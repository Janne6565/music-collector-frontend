import type { Photo } from "@/domain/types";
import { useStore } from "@/local/StoreProvider";
import { createPhoto, reorderPhoto, tombstonePhoto } from "@/local/photoWrites";
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

  return {
    tiles,
    /**
     * The preview — the first photo whose bytes are already on the device.
     *
     * First, because order is what the star sets (see `move`). "Already on the device"
     * because a copy pulled down from another account has its photo records before it has
     * their bytes, and a hero pointed at a blob that is not there yet shows nothing at all.
     */
    firstSrc: tiles.find((tile) => tile.src !== null)?.src ?? null,
    loading: photos.isLoading,
    accept: ACCEPTED.join(","),
    add: (file: File) => add.mutate(file),
    adding: add.isPending,
    rejected,
    remove: (photo: Photo) => remove.mutate(photo),
    removing: remove.isPending ? remove.variables?.id : undefined,
    /** Star — the photo becomes the one every other screen shows for this copy. */
    setPreview: (photo: Photo) => move.mutate({ photoId: photo.id, to: 0 }),
    /** Drag — the same write, to wherever it was dropped. */
    moveTo: (photoId: string, index: number) => move.mutate({ photoId, to: index }),
    reordering: move.isPending,
  };
}
