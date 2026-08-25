import { lookupAlbumCovers, searchReleases } from "@/api/releases";
import { useStore } from "@/local/StoreProvider";
import type { Release, WishFormat, WishlistItem } from "@janne6565/music-collector-shared";
import {
  applyWishPatch,
  asWishFormat,
  createPhoto,
  createWishlistItem,
  isManualReleaseId,
  manualReleaseId,
  tombstonePhoto,
} from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

/** Kept in step with the add sheet: one field standing still means one request, not eleven. */
const DEBOUNCE_MS = 350;

/** What a file picker produces, matching the server's allowlist. */
const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
/** The server's own cap. Refusing here makes it a sentence rather than a 413 later. */
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
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
  /**
   * The artwork of the pressing that was picked, when one was.
   *
   * Carried rather than looked up again: the search row the reader just clicked was already
   * showing this cover, and asking the server for the album's cover a second time would
   * blank the tile for a moment to arrive at the same picture. Null for an entry reopened
   * to edit and for a hand-typed one, which is what `albumCover` is for.
   */
  readonly coverArtUrl: string | null;
}

function subjectOf(release: Release): WishSubject {
  return {
    albumId: release.albumId,
    title: release.title,
    artistName: release.artistName,
    year: release.year,
    label: release.label,
    coverArtUrl: release.coverArtUrl,
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
          coverArtUrl: null,
        }
      : seed !== null
        ? subjectOf(seed)
        : null,
  );
  const [format, setFormat] = useState<WishFormat | null>(
    existing !== null ? asWishFormat(existing.desiredFormat) : asWishFormat(seed?.format ?? null),
  );
  const [note, setNote] = useState(existing?.note ?? "");

  /**
   * A picture chosen for a record no catalogue has, held until there is a wish to hang it
   * on. It is written when the sheet is saved, not when the file is picked: an image
   * attached to an entry somebody then abandoned is bytes nothing will ever reference.
   */
  const [image, setImage] = useState<{ readonly file: File; readonly url: string } | null>(null);
  const [imageRejected, setImageRejected] = useState<"type" | "size" | null>(null);

  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");

  /** Hand-typed fields, for the record no search will ever return. */
  const [typed, setTyped] = useState({ title: "", artistName: "", year: "" });

  /**
   * The album's artwork, for a subject that arrived without a pressing's.
   *
   * An entry reopened to edit knows only its album, and the sheet showing a blank sleeve
   * for a record whose cover the list beside it is drawing reads as a loading state that
   * never finishes. Skipped entirely when the picked release already brought one, and for
   * a hand-typed album, which no catalogue can answer for.
   */
  /**
   * The picture already on a hand-entered entry the sheet was reopened on.
   *
   * Keyed in the singular, and deliberately not under `wish-photos`: that key belongs to
   * the list's hook, which caches a Map of many. Sharing it meant this query read back an
   * empty Map — an object, therefore not null — and the sheet believed it had a picture.
   */
  const ownPhoto = useQuery({
    queryKey: ["wish-photo", existing?.id ?? ""],
    enabled: existing !== null,
    queryFn: async () => {
      const photo = (await store.listWishPhotos([existing?.id ?? ""])).get(existing?.id ?? "");
      if (photo === undefined) return null;
      const bytes = await store.getPhotoBytes(photo.id);
      return bytes === undefined ? null : URL.createObjectURL(bytes);
    },
  });

  const albumCover = useQuery({
    queryKey: ["albumCovers", subject === null ? [] : [subject.albumId]],
    enabled:
      subject !== null && subject.coverArtUrl === null && !isManualReleaseId(subject.albumId),
    staleTime: 60 * 60 * 1000,
    queryFn: () => lookupAlbumCovers([subject?.albumId ?? ""]),
  });

  // The preview pins its blob until revoked, and the sheet outlives several choices.
  useEffect(
    () => () => {
      if (image !== null) URL.revokeObjectURL(image.url);
    },
    [image],
  );

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

  /**
   * Writes the chosen picture against a wish that now exists.
   *
   * Bytes first, like every other photo: a record whose image is missing renders as a
   * permanent placeholder, whereas bytes with no record are merely unreferenced. The
   * previous picture is tombstoned rather than overwritten — a photo id points at one
   * image forever, and the upload of the new one has not happened yet.
   */
  const attachImage = async (wishId: string) => {
    if (image === null) return;
    const previous = (await store.listWishPhotos([wishId])).get(wishId);
    const id = crypto.randomUUID();
    await store.putPhotoBytes(id, await image.file.arrayBuffer(), image.file.type);
    await store.putPhoto(
      createPhoto(
        { wishId, contentType: image.file.type, byteSize: image.file.size, sortIndex: 0 },
        clock,
        Date.now(),
        id,
      ),
    );
    if (previous !== undefined) {
      await store.putPhoto(tombstonePhoto(previous, clock, Date.now()));
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = note.trim();
      const cleaned = trimmed === "" ? null : trimmed;

      if (existing !== null) {
        await store.putWishlistItem(
          applyWishPatch(existing, { desiredFormat: format, note: cleaned }, clock),
        );
        await attachImage(existing.id);
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
        await attachImage(already.id);
        return;
      }

      const wishId = crypto.randomUUID();
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
          wishId,
        ),
      );
      await attachImage(wishId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      await queryClient.invalidateQueries({ queryKey: ["wish-photos"] });
      await queryClient.invalidateQueries({ queryKey: ["wish-photo"] });
      onDone();
    },
  });

  const typedYear = Number.parseInt(typed.year, 10);

  return {
    step,
    subject,
    /** The catalogue's answer: the picked pressing's cover, else the album's. */
    subjectCoverArtUrl:
      subject === null
        ? null
        : (subject.coverArtUrl ?? albumCover.data?.get(subject.albumId) ?? null),
    /**
     * The device's own picture: the file being chosen right now, else the one already saved.
     *
     * The unsaved choice outranks the saved one on purpose — picking a file and watching
     * the tile keep the old picture is the app telling you it did not hear you — and both
     * outrank the catalogue, which for a hand-entered record has nothing to say anyway.
     */
    subjectPictureSrc: image?.url ?? ownPhoto.data ?? null,
    /**
     * Whether this entry can carry a picture of its own.
     *
     * Only a record no catalogue has: everything else resolves its album's cover from the
     * mirror, and two sources for one tile would need a precedence rule nobody asked for.
     */
    canUploadImage: subject !== null && isManualReleaseId(subject.albumId),
    imageRejected,
    chooseImage: (file: File) => {
      setImageRejected(null);
      if (!ACCEPTED_IMAGES.includes(file.type)) {
        setImageRejected("type");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageRejected("size");
        return;
      }
      setImage({ file, url: URL.createObjectURL(file) });
    },
    acceptedImages: ACCEPTED_IMAGES.join(","),
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
        // A record no catalogue has cannot have catalogue artwork either.
        coverArtUrl: null,
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
