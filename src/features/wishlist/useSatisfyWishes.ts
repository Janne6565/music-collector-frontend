import { useUndo } from "@/features/detail/UndoDelete";
import { useStore } from "@/local/StoreProvider";
import type { Copy, Release } from "@janne6565/rekordo-shared";
import { tombstoneWishlistItem, wishSatisfiedBy } from "@janne6565/rekordo-shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * The wishlist's quietest exit (screen 16e).
 *
 * You go looking for a record, find it, file it — and the entry that was waiting for it
 * leaves on its own. No dialog, because there is no question: an entry is a note about
 * something you do not own, and you now own it. One undoable line is the whole ceremony.
 *
 * Called from every path that files a copy rather than from the store, deliberately: the
 * store is where records are written, not where product decisions live, and a sync pulling
 * somebody else's copy in must not silently rewrite this device's wishlist.
 */
export function useSatisfyWishes(): (copy: Copy, release: Release | undefined) => Promise<void> {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();
  const { offer } = useUndo();

  return useCallback(
    async (copy, release) => {
      const satisfied = wishSatisfiedBy(await store.listWishlist(), copy, release);
      if (satisfied === undefined) return;

      await store.putWishlistItem(tombstoneWishlistItem(satisfied, clock, Date.now()));
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      offer({
        kind: "WISH",
        wishId: satisfied.id,
        title: satisfied.title,
        wantedSince: satisfied.createdAt,
      });
    },
    [store, clock, queryClient, offer],
  );
}
