import "fake-indexeddb/auto";
import { DexieLocalStore } from "@/local/dexieStore";
import type { Hlc } from "@janne6565/music-collector-shared";
import type { Release } from "@janne6565/music-collector-shared";
import { createCopy, createPhoto, hlcInitial, hlcTick } from "@janne6565/music-collector-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import Dexie from "dexie";
import { createElement } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let store: DexieLocalStore;

const clock = (() => {
  let current = hlcInitial("test-device");
  let wall = 1000;
  return {
    next(): Hlc {
      wall += 1;
      current = hlcTick(current, wall);
      return current;
    },
  };
})();

vi.mock("@/local/StoreProvider", () => ({
  useStore: () => ({ store, clock }),
}));

const { usePhotoStripLogic } = await import("@/features/photos/usePhotoStripLogic");

beforeAll(() => {
  // jsdom has no blob URLs, and the hook makes one per photo to hand to an <img>.
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});

function harness(copyId = "copy-1") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderHook(() => usePhotoStripLogic(copyId), {
    wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
  });
}

const release: Release = {
  id: "musicbrainz:r-1",
  albumId: "musicbrainz:a-1",
  title: "Bitches Brew",
  artistName: "Miles Davis",
  year: 1970,
  format: "VINYL",
  label: null,
  catalogNumber: null,
  country: null,
  barcode: null,
  releaseDate: null,
  trackCount: null,
  discCount: null,
  coverArtUrl: "https://example.test/cover.jpg",
  coverTheme: null,
  cachedAt: 0,
};

/** The ids of this copy's photos, in the order the rest of the app reads them. */
async function order(copyId = "copy-1") {
  return (await store.listPhotos(copyId)).map((photo) => photo.id);
}

describe("usePhotoStripLogic", () => {
  beforeEach(async () => {
    await Dexie.delete("music-collector");
    store = new DexieLocalStore();
    await store.open();
    await store.cacheReleases([release]);
    await store.putCopy(
      createCopy(
        release,
        {
          condition: null,
          sleeveCondition: null,
          preferCatalogArt: false,
          pricePaidCents: null,
          currency: "EUR",
          purchasedOn: null,
          purchasedAt: null,
          notes: null,
          rating: null,
        },
        clock,
        1000,
        "copy-1",
      ),
    );

    for (const [index, id] of ["p-a", "p-b", "p-c"].entries()) {
      await store.putPhoto(
        createPhoto(
          { copyId: "copy-1", contentType: "image/jpeg", byteSize: 10, sortIndex: index },
          clock,
          1000,
          id,
        ),
      );
    }
  });

  it("puts a starred photo at the front and closes the gap behind it", async () => {
    // Order is the preview: starring has to be a move, or the picture the library grid
    // shows and the picture marked in the editor would be two different answers.
    const { result } = harness();
    await waitFor(() => expect(result.current.tiles).toHaveLength(3));

    const third = result.current.tiles[2];
    if (third === undefined) throw new Error("expected three tiles");
    result.current.setPreview({ kind: "PHOTO", id: third.photo.id });

    await waitFor(async () => expect(await order()).toEqual(["p-c", "p-a", "p-b"]));
  });

  it("renumbers densely, so a move never leaves two photos on the same index", async () => {
    // Gaps and ties in sortIndex survive a merge, and ties are resolved by whatever order
    // the store happens to return — which is not an order anybody chose.
    const { result } = harness();
    await waitFor(() => expect(result.current.tiles).toHaveLength(3));

    result.current.moveTo("p-a", 2);
    await waitFor(async () => expect(await order()).toEqual(["p-b", "p-c", "p-a"]));

    const indexes = (await store.listPhotos("copy-1")).map((photo) => photo.sortIndex);
    expect(indexes).toEqual([0, 1, 2]);
  });

  it("leaves the photos a move did not touch unstamped", async () => {
    // A restamped photo starts winning merges against another device's edit to it, so a
    // move has to write only the photos whose index actually moved. Swapping the first two
    // leaves the third exactly where it was.
    const stamped = async (id: string) =>
      (await store.listPhotos("copy-1")).find((photo) => photo.id === id)?.fieldClocks.sortIndex;
    const before = await stamped("p-c");
    const { result } = harness();
    await waitFor(() => expect(result.current.tiles).toHaveLength(3));

    result.current.moveTo("p-a", 1);

    await waitFor(async () => expect(await order()).toEqual(["p-b", "p-a", "p-c"]));
    expect(await stamped("p-c")).toBe(before);
    expect(await stamped("p-a")).not.toBe(undefined);
    expect(await stamped("p-b")).not.toBe(before);
  });

  it("stars the catalogue's artwork without disturbing the photo order", async () => {
    // The catalogue cover has no place in the photo list to be moved to, so this is the
    // one preview choice that is a flag rather than a move. It must not quietly reorder
    // the photos on its way past them.
    const { result } = harness();
    await waitFor(() => expect(result.current.tiles).toHaveLength(3));

    result.current.setPreview({ kind: "CATALOG" });

    await waitFor(() => expect(result.current.preferCatalogArt).toBe(true));
    // Null means "fall through to the release's own cover art" — see copyPreviewSrc.
    expect(result.current.previewSrc).toBeNull();
    expect(await order()).toEqual(["p-a", "p-b", "p-c"]);
  });

  it("starring a photo takes the copy back off the catalogue", async () => {
    // Both halves of one answer: a copy that prefers the catalogue while a photo sits at
    // the front of its list is a state the two gestures drift into, not one anyone chose.
    const { result } = harness();
    await waitFor(() => expect(result.current.tiles).toHaveLength(3));

    result.current.setPreview({ kind: "CATALOG" });
    await waitFor(() => expect(result.current.preferCatalogArt).toBe(true));

    result.current.setPreview({ kind: "PHOTO", id: "p-c" });

    await waitFor(() => expect(result.current.preferCatalogArt).toBe(false));
    expect(await order()).toEqual(["p-c", "p-a", "p-b"]);
  });
});
