import type { CollectionStats, Condition, Copy, Format, Release } from "@/domain/types";
import type { LibraryFilter } from "@/local/LocalStore";
import { useStore } from "@/local/StoreProvider";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

export type FormatFilter = Format | "ALL";
export type SortKey = NonNullable<LibraryFilter["sort"]>;

export interface LibraryRow {
  readonly copy: Copy;
  readonly release: Release | undefined;
}

/**
 * Just the sidebar's counts.
 *
 * The shell is on every page, but only the library needs the grid behind it. Splitting the
 * stats query out keeps the detail and wishlist pages from loading a whole collection to
 * put four numbers in the sidebar.
 */
export function useCollectionStats(): CollectionStats | undefined {
  const { store } = useStore();
  return useQuery({ queryKey: ["stats"], queryFn: () => store.stats() }).data;
}

export function useLibraryLogic() {
  const { store } = useStore();
  const [format, setFormat] = useState<FormatFilter>("ALL");
  const [condition, setCondition] = useState<Condition | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("ADDED_DESC");

  const stats = useCollectionStats();

  const copiesQuery = useQuery({
    queryKey: ["copies", format, condition, search, sort],
    queryFn: async () => {
      const copies = await store.listCopies({ format, condition, search, sort });
      const releases = await store.getReleases(copies.map((copy) => copy.releaseId));
      return copies.map((copy) => ({ copy, release: releases.get(copy.releaseId) }));
    },
  });

  const rows = useMemo<LibraryRow[]>(() => copiesQuery.data ?? [], [copiesQuery.data]);

  const handleFormat = useCallback((next: FormatFilter) => setFormat(next), []);
  // Pressing the grade you are already on clears it: the rail has no "All" chip, so the
  // chip itself has to be the way back out.
  const handleCondition = useCallback(
    (next: Condition) => setCondition((current) => (current === next ? null : next)),
    [],
  );
  const handleSearch = useCallback((next: string) => setSearch(next), []);
  const cycleSort = useCallback(() => {
    setSort((current) =>
      current === "ADDED_DESC"
        ? "ARTIST_ASC"
        : current === "ARTIST_ASC"
          ? "YEAR_DESC"
          : "ADDED_DESC",
    );
  }, []);

  return {
    rows,
    stats,
    loading: copiesQuery.isLoading,
    failed: copiesQuery.isError,
    /** True only when the collection itself is empty, not when a filter excludes everything. */
    collectionEmpty: stats !== undefined && stats.copyCount === 0,
    format,
    condition,
    search,
    sort,
    handleFormat,
    handleCondition,
    handleSearch,
    cycleSort,
  };
}
