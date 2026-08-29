import { type AvatarCrop, removeAvatar, uploadAvatar } from "@/api/avatar";
import { type ChosenPicture, PictureRejected, readPicture } from "@/features/account/pictureFile";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The states of the one row that offers a picture (27a, 27d).
 *
 * <p>`empty` and `set` are the two resting states; everything else is a moment on the way
 * between them. The three failures are kept apart rather than folded into one "that did not
 * work", because they are three different things to do next: pick a different file, export
 * this one smaller, or come back later — and only the row knows which.
 */
export type PictureState =
  | { readonly kind: "idle" }
  | { readonly kind: "choosing" }
  | { readonly kind: "framing"; readonly picture: ChosenPicture }
  | { readonly kind: "uploading"; readonly sent: number; readonly total: number }
  | { readonly kind: "wrongType"; readonly name: string }
  | { readonly kind: "tooLarge"; readonly name: string; readonly bytes: number }
  | { readonly kind: "unavailable" };

export interface ProfilePictureLogic {
  readonly state: PictureState;
  /** The picture as it stands, which changes only on the server's word. */
  readonly url: string | null;
  /** True from the moment an upload lands until the page is left, for "Updated just now". */
  readonly justUpdated: boolean;
  readonly confirmingRemove: boolean;
  readonly pick: () => void;
  readonly chose: (file: File) => void;
  readonly cancelFraming: () => void;
  readonly confirmFraming: (crop: AvatarCrop) => void;
  readonly askRemove: () => void;
  readonly cancelRemove: () => void;
  readonly confirmRemove: () => void;
  /** Resends the picture that was already framed, for the failure that was not its fault. */
  readonly retry: () => void;
  /** Abandons an upload in flight. The picture on the account is untouched either way. */
  readonly cancelUpload: () => void;
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * @param current  where the account's picture is now, from `/auth/me`
 * @param onChange told the new URL (or null) so the header and the sidebar chip follow
 */
export function useProfilePictureLogic(
  current: string | null,
  onChange: (url: string | null) => void,
): ProfilePictureLogic {
  const [state, setState] = useState<PictureState>({ kind: "idle" });
  const [url, setUrl] = useState<string | null>(current);
  const [justUpdated, setJustUpdated] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** The framed picture, kept so "Try again" after a 502 does not ask for the file again. */
  const pending = useRef<{ picture: ChosenPicture; crop: AvatarCrop } | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  /** True while a chosen file is being decoded, which is not the same as still choosing. */
  const reading = useRef(false);

  // The picker gives no event when it is dismissed, so the row would sit on "Waiting on the
  // file picker" for as long as the page was open. Coming back to the window without a file
  // is the only signal there is that nothing was chosen.
  useEffect(() => {
    if (state.kind !== "choosing") return;
    const settle = () =>
      window.setTimeout(
        () =>
          setState((was) => (was.kind === "choosing" && !reading.current ? { kind: "idle" } : was)),
        400,
      );
    window.addEventListener("focus", settle);
    return () => window.removeEventListener("focus", settle);
  }, [state.kind]);

  // The row is told what the account has whenever the account is re-read, but never while
  // an upload of its own is in flight: the server's answer to that upload is the newer fact.
  useEffect(() => {
    if (state.kind === "idle") setUrl(current);
  }, [current, state.kind]);

  const release = useCallback((picture: ChosenPicture | undefined) => {
    if (picture !== undefined) URL.revokeObjectURL(picture.previewUrl);
  }, []);

  const send = useCallback(
    async (picture: ChosenPicture, crop: AvatarCrop) => {
      const controller = new AbortController();
      inFlight.current = controller;
      setState({ kind: "uploading", sent: 0, total: picture.upload.size });
      try {
        const avatar = await uploadAvatar(
          picture.upload,
          crop,
          (sent, total) =>
            setState({ kind: "uploading", sent, total: total === 0 ? picture.upload.size : total }),
          controller.signal,
        );
        const next = avatar.url ?? null;
        setUrl(next);
        onChange(next);
        setJustUpdated(true);
        setState({ kind: "idle" });
        release(picture);
        pending.current = null;
      } catch (error) {
        // Abandoning on purpose is not a failure, and there is nothing to say about it.
        if (controller.signal.aborted) {
          release(picture);
          setState({ kind: "idle" });
          return;
        }
        // The old picture is deliberately untouched: 27d's whole point is that a photo
        // feature being down must not read as the app being broken.
        pending.current = { picture, crop };
        setState(problemOf(error, picture));
      } finally {
        if (inFlight.current === controller) inFlight.current = null;
      }
    },
    [onChange, release],
  );

  return {
    state,
    url,
    justUpdated,
    confirmingRemove,
    inputRef,
    pick: () => {
      setState({ kind: "choosing" });
      inputRef.current?.click();
    },
    chose: (file) => {
      reading.current = true;
      void readPicture(file)
        .then((picture) => setState({ kind: "framing", picture }))
        .catch((error: unknown) => setState(problemOf(error)))
        .finally(() => {
          reading.current = false;
        });
    },
    cancelUpload: () => inFlight.current?.abort(),
    retry: () => {
      const again = pending.current;
      if (again === null) return;
      void send(again.picture, again.crop);
    },
    cancelFraming: () => {
      setState((was) => {
        // Confirming is a dismissal too — the sheet plays its exit and tells the caller it
        // closed 120ms later, by which time the upload it started is already running. So
        // this only ever resets a step that is still open, or "Use this picture" would put
        // the row back to idle a fifth of a second after it began.
        if (was.kind !== "framing") return was;
        release(was.picture);
        return { kind: "idle" };
      });
    },
    confirmFraming: (crop) => {
      if (state.kind !== "framing") return;
      void send(state.picture, crop);
    },
    askRemove: () => setConfirmingRemove(true),
    cancelRemove: () => setConfirmingRemove(false),
    confirmRemove: () => {
      setConfirmingRemove(false);
      void removeAvatar()
        .then(() => {
          setUrl(null);
          onChange(null);
          setJustUpdated(false);
          setState({ kind: "idle" });
        })
        .catch(() => setState({ kind: "unavailable" }));
    },
  };
}

/**
 * Which of 27d's three sentences this was.
 *
 * @param picture the file it was about, when the refusal came back from the server rather
 *                than from the device — so both failures can still name it.
 */
function problemOf(error: unknown, picture?: ChosenPicture): PictureState {
  if (error instanceof PictureRejected) {
    return error.problem.kind === "size"
      ? { kind: "tooLarge", name: error.problem.name, bytes: error.problem.bytes }
      : { kind: "wrongType", name: error.problem.name };
  }
  // The server's 415 and 413 land on the same two sentences the device would have said,
  // which is why they are not separate states: from where the person is standing, a limit
  // caught here and a limit caught there are one fact about the file they chose.
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 415) return { kind: "wrongType", name: picture?.name ?? "" };
  if (status === 413)
    return { kind: "tooLarge", name: picture?.name ?? "", bytes: picture?.bytes ?? 0 };
  return { kind: "unavailable" };
}
