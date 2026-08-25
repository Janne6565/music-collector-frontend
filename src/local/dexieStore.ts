import type {
  CollectionStats,
  Copy,
  Format,
  LibraryFilter,
  LocalStore,
  Photo,
  Release,
  WishlistItem,
} from "@janne6565/music-collector-shared";
import { FORMATS } from "@janne6565/music-collector-shared";
import Dexie, { type EntityTable } from "dexie";

const DEVICE_ID_KEY = "deviceId";
const CLOCK_KEY = "clock";
const CURSOR_KEY = "syncCursor";
const PENDING_KEY = "pendingIds";
/** Namespaced, so a preference can never collide with the sync bookkeeping above. */
const SETTING_PREFIX = "setting:";

interface MetaRow {
  key: string;
  value: string;
}

/**
 * Image bytes, in their own table so a library read never drags them along.
 *
 * Stored as an ArrayBuffer rather than a Blob: Blob support in IndexedDB is uneven across
 * engines, and a buffer plus its content type reconstructs the Blob exactly.
 */
interface PhotoBytesRow {
  id: string;
  buffer: ArrayBuffer;
  contentType: string;
}

/**
 * Every id written before the app read two catalogues came from MusicBrainz, so prefixing
 * is exactly right. Guarded against running twice, which an interrupted upgrade can do.
 */
function qualify(id: string | undefined): string {
  if (id === undefined || id === null) return id as unknown as string;
  return id.includes(":") ? id : `musicbrainz:${id}`;
}

function renameClock(row: Record<string, unknown>, from: string, to: string): void {
  const clocks = row.fieldClocks as Record<string, string> | undefined;
  if (clocks === undefined || clocks[from] === undefined) return;
  clocks[to] = clocks[from];
  delete clocks[from];
}

class MusicCollectorDb extends Dexie {
  copies!: EntityTable<Copy, "id">;
  releaseCache!: EntityTable<Release, "id">;
  wishlist!: EntityTable<WishlistItem, "id">;
  photos!: EntityTable<Photo, "id">;
  photoBytes!: EntityTable<PhotoBytesRow, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("music-collector");
    // Only fields that are queried or sorted need indexing; the rest ride along in the row.
    // Versions 1 and 2 are history: they describe databases that exist on people's
    // machines, and editing them would make Dexie disagree with what is actually on disk.
    this.version(1).stores({
      copies: "id, releaseMbid, createdAt, deletedAt",
      releases: "mbid, releaseGroupMbid",
      wishlist: "id, releaseGroupMbid, deletedAt",
      meta: "key",
    });
    this.version(2).stores({
      copies: "id, releaseMbid, createdAt, deletedAt",
      releases: "mbid, releaseGroupMbid",
      wishlist: "id, releaseGroupMbid, deletedAt",
      photos: "id, copyId, storageKey, deletedAt",
      photoBytes: "id",
      meta: "key",
    });

    /**
     * Ids become source-qualified, because the app now reads two catalogues.
     *
     * The cached releases move to a new table rather than being altered in place: their
     * primary key was `mbid` and is now `id`, and IndexedDB cannot change a key path on an
     * existing store. `releaseCache` is also the more honest name — these rows are a copy
     * of what upstream said, discardable in a way that copies and wishes are not.
     *
     * The rows are carried across rather than dropped. Without them a library that is
     * offline would show a grid of dashes: nothing re-fetches release metadata on its own.
     */
    this.version(3)
      .stores({
        copies: "id, releaseId, createdAt, deletedAt",
        releaseCache: "id, albumId",
        wishlist: "id, albumId, deletedAt",
        photos: "id, copyId, storageKey, deletedAt",
        photoBytes: "id",
        meta: "key",
      })
      .upgrade(async (tx) => {
        const cached = await tx.table("releases").toArray();
        await tx.table("releaseCache").bulkAdd(
          cached.map(({ mbid, releaseGroupMbid, ...rest }) => ({
            ...rest,
            id: qualify(mbid),
            albumId: qualify(releaseGroupMbid),
          })),
        );

        // The field clocks are keyed by field name, so a clock left under the old key
        // reads as never-set — losing every edit that field has ever won in a merge.
        await tx
          .table("copies")
          .toCollection()
          .modify((copy: Record<string, unknown>) => {
            copy.releaseId = qualify(copy.releaseMbid as string);
            copy.releaseMbid = undefined;
            renameClock(copy, "releaseMbid", "releaseId");
          });

        await tx
          .table("wishlist")
          .toCollection()
          .modify((wish: Record<string, unknown>) => {
            wish.albumId = qualify(wish.releaseGroupMbid as string);
            wish.releaseGroupMbid = undefined;
            renameClock(wish, "releaseGroupMbid", "albumId");
          });
      });

    // Dropped in its own version: a store cannot be read in the upgrade that deletes it.
    this.version(4).stores({ releases: null });
  }
}

/**
 * IndexedDB-backed store for the web app.
 *
 * localStorage is not an option here: it caps out around 5 MB, it is synchronous, and it
 * only holds strings. A collection with a few hundred copies and cached cover metadata
 * passes that limit quickly.
 */
export class DexieLocalStore implements LocalStore {
  private readonly db = new MusicCollectorDb();

  async open(): Promise<void> {
    await this.db.open();
  }

  async listCopies(filter: LibraryFilter = {}): Promise<Copy[]> {
    const copies = await this.db.copies.filter((copy) => copy.deletedAt === null).toArray();
    const releases = await this.getReleases(copies.map((copy) => copy.releaseId));

    const matching = copies.filter((copy) => {
      const release = releases.get(copy.releaseId);
      if (
        filter.format !== undefined &&
        filter.format !== "ALL" &&
        release?.format !== filter.format
      ) {
        return false;
      }
      // A grade the copy has never been given is not "Good" — an ungraded copy drops out
      // of every grade filter rather than defaulting into the mildest one.
      if (
        filter.condition !== undefined &&
        filter.condition !== null &&
        copy.condition !== filter.condition
      ) {
        return false;
      }
      const term = filter.search?.trim().toLowerCase();
      if (term === undefined || term === "") return true;
      const haystack = [release?.title, release?.artistName, release?.catalogNumber, copy.notes]
        .filter((part): part is string => typeof part === "string")
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    return sortCopies(matching, releases, filter.sort ?? "ADDED_DESC");
  }

  async getCopy(id: string): Promise<Copy | undefined> {
    const copy = await this.db.copies.get(id);
    return copy?.deletedAt === null ? copy : undefined;
  }

  async getCopyIncludingDeleted(id: string): Promise<Copy | undefined> {
    return this.db.copies.get(id);
  }

  async listCopiesInReleaseGroup(albumId: string): Promise<Copy[]> {
    const releases = await this.db.releaseCache.where("albumId").equals(albumId).toArray();
    const releaseIds = new Set(releases.map((release) => release.id));
    const copies = await this.db.copies.filter((copy) => copy.deletedAt === null).toArray();
    return copies.filter((copy) => releaseIds.has(copy.releaseId));
  }

  async putCopy(copy: Copy): Promise<void> {
    await this.db.copies.put(copy);
    await this.markPending(copy.id);
  }

  async adoptCopy(copy: Copy): Promise<void> {
    await this.db.copies.put(copy);
  }

  /** One pending set for copies and wishes alike — they push in the same batch. */
  private async markPending(id: string): Promise<void> {
    const pending = new Set(await this.readPendingIds());
    if (pending.has(id)) return;
    pending.add(id);
    await this.writePendingIds([...pending]);
  }

  async cacheReleases(releases: readonly Release[]): Promise<void> {
    await this.db.releaseCache.bulkPut([...releases]);
  }

  async getRelease(releaseId: string): Promise<Release | undefined> {
    return this.db.releaseCache.get(releaseId);
  }

  async getReleases(releaseIds: readonly string[]): Promise<Map<string, Release>> {
    if (releaseIds.length === 0) return new Map();
    const rows = await this.db.releaseCache.bulkGet([...new Set(releaseIds)]);
    return new Map(
      rows.filter((row): row is Release => row !== undefined).map((row) => [row.id, row]),
    );
  }

  async listPhotos(copyId: string): Promise<Photo[]> {
    const photos = await this.db.photos.where("copyId").equals(copyId).toArray();
    return photos
      .filter((photo) => photo.deletedAt === null)
      .sort((a, b) => a.sortIndex - b.sortIndex);
  }

  async listCoverPhotos(copyIds: readonly string[]): Promise<Map<string, Photo>> {
    // anyOf on an empty list is legal but pointless, and the callers hit it on first paint.
    if (copyIds.length === 0) return new Map();
    const photos = await this.db.photos
      .where("copyId")
      .anyOf(copyIds as string[])
      .toArray();

    const first = new Map<string, Photo>();
    for (const photo of photos) {
      if (photo.deletedAt !== null) continue;
      const held = first.get(photo.copyId);
      if (held === undefined || photo.sortIndex < held.sortIndex) first.set(photo.copyId, photo);
    }
    return first;
  }

  async getPhotoIncludingDeleted(id: string): Promise<Photo | undefined> {
    return this.db.photos.get(id);
  }

  async listPhotosAwaitingUpload(): Promise<Photo[]> {
    const photos = await this.db.photos
      .filter((photo) => photo.storageKey === null && photo.deletedAt === null)
      .toArray();
    // Only those whose bytes are actually here; a photo pulled from another device has no
    // local bytes to upload and nothing to do.
    const withBytes: Photo[] = [];
    for (const photo of photos) {
      if ((await this.db.photoBytes.get(photo.id)) !== undefined) withBytes.push(photo);
    }
    return withBytes;
  }

  async putPhoto(photo: Photo): Promise<void> {
    await this.db.photos.put(photo);
    await this.markPending(photo.id);
  }

  async adoptPhoto(photo: Photo): Promise<void> {
    await this.db.photos.put(photo);
  }

  async putPhotoBytes(id: string, buffer: ArrayBuffer, contentType: string): Promise<void> {
    await this.db.photoBytes.put({ id, buffer, contentType });
  }

  async getPhotoBytes(id: string): Promise<Blob | undefined> {
    const row = await this.db.photoBytes.get(id);
    return row === undefined ? undefined : new Blob([row.buffer], { type: row.contentType });
  }

  async deletePhotoBytes(id: string): Promise<void> {
    await this.db.photoBytes.delete(id);
  }

  async listWishlist(): Promise<WishlistItem[]> {
    const items = await this.db.wishlist.filter((item) => item.deletedAt === null).toArray();
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getWishlistItemIncludingDeleted(id: string): Promise<WishlistItem | undefined> {
    return this.db.wishlist.get(id);
  }

  async putWishlistItem(item: WishlistItem): Promise<void> {
    await this.db.wishlist.put(item);
    await this.markPending(item.id);
  }

  async adoptWishlistItem(item: WishlistItem): Promise<void> {
    await this.db.wishlist.put(item);
  }

  async wishlistHas(albumId: string): Promise<boolean> {
    const matches = await this.db.wishlist.where("albumId").equals(albumId).toArray();
    return matches.some((item) => item.deletedAt === null);
  }

  async stats(): Promise<CollectionStats> {
    const copies = await this.db.copies.filter((copy) => copy.deletedAt === null).toArray();
    const releases = await this.getReleases(copies.map((copy) => copy.releaseId));
    return computeStats(copies, releases);
  }

  async deviceId(): Promise<string> {
    const existing = await this.db.meta.get(DEVICE_ID_KEY);
    if (existing !== undefined) return existing.value;
    const generated = crypto.randomUUID();
    await this.db.meta.put({ key: DEVICE_ID_KEY, value: generated });
    return generated;
  }

  async readClock(): Promise<string | undefined> {
    return (await this.db.meta.get(CLOCK_KEY))?.value;
  }

  async writeClock(encoded: string): Promise<void> {
    await this.db.meta.put({ key: CLOCK_KEY, value: encoded });
  }

  async readSyncCursor(): Promise<number> {
    const row = await this.db.meta.get(CURSOR_KEY);
    return row === undefined ? 0 : Number.parseInt(row.value, 10);
  }

  async writeSyncCursor(cursor: number): Promise<void> {
    await this.db.meta.put({ key: CURSOR_KEY, value: String(cursor) });
  }

  async readPendingIds(): Promise<string[]> {
    const row = await this.db.meta.get(PENDING_KEY);
    return row === undefined ? [] : (JSON.parse(row.value) as string[]);
  }

  async writePendingIds(ids: readonly string[]): Promise<void> {
    await this.db.meta.put({ key: PENDING_KEY, value: JSON.stringify(ids) });
  }

  async readSetting(key: string): Promise<string | undefined> {
    return (await this.db.meta.get(`${SETTING_PREFIX}${key}`))?.value;
  }

  async writeSetting(key: string, value: string): Promise<void> {
    await this.db.meta.put({ key: `${SETTING_PREFIX}${key}`, value });
  }
}

/** Exported for testing — pure, so it needs no IndexedDB. */
export function computeStats(
  copies: readonly Copy[],
  releases: ReadonlyMap<string, Release>,
): CollectionStats {
  const byFormat = Object.fromEntries(FORMATS.map((format) => [format, 0])) as Record<
    Format,
    number
  >;
  const releaseGroups = new Set<string>();
  let totalSpentCents = 0;

  for (const copy of copies) {
    const release = releases.get(copy.releaseId);
    if (release !== undefined) {
      byFormat[release.format] += 1;
      releaseGroups.add(release.albumId);
    }
    totalSpentCents += copy.pricePaidCents ?? 0;
  }

  return {
    copyCount: copies.length,
    releaseGroupCount: releaseGroups.size,
    totalSpentCents,
    // Rounded, and guarded against the empty collection the profile screen starts at.
    averageSpentCents: copies.length === 0 ? 0 : Math.round(totalSpentCents / copies.length),
    byFormat,
  };
}

/** Exported for testing — pure. */
export function sortCopies(
  copies: readonly Copy[],
  releases: ReadonlyMap<string, Release>,
  sort: NonNullable<LibraryFilter["sort"]>,
): Copy[] {
  const sorted = [...copies];
  switch (sort) {
    case "ARTIST_ASC":
      return sorted.sort((a, b) =>
        (releases.get(a.releaseId)?.artistName ?? "").localeCompare(
          releases.get(b.releaseId)?.artistName ?? "",
        ),
      );
    case "YEAR_DESC":
      return sorted.sort(
        (a, b) => (releases.get(b.releaseId)?.year ?? 0) - (releases.get(a.releaseId)?.year ?? 0),
      );
    case "ADDED_DESC":
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
}
