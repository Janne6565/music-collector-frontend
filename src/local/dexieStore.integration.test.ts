import "fake-indexeddb/auto";
import { hlcInitial, hlcTick } from "@/domain/hlc";
import type { Release } from "@/domain/types";
import { type ClockSource, createCopy, tombstoneCopy } from "@/local/copyWrites";
import { DexieLocalStore } from "@/local/dexieStore";
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
