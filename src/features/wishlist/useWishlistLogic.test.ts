import type { LocalStore, Photo, WishlistItem } from "@janne6565/rekordo-shared";
import { createPhoto, createWishlistItem } from "@janne6565/rekordo-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/releases", async (original) => ({
  ...(await original<typeof import("@/api/releases")>()),
  lookupAlbumCovers: vi.fn(async () => new Map<string, string | null>()),
  lookupPressingCovers: vi.fn(async () => new Map<string, string | null>()),
}));

let wishes: WishlistItem[] = [];
let photos: Photo[] = [];

const store = {
  listWishlist: async () => wishes.filter((wish) => wish.deletedAt === null),
  putWishlistItem: async (item: WishlistItem) => {
    wishes = wishes.map((wish) => (wish.id === item.id ? item : wish));
  },
  listWishPhotos: async (wishIds: readonly string[]) => {
    const found = new Map<string, Photo>();
    for (const photo of photos) {
      if (photo.wishId !== null && wishIds.includes(photo.wishId) && photo.deletedAt === null) {
        found.set(photo.wishId, photo);
      }
    }
    return found;
  },
  putPhoto: async (photo: Photo) => {
    photos = photos.map((held) => (held.id === photo.id ? photo : held));
  },
  getPhotoBytes: async () => undefined,
  readSetting: async () => undefined,
  writeSetting: async () => {},
} as unknown as LocalStore;

vi.mock("@/local/StoreProvider", () => ({
  useStore: () => ({ store, clock: { next: () => ({ wall: 1, counter: 0, node: "test" }) } }),
}));

const { useWishlistLogic } = await import("@/features/wishlist/useWishlistLogic");

const clock = { next: () => ({ wall: 1, counter: 0, node: "test" }) };

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderHook(() => useWishlistLogic(), {
    wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
  });
}

describe("removing a wish", () => {
  beforeEach(() => {
    wishes = [
      createWishlistItem(
        {
          albumId: "local:abc",
          releaseId: null,
          title: "Chapters Left Unread",
          artistName: "Nobody",
          year: null,
          desiredFormat: null,
          note: null,
        },
        clock,
        1000,
        "wish-1",
      ),
    ];
    photos = [
      createPhoto(
        { wishId: "wish-1", contentType: "image/png", byteSize: 8, sortIndex: 0 },
        clock,
        1000,
        "photo-1",
      ),
    ];
  });

  it("puts the entry's picture down with it", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.count).toBe(1));

    act(() => result.current.remove(wishes[0]));

    // A wish id is never reused, so a photo left behind is one nothing can ever reference
    // again — and the server only deletes the stored object when the record is put down.
    await waitFor(() => expect(photos[0].deletedAt).not.toBeNull());
    expect(wishes[0].deletedAt).not.toBeNull();
  });

  it("does not trip over an entry that never had one", async () => {
    photos = [];
    const { result } = harness();
    await waitFor(() => expect(result.current.count).toBe(1));

    act(() => result.current.remove(wishes[0]));

    await waitFor(() => expect(wishes[0].deletedAt).not.toBeNull());
  });
});

/**
 * Which sleeve a row draws.
 *
 * The album's answer is resolved from whichever pressing the mirror ranks first, which is
 * how an entry ended up wearing a different pressing's cover than the search row it was
 * made from. The pressing the entry remembers is asked about first, and the album is only
 * the fallback.
 */
describe("the cover a row shows", () => {
  const ALBUM = "https://covers/album.jpg";
  const PRESSING = "https://covers/pressing.jpg";

  beforeEach(async () => {
    photos = [];
    wishes = [
      createWishlistItem(
        {
          albumId: "musicbrainz:a1",
          releaseId: "discogs:r1",
          title: "Konstrukt 5",
          artistName: "Buntspecht",
          year: 2025,
          desiredFormat: "VINYL",
          note: null,
        },
        clock,
        1000,
        "wish-1",
      ),
    ];
    const releases = await import("@/api/releases");
    vi.mocked(releases.lookupAlbumCovers).mockResolvedValue(new Map([["musicbrainz:a1", ALBUM]]));
    vi.mocked(releases.lookupPressingCovers).mockResolvedValue(new Map([["discogs:r1", PRESSING]]));
  });

  it("prefers the pressing the entry was made from", async () => {
    const { result } = harness();

    await waitFor(() => expect(result.current.coverOf(wishes[0])).toBe(PRESSING));
  });

  it("falls back to the album when the mirror has never seen that pressing", async () => {
    const releases = await import("@/api/releases");
    vi.mocked(releases.lookupPressingCovers).mockResolvedValue(new Map());
    const { result } = harness();

    await waitFor(() => expect(result.current.coverOf(wishes[0])).toBe(ALBUM));
  });

  it("asks about an entry that remembers no pressing by album alone", async () => {
    const releases = await import("@/api/releases");
    vi.mocked(releases.lookupPressingCovers).mockClear();
    wishes = [{ ...wishes[0], releaseId: null }];
    const { result } = harness();

    await waitFor(() => expect(result.current.coverOf(wishes[0])).toBe(ALBUM));
    expect(vi.mocked(releases.lookupPressingCovers)).not.toHaveBeenCalled();
  });
});

/**
 * The box over the list.
 *
 * What it matches on is the shared package's decision and is tested there; what is tested
 * here is the part the page hangs on — that the count stays the whole list while the rows
 * narrow, and that "nothing matches" is a different state from "nothing on the list".
 */
describe("searching the list", () => {
  beforeEach(() => {
    photos = [];
    wishes = [
      createWishlistItem(
        {
          albumId: "local:a",
          releaseId: null,
          title: "Tago Mago",
          artistName: "Can",
          year: null,
          desiredFormat: null,
          note: "green label",
        },
        clock,
        1000,
        "wish-1",
      ),
      createWishlistItem(
        {
          albumId: "local:b",
          releaseId: null,
          title: "Selected Ambient Works",
          artistName: "Aphex Twin",
          year: null,
          desiredFormat: null,
          note: null,
        },
        clock,
        2000,
        "wish-2",
      ),
    ];
  });

  it("narrows the rows but not the count in the header", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    act(() => result.current.handleSearch("aphex"));

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].id).toBe("wish-2");
    // The header says how many records you are hunting, which a search does not change.
    expect(result.current.count).toBe(2);
    expect(result.current.filtering).toBe(true);
  });

  it("tells a term that names nothing apart from a wishlist with nothing on it", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    act(() => result.current.handleSearch("bowie"));

    await waitFor(() => expect(result.current.noMatches).toBe(true));
    expect(result.current.count).toBe(2);
  });

  it("is not filtering on whitespace alone", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    act(() => result.current.handleSearch("   "));

    await waitFor(() => expect(result.current.filtering).toBe(false));
    expect(result.current.items).toHaveLength(2);
  });
});
