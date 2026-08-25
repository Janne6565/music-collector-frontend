import type { LocalStore, Photo, WishlistItem } from "@janne6565/music-collector-shared";
import { createPhoto, createWishlistItem } from "@janne6565/music-collector-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/releases", async (original) => ({
  ...(await original<typeof import("@/api/releases")>()),
  lookupAlbumCovers: vi.fn(async () => new Map<string, string | null>()),
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
