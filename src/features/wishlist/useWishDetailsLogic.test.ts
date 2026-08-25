import type {
  Copy,
  LocalStore,
  Photo,
  Release,
  WishlistItem,
} from "@janne6565/music-collector-shared";
import { createWishlistItem } from "@janne6565/music-collector-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupPressings = vi.hoisted(() => vi.fn(async () => [] as Release[]));
const lookupAlbumCovers = vi.hoisted(() => vi.fn(async () => new Map<string, string | null>()));

vi.mock("@/api/releases", async (original) => ({
  ...(await original<typeof import("@/api/releases")>()),
  lookupPressings,
  lookupAlbumCovers,
}));

const offer = vi.hoisted(() => vi.fn());
vi.mock("@/features/detail/UndoDelete", () => ({
  useUndo: () => ({ offer, restored: null }),
}));

let wishes: WishlistItem[] = [];
let photos: Photo[] = [];
let copies: Copy[] = [];
let releases = new Map<string, Release>();

const store = {
  listWishlist: async () => wishes.filter((wish) => wish.deletedAt === null),
  putWishlistItem: async (item: WishlistItem) => {
    wishes = wishes.map((wish) => (wish.id === item.id ? item : wish));
  },
  listWishPhotos: async () => new Map(photos.map((photo) => [photo.wishId as string, photo])),
  putPhoto: async () => {},
  getPhotoBytes: async () => undefined,
  listCopies: async () => copies,
  getReleases: async () => releases,
  listCopiesInReleaseGroup: async () => copies,
  readSetting: async () => undefined,
  writeSetting: async () => {},
} as unknown as LocalStore;

vi.mock("@/local/StoreProvider", () => ({
  useStore: () => ({ store, clock: { next: () => ({ wall: 1, counter: 0, node: "test" }) } }),
}));

const { useWishDetailsLogic } = await import("@/features/wishlist/useWishDetailsLogic");

const clock = { next: () => ({ wall: 1, counter: 0, node: "test" }) };

function wish(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    ...createWishlistItem(
      {
        albumId: "musicbrainz:a1",
        title: "Ege Bamyasi",
        artistName: "Can",
        year: 1972,
        desiredFormat: "VINYL",
        note: "Original Spoon press",
      },
      clock,
      1000,
      "wish-1",
    ),
    ...overrides,
  };
}

function harness(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return {
    client,
    ...renderHook(() => useWishDetailsLogic("wish-1", onClose), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
    }),
  };
}

beforeEach(() => {
  wishes = [wish()];
  photos = [];
  copies = [];
  releases = new Map();
  lookupPressings.mockClear();
  lookupPressings.mockResolvedValue([]);
  offer.mockClear();
});

describe("editing in place", () => {
  it("writes a format the moment it is picked, with no Save", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    act(() => result.current.setFormat("CD"));

    await waitFor(() => expect(wishes[0].desiredFormat).toBe("CD"));
  });

  // Real timers throughout: testing-library's waitFor polls on them, so a fake clock and
  // an async assertion deadlock each other.
  it("waits for typing to stop before writing a note", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    act(() => result.current.setNote("Green label"));
    // Not yet: the keystroke is not the write.
    expect(wishes[0].note).toBe("Original Spoon press");

    await waitFor(() => expect(wishes[0].note).toBe("Green label"));
  });

  it("stores an emptied note as nothing, not as an empty string", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    act(() => result.current.setNote("   "));

    await waitFor(() => expect(wishes[0].note).toBeNull());
  });
});

describe("the optional pressings lookup", () => {
  it("asks for nothing until somebody asks", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    expect(result.current.pressingsState).toBe("IDLE");
    expect(lookupPressings).not.toHaveBeenCalled();

    act(() => result.current.lookUpPressings());

    await waitFor(() => expect(result.current.pressingsState).toBe("LOADED"));
    expect(lookupPressings).toHaveBeenCalledWith("musicbrainz:a1");
  });

  it("keeps its own failure to itself", async () => {
    lookupPressings.mockRejectedValue(new Error("502"));
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    act(() => result.current.lookUpPressings());

    await waitFor(() => expect(result.current.pressingsState).toBe("FAILED"));
    // Nothing else on the entry depends on it: the wish is local and still whole.
    expect(result.current.entry?.title).toBe("Ege Bamyasi");
  });

  it("has nothing to look up for a record no catalogue holds", async () => {
    wishes = [wish({ albumId: "local:abc" })];
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    expect(result.current.pressingsState).toBe("UNAVAILABLE");
    expect(result.current.manual).toBe(true);
  });
});

describe("position", () => {
  it("says nothing about an entry nobody has placed by hand", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    // sortIndex null is "never placed", which is not position 1.
    expect(result.current.position).toBeNull();
  });

  it("counts from one once the list has been dragged", async () => {
    wishes = [
      wish({ id: "wish-0", sortIndex: 0 }),
      wish({ sortIndex: 1 }),
      wish({ id: "wish-2", sortIndex: 2 }),
    ];
    const { result } = harness();

    await waitFor(() => expect(result.current.position).toBe(2));
  });
});

describe("removal", () => {
  it("asks in the footer before it removes anything", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    act(() => result.current.askToRemove());
    expect(result.current.confirmingRemoval).toBe(true);
    expect(wishes[0].deletedAt).toBeNull();

    act(() => result.current.cancelRemoval());
    expect(result.current.confirmingRemoval).toBe(false);
  });

  it("tombstones the entry, offers the undo, and closes", async () => {
    const onClose = vi.fn();
    const { result } = harness(onClose);
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    act(() => result.current.remove());

    await waitFor(() => expect(wishes[0].deletedAt).not.toBeNull());
    expect(offer).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "WISH", wishId: "wish-1", title: "Ege Bamyasi" }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe("when the entry leaves underneath the reader", () => {
  it("keeps drawing the album and says what happened", async () => {
    const { result, client } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    // Another device filed a copy; the sync tombstoned the wish and invalidated the list,
    // which is how this device ever hears about it.
    wishes = [{ ...wishes[0], deletedAt: 2000 }];
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["wishlist"] });
    });

    await waitFor(() => expect(result.current.satisfied).toBe(true));
    // The album stays: this is news, not a dialog falling over.
    expect(result.current.entry?.title).toBe("Ege Bamyasi");
  });

  it("does not call our own removal news", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.entry).not.toBeNull());

    act(() => result.current.remove());

    await waitFor(() => expect(wishes[0].deletedAt).not.toBeNull());
    expect(result.current.satisfied).toBe(false);
  });
});
