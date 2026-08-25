import { lookupByBarcode, lookupRelease, searchReleases } from "@/api/releases";
import { fromCsv } from "@/domain/csv";
import { useStore } from "@/local/StoreProvider";
import { clearRecentSearches, readRecentSearches, rememberSearch } from "@/local/settings";
import type {
  Artist,
  CopyDraft,
  Format,
  LocalStore,
  Release,
} from "@janne6565/music-collector-shared";
import { createCopy } from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export type AddTab = "SEARCH" | "BARCODE" | "CSV";
export type AddFormatFilter = Format | "ALL";

/** A bare run of 8–14 digits is a scanned or pasted barcode, not a title. */
const BARCODE = /^\d{8,14}$/;

/**
 * How long the field has to stand still before the search runs itself.
 *
 * Long enough that typing an artist's name is one request rather than eleven, short
 * enough that it still feels like the list is following along.
 */
const DEBOUNCE_MS = 350;

/** Below this, a title search matches most of the archive and tells you nothing. */
const MIN_TERM_LENGTH = 2;

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

/**
 * Fetches and stores one release's cover theme without anyone waiting for it.
 *
 * Failures are swallowed on purpose: the theme is decoration, the copy is already saved,
 * and the detail page asks again for itself if this never lands.
 */
async function warmCoverTheme(release: Release, store: LocalStore): Promise<void> {
  if (release.coverTheme !== null) return;
  const enriched = await lookupRelease(release.id).catch(() => null);
  if (enriched !== null && enriched.coverTheme !== null) {
    await store.cacheReleases([enriched]).catch(() => undefined);
  }
}

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
export function useAddDialogLogic(onClose: () => void, onAdded: (copyId: string) => void) {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<AddTab>("SEARCH");
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [format, setFormat] = useState<AddFormatFilter>("ALL");
  /**
   * The row the footer's primary acts on.
   *
   * The release itself rather than its id: a pressing picked inside an artist's
   * discography (screen 10d) is not in `results`, so there is nothing to look an id up in.
   */
  const [selected, setSelected] = useState<Release | null>(null);
  /**
   * The artist whose discography is open over the results, if any (screen 10d). A pane
   * rather than a route: opening an artist is a detour inside adding a record, and the
   * search underneath is exactly what you come back to.
   */
  const [openArtist, setOpenArtist] = useState<Artist | null>(null);

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
    queryFn: async () => new Set((await store.listCopies()).map((copy) => copy.releaseId)),
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
    onSuccess: async (copy, release) => {
      await queryClient.invalidateQueries({ queryKey: ["copies"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      await queryClient.invalidateQueries({ queryKey: ["ownedMbids"] });
      // A search result carries no cover theme — only the detail lookup samples one, and on
      // a cover the server has never seen that takes seconds. Warm it while the user is
      // still in the sheet, so the record they just added opens already themed.
      void warmCoverTheme(release, store);
      // The row that was acted on has been acted on; leaving it lit invites a second copy
      // of the same pressing from a footer press meant for the sheet as a whole.
      setSelected(null);
      // Every add hands the copy straight to the details step (screen 8d). Here rather
      // than at each call site so the row's Add, the footer and a pressing picked inside a
      // discography cannot end up being three different amounts of "added".
      onAdded(copy.id);
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
          (await store.getRelease(row.releaseId)) ?? (await lookupRelease(row.releaseId));
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

  const search = useCallback((next: string) => {
    setSubmitted(next);
    setSelected(null);
    // A new search invalidates the discography that was opened from the old one.
    setOpenArtist(null);
  }, []);

  /**
   * Recent searches hold things somebody meant, not every prefix they passed through on
   * the way — which is why this is not called from the debounce. A search counts as meant
   * once it is pressed for deliberately (Enter, or repeating an earlier one) or once it
   * produces something that gets added.
   */
  const remember = useCallback(
    (next: string) => {
      void rememberSearch(store, next).then(() =>
        queryClient.invalidateQueries({ queryKey: ["recentSearches"] }),
      );
    },
    [store, queryClient],
  );

  const query = term.trim();
  /**
   * Whether what is in the field is worth sending. A barcode is only a barcode once it is
   * complete, so a half-scanned number never reaches the proxy.
   */
  const queryReady = tab === "BARCODE" ? BARCODE.test(query) : query.length >= MIN_TERM_LENGTH;
  /** Typed something new and the request has not gone out yet. */
  const waiting = queryReady && query !== submitted;

  /**
   * The search runs itself after the field stands still.
   *
   * Adding a record is a search you repeat with small corrections — a misheard title, an
   * artist spelled two ways — and an Enter between every attempt is a keystroke that only
   * ever means "yes, I did mean the thing I just typed". Enter still works, and skips
   * the wait.
   */
  useEffect(() => {
    if (!queryReady) {
      // Emptying or shortening the field drops the results with it, rather than leaving
      // them stranded under a box that no longer says what produced them.
      search("");
      return;
    }
    if (query === submitted) return;
    const timer = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, queryReady, submitted, search]);

  return {
    tab,
    setTab: useCallback(
      (next: AddTab) => {
        setTab(next);
        setSelected(null);
        // The field is cleared with the tab, so the barcode box never opens holding a
        // half-typed album title that no barcode can ever match — and, now that the
        // search runs itself, never carries one tab's query into the other's request.
        setTerm("");
        search("");
      },
      [search],
    ),
    term,
    setTerm,
    /** Enter — the same search, without waiting out the debounce. */
    submit: useCallback(() => {
      if (query === "") return;
      search(query);
      if (!BARCODE.test(query)) remember(query);
    }, [query, search, remember]),
    canSubmit: query !== "",
    format,
    // Narrowing the filter can take the picked row off screen, and a footer acting on a
    // release you can no longer see is worse than making you pick again.
    setFormat: useCallback((next: AddFormatFilter) => {
      setFormat(next);
      setSelected(null);
    }, []),
    results,
    /**
     * True from the keystroke, not from the request: the skeletons stand in for the wait
     * as a whole, and a debounce the reader cannot see is still a wait.
     */
    searching: waiting || resultsQuery.isFetching,
    failed: resultsQuery.isError && !waiting,
    hasSearched: submitted !== "" || waiting,
    submittedTerm: submitted,
    isOwned: (release: Release) => owned.data?.has(release.id) === true,
    selected,
    select: setSelected,
    /**
     * Adds the copy and opens its details step over the sheet (screen 8d).
     *
     * The sheet is left mounted underneath rather than closed: the copy is saved the
     * moment this runs, so the step is an offer to say what your copy is like, not a form
     * standing between you and owning the record. Dismissing it puts you back on the same
     * results with the same query, which is what keeps several additions in one sitting
     * possible now that each of them has a second step.
     */
    addRelease: (release: Release) => {
      // The search that found something you kept is one worth offering again.
      if (submitted !== "" && !BARCODE.test(submitted)) remember(submitted);
      add.mutate(release);
    },
    addingMbid: add.isPending ? add.variables?.id : undefined,
    /** Artists are only worth asking about for a title search — no artist is named 602537. */
    artistQuery: tab === "BARCODE" ? "" : submitted,
    openArtist,
    showArtist: setOpenArtist,
    closeArtist: () => setOpenArtist(null),
    recentSearches: recent.data ?? [],
    repeatSearch: (term: string) => {
      setTerm(term);
      search(term.trim());
      remember(term);
    },
    clearRecent: () => forgetSearches.mutate(),
    importCsv: (file: File) => importCsv.mutate(file),
    importing: importCsv.isPending,
    importResult: importCsv.data,
    importFailed: importCsv.isError,
    close: onClose,
  };
}
