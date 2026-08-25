import type { SharedWishDto } from "@/api/generated/musicCollectorAPI.schemas";
import { lookupAlbumCovers } from "@/api/releases";
import { isManualReleaseId } from "@janne6565/music-collector-shared";
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
            .filter((albumId): albumId is string => albumId !== undefined)
            .filter((albumId) => !isManualReleaseId(albumId)),
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

  return covers.data ?? NONE;
}
