import { searchReleases } from "@/api/releases";
import { useStore } from "@/local/StoreProvider";
import type { Release, WishFormat, WishlistItem } from "@janne6565/music-collector-shared";
import {
  applyWishPatch,
  asWishFormat,
  createWishlistItem,
  manualReleaseId,
} from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

/** Kept in step with the add sheet: one field standing still means one request, not eleven. */
const DEBOUNCE_MS = 350;
const MIN_TERM_LENGTH = 2;

/**
 * What the sheet is doing.
 *
 * `PICK` is the search — the release an entry is *for*, which is the one thing about it
 * that cannot be edited later. `DETAILS` is the format and the note. `MANUAL` is the way
 * in for a record the archive has never heard of.
 */
export type WishStep = "PICK" | "DETAILS" | "MANUAL";

export interface WishSubject {
  readonly albumId: string;
  readonly title: string;
  readonly artistName: string;
  readonly year: number | null;
  /** The pressing the row came from, for the line under the title. Absent when typed. */
  readonly label: string | null;
}

function subjectOf(release: Release): WishSubject {
  return {
    albumId: release.albumId,
    title: release.title,
    artistName: release.artistName,
    year: release.year,
    label: release.label,
  };
}

/**
 * The add-to-wishlist sheet (screen 16c), and the same sheet reopened to edit an entry.
 *
 * One sheet for both because an entry is small enough that "add" and "edit" ask the same
 * two questions, and because the design's promise — "adding it twice just reopens this
 * sheet" — is only true if there is one sheet to reopen.
 */
export function useWishDialogLogic(
  existing: WishlistItem | null,
  onDone: () => void,
  /** A release the caller already picked, which is the search's only answer anyway. */
  seed: Release | null = null,
) {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();

  const opensOnDetails = existing !== null || seed !== null;
  const [step, setStep] = useState<WishStep>(opensOnDetails ? "DETAILS" : "PICK");
  const [subject, setSubject] = useState<WishSubject | null>(
    existing !== null
      ? {
          albumId: existing.albumId,
          title: existing.title,
          artistName: existing.artistName,
          year: existing.year,
          label: null,
        }
      : seed !== null
        ? subjectOf(seed)
        : null,
  );
  const [format, setFormat] = useState<WishFormat | null>(
    existing !== null ? asWishFormat(existing.desiredFormat) : asWishFormat(seed?.format ?? null),
  );
  const [note, setNote] = useState(existing?.note ?? "");

  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");

  /** Hand-typed fields, for the record no search will ever return. */
  const [typed, setTyped] = useState({ title: "", artistName: "", year: "" });

  const results = useQuery({
    queryKey: ["releaseSearch", submitted],
    enabled: submitted.trim() !== "",
    queryFn: () => searchReleases(submitted.trim()),
  });

  const query = term.trim();
  const ready = query.length >= MIN_TERM_LENGTH;
  const waiting = ready && query !== submitted;

  useEffect(() => {
    if (!ready) {
      setSubmitted("");
      return;
    }
    if (query === submitted) return;
    const timer = setTimeout(() => setSubmitted(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, ready, submitted]);

  /** Which results are already on the list, so a row can say so instead of duplicating. */
  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: () => store.listWishlist() });
  const wishedAlbums = new Set((wishlist.data ?? []).map((item) => item.albumId));

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = note.trim();
      const cleaned = trimmed === "" ? null : trimmed;

      if (existing !== null) {
        await store.putWishlistItem(
          applyWishPatch(existing, { desiredFormat: format, note: cleaned }, clock),
        );
        return;
      }
      if (subject === null) return;

      // One entry per release: a second heart on the same album is a reopened sheet, not a
      // second row. Checked against the live list rather than remembered in state, because
      // the entry may have arrived from another device while this sheet was open.
      const already = (await store.listWishlist()).find((item) => item.albumId === subject.albumId);
      if (already !== undefined) {
        await store.putWishlistItem(
          applyWishPatch(already, { desiredFormat: format, note: cleaned }, clock),
        );
        return;
      }

      await store.putWishlistItem(
        createWishlistItem(
          {
            albumId: subject.albumId,
            title: subject.title,
            artistName: subject.artistName,
            year: subject.year,
            desiredFormat: format,
            note: cleaned,
          },
          clock,
          Date.now(),
          crypto.randomUUID(),
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      onDone();
    },
  });

  const typedYear = Number.parseInt(typed.year, 10);

  return {
    step,
    subject,
    editing: existing !== null,
    term,
    setTerm,
    results: results.data ?? [],
    searching: waiting || results.isFetching,
    failed: results.isError && !waiting,
    hasSearched: submitted !== "" || waiting,
    isWished: (release: Release) => wishedAlbums.has(release.albumId),
    pick: useCallback((release: Release) => {
      setSubject(subjectOf(release));
      // A release row already says which format it is; that is the obvious thing to want,
      // and anything the wishlist cannot ask for ("digital") falls through to "any".
      setFormat(asWishFormat(release.format));
      setStep("DETAILS");
    }, []),
    /** Back to the search, which is the only part of an entry that is not editable later. */
    back: useCallback(() => setStep("PICK"), []),
    startManual: useCallback(() => setStep("MANUAL"), []),
    typed,
    setTyped: (patch: Partial<typeof typed>) => setTyped((current) => ({ ...current, ...patch })),
    canConfirmManual: typed.title.trim() !== "" || typed.artistName.trim() !== "",
    /**
     * Turns the typed fields into a subject with an id nobody else can collide with.
     *
     * `local:` for the same reason a hand-entered copy uses it (turn 14): the entry is not
     * a claim about anything in the archive, so it must never match one — and an album id
     * that cannot be looked up is exactly an album no catalogue has.
     */
    confirmManual: useCallback(() => {
      setSubject({
        albumId: manualReleaseId(crypto.randomUUID()),
        title: typed.title.trim(),
        artistName: typed.artistName.trim(),
        year: Number.isFinite(typedYear) ? typedYear : null,
        label: null,
      });
      setStep("DETAILS");
    }, [typed, typedYear]),
    format,
    setFormat,
    note,
    setNote,
    save: () => save.mutate(),
    saving: save.isPending,
    saveFailed: save.isError,
  };
}
