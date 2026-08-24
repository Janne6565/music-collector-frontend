import "fake-indexeddb/auto";
import { hlcInitial, hlcTick } from "@/domain/hlc";
import type { Copy, Release } from "@/domain/types";
import { type ClockSource, createCopy, tombstoneCopy } from "@/local/copyWrites";
import { DexieLocalStore } from "@/local/dexieStore";
import { SyncEngine } from "@/sync/syncEngine";
import Dexie from "dexie";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pull = vi.fn();
const push = vi.fn();
vi.mock("@/api/generated/sync/sync", () => ({
  pull: (...args: unknown[]) => pull(...args),
  push: (...args: unknown[]) => push(...args),
}));

function clockSource(node: string): ClockSource {
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

const release: Release = {
  mbid: "rel-1",
  releaseGroupMbid: "group-1",
  title: "Bitches Brew",
  artistName: "Miles Davis",
  year: 1970,
  format: "VINYL",
  label: null,
  catalogNumber: null,
  country: null,
  barcode: null,
  coverArtUrl: null,
  coverTheme: null,
  cachedAt: 0,
};

const draft = {
  condition: "VG_PLUS" as const,
  pricePaidCents: 2800,
  currency: "EUR",
  purchasedOn: null,
  purchasedAt: null,
  notes: null,
  rating: null,
};

function dtoOf(copy: Copy) {
  return { ...copy };
}

describe("SyncEngine", () => {
  let store: DexieLocalStore;
  let engine: SyncEngine;
  let clock: ClockSource;

  beforeEach(async () => {
    await Dexie.delete("music-collector");
    store = new DexieLocalStore();
    await store.open();
    clock = clockSource("device-a");
    engine = new SyncEngine(store, clock);
    pull.mockReset();
    push.mockReset();
    pull.mockResolvedValue({ copies: [], cursor: 0, hasMore: false });
    push.mockResolvedValue({ copies: [], cursor: 0, hasMore: false });
  });

  it("pushes a locally created copy exactly once", async () => {
    await store.cacheReleases([release]);
    await store.putCopy(createCopy(release, draft, clock, 1000, "copy-1"));

    const first = await engine.sync();
    const second = await engine.sync();

    expect(first.pushed).toBe(1);
    // Without clearing pending after a successful push, the client resends forever.
    expect(second.pushed).toBe(0);
  });

  it("does not push back what it just pulled", async () => {
    const remote = createCopy(release, draft, clock, 1000, "copy-remote");
    pull.mockResolvedValueOnce({ copies: [dtoOf(remote)], cursor: 5, hasMore: false });

    const first = await engine.sync();

    expect(first.pulled).toBe(1);
    expect(await store.readPendingIds()).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });

  it("merges a pulled record against local edits rather than overwriting them", async () => {
    await store.cacheReleases([release]);
    const local = createCopy(release, draft, clock, 1000, "copy-1");
    await store.putCopy(local);

    // The server has a newer rating; everything else on it is older.
    const remote: Copy = {
      ...local,
      rating: 5,
      condition: "G",
      fieldClocks: {
        ...local.fieldClocks,
        rating: "000000000900000:0000:b",
        condition: "000000000000001:0000:b",
      },
    };
    pull.mockResolvedValueOnce({ copies: [dtoOf(remote)], cursor: 9, hasMore: false });

    await engine.sync();

    const merged = await store.getCopy("copy-1");
    expect(merged?.rating).toBe(5);
    // The local condition is newer, so the server's older one must not win.
    expect(merged?.condition).toBe("VG_PLUS");
  });

  it("follows the cursor across pages", async () => {
    const one = createCopy(release, draft, clock, 1000, "copy-1");
    const two = createCopy(release, draft, clock, 1000, "copy-2");
    pull
      .mockResolvedValueOnce({ copies: [dtoOf(one)], cursor: 1, hasMore: true })
      .mockResolvedValueOnce({ copies: [dtoOf(two)], cursor: 2, hasMore: false });

    const result = await engine.sync();

    expect(result.pulled).toBe(2);
    expect(await store.readSyncCursor()).toBe(2);
    expect(pull).toHaveBeenNthCalledWith(2, { since: 1 });
  });

  it("pushes a tombstone so deletes propagate", async () => {
    await store.cacheReleases([release]);
    await store.putCopy(createCopy(release, draft, clock, 1000, "copy-1"));
    await engine.sync();
    push.mockClear();

    const alive = await store.getCopy("copy-1");
    await store.putCopy(tombstoneCopy(alive as Copy, clock, 5000));
    await engine.sync();

    const pushed = push.mock.calls[0]?.[0] as { copies: Copy[] };
    expect(pushed.copies).toHaveLength(1);
    expect(pushed.copies[0]?.deletedAt).toBe(5000);
  });

  it("drops a malformed server record instead of writing it", async () => {
    pull.mockResolvedValueOnce({ copies: [{ id: "broken" }], cursor: 3, hasMore: false });

    const result = await engine.sync();

    expect(result.pulled).toBe(0);
    expect(await store.getCopy("broken")).toBeUndefined();
  });
});

describe("first sign-in", () => {
  let store: DexieLocalStore;
  let engine: SyncEngine;
  let clock: ClockSource;

  beforeEach(async () => {
    await Dexie.delete("music-collector");
    store = new DexieLocalStore();
    await store.open();
    clock = clockSource("device-a");
    engine = new SyncEngine(store, clock);
    pull.mockReset();
    push.mockReset();
    push.mockResolvedValue({ copies: [], cursor: 0, hasMore: false });

    await store.cacheReleases([release]);
    await store.putCopy(createCopy(release, draft, clock, 1000, "local-1"));
  });

  it("MERGE keeps both sides", async () => {
    const accountCopy = createCopy(release, draft, clockSource("device-b"), 2000, "account-1");
    pull.mockResolvedValueOnce({ copies: [dtoOf(accountCopy)], cursor: 4, hasMore: false });

    await engine.firstSync("MERGE");

    expect((await store.listCopies()).map((c) => c.id).sort()).toEqual(["account-1", "local-1"]);
  });

  it("KEEP_ACCOUNT discards the local collection", async () => {
    const accountCopy = createCopy(release, draft, clockSource("device-b"), 2000, "account-1");
    pull.mockResolvedValue({ copies: [dtoOf(accountCopy)], cursor: 4, hasMore: false });

    await engine.firstSync("KEEP_ACCOUNT");

    expect((await store.listCopies()).map((c) => c.id)).toEqual(["account-1"]);
    // The discard is a tombstone, so it replicates rather than letting another device
    // hand the records straight back.
    expect((await store.getCopyIncludingDeleted("local-1"))?.deletedAt).not.toBeNull();
  });

  it("KEEP_LOCAL discards what was only in the account", async () => {
    const accountCopy = createCopy(release, draft, clockSource("device-b"), 2000, "account-1");
    pull.mockResolvedValue({ copies: [dtoOf(accountCopy)], cursor: 4, hasMore: false });

    await engine.firstSync("KEEP_LOCAL");

    expect((await store.listCopies()).map((c) => c.id)).toEqual(["local-1"]);
    expect((await store.getCopyIncludingDeleted("account-1"))?.deletedAt).not.toBeNull();
  });
});

describe("deletes stay deleted", () => {
  let store: DexieLocalStore;
  let engine: SyncEngine;
  let clock: ClockSource;

  beforeEach(async () => {
    await Dexie.delete("music-collector");
    store = new DexieLocalStore();
    await store.open();
    clock = clockSource("device-a");
    engine = new SyncEngine(store, clock);
    pull.mockReset();
    push.mockReset();
    push.mockResolvedValue({ copies: [], cursor: 0, hasMore: false });
  });

  it("does not resurrect a locally deleted copy that the server still has alive", async () => {
    // The regression that motivated getCopyIncludingDeleted: a tombstoned copy looked
    // absent, so the server's live version was adopted as if it were new.
    await store.cacheReleases([release]);
    const alive = createCopy(release, draft, clock, 1000, "copy-1");
    await store.putCopy(alive);
    await store.putCopy(tombstoneCopy(alive, clock, 5000));

    pull.mockResolvedValue({ copies: [dtoOf(alive)], cursor: 7, hasMore: false });
    await engine.sync();

    expect(await store.getCopy("copy-1")).toBeUndefined();
    expect((await store.getCopyIncludingDeleted("copy-1"))?.deletedAt).toBe(5000);
  });

  it("accepts a delete made on another device", async () => {
    await store.cacheReleases([release]);
    const alive = createCopy(release, draft, clock, 1000, "copy-1");
    await store.putCopy(alive);

    const deletedElsewhere = tombstoneCopy(alive, clockSource("device-z"), 9000);
    pull.mockResolvedValue({ copies: [dtoOf(deletedElsewhere)], cursor: 7, hasMore: false });
    await engine.sync();

    expect(await store.getCopy("copy-1")).toBeUndefined();
  });
});
