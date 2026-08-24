import type { Copy, Format, Release } from "@/domain/types";
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

export function useLibraryLogic() {
  const { store } = useStore();
  const [format, setFormat] = useState<FormatFilter>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("ADDED_DESC");

  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: () => store.stats(),
  });

  const copiesQuery = useQuery({
    queryKey: ["copies", format, search, sort],
    queryFn: async () => {
      const copies = await store.listCopies({ format, search, sort });
      const releases = await store.getReleases(copies.map((copy) => copy.releaseMbid));
      return copies.map((copy) => ({ copy, release: releases.get(copy.releaseMbid) }));
    },
  });

  const rows = useMemo<LibraryRow[]>(() => copiesQuery.data ?? [], [copiesQuery.data]);

  const handleFormat = useCallback((next: FormatFilter) => setFormat(next), []);
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
    stats: statsQuery.data,
    loading: copiesQuery.isLoading,
    failed: copiesQuery.isError,
    /** True only when the collection itself is empty, not when a filter excludes everything. */
    collectionEmpty: statsQuery.data !== undefined && statsQuery.data.copyCount === 0,
    format,
    search,
    sort,
    handleFormat,
    handleSearch,
    cycleSort,
  };
}
