import { useStore } from "@/local/StoreProvider";
import { readWishlistSort, writeWishlistSort } from "@/local/settings";
import type { WishPatch, WishSort, WishlistItem } from "@janne6565/music-collector-shared";
import {
  applyWishPatch,
  hasManualOrder,
  manualOrderWrites,
  moveWish,
  sortWishlist,
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
      await store.putWishlistItem(tombstoneWishlistItem(item, clock, Date.now()));
    },
    onSuccess: invalidate,
  });

  return {
    items: ordered,
    count: items.length,
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
