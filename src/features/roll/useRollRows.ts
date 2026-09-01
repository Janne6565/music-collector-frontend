import { useStore } from "@/local/StoreProvider";
import type { RollRow } from "@janne6565/rekordo-shared";
import { useQuery } from "@tanstack/react-query";

/**
 * The whole shelf, for the roll to draw its pool out of.
 *
 * Deliberately not the library's rows: the sheet carries its own pool, and reading the
 * grid's would mean a roll silently inherited whatever you had typed into the search box.
 *
 * The key is the library's own key for an unfiltered shelf, so on the common path — the
 * library is showing everything and somebody taps the dice — this is already in the cache
 * and the sheet opens on a wheel that is already turning.
 */
export function useRollRows(): { readonly rows: readonly RollRow[]; readonly loading: boolean } {
  const { store } = useStore();
  const query = useQuery({
    queryKey: ["copies", "ALL", "", "ADDED_DESC"],
    queryFn: async () => {
      const copies = await store.listCopies({ format: "ALL", search: "", sort: "ADDED_DESC" });
      const releases = await store.getReleases(copies.map((copy) => copy.releaseId));
      return copies.map((copy) => ({ copy, release: releases.get(copy.releaseId) }));
    },
  });

  return { rows: query.data ?? [], loading: query.isLoading };
}
