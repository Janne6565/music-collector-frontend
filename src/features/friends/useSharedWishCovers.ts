import type { SharedWishDto } from "@/api/generated/rekordoAPI.schemas";
import { lookupAlbumCovers, lookupPressingCovers } from "@/api/releases";
import { isManualReleaseId } from "@janne6565/rekordo-shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const NONE: ReadonlyMap<string, string | null> = new Map();

/**
 * The artwork for somebody else's wishlist, resolved album by album.
 *
 * The sibling of `useSharedCoverPhotos`, and the counterpart of what `useWishlistLogic`
 * does for your own list: a wish names an *album*, and an album carries no cover — only a
 * pressing of it does — so the picture is asked for rather than sent with the row. Nothing
 * about it is private, which is why this goes to the open metadata mirror instead of
 * widening the shared wishlist response: the answer is a fact about a catalogue, the same
 * for every viewer, and a signed-out visitor on a public profile may have it too.
 *
 * An entry that names the pressing it was made from is asked about that pressing first,
 * exactly as the owner's own list is: the album's answer is whichever pressing the mirror
 * ranks first, and showing a friend a different sleeve than the one they are hunting for
 * is the same bug wherever it is drawn. The result stays keyed by album, because that is
 * what the row has in hand — and one entry per album means no two wishes compete for a key.
 *
 * Hand-entered wishes are left out. Their only possible picture is one the owner uploaded,
 * and `PhotoService` refuses those to everybody but the owner on purpose — a wish is not a
 * shelf. Those rows draw the format silhouette, here as on the owner's own list.
 */
export function useSharedWishCovers(
  wishes: readonly SharedWishDto[],
): ReadonlyMap<string, string | null> {
  /**
   * Sorted and de-duplicated, so the key is the *set* of albums on screen: the same list
   * sorted differently is the same question, and asking it again would refetch on a sort.
   */
  const albumIds = useMemo(
    () =>
      [
        ...new Set(
          wishes
            .map((wish) => wish.albumId)
            // `!= null` rather than a check for undefined: the generated DTO types every
            // field optional, but the server sends an explicit null for a wish that names
            // no pressing. Excluding only undefined let that null through a predicate
            // swearing it was a string, and the next line called startsWith on it.
            .filter((albumId): albumId is string => albumId != null)
            .filter((albumId) => !isManualReleaseId(albumId)),
        ),
      ].sort(),
    [wishes],
  );

  const releaseIds = useMemo(
    () =>
      [
        ...new Set(
          wishes
            .map((wish) => wish.releaseId)
            // Null here is the ordinary case, not an edge one: a wish made before entries
            // remembered their pressing, or one made from an album rather than a pressing.
            .filter((releaseId): releaseId is string => releaseId != null)
            .filter((releaseId) => !isManualReleaseId(releaseId)),
        ),
      ].sort(),
    [wishes],
  );

  const covers = useQuery({
    queryKey: ["albumCovers", albumIds],
    enabled: albumIds.length > 0,
    // The mirror's answer for an album does not move while a page is open. Shared with the
    // owner's own wishlist by design — it is the same question with the same answer.
    staleTime: 60 * 60 * 1000,
    queryFn: () => lookupAlbumCovers(albumIds),
  });

  const pressings = useQuery({
    queryKey: ["pressingCovers", releaseIds],
    enabled: releaseIds.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: () => lookupPressingCovers(releaseIds),
  });

  return useMemo(() => {
    const byAlbum = covers.data;
    const byPressing = pressings.data;
    if (byAlbum === undefined && byPressing === undefined) return NONE;

    const merged = new Map(byAlbum ?? NONE);
    for (const wish of wishes) {
      if (wish.albumId == null || wish.releaseId == null) continue;
      const url = byPressing?.get(wish.releaseId) ?? null;
      if (url !== null) merged.set(wish.albumId, url);
    }
    return merged;
  }, [covers.data, pressings.data, wishes]);
}
