import type { LocalStore, Release, WishlistItem } from "@janne6565/music-collector-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupAlbumCovers = vi.hoisted(() =>
  vi.fn(async () => new Map<string, string | null>([["musicbrainz:a1", "https://covers/album.jpg"]])),
);

vi.mock("@/api/releases", async (original) => ({
  ...(await original<typeof import("@/api/releases")>()),
  searchReleases: vi.fn(async () => []),
  lookupAlbumCovers,
}));

const store = {
  listWishlist: async () => [],
  putWishlistItem: async () => {},
  readSetting: async () => undefined,
  writeSetting: async () => {},
} as unknown as LocalStore;

vi.mock("@/local/StoreProvider", () => ({
  useStore: () => ({ store, clock: { next: () => ({ wall: 1, counter: 0, node: "test" }) } }),
}));

const { useWishDialogLogic } = await import("@/features/wishlist/useWishDialogLogic");

function harness(existing: WishlistItem | null, seed: Release | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderHook(() => useWishDialogLogic(existing, vi.fn(), seed), {
    wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
  });
}

const RELEASE = {
  id: "musicbrainz:r1",
  albumId: "musicbrainz:a1",
  title: "Bitches Brew",
  artistName: "Miles Davis",
  year: 1970,
  format: "VINYL",
  label: "Columbia",
  catalogNumber: null,
  country: null,
  barcode: null,
  releaseDate: null,
  trackCount: null,
  discCount: null,
  coverArtUrl: "https://covers/pressing.jpg",
  coverTheme: null,
  cachedAt: 0,
} as Release;

const ENTRY = {
  id: "wish-1",
  albumId: "musicbrainz:a1",
  title: "Bitches Brew",
  artistName: "Miles Davis",
  year: 1970,
  desiredFormat: "VINYL",
  note: null,
  sortIndex: null,
  createdAt: 0,
  deletedAt: null,
  fieldClocks: {},
} as unknown as WishlistItem;

describe("useWishDialogLogic cover art", () => {
  beforeEach(() => {
    lookupAlbumCovers.mockClear();
  });

  it("keeps the cover of the pressing that was picked", async () => {
    const { result } = harness(null);

    act(() => result.current.pick(RELEASE));

    expect(result.current.subjectCoverArtUrl).toBe("https://covers/pressing.jpg");
    // The row that was just clicked was already showing it; asking again would blank the
    // tile to arrive at the same picture.
    expect(lookupAlbumCovers).not.toHaveBeenCalled();
  });

  it("resolves the album's cover for an entry reopened to edit", async () => {
    const { result } = harness(ENTRY);

    await waitFor(() => expect(result.current.subjectCoverArtUrl).toBe("https://covers/album.jpg"));
    expect(lookupAlbumCovers).toHaveBeenCalledWith(["musicbrainz:a1"]);
  });

  it("asks nothing for a record no catalogue has", async () => {
    const { result } = harness(null);

    act(() => result.current.setTyped({ title: "Chapters Left Unread" }));
    act(() => result.current.confirmManual());

    expect(result.current.subject?.albumId.startsWith("local:")).toBe(true);
    expect(result.current.subjectCoverArtUrl).toBeNull();
    expect(lookupAlbumCovers).not.toHaveBeenCalled();
  });
});
