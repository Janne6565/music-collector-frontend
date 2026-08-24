import type { Photo } from "@/domain/types";
import { useStore } from "@/local/StoreProvider";
import { createPhoto, tombstonePhoto } from "@/local/photoWrites";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/** What a phone camera or a file picker actually produces, matching the server's allowlist. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export interface PhotoTile {
  readonly photo: Photo;
  /** An object URL for the local bytes, or null while they are still being fetched. */
  readonly src: string | null;
}

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
    },
  });

  const remove = useMutation({
    mutationFn: async (photo: Photo) => {
      await store.putPhoto(tombstonePhoto(photo, clock, Date.now()));
      await store.deletePhotoBytes(photo.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["photos", copyId] });
    },
  });

  return {
    tiles,
    loading: photos.isLoading,
    accept: ACCEPTED.join(","),
    add: (file: File) => add.mutate(file),
    adding: add.isPending,
    rejected,
    remove: (photo: Photo) => remove.mutate(photo),
    removing: remove.isPending ? remove.variables?.id : undefined,
  };
}
