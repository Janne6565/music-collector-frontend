import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import { useStore } from "@/local/StoreProvider";
import { syncOutcomeCleared } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type {
  CollectionStats,
  Copy,
  Format,
  LibraryFilter,
  Release,
} from "@janne6565/rekordo-shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

export type FormatFilter = Format | "ALL";
export type SortKey = NonNullable<LibraryFilter["sort"]>;

/**
 * How long the search box has to stand still before the grid re-queries.
 *
 * The query is local, so the cost is not a request — it is that every keystroke re-sorted
 * and re-rendered the whole grid, and a shelf reflowing under each letter is hard to read
 * while you are still typing the word. Shorter than the add dialog's 350ms, which is
 * pacing an upstream call; this one only has to outlast the gap between two keystrokes.
 */
const SEARCH_DEBOUNCE_MS = 200;

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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("ADDED_DESC");
  /**
   * 29e-5: the shelf filtered down to the records the sign-in brought in.
   *
   * Held here rather than in the URL because it is not a place — it is the second half of
   * a sentence the banner is still saying, and it goes away with the banner.
   */
  const [showingArrived, setShowingArrived] = useState(false);
  const dispatch = useAppDispatch();
  const outcome = useAppSelector((state) => state.auth.syncOutcome);

  /** What the grid is filtered by — the box stays instant, this trails it. */
  const searchTerm = useDebouncedSearch(search, SEARCH_DEBOUNCE_MS);

  const stats = useCollectionStats();

  const copiesQuery = useQuery({
    queryKey: ["copies", format, searchTerm, sort],
    queryFn: async () => {
      const copies = await store.listCopies({ format, search: searchTerm, sort });
      const releases = await store.getReleases(copies.map((copy) => copy.releaseId));
      return copies.map((copy) => ({ copy, release: releases.get(copy.releaseId) }));
    },
  });

  const all = useMemo<LibraryRow[]>(() => copiesQuery.data ?? [], [copiesQuery.data]);
  const rows = useMemo<LibraryRow[]>(() => {
    if (!showingArrived || outcome === null) return all;
    const arrived = new Set(outcome.ids);
    return all.filter((row) => arrived.has(row.copy.id));
  }, [all, outcome, showingArrived]);

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
    stats,
    loading: copiesQuery.isLoading,
    failed: copiesQuery.isError,
    /** True only when the collection itself is empty, not when a filter excludes everything. */
    collectionEmpty: stats !== undefined && stats.copyCount === 0,
    format,
    search,
    sort,
    handleFormat,
    handleSearch,
    cycleSort,
    /** 24b: the phone picks a mode from a sheet rather than cycling through three. */
    setSort,

    /** What the sign-in resolved to, until it has been read once. */
    outcome,
    showingArrived,
    showArrived: () => setShowingArrived(true),
    dismissOutcome: () => {
      setShowingArrived(false);
      dispatch(syncOutcomeCleared());
    },
  };
}
