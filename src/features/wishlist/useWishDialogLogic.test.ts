import type { LocalStore, Photo, Release, WishlistItem } from "@janne6565/music-collector-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupAlbumCovers = vi.hoisted(() =>
  vi.fn(
    async () => new Map<string, string | null>([["musicbrainz:a1", "https://covers/album.jpg"]]),
  ),
);

vi.mock("@/api/releases", async (original) => ({
  ...(await original<typeof import("@/api/releases")>()),
  searchReleases: vi.fn(async () => []),
  lookupAlbumCovers,
}));

const wishes: WishlistItem[] = [];
const photos: Photo[] = [];
const bytes = new Map<string, string>();

const store = {
  listWishlist: async () => wishes,
  putWishlistItem: async (item: WishlistItem) => {
    wishes.push(item);
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
    photos.push(photo);
  },
  putPhotoBytes: async (id: string, _buffer: ArrayBuffer, contentType: string) => {
    bytes.set(id, contentType);
  },
  getPhotoBytes: async () => undefined,
  readSetting: async () => undefined,
  writeSetting: async () => {},
} as unknown as LocalStore;

vi.mock("@/local/StoreProvider", () => ({
  useStore: () => ({ store, clock: { next: () => ({ wall: 1, counter: 0, node: "test" }) } }),
}));

const { useWishDialogLogic } = await import("@/features/wishlist/useWishDialogLogic");

function harness(
  existing: WishlistItem | null,
  seed: Release | null = null,
  prime?: (client: QueryClient) => void,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  prime?.(client);
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
    // The store rides along so an imported archive can fill a cover this deployment's
    // mirror cannot resolve; which ids were asked for is what this test is about.
    expect(lookupAlbumCovers).toHaveBeenCalledWith(["musicbrainz:a1"], expect.anything());
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

describe("a picture for a record no catalogue has", () => {
  beforeEach(() => {
    wishes.length = 0;
    photos.length = 0;
    bytes.clear();
    URL.createObjectURL = vi.fn(() => "blob:chosen");
    URL.revokeObjectURL = vi.fn();
  });

  function image(type = "image/png", size = 1024): File {
    const file = new File([new Uint8Array(8)], "cover.png", { type });
    Object.defineProperty(file, "size", { value: size });
    // jsdom's File implements neither, and both are how the bytes reach the store.
    Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
    return file;
  }

  function typedIn() {
    const harnessed = harness(null);
    act(() => harnessed.result.current.setTyped({ title: "Chapters Left Unread" }));
    act(() => harnessed.result.current.confirmManual());
    return harnessed;
  }

  it("offers the upload on every entry, catalogued or not", () => {
    // It used to be hand-entered records only. The catalogue's answer is one pressing's
    // sleeve among several and often not the one being hunted for, so the precedence is
    // stated — your picture first — rather than the choice being withheld.
    const matched = harness(null);
    act(() => matched.result.current.pick(RELEASE));
    expect(matched.result.current.canUploadImage).toBe(true);

    expect(typedIn().result.current.canUploadImage).toBe(true);
  });

  it("keeps the pressing that was picked, so the entry wears that sleeve", () => {
    const { result } = harness(null);

    act(() => result.current.pick(RELEASE));

    expect(result.current.subject?.releaseId).toBe(RELEASE.id);
    // The row that was clicked was already showing this cover; nothing re-asks for it.
    expect(result.current.subjectCoverArtUrl).toBe(RELEASE.coverArtUrl);
  });

  it("shows the chosen picture straight away, as the device's own rather than the catalogue's", () => {
    const { result } = typedIn();

    act(() => result.current.chooseImage(image()));

    expect(result.current.subjectPictureSrc).toBe("blob:chosen");
    // Not folded into the catalogue's answer: a file already on the device must not be
    // drawn with the shimmer that says "this is on its way".
    expect(result.current.subjectCoverArtUrl).toBeNull();
    expect(result.current.imageRejected).toBeNull();
  });

  it("refuses what the server would refuse, before anything is written", () => {
    const { result } = typedIn();

    act(() => result.current.chooseImage(image("application/pdf")));
    expect(result.current.imageRejected).toBe("type");

    act(() => result.current.chooseImage(image("image/png", 16 * 1024 * 1024)));
    expect(result.current.imageRejected).toBe("size");

    expect(result.current.subjectPictureSrc).toBeNull();
  });

  it("writes the picture against the wish, and only once the entry is saved", async () => {
    const { result } = typedIn();
    act(() => result.current.chooseImage(image()));

    // Nothing yet: an image on an entry somebody abandons is bytes nothing references.
    expect(photos).toHaveLength(0);

    act(() => result.current.save());
    await waitFor(() => expect(photos).toHaveLength(1));

    expect(photos[0].wishId).toBe(wishes[0].id);
    expect(photos[0].copyId).toBeNull();
    // Bytes first, so the record never points at an image that is not there.
    expect(bytes.get(photos[0].id)).toBe("image/png");
  });

  it("replaces a picture by tombstoning the old one, never by overwriting it", async () => {
    const entry = { ...ENTRY, albumId: "local:abc" } as WishlistItem;
    const first = harness(entry);
    act(() => first.result.current.chooseImage(image()));
    act(() => first.result.current.save());
    await waitFor(() => expect(photos).toHaveLength(1));

    const second = harness(entry);
    act(() => second.result.current.chooseImage(image("image/jpeg")));
    act(() => second.result.current.save());
    await waitFor(() => expect(photos).toHaveLength(3));

    // A photo id points at one image forever, so the new one is a new row and the old one
    // is put down rather than edited.
    expect(photos[1].wishId).toBe(entry.id);
    expect(photos[2].id).toBe(photos[0].id);
    expect(photos[2].deletedAt).not.toBeNull();
  });

  it("does not mistake the list's cache for a picture of its own", () => {
    // The list's hook caches a Map of many under ["wish-photos", <ids>], and its key for
    // an empty set is the same shape this sheet would use for an entry with no id. An
    // empty Map is an object, so reading it back here once made the sheet believe it had
    // a picture: no image drawn, and the button offering to *replace* nothing.
    const { result } = harness(null, null, (client) =>
      client.setQueryData(["wish-photos", ""], new Map()),
    );

    act(() => result.current.setTyped({ title: "Chapters Left Unread" }));
    act(() => result.current.confirmManual());

    expect(result.current.subjectPictureSrc).toBeNull();
  });
});
