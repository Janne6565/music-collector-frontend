import { lookupAlbumCovers, lookupPressings } from "@/api/releases";
import { useUndo } from "@/features/detail/UndoDelete";
import { useStore } from "@/local/StoreProvider";
import type { Release, WishFormat, WishlistItem } from "@janne6565/music-collector-shared";
import {
  applyWishPatch,
  isManualReleaseId,
  sortWishlist,
  tombstonePhoto,
  tombstoneWishlistItem,
} from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/** A note stands still this long before it is written. Long enough to be typing, short
 * enough that closing the modal never races it — the close writes any pending edit first. */
const NOTE_DEBOUNCE_MS = 500;

/** What the optional pressings lookup is doing (16m, 16n). */
export type PressingsState = "IDLE" | "LOADING" | "LOADED" | "FAILED" | "UNAVAILABLE";

/**
 * Screen 16j — one wishlist entry, as a modal over the list.
 *
 * Everything here is everything an entry knows, which is not much: an album, a wanted
 * format, a note, and when it was added. A wish holds no pressing, so there is nothing a
 * full page would have room for.
 *
 * Format and note edit in place with no Save. That is the turn's central call: an entry is
 * two editable fields, and a sheet that asks you to confirm two fields is ceremony. The
 * add sheet (16c) keeps its Save because until it is saved there is no entry to edit.
 */
export function useWishDetailsLogic(wishId: string, onClose: () => void) {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();
  const { offer } = useUndo();

  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: () => store.listWishlist() });
  const entry = (wishlist.data ?? []).find((item) => item.id === wishId) ?? null;

  /**
   * The entry as it was when the modal opened.
   *
   * Kept so the modal can go on drawing an album that has just left the list (16r): the
   * copy you filed on another device is news, not a crash, and a dialog that emptied
   * itself mid-sentence would read as one.
   */
  const [opened, setOpened] = useState<WishlistItem | null>(null);
  useEffect(() => {
    if (entry !== null && opened === null) setOpened(entry);
  }, [entry, opened]);
  const shown = entry ?? opened;

  const [note, setNote] = useState<string | null>(null);
  const noteValue = note ?? shown?.note ?? "";

  const manual = shown !== null && isManualReleaseId(shown.albumId);

  const cover = useQuery({
    queryKey: ["albumCovers", shown === null ? [] : [shown.albumId]],
    enabled: shown !== null && !manual,
    staleTime: 60 * 60 * 1000,
    queryFn: () => lookupAlbumCovers([shown?.albumId ?? ""]),
  });

  const picture = useQuery({
    queryKey: ["wish-photo", wishId],
    queryFn: async () => {
      const photo = (await store.listWishPhotos([wishId])).get(wishId);
      if (photo === undefined) return null;
      const bytes = await store.getPhotoBytes(photo.id);
      return bytes === undefined ? null : URL.createObjectURL(bytes);
    },
  });

  /**
   * Where this entry sits in the hand-built order, or null when nobody has placed it.
   *
   * Null is not position 0: an entry added since the last drag has never been placed by
   * hand, and saying "1st" about it would be inventing a decision nobody made.
   */
  const position =
    shown === null || shown.sortIndex === null
      ? null
      : sortWishlist(wishlist.data ?? [], "MANUAL").findIndex((item) => item.id === shown.id) + 1;

  /**
   * How many records by this artist are already on the shelf.
   *
   * Matched on the artist's name, because a wish carries no artist id — so it is a
   * footnote and not a link to somewhere.
   */
  const alsoOwned = useQuery({
    queryKey: ["wishAlsoOwned", shown?.artistName ?? ""],
    enabled: shown !== null,
    queryFn: async () => {
      const artist = shown?.artistName.trim().toLowerCase();
      if (artist === undefined || artist === "") return 0;
      const copies = await store.listCopies();
      const releases = await store.getReleases(copies.map((copy) => copy.releaseId));
      return copies.filter(
        (copy) => releases.get(copy.releaseId)?.artistName.trim().toLowerCase() === artist,
      ).length;
    },
  });

  /**
   * The album's pressings, asked for only when somebody asks (16m).
   *
   * A second request that can take a second or two and can fail, for a list that is
   * reference material — a wish names the album, not a press — so it never runs on open
   * and nothing on the entry waits for it.
   */
  const [pressingsWanted, setPressingsWanted] = useState(false);
  const pressings = useQuery({
    queryKey: ["pressings", shown?.albumId ?? ""],
    enabled: pressingsWanted && shown !== null && !manual,
    retry: false,
    staleTime: 60 * 60 * 1000,
    queryFn: () => lookupPressings(shown?.albumId ?? ""),
  });
  const [showAllPressings, setShowAllPressings] = useState(false);

  const write = async (patch: Parameters<typeof applyWishPatch>[1]) => {
    if (entry === null) return;
    await store.putWishlistItem(applyWishPatch(entry, patch, clock));
    await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };

  /** The note lands when typing stops, not on every keystroke. */
  useEffect(() => {
    if (note === null || entry === null) return;
    const trimmed = note.trim();
    const cleaned = trimmed === "" ? null : trimmed;
    if (cleaned === entry.note) return;
    const timer = setTimeout(() => void write({ note: cleaned }), NOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  /**
   * Whether the entry left because this modal removed it.
   *
   * Kept past the mutation settling: between the write and the close animation the entry
   * is already gone from the list, and without this the modal would spend that moment
   * announcing that somebody else had filed a copy — the wrong news, briefly, every time.
   */
  const [removedHere, setRemovedHere] = useState(false);

  const remove = useMutation({
    mutationFn: async () => {
      if (entry === null) return;
      setRemovedHere(true);
      const now = Date.now();
      await store.putWishlistItem(tombstoneWishlistItem(entry, clock, now));
      // The picture goes with it: a wish id is never reused, so one left behind is bytes
      // nothing can reference again.
      const held = (await store.listWishPhotos([entry.id])).get(entry.id);
      if (held !== undefined) await store.putPhoto(tombstonePhoto(held, clock, now));
      offer({
        kind: "WISH",
        wishId: entry.id,
        title: entry.title,
        wantedSince: entry.createdAt,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      await queryClient.invalidateQueries({ queryKey: ["wish-photos"] });
      onClose();
    },
  });

  /**
   * True once the entry has left the list underneath the reader (16r).
   *
   * Never for a removal of our own: that entry is gone because this modal removed it,
   * which is a different piece of news and gets 16q's footer instead.
   */
  const satisfied = opened !== null && entry === null && !remove.isPending && !removedHere;

  /**
   * The copy that took this entry off the list, when there is one to point at (16r).
   *
   * Matched through the album rather than remembered: the copy was filed on another
   * device, so this one only learns about it when it arrives.
   */
  const satisfiedBy = useQuery({
    queryKey: ["wishSatisfiedBy", shown?.albumId ?? ""],
    enabled: satisfied && shown !== null,
    queryFn: async () => {
      const copies = await store.listCopiesInReleaseGroup(shown?.albumId ?? "");
      return [...copies].sort((a, b) => b.createdAt - a.createdAt)[0]?.id ?? null;
    },
  });

  return {
    entry: shown,
    loading: wishlist.isLoading && shown === null,
    manual,
    /** The catalogue's answer for the album, and the picture somebody uploaded for it. */
    coverArtUrl: shown === null ? null : (cover.data?.get(shown.albumId) ?? null),
    pictureSrc: picture.data ?? null,
    coverPending: !manual && cover.isFetching,
    position,
    alsoOwned: alsoOwned.data ?? 0,
    note: noteValue,
    setNote,
    setFormat: (format: WishFormat | null) => void write({ desiredFormat: format }),
    pressingsState: ((): PressingsState => {
      if (manual) return "UNAVAILABLE";
      if (!pressingsWanted) return "IDLE";
      if (pressings.isError) return "FAILED";
      if (pressings.isFetching) return "LOADING";
      return "LOADED";
    })(),
    pressings: (pressings.data ?? []) as readonly Release[],
    pressingsShown: showAllPressings ? (pressings.data ?? []).length : PRESSINGS_PREVIEW,
    lookUpPressings: () => setPressingsWanted(true),
    retryPressings: () => void pressings.refetch(),
    hidePressings: () => {
      setPressingsWanted(false);
      setShowAllPressings(false);
    },
    showAllPressings: () => setShowAllPressings(true),
    confirmingRemoval,
    askToRemove: () => setConfirmingRemoval(true),
    cancelRemoval: () => setConfirmingRemoval(false),
    remove: () => remove.mutate(),
    removing: remove.isPending,
    satisfied,
    satisfiedCopyId: satisfiedBy.data ?? null,
  };
}

/** How many pressings the box shows before "Show N more" (16m). */
const PRESSINGS_PREVIEW = 3;
