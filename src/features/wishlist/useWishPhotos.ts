import { useStore } from "@/local/StoreProvider";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * The picture somebody gave a hand-entered wish, as something an `<img>` can show.
 *
 * The same shape as `useCoverPhotos` and for the same reason: one indexed query for the
 * whole screen, and bytes read only for the entries that actually have one. A wish for a
 * record the archive has never heard of can get its cover no other way — nothing will
 * ever resolve artwork for an album no catalogue holds.
 */
export function useWishPhotos(wishIds: readonly string[]): ReadonlyMap<string, string> {
  const { store } = useStore();
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(() => new Map());

  // Joined, so the query key changes only when the set of entries on screen does — a new
  // array of the same ids on every render would otherwise refetch forever.
  const key = wishIds.join(",");

  const photos = useQuery({
    queryKey: ["wish-photos", key],
    queryFn: () => store.listWishPhotos(wishIds),
  });

  useEffect(() => {
    let cancelled = false;
    const made: string[] = [];

    void (async () => {
      const built = new Map<string, string>();
      for (const [wishId, photo] of photos.data ?? []) {
        const bytes = await store.getPhotoBytes(photo.id);
        // Absent until this device has pulled the bytes: the picture syncs as a record
        // first and an object afterwards, so the row shows its silhouette in between.
        if (bytes === undefined) continue;
        const url = URL.createObjectURL(bytes);
        made.push(url);
        built.set(wishId, url);
      }
      if (cancelled) return;
      setUrls(built);
    })();

    return () => {
      cancelled = true;
      // Object URLs pin their blob until revoked.
      for (const url of made) URL.revokeObjectURL(url);
    };
  }, [photos.data, store]);

  return urls;
}
