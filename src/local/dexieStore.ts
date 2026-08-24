import type { CollectionStats, Copy, Format, Photo, Release, WishlistItem } from "@/domain/types";
import { FORMATS } from "@/domain/types";
import type { LibraryFilter, LocalStore } from "@/local/LocalStore";
import Dexie, { type EntityTable } from "dexie";

const DEVICE_ID_KEY = "deviceId";
const CLOCK_KEY = "clock";
const CURSOR_KEY = "syncCursor";
const PENDING_KEY = "pendingIds";

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

class MusicCollectorDb extends Dexie {
  copies!: EntityTable<Copy, "id">;
  releases!: EntityTable<Release, "mbid">;
  wishlist!: EntityTable<WishlistItem, "id">;
  photos!: EntityTable<Photo, "id">;
  photoBytes!: EntityTable<PhotoBytesRow, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("music-collector");
    // Only fields that are queried or sorted need indexing; the rest ride along in the row.
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
    const releases = await this.getReleases(copies.map((copy) => copy.releaseMbid));

    const matching = copies.filter((copy) => {
      const release = releases.get(copy.releaseMbid);
      if (
        filter.format !== undefined &&
        filter.format !== "ALL" &&
        release?.format !== filter.format
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

  async listCopiesInReleaseGroup(releaseGroupMbid: string): Promise<Copy[]> {
    const releases = await this.db.releases
      .where("releaseGroupMbid")
      .equals(releaseGroupMbid)
      .toArray();
    const mbids = new Set(releases.map((release) => release.mbid));
    const copies = await this.db.copies.filter((copy) => copy.deletedAt === null).toArray();
    return copies.filter((copy) => mbids.has(copy.releaseMbid));
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
    await this.db.releases.bulkPut([...releases]);
  }

  async getRelease(mbid: string): Promise<Release | undefined> {
    return this.db.releases.get(mbid);
  }

  async getReleases(mbids: readonly string[]): Promise<Map<string, Release>> {
    if (mbids.length === 0) return new Map();
    const rows = await this.db.releases.bulkGet([...new Set(mbids)]);
    return new Map(
      rows.filter((row): row is Release => row !== undefined).map((row) => [row.mbid, row]),
    );
  }

  async listPhotos(copyId: string): Promise<Photo[]> {
    const photos = await this.db.photos.where("copyId").equals(copyId).toArray();
    return photos
      .filter((photo) => photo.deletedAt === null)
      .sort((a, b) => a.sortIndex - b.sortIndex);
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

  async wishlistHas(releaseGroupMbid: string): Promise<boolean> {
    const matches = await this.db.wishlist
      .where("releaseGroupMbid")
      .equals(releaseGroupMbid)
      .toArray();
    return matches.some((item) => item.deletedAt === null);
  }

  async stats(): Promise<CollectionStats> {
    const copies = await this.db.copies.filter((copy) => copy.deletedAt === null).toArray();
    const releases = await this.getReleases(copies.map((copy) => copy.releaseMbid));
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
    const release = releases.get(copy.releaseMbid);
    if (release !== undefined) {
      byFormat[release.format] += 1;
      releaseGroups.add(release.releaseGroupMbid);
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
        (releases.get(a.releaseMbid)?.artistName ?? "").localeCompare(
          releases.get(b.releaseMbid)?.artistName ?? "",
        ),
      );
    case "YEAR_DESC":
      return sorted.sort(
        (a, b) =>
          (releases.get(b.releaseMbid)?.year ?? 0) - (releases.get(a.releaseMbid)?.year ?? 0),
      );
    case "ADDED_DESC":
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
}
