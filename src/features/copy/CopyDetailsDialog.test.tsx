import "fake-indexeddb/auto";
import { CopyDetailsDialog } from "@/features/copy/CopyDetailsDialog";
import { useDetailLogic } from "@/features/detail/useDetailLogic";
import { usePhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { DexieLocalStore } from "@/local/dexieStore";
import { store as reduxStore } from "@/store";
import type { Hlc, Release } from "@janne6565/music-collector-shared";
import { createCopy, createPhoto, hlcInitial, hlcTick } from "@janne6565/music-collector-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import Dexie from "dexie";
import { Provider } from "react-redux";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n/config";

let local: DexieLocalStore;

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
  useStore: () => ({ store: local, clock }),
}));

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
  coverArtUrl: "https://covers.example/r-1.jpg",
  coverTheme: null,
  cachedAt: 0,
} as Release;

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
  // jsdom implements neither, and <dialog> is how every sheet in this app is drawn.
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

beforeEach(async () => {
  await Dexie.delete("music-collector");
  local = new DexieLocalStore();
  await local.open();
  await local.cacheReleases([release]);
  await local.putCopy(
    createCopy(
      release,
      {
        condition: "VG_PLUS",
        sleeveCondition: "NM",
        catalogArt: "AUTO",
        pricePaidCents: 2800,
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
  await local.putPhotoBytes("p-a", new ArrayBuffer(8), "image/jpeg");
  await local.putPhoto(
    createPhoto(
      { copyId: "copy-1", contentType: "image/jpeg", byteSize: 8, sortIndex: 0 },
      clock,
      1000,
      "p-a",
    ),
  );
});

function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <Provider store={reduxStore}>
      <QueryClientProvider client={client}>
        <CopyDetailsDialog copyId="copy-1" mode="EDIT" onClose={() => {}} />
      </QueryClientProvider>
    </Provider>,
  );
}

describe("CopyDetailsDialog", () => {
  it("opens on a stored copy without throwing", async () => {
    open();
    await waitFor(() => expect(screen.getByText("Bitches Brew")).toBeDefined());
  });

  it("opens on a copy stored before catalogArt existed", async () => {
    // Every browser that has used this app has rows written before the field, and a
    // local-first app never gets to migrate them behind the user's back on deploy.
    const stored = await local.getCopy("copy-1");
    if (stored === undefined) throw new Error("expected the copy");
    const { catalogArt, ...legacy } = stored;
    await local.putCopy(legacy as typeof stored);

    open();
    await waitFor(() => expect(screen.getByText("Bitches Brew")).toBeDefined());
  });

  it("does not write to the query key the detail page reads", async () => {
    // Two queries under one key are one cache entry with one queryFn -- the last observer
    // to mount decides it. Sharing `["copy", id]` let this hook answer the detail page's
    // query with a bare Copy, and the page crashed reading fields it no longer had. The
    // editor mounts a second strip over a page that already has one, which is why the
    // crash landed on the Edit button.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={reduxStore}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </Provider>
    );

    const strip = renderHook(() => usePhotoStripLogic("copy-1"), { wrapper });
    await waitFor(() => expect(strip.result.current.catalogArt).toBe("AUTO"));

    expect(client.getQueryData(["copy", "copy-1"])).toBeUndefined();
  });

  it("leaves the detail page its whole record while the editor is open", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={reduxStore}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </Provider>
    );

    const detail = renderHook(() => useDetailLogic("copy-1"), { wrapper });
    await waitFor(() => expect(detail.result.current.data).not.toBe(undefined));

    // The page already has one of these; the editor opening is the second.
    renderHook(() => usePhotoStripLogic("copy-1"), { wrapper });
    renderHook(() => usePhotoStripLogic("copy-1"), { wrapper });
    await client.invalidateQueries({ queryKey: ["copy", "copy-1"] });

    await waitFor(() => expect(detail.result.current.data?.otherCopies).toBeInstanceOf(Array));
  });
});
