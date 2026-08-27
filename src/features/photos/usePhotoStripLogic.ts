import type { ShownImage } from "@/features/photos/shownImage";
import { useStore } from "@/local/StoreProvider";
import type { CatalogArtChoice, Photo } from "@janne6565/rekordo-shared";
import {
  applyCopyPatch,
  copyPreviewSrc,
  createPhoto,
  reorderPhoto,
  tombstonePhoto,
} from "@janne6565/rekordo-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/** What a phone camera or a file picker actually produces, matching the server's allowlist. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export interface PhotoTile {
  readonly photo: Photo;
  /** An object URL for the local bytes, or null while they are still being fetched. */
  readonly src: string | null;
}

export type PhotoStripLogic = ReturnType<typeof usePhotoStripLogic>;

export function usePhotoStripLogic(copyId: string) {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();
  const [rejected, setRejected] = useState<"type" | "size" | null>(null);

  const photos = useQuery({
    queryKey: ["photos", copyId],
    queryFn: () => store.listPhotos(copyId),
  });

  /**
   * The copy itself, for the one preview choice its photo order cannot express.
   *
   * Its own key, not the `["copy", id]` the detail page reads. Two queries under one key
   * are one cache entry with one queryFn — the last observer to mount decides it — so
   * sharing the key let this hook hand the page a bare Copy where it expected the whole
   * `DetailData`, and the page crashed on the fields that were suddenly missing.
   */
  const copy = useQuery({
    queryKey: ["copyCatalogArt", copyId],
    // Null rather than undefined: react-query rejects undefined as a query result.
    queryFn: async () => (await store.getCopy(copyId)) ?? null,
  });

  const [tiles, setTiles] = useState<PhotoTile[]>([]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];

    void (async () => {
      const built: PhotoTile[] = [];
      for (const photo of photos.data ?? []) {
        const bytes = await store.getPhotoBytes(photo.id);
        if (bytes === undefined) {
          built.push({ photo, src: null });
          continue;
        }
        const url = URL.createObjectURL(bytes);
        urls.push(url);
        built.push({ photo, src: url });
      }
      if (!cancelled) setTiles(built);
    })();

    return () => {
      cancelled = true;
      // Object URLs pin their blob in memory until revoked; leaking one per render would
      // hold every photo the user has ever looked at.
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [photos.data, store]);

  const add = useMutation({
    mutationFn: async (file: File) => {
      setRejected(null);
      if (!ACCEPTED.includes(file.type)) {
        setRejected("type");
        return;
      }
      const id = crypto.randomUUID();
      // Bytes first: a record whose image is missing would render as a permanent
      // placeholder, whereas bytes with no record are simply unreferenced.
      await store.putPhotoBytes(id, await file.arrayBuffer(), file.type);
      await store.putPhoto(
        createPhoto(
          {
            copyId,
            contentType: file.type,
            byteSize: file.size,
            sortIndex: photos.data?.length ?? 0,
          },
          clock,
          Date.now(),
          id,
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["photos", copyId] });
      await queryClient.invalidateQueries({ queryKey: ["cover-photos"] });
    },
  });

  /**
   * Putting one photo at a given place in the list, and renumbering the rest around it.
   *
   * Order *is* the preview: the first image is the one the library grid and the detail
   * hero show, which is why 12b draws starring and dragging as one gesture rather than two
   * — a star is a move to the front. Keeping it that way means the preview syncs on the
   * `sortIndex` every device already merges, instead of on a second field that could
   * disagree with the order it is drawn in.
   *
   * The whole list is renumbered rather than the moved photo alone: gaps and ties in
   * `sortIndex` survive a merge, and a list that renumbers itself densely on every move
   * cannot drift into an order nobody chose.
   */
  const move = useMutation({
    mutationFn: async ({ photoId, to }: { photoId: string; to: number }) => {
      const current = await store.listPhotos(copyId);
      const from = current.findIndex((photo) => photo.id === photoId);
      if (from === -1 || from === to) return;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (moved === undefined) return;
      next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
      for (const [index, photo] of next.entries()) {
        const renumbered = reorderPhoto(photo, index, clock);
        // Identity, not equality: reorderPhoto hands back the same object when the index
        // did not change, so an untouched photo is never restamped into winning a merge.
        if (renumbered !== photo) await store.putPhoto(renumbered);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["photos", copyId] });
      // The grid and the detail hero read the preview out of this list too.
      await queryClient.invalidateQueries({ queryKey: ["cover-photos"] });
    },
  });

  /**
   * Starring the catalogue, or starring away from it.
   *
   * Kept as one mutation with `move` rather than two independent writes, because they are
   * two halves of the same answer: a copy that prefers the catalogue while a photo sits at
   * the front of its list is not a state anyone chose, it is a state the two gestures drift
   * into. Every star writes both sides.
   */
  const chooseCatalogArt = useMutation({
    mutationFn: async (choice: CatalogArtChoice) => {
      const current = await store.getCopy(copyId);
      if (current === undefined) return;
      // applyCopyPatch restamps nothing when the value is unchanged, so starring the tile
      // that is already the preview does not start winning merges against real edits.
      await store.putCopy(applyCopyPatch(current, { catalogArt: choice }, clock));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copyCatalogArt", copyId] });
      // What the detail page and the shelf read, so the choice shows without a reload.
      await queryClient.invalidateQueries({ queryKey: ["copy", copyId] });
      await queryClient.invalidateQueries({ queryKey: ["copies"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (photo: Photo) => {
      await store.putPhoto(tombstonePhoto(photo, clock, Date.now()));
      await store.deletePhotoBytes(photo.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["photos", copyId] });
      await queryClient.invalidateQueries({ queryKey: ["cover-photos"] });
    },
  });

  /**
   * The first photo whose bytes are already on the device.
   *
   * First, because order is what the star sets (see `move`). "Already on the device"
   * because a copy pulled down from another account has its photo records before it has
   * their bytes, and a hero pointed at a blob that is not there yet shows nothing at all.
   */
  const firstSrc = tiles.find((tile) => tile.src !== null)?.src ?? null;
  const catalogArt: CatalogArtChoice = copy.data?.catalogArt ?? "AUTO";

  return {
    tiles,
    /** The image every other screen draws for this copy — null means the catalogue's own. */
    previewSrc: copyPreviewSrc({ catalogArt }, firstSrc),
    loading: photos.isLoading,
    accept: ACCEPTED.join(","),
    add: (file: File) => add.mutate(file),
    adding: add.isPending,
    rejected,
    remove: (photo: Photo) => remove.mutate(photo),
    removing: remove.isPending ? remove.variables?.id : undefined,
    /** False until the catalogue's own artwork has been starred for this copy. */
    catalogArt,
    /** Star — this image becomes the one every other screen shows for this copy. */
    setPreview: (shown: ShownImage) => {
      if (shown.kind === "CATALOG") {
        chooseCatalogArt.mutate("PREFERRED");
        return;
      }
      // Both halves: to the front of the list, and off the catalogue — see the note on
      // `chooseCatalogArt`. Starring a photo is not a reason to un-hide the artwork, so a
      // copy that has hidden it keeps that answer.
      move.mutate({ photoId: shown.id, to: 0 });
      if (catalogArt === "PREFERRED") chooseCatalogArt.mutate("AUTO");
    },
    /** Remove the release's artwork from this copy's images, and put it back. */
    hideCatalogArt: () => chooseCatalogArt.mutate("HIDDEN"),
    restoreCatalogArt: () => chooseCatalogArt.mutate("AUTO"),
    choosing: chooseCatalogArt.isPending,
    /** Drag — the same write, to wherever it was dropped. */
    moveTo: (photoId: string, index: number) => move.mutate({ photoId, to: index }),
    reordering: move.isPending || chooseCatalogArt.isPending,
  };
}
