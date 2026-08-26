import { lookupAlbumCovers } from "@/api/releases";
import { useWishPhotos } from "@/features/wishlist/useWishPhotos";
import { useStore } from "@/local/StoreProvider";
import { readWishlistSort, writeWishlistSort } from "@/local/settings";
import type { WishPatch, WishSort, WishlistItem } from "@janne6565/music-collector-shared";
import {
  applyWishPatch,
  hasManualOrder,
  isManualReleaseId,
  manualOrderWrites,
  moveWish,
  sortWishlist,
  tombstonePhoto,
  tombstoneWishlistItem,
} from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * The wishlist page (screen 16g) and, through the same hook, the list on mobile.
 *
 * Everything the list can do to an entry lives here: order it, edit it, take it off. What
 * it cannot do is turn one into a copy — "I found a copy" hands over to the add flow with
 * the release filled in, and the entry only leaves once a copy actually exists
 * (`useSatisfyWishes`). Backing out of that flow has to cost nothing.
 */
export function useWishlistLogic() {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();

  const wishlist = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => store.listWishlist(),
  });

  const sortQuery = useQuery({
    queryKey: ["wishlistSort"],
    queryFn: () => readWishlistSort(store),
  });
  const sort: WishSort = sortQuery.data ?? "NEWEST";

  const items = wishlist.data ?? [];
  const ordered = useMemo(() => sortWishlist(items, sort), [items, sort]);

  /**
   * The albums on the list, sorted and de-duplicated so the query key is the *set* rather
   * than the order it happens to be shown in — reordering a list must not refetch it.
   */
  const albumIds = useMemo(
    () =>
      [...new Set(items.map((item) => item.albumId))]
        .filter((albumId) => !isManualReleaseId(albumId))
        .sort(),
    [items],
  );

  /**
   * The artwork, which an entry does not carry.
   *
   * A wish is for an album, and an album is an id and a title — the cover belongs to a
   * pressing of it, so the server resolves one. Kept out of the local store deliberately:
   * it is a fact about a catalogue that any client may re-ask for, not part of the
   * collection, and a device offline simply draws the format silhouette instead.
   */
  /**
   * The pictures people uploaded for records no catalogue has. Only those entries can
   * carry one, so this is the whole of the hand-entered half of the list.
   */
  const ownPhotos = useWishPhotos(
    useMemo(
      () => items.filter((item) => isManualReleaseId(item.albumId)).map((item) => item.id),
      [items],
    ),
  );

  const covers = useQuery({
    queryKey: ["albumCovers", albumIds],
    enabled: albumIds.length > 0,
    // The mirror's answer for an album does not move while a list is open.
    staleTime: 60 * 60 * 1000,
    queryFn: () => lookupAlbumCovers(albumIds, store),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };

  const chooseSort = useMutation({
    mutationFn: (next: WishSort) => writeWishlistSort(store, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlistSort"] }),
  });

  /**
   * A drag renumbers every entry and switches the list to "Your order".
   *
   * Switching the sort is the point rather than a side effect: dragging a row while the
   * list is ordered by title would otherwise produce a move that the next render undoes,
   * which reads as the app refusing to do what it was just told.
   */
  const reorder = useMutation({
    mutationFn: async ({ from, to }: { readonly from: number; readonly to: number }) => {
      const next = moveWish(ordered, from, to);
      for (const { item, sortIndex } of manualOrderWrites(next)) {
        await store.putWishlistItem(applyWishPatch(item, { sortIndex }, clock));
      }
      await writeWishlistSort(store, "MANUAL");
    },
    onSuccess: async () => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["wishlistSort"] });
    },
  });

  const edit = useMutation({
    mutationFn: async ({
      item,
      patch,
    }: { readonly item: WishlistItem; readonly patch: WishPatch }) => {
      await store.putWishlistItem(applyWishPatch(item, patch, clock));
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (item: WishlistItem) => {
      const now = Date.now();
      await store.putWishlistItem(tombstoneWishlistItem(item, clock, now));
      // The picture goes with it. A wish id is never reused, so a photo left behind is one
      // nothing can ever reference again — and the server only deletes the object in
      // storage when the record it belongs to is put down.
      const picture = (await store.listWishPhotos([item.id])).get(item.id);
      if (picture !== undefined) await store.putPhoto(tombstonePhoto(picture, clock, now));
    },
    onSuccess: async () => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["wish-photos"] });
    },
  });

  return {
    items: ordered,
    count: items.length,
    /** The album's artwork, resolved by the server. Null while on its way, and when none. */
    coverOf: (item: WishlistItem): string | null => covers.data?.get(item.albumId) ?? null,
    /**
     * The picture somebody uploaded for this entry, which only a hand-entered one can have.
     *
     * Kept apart from the catalogue's cover rather than folded into it: this one is already
     * on the device, so it paints on the frame it is asked for, and sweeping over it would
     * invent a wait that never happened.
     */
    pictureOf: (item: WishlistItem): string | null => ownPhotos.get(item.id) ?? null,
    loading: wishlist.isLoading,
    sort,
    /** "Your order" is only a thing the menu names once a drag has produced one. */
    manual: hasManualOrder(items),
    setSort: (next: WishSort) => chooseSort.mutate(next),
    reorder: (from: number, to: number) => reorder.mutate({ from, to }),
    reordering: reorder.isPending,
    edit: (item: WishlistItem, patch: WishPatch) => edit.mutate({ item, patch }),
    remove: (item: WishlistItem) => remove.mutate(item),
    removing: remove.isPending ? remove.variables?.id : undefined,
  };
}
