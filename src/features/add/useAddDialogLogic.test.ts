import { searchReleases } from "@/api/releases";
import type { LocalStore, Release } from "@janne6565/rekordo-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/releases", async (original) => ({
  ...(await original<typeof import("@/api/releases")>()),
  searchReleases: vi.fn(async () => []),
  lookupByBarcode: vi.fn(async () => []),
}));

const settings = new Map<string, string>();

const copies: unknown[] = [];
/** Adding a copy consults the wishlist now (screen 16e), so the fake has to hold one. */
let wishes: unknown[] = [];

const store = {
  listCopies: async () => [],
  cacheReleases: async () => {},
  putCopy: async (copy: unknown) => {
    copies.push(copy);
  },
  listWishlist: async () => wishes,
  putWishlistItem: async (item: { id: string }) => {
    wishes = wishes.map((wish) => ((wish as { id: string }).id === item.id ? item : wish));
  },
  readSetting: async (key: string) => settings.get(key),
  writeSetting: async (key: string, value: string) => {
    settings.set(key, value);
  },
} as unknown as LocalStore;

vi.mock("@/local/StoreProvider", () => ({
  useStore: () => ({ store, clock: { next: () => ({ wall: 1, counter: 0, node: "test" }) } }),
}));

// Imported after the mocks above are registered, so the hook picks them up.
const { useAddDialogLogic } = await import("@/features/add/useAddDialogLogic");

function harness(onAdded: (copyId: string) => void = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderHook(() => useAddDialogLogic(vi.fn(), onAdded), {
    wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
  });
}

const RELEASE: Release = {
  id: "musicbrainz:1",
  albumId: "musicbrainz:a1",
  title: "Bitches Brew",
  artistName: "Miles Davis",
  year: 1970,
  format: "VINYL",
  label: "Columbia",
  catalogNumber: "GP 26",
  country: "US",
  barcode: null,
  releaseDate: "1970-03-30",
  trackCount: 6,
  discCount: 2,
  coverArtUrl: null,
  coverTheme: null,
  cachedAt: 0,
};

/**
 * Lets the debounce fire and the query that follows it settle.
 *
 * Twice: the first pass fires the timer, and the request it schedules only goes out on
 * the re-render that `act` flushes on its way out.
 */
async function settle() {
  for (let pass = 0; pass < 2; pass += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
  }
}

/** Types a term the way a person does, one keystroke at a time. */
async function type(result: { current: ReturnType<typeof useAddDialogLogic> }, term: string) {
  for (let index = 1; index <= term.length; index += 1) {
    const soFar = term.slice(0, index);
    await act(async () => {
      result.current.setTerm(soFar);
      await vi.advanceTimersByTimeAsync(40);
    });
  }
}

describe("useAddDialogLogic", () => {
  beforeEach(() => {
    settings.clear();
    copies.length = 0;
    wishes = [];
    vi.mocked(searchReleases).mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("searches without being asked, once the field stands still", async () => {
    const { result } = harness();

    await type(result, "brian eno");
    expect(searchReleases).not.toHaveBeenCalled();

    await settle();

    // Nine keystrokes, one request — the whole point of the debounce.
    expect(searchReleases).toHaveBeenCalledTimes(1);
    expect(searchReleases).toHaveBeenCalledWith("brian eno");
  });

  it("shows the wait from the keystroke, not from the request", async () => {
    // The skeletons stand in for the whole wait. If `searching` only turned on when the
    // request went out, the debounce would read as a list that had stopped responding.
    const { result } = harness();

    await type(result, "eno");

    expect(result.current.searching).toBe(true);
    expect(result.current.hasSearched).toBe(true);
  });

  it("does not send a term too short to mean anything", async () => {
    const { result } = harness();

    await type(result, "e");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(searchReleases).not.toHaveBeenCalled();
    expect(result.current.searching).toBe(false);
  });

  it("only sends a barcode once it is complete", async () => {
    const { result } = harness();
    await act(async () => result.current.setTab("BARCODE"));

    await type(result, "5099");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(searchReleases).not.toHaveBeenCalled();
  });

  it("runs straight away on Enter", async () => {
    const { result } = harness();

    await act(async () => result.current.setTerm("brian eno"));
    await act(async () => result.current.submit());

    expect(searchReleases).toHaveBeenCalledTimes(1);
  });

  it("drops the results when the field is emptied", async () => {
    const { result } = harness();

    await type(result, "brian eno");
    await settle();
    expect(result.current.searching).toBe(false);

    await act(async () => result.current.setTerm(""));

    // Back to the recent searches, rather than the last results left stranded under a box
    // that no longer says what produced them.
    expect(result.current.hasSearched).toBe(false);
  });

  it("hands every add to the details step, however it was added", async () => {
    // Screen 8d is step two of adding, not a branch of it: a copy written and then left
    // blank is the failure this exists to prevent, so the row's Add has to reach the step
    // just as the footer's primary does.
    const onAdded = vi.fn();
    const { result } = harness(onAdded);

    await act(async () => result.current.addRelease(RELEASE));
    await settle();

    expect(copies).toHaveLength(1);
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(onAdded).toHaveBeenCalledWith((copies[0] as { id: string }).id);
  });

  it("takes the record off the wishlist when the copy that satisfies it is filed", async () => {
    // Screen 16e — the wishlist's quietest exit. Wired here rather than on the wishlist
    // page because the add is where it happens, whichever way in was used.
    wishes = [
      {
        id: "w1",
        albumId: RELEASE.albumId,
        title: RELEASE.title,
        artistName: RELEASE.artistName,
        year: RELEASE.year,
        desiredFormat: "VINYL",
        note: null,
        sortIndex: null,
        createdAt: 1,
        deletedAt: null,
        fieldClocks: {},
      },
    ];
    const { result } = harness();

    await act(async () => result.current.addRelease(RELEASE));
    await settle();

    expect((wishes[0] as { deletedAt: number | null }).deletedAt).not.toBeNull();
  });

  it("leaves an entry standing when the copy is not the format it asked for", async () => {
    wishes = [
      {
        id: "w1",
        albumId: RELEASE.albumId,
        title: RELEASE.title,
        artistName: RELEASE.artistName,
        year: RELEASE.year,
        // The release is vinyl; wanting the tape is not satisfied by buying the record.
        desiredFormat: "CASSETTE",
        note: null,
        sortIndex: null,
        createdAt: 1,
        deletedAt: null,
        fieldClocks: {},
      },
    ];
    const { result } = harness();

    await act(async () => result.current.addRelease(RELEASE));
    await settle();

    expect((wishes[0] as { deletedAt: number | null }).deletedAt).toBeNull();
  });

  it("drops the picked row once it has been added", async () => {
    // Otherwise the footer stays armed on a release that is already in the library, and
    // the next press meant for the sheet files a second copy of it.
    const { result } = harness();

    await act(async () => result.current.select(RELEASE));
    expect(result.current.selected).not.toBeNull();

    await act(async () => result.current.addRelease(RELEASE));
    await settle();

    expect(result.current.selected).toBeNull();
  });

  it("remembers a search somebody pressed for, not every prefix on the way", async () => {
    const { result } = harness();

    await type(result, "brian eno");
    await settle();

    expect(settings.get("recentSearches")).toBeUndefined();

    await act(async () => result.current.submit());
    await settle();
    expect(settings.get("recentSearches")).toBe('["brian eno"]');
  });
});
