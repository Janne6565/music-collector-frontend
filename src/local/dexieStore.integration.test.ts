import "fake-indexeddb/auto";
import { hlcInitial, hlcTick } from "@/domain/hlc";
import type { Release } from "@/domain/types";
import { type ClockSource, createCopy, tombstoneCopy } from "@/local/copyWrites";
import { DexieLocalStore } from "@/local/dexieStore";
import { createPhoto, markUploaded, tombstonePhoto } from "@/local/photoWrites";
import { createWishlistItem, tombstoneWishlistItem } from "@/local/wishWrites";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";

function clockSource(node = "test-device"): ClockSource {
  let current = hlcInitial(node);
  let wall = 1000;
  return {
    next() {
      wall += 1;
      current = hlcTick(current, wall);
      return current;
    },
  };
}

function release(mbid: string, overrides: Partial<Release> = {}): Release {
  return {
    mbid,
    releaseGroupMbid: "group-brew",
    title: "Bitches Brew",
    artistName: "Miles Davis",
    year: 1970,
    format: "VINYL",
    label: "Columbia",
    catalogNumber: "GP 26",
    country: "US",
    barcode: null,
    coverArtUrl: null,
    coverTheme: null,
    cachedAt: 0,
    ...overrides,
  };
}

const draft = {
  condition: "VG_PLUS" as const,
  pricePaidCents: 2800,
  currency: "EUR",
  purchasedOn: "2026-08-14",
  purchasedAt: "Concerto, Amsterdam",
  notes: null,
  rating: 4,
};

/**
 * Exercises the real Dexie store against fake-indexeddb, so the schema, the indexes and
 * the tombstone filtering are covered rather than just the pure helpers around them.
 */
describe("DexieLocalStore", () => {
  let store: DexieLocalStore;
  let clock: ClockSource;

  beforeEach(async () => {
    // fake-indexeddb persists across tests in the same file, so the database has to be
    // dropped explicitly — reassigning globalThis.indexedDB does not isolate Dexie, which
    // has already captured a reference to it.
    await Dexie.delete("music-collector");
    store = new DexieLocalStore();
    clock = clockSource();
    await store.open();
  });

  it("round-trips a copy", async () => {
    const vinyl = release("r-vinyl");
    await store.cacheReleases([vinyl]);
    const copy = createCopy(vinyl, draft, clock, 5000, "copy-1");
    await store.putCopy(copy);

    expect(await store.getCopy("copy-1")).toEqual(copy);
    expect(await store.listCopies()).toHaveLength(1);
  });

  it("hides tombstoned copies from reads but keeps the row", async () => {
    const vinyl = release("r-vinyl");
    await store.cacheReleases([vinyl]);
    await store.putCopy(createCopy(vinyl, draft, clock, 5000, "copy-1"));

    const copy = await store.getCopy("copy-1");
    expect(copy).toBeDefined();
    await store.putCopy(tombstoneCopy(copy as NonNullable<typeof copy>, clock, 9000));

    expect(await store.getCopy("copy-1")).toBeUndefined();
    expect(await store.listCopies()).toHaveLength(0);
    // The tombstone must survive, or the next sync would resurrect the copy.
    expect(await store.stats()).toMatchObject({ copyCount: 0 });
  });

  it("filters by format through the cached release", async () => {
    const vinyl = release("r-vinyl", { format: "VINYL" });
    const cd = release("r-cd", { format: "CD" });
    await store.cacheReleases([vinyl, cd]);
    await store.putCopy(createCopy(vinyl, draft, clock, 1, "c-vinyl"));
    await store.putCopy(createCopy(cd, draft, clock, 2, "c-cd"));

    expect((await store.listCopies({ format: "VINYL" })).map((c) => c.id)).toEqual(["c-vinyl"]);
    expect(await store.listCopies({ format: "ALL" })).toHaveLength(2);
  });

  it("searches across title, artist and catalog number", async () => {
    const vinyl = release("r-vinyl");
    await store.cacheReleases([vinyl]);
    await store.putCopy(createCopy(vinyl, draft, clock, 1, "c-1"));

    expect(await store.listCopies({ search: "bitches" })).toHaveLength(1);
    expect(await store.listCopies({ search: "miles" })).toHaveLength(1);
    expect(await store.listCopies({ search: "GP 26" })).toHaveLength(1);
    expect(await store.listCopies({ search: "coltrane" })).toHaveLength(0);
  });

  it("finds the other copies of the same album across formats", async () => {
    // This is what the detail screen's "other copies of this release" reads.
    const vinyl = release("r-vinyl", { format: "VINYL" });
    const cd = release("r-cd", { format: "CD" });
    const unrelated = release("r-other", { releaseGroupMbid: "group-light", format: "CASSETTE" });
    await store.cacheReleases([vinyl, cd, unrelated]);
    await store.putCopy(createCopy(vinyl, draft, clock, 1, "c-vinyl"));
    await store.putCopy(createCopy(cd, draft, clock, 2, "c-cd"));
    await store.putCopy(createCopy(unrelated, draft, clock, 3, "c-other"));

    const siblings = await store.listCopiesInReleaseGroup("group-brew");

    expect(siblings.map((c) => c.id).sort()).toEqual(["c-cd", "c-vinyl"]);
  });

  it("counts copies and albums separately in stats", async () => {
    const vinyl = release("r-vinyl", { format: "VINYL" });
    const cd = release("r-cd", { format: "CD" });
    await store.cacheReleases([vinyl, cd]);
    await store.putCopy(createCopy(vinyl, draft, clock, 1, "c-vinyl"));
    await store.putCopy(createCopy(cd, draft, clock, 2, "c-cd"));

    expect(await store.stats()).toMatchObject({
      copyCount: 2,
      releaseGroupCount: 1,
      totalSpentCents: 5600,
      averageSpentCents: 2800,
    });
  });

  it("keeps the device id stable across reopens", async () => {
    // The device id is the tie-breaker in every field-level merge; a new one on each
    // start would make conflict resolution non-deterministic.
    const first = await store.deviceId();

    const reopened = new DexieLocalStore();
    await reopened.open();

    expect(await reopened.deviceId()).toBe(first);
  });

  it("persists the clock so stamps never go backwards after a restart", async () => {
    await store.writeClock("000000000001000:0005:test-device");

    const reopened = new DexieLocalStore();
    await reopened.open();

    expect(await reopened.readClock()).toBe("000000000001000:0005:test-device");
  });
});

describe("wishlist", () => {
  let store: DexieLocalStore;
  let clock: ClockSource;

  beforeEach(async () => {
    await Dexie.delete("music-collector");
    store = new DexieLocalStore();
    clock = clockSource();
    await store.open();
  });

  function wish(id: string, group = "group-brew") {
    return createWishlistItem(
      {
        releaseGroupMbid: group,
        title: "Ege Bamyasi",
        artistName: "Can",
        year: 1972,
        desiredFormat: "VINYL",
        note: "Want an original Spoon press",
      },
      clock,
      1000,
      id,
    );
  }

  it("round-trips a wish and marks it pending", async () => {
    await store.putWishlistItem(wish("w-1"));

    expect(await store.listWishlist()).toHaveLength(1);
    // Wishes and copies share one pending set, so they push in a single request.
    expect(await store.readPendingIds()).toEqual(["w-1"]);
  });

  it("hides a tombstoned wish but keeps the row for sync", async () => {
    await store.putWishlistItem(wish("w-1"));
    const stored = await store.getWishlistItemIncludingDeleted("w-1");
    await store.putWishlistItem(
      tombstoneWishlistItem(stored as NonNullable<typeof stored>, clock, 9000),
    );

    expect(await store.listWishlist()).toHaveLength(0);
    expect((await store.getWishlistItemIncludingDeleted("w-1"))?.deletedAt).toBe(9000);
  });

  it("knows whether an album is already wished for", async () => {
    await store.putWishlistItem(wish("w-1", "group-brew"));

    expect(await store.wishlistHas("group-brew")).toBe(true);
    expect(await store.wishlistHas("group-light")).toBe(false);
  });

  it("stops counting an album as wished for once the wish is deleted", async () => {
    await store.putWishlistItem(wish("w-1", "group-brew"));
    const stored = await store.getWishlistItemIncludingDeleted("w-1");
    await store.putWishlistItem(
      tombstoneWishlistItem(stored as NonNullable<typeof stored>, clock, 9000),
    );

    expect(await store.wishlistHas("group-brew")).toBe(false);
  });

  it("adopting a wish does not mark it pending", async () => {
    // Otherwise the client pushes straight back what it just pulled, forever.
    await store.adoptWishlistItem(wish("w-1"));

    expect(await store.readPendingIds()).toEqual([]);
  });
});

describe("photos", () => {
  let store: DexieLocalStore;
  let clock: ClockSource;

  beforeEach(async () => {
    await Dexie.delete("music-collector");
    store = new DexieLocalStore();
    clock = clockSource();
    await store.open();
  });

  function photo(id: string, copyId = "copy-1", sortIndex = 0) {
    return createPhoto(
      { copyId, contentType: "image/jpeg", byteSize: 1024, sortIndex },
      clock,
      1000,
      id,
    );
  }

  const bytes = () => new Uint8Array([1, 2, 3]).buffer;

  it("round-trips a photo and its bytes", async () => {
    await store.putPhoto(photo("p-1"));
    await store.putPhotoBytes("p-1", bytes(), "image/jpeg");

    expect(await store.listPhotos("copy-1")).toHaveLength(1);
    expect((await store.getPhotoBytes("p-1"))?.size).toBe(3);
  });

  it("returns the strip in sort order", async () => {
    await store.putPhoto(photo("p-c", "copy-1", 2));
    await store.putPhoto(photo("p-a", "copy-1", 0));
    await store.putPhoto(photo("p-b", "copy-1", 1));

    expect((await store.listPhotos("copy-1")).map((p) => p.id)).toEqual(["p-a", "p-b", "p-c"]);
  });

  it("only lists photos for the copy asked about", async () => {
    await store.putPhoto(photo("p-1", "copy-1"));
    await store.putPhoto(photo("p-2", "copy-2"));

    expect((await store.listPhotos("copy-1")).map((p) => p.id)).toEqual(["p-1"]);
  });

  it("hides a tombstoned photo but keeps the row for sync", async () => {
    await store.putPhoto(photo("p-1"));
    const stored = await store.getPhotoIncludingDeleted("p-1");
    await store.putPhoto(tombstonePhoto(stored as NonNullable<typeof stored>, clock, 9000));

    expect(await store.listPhotos("copy-1")).toHaveLength(0);
    expect((await store.getPhotoIncludingDeleted("p-1"))?.deletedAt).toBe(9000);
  });

  it("offers for upload only photos whose bytes are actually here", async () => {
    // A photo pulled from another device has metadata but no local bytes; uploading it
    // would be impossible and retrying forever would be pointless.
    await store.putPhoto(photo("p-local"));
    await store.putPhotoBytes("p-local", bytes(), "image/jpeg");
    await store.putPhoto(photo("p-elsewhere"));

    expect((await store.listPhotosAwaitingUpload()).map((p) => p.id)).toEqual(["p-local"]);
  });

  it("stops offering a photo for upload once it has a storage key", async () => {
    await store.putPhoto(photo("p-1"));
    await store.putPhotoBytes("p-1", bytes(), "image/jpeg");
    const stored = await store.getPhotoIncludingDeleted("p-1");
    await store.putPhoto(markUploaded(stored as NonNullable<typeof stored>, "user/p-1", clock));

    expect(await store.listPhotosAwaitingUpload()).toHaveLength(0);
  });

  it("adopting a photo does not mark it pending", async () => {
    await store.adoptPhoto(photo("p-1"));

    expect(await store.readPendingIds()).toEqual([]);
  });
});
