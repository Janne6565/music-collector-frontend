import type { SharedCopyDto } from "@/api/generated/rekordoAPI.schemas";
import { downloadPhotoBytes } from "@/api/photos";
import { useEffect, useState } from "react";

/**
 * The photos on somebody else's shelf, as something an `<img>` can show.
 *
 * The sibling of `useCoverPhotos`, which reads the same pictures out of the local store —
 * that one cannot serve here, because a viewer has none of the owner's bytes on their own
 * device. These arrive over `/api/v1/photos/{id}/content`, which is authorised per request
 * against the owner's sharing settings.
 *
 * Fetched through the API client rather than pointed at with a bare `<img src>`: a
 * friends-only shelf needs the viewer's token on the request, and an image tag cannot send
 * one. Only copies the server named a photo for cost anything, which on most shelves is
 * the handful of records the archive has no cover for.
 */
export function useSharedCoverPhotos(
  copies: readonly SharedCopyDto[],
): ReadonlyMap<string, string> {
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(() => new Map());

  // Joined, so the effect re-runs when the set of photos on screen changes rather than on
  // every render — a new array of the same ids would otherwise refetch forever.
  const key = copies
    .map((copy) => `${copy.id}:${copy.previewPhotoId ?? ""}`)
    .filter((pair) => !pair.endsWith(":"))
    .join(",");

  useEffect(() => {
    if (key === "") {
      setUrls(new Map());
      return;
    }
    let cancelled = false;
    const made: string[] = [];

    void (async () => {
      const built = new Map<string, string>();
      for (const pair of key.split(",")) {
        const [copyId, photoId] = pair.split(":");
        if (copyId === undefined || photoId === undefined) continue;
        // A refusal is a 404 by design, and a shelf with one unreadable picture is still a
        // shelf: the tile falls back to the format silhouette rather than the page failing.
        const bytes = await downloadPhotoBytes(photoId).catch(() => null);
        if (bytes === null) continue;
        const url = URL.createObjectURL(bytes);
        made.push(url);
        built.set(copyId, url);
      }
      if (cancelled) {
        for (const url of made) URL.revokeObjectURL(url);
        return;
      }
      setUrls(built);
    })();

    return () => {
      cancelled = true;
      // Object URLs pin their blob until revoked; switching tabs on a profile would
      // otherwise hold every photo the page has ever shown.
      for (const url of made) URL.revokeObjectURL(url);
    };
  }, [key]);

  return urls;
}
