import { createSyncTransport } from "@/sync/transport";
import type { LocalStore } from "@janne6565/music-collector-shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pull = vi.fn();
const push = vi.fn();
const getReleases = vi.fn();
vi.mock("@/api/generated/sync/sync", () => ({
  pull: (...args: unknown[]) => pull(...args),
  push: (...args: unknown[]) => push(...args),
}));
vi.mock("@/api/generated/metadata/metadata", () => ({
  getReleases: (...args: unknown[]) => getReleases(...args),
}));

/**
 * The transport is where a server record stops being optional-everything and becomes a
 * domain record — so this is the only place that can drop a malformed one. The engine
 * behind it takes what it is given, and its own behaviour is tested in the shared package.
 */
describe("the web sync transport", () => {
  const store = {} as LocalStore;

  beforeEach(() => {
    pull.mockReset();
    push.mockReset();
    getReleases.mockReset();
  });

  it("drops a record missing the fields the store cannot do without", async () => {
    pull.mockResolvedValue({ copies: [{ id: "broken" }], cursor: 3, hasMore: false });

    const page = await createSyncTransport(store).pull(0);

    expect(page.copies).toEqual([]);
    expect(page.cursor).toBe(3);
  });

  it("keeps a complete record, filling the optional fields with nulls", async () => {
    pull.mockResolvedValue({
      copies: [
        {
          id: "copy-1",
          releaseId: "rel-1",
          currency: "EUR",
          createdAt: 1000,
          fieldClocks: {},
        },
      ],
      cursor: 4,
      hasMore: false,
    });

    const page = await createSyncTransport(store).pull(0);

    expect(page.copies).toHaveLength(1);
    expect(page.copies[0]?.rating).toBeNull();
    expect(page.copies[0]?.deletedAt).toBeNull();
  });

  /**
   * The pressing a wish was made from, across the seam in both directions.
   *
   * Worth a test of its own because the DTO's fields are all optional: a mapping that
   * forgot this one would type-check perfectly and simply never send it, and the entry
   * would go back to wearing whichever pressing the mirror ranks first on every other
   * device — the exact bug the field exists to fix.
   */
  it("carries the pressing a wish was made from, both ways", async () => {
    push.mockResolvedValue({ copies: [], wishes: [], photos: [], cursor: 9 });
    const wish = {
      id: "wish-1",
      albumId: "musicbrainz:a1",
      releaseId: "discogs:r1",
      title: "Konstrukt 5",
      artistName: "Buntspecht",
      year: 2025,
      desiredFormat: "VINYL",
      note: null,
      sortIndex: null,
      createdAt: 1000,
      deletedAt: null,
      fieldClocks: {},
    } as unknown as Parameters<ReturnType<typeof createSyncTransport>["push"]>[1][number];

    await createSyncTransport(store).push([], [wish], []);

    expect(push.mock.calls[0]?.[0].wishes[0].releaseId).toBe("discogs:r1");

    pull.mockResolvedValue({
      wishes: [
        {
          id: "wish-1",
          albumId: "musicbrainz:a1",
          releaseId: "discogs:r1",
          title: "Konstrukt 5",
          artistName: "Buntspecht",
          createdAt: 1000,
          fieldClocks: {},
        },
      ],
      cursor: 5,
      hasMore: false,
    });

    const page = await createSyncTransport(store).pull(0);

    expect(page.wishes[0]?.releaseId).toBe("discogs:r1");
  });

  it("reads an entry from a server too old to know about pressings as having none", async () => {
    pull.mockResolvedValue({
      wishes: [
        {
          id: "wish-1",
          albumId: "musicbrainz:a1",
          title: "Konstrukt 5",
          artistName: "Buntspecht",
          createdAt: 1000,
          fieldClocks: {},
        },
      ],
      cursor: 5,
      hasMore: false,
    });

    const page = await createSyncTransport(store).pull(0);

    // Null, not undefined: a field absent from a record reads as one nobody ever set.
    expect(page.wishes[0]?.releaseId).toBeNull();
  });

  it("keeps the cursor it was given when the server sends none", async () => {
    pull.mockResolvedValue({ copies: [], hasMore: false });

    expect((await createSyncTransport(store).pull(7)).cursor).toBe(7);
  });

  it("asks the mirror for the releases the engine is missing, dropping unusable rows", async () => {
    getReleases.mockResolvedValue([
      { id: "rel-1", albumId: "group-1", title: "Illmatic", artistName: "Nas", year: 1994 },
      { id: "rel-broken" },
    ]);

    const releases = await createSyncTransport(store).fetchReleases(["rel-1", "rel-broken"]);

    expect(getReleases).toHaveBeenCalledWith({ releaseId: ["rel-1", "rel-broken"] });
    expect(releases).toHaveLength(1);
    expect(releases[0]?.title).toBe("Illmatic");
  });

  it("pages a collection larger than the server's cap", async () => {
    getReleases.mockResolvedValue([]);
    const ids = Array.from({ length: 150 }, (_, index) => `rel-${index}`);

    await createSyncTransport(store).fetchReleases(ids);

    expect(getReleases).toHaveBeenCalledTimes(2);
    expect(getReleases.mock.calls[1]?.[0]).toEqual({ releaseId: ids.slice(100) });
  });
});
