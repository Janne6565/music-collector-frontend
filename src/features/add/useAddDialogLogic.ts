import { lookupByBarcode, lookupRelease, searchReleases } from "@/api/releases";
import { fromCsv } from "@/domain/csv";
import type { Format, Release } from "@/domain/types";
import { useStore } from "@/local/StoreProvider";
import { type CopyDraft, createCopy } from "@/local/copyWrites";
import { clearRecentSearches, readRecentSearches, rememberSearch } from "@/local/settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export type AddTab = "SEARCH" | "BARCODE" | "CSV";
export type AddFormatFilter = Format | "ALL";

/** A bare run of 8–14 digits is a scanned or pasted barcode, not a title. */
const BARCODE = /^\d{8,14}$/;

const EMPTY_DRAFT: CopyDraft = {
  condition: null,
  sleeveCondition: null,
  pricePaidCents: null,
  currency: "EUR",
  purchasedOn: null,
  purchasedAt: null,
  notes: null,
  rating: null,
};

export interface CsvImportResult {
  readonly added: number;
  readonly skipped: number;
}

/**
 * The "Add a copy" modal from screen 6a.
 *
 * A modal rather than the separate page it used to be: adding is something you do *to*
 * the library you are looking at, and coming back to a scroll position you had lost is a
 * small tax paid on every single addition.
 */
export function useAddDialogLogic(onClose: () => void) {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<AddTab>("SEARCH");
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [format, setFormat] = useState<AddFormatFilter>("ALL");
  const [selectedMbid, setSelectedMbid] = useState<string | null>(null);

  const resultsQuery = useQuery({
    queryKey: ["releaseSearch", submitted],
    // Only runs once a search is actually submitted, so typing does not hammer the proxy.
    enabled: submitted.trim() !== "",
    queryFn: () => {
      const query = submitted.trim();
      return BARCODE.test(query) ? lookupByBarcode(query) : searchReleases(query);
    },
  });

  /**
   * Which of the results are already in the library.
   *
   * Read from the local store rather than tracked in this component's state: a copy added
   * on another device and pulled in by sync should show as owned here too.
   */
  const owned = useQuery({
    queryKey: ["ownedMbids"],
    queryFn: async () => new Set((await store.listCopies()).map((copy) => copy.releaseMbid)),
  });

  /** The empty state of the search tab, and the mobile search screen (5a). */
  const recent = useQuery({
    queryKey: ["recentSearches"],
    queryFn: () => readRecentSearches(store),
  });

  const forgetSearches = useMutation({
    mutationFn: () => clearRecentSearches(store),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recentSearches"] });
    },
  });

  const add = useMutation({
    mutationFn: async (release: Release) => {
      // Cache the release alongside the copy: every screen reads release metadata from the
      // local store and must keep working with no network at all.
      await store.cacheReleases([release]);
      const copy = createCopy(release, EMPTY_DRAFT, clock, Date.now(), crypto.randomUUID());
      await store.putCopy(copy);
      return copy;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copies"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      await queryClient.invalidateQueries({ queryKey: ["ownedMbids"] });
    },
  });

  /**
   * Importing an export.
   *
   * Every row is resolved through the metadata proxy before anything is written, so an
   * import either produces a copy attached to a real release or reports the row as
   * skipped — never a copy pointing at an mbid the app knows nothing about.
   */
  const importCsv = useMutation<CsvImportResult, Error, File>({
    mutationFn: async (file) => {
      const { rows, skipped: malformed } = fromCsv(await file.text());
      let added = 0;
      let skipped = malformed;
      for (const row of rows) {
        const release =
          (await store.getRelease(row.releaseMbid)) ?? (await lookupRelease(row.releaseMbid));
        if (release === null || release === undefined) {
          skipped += 1;
          continue;
        }
        await store.cacheReleases([release]);
        await store.putCopy(
          createCopy(
            release,
            {
              condition: row.mediaCondition,
              sleeveCondition: row.sleeveCondition,
              pricePaidCents: row.pricePaidCents,
              currency: row.currency,
              purchasedOn: row.purchasedOn,
              purchasedAt: row.purchasedAt,
              notes: row.notes,
              rating: row.rating,
            },
            clock,
            Date.now(),
            crypto.randomUUID(),
          ),
        );
        added += 1;
      }
      return { added, skipped };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });

  const all = resultsQuery.data ?? [];
  const results = format === "ALL" ? all : all.filter((release) => release.format === format);
  const selected = results.find((release) => release.mbid === selectedMbid) ?? null;

  const search = useCallback(
    (next: string) => {
      setSubmitted(next);
      setSelectedMbid(null);
      // Remembered on submit rather than on keystroke, so the list holds searches somebody
      // meant, not every prefix they passed through on the way.
      void rememberSearch(store, next).then(() =>
        queryClient.invalidateQueries({ queryKey: ["recentSearches"] }),
      );
    },
    [store, queryClient],
  );

  return {
    tab,
    setTab: useCallback((next: AddTab) => {
      setTab(next);
      setSelectedMbid(null);
    }, []),
    term,
    setTerm,
    submit: useCallback(() => search(term), [search, term]),
    canSubmit: term.trim().length > 0,
    format,
    setFormat,
    results,
    searching: resultsQuery.isFetching,
    failed: resultsQuery.isError,
    hasSearched: submitted.trim() !== "",
    submittedTerm: submitted.trim(),
    isOwned: (release: Release) => owned.data?.has(release.mbid) === true,
    selected,
    select: setSelectedMbid,
    /** Adds the copy and stays put, so several can be added in one sitting. */
    addRelease: (release: Release) => add.mutate(release),
    addingMbid: add.isPending ? add.variables?.mbid : undefined,
    /** Adds the copy and hands it to the details step (screen 8d). */
    addAndEdit: async (release: Release) => {
      const copy = await add.mutateAsync(release);
      return copy.id;
    },
    recentSearches: recent.data ?? [],
    repeatSearch: (term: string) => {
      setTerm(term);
      search(term);
    },
    clearRecent: () => forgetSearches.mutate(),
    importCsv: (file: File) => importCsv.mutate(file),
    importing: importCsv.isPending,
    importResult: importCsv.data,
    importFailed: importCsv.isError,
    close: onClose,
  };
}
