import type { CollectionStats, Copy, Format, Release, WishlistItem } from "@/domain/types";
import { FORMATS } from "@/domain/types";
import type { LibraryFilter, LocalStore } from "@/local/LocalStore";
import Dexie, { type EntityTable } from "dexie";

const DEVICE_ID_KEY = "deviceId";
const CLOCK_KEY = "clock";

interface MetaRow {
  key: string;
  value: string;
}

class MusicCollectorDb extends Dexie {
  copies!: EntityTable<Copy, "id">;
  releases!: EntityTable<Release, "mbid">;
  wishlist!: EntityTable<WishlistItem, "id">;
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
  }

  async softDeleteCopy(id: string, at: number): Promise<void> {
    // Tombstone, not a removal: a deleted row that simply disappeared locally would be
    // handed straight back by the server on the next sync.
    await this.db.copies.update(id, { deletedAt: at });
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

  async listWishlist(): Promise<WishlistItem[]> {
    const items = await this.db.wishlist.filter((item) => item.deletedAt === null).toArray();
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  async putWishlistItem(item: WishlistItem): Promise<void> {
    await this.db.wishlist.put(item);
  }

  async softDeleteWishlistItem(id: string, at: number): Promise<void> {
    await this.db.wishlist.update(id, { deletedAt: at });
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
