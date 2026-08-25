import { cn } from "@/lib/utils";
import { DURATION } from "@janne6565/music-collector-shared";
import { X } from "lucide-react";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * How anything inside a sheet closes it.
 *
 * Calling the caller's own `onClose` would unmount the dialog on the spot and there would
 * be no element left to run the exit on — so every control that dismisses goes through
 * here instead, and the sheet leaves the same way whichever one was used.
 */
interface ModalControls {
  readonly dismiss: () => void;
  /** True while a backdrop click has just been refused, so Save can say where to look. */
  readonly refused: boolean;
}

const ModalContext = createContext<ModalControls | null>(null);

export function useModalDismiss(fallback?: () => void): () => void {
  const controls = useContext(ModalContext);
  return controls?.dismiss ?? fallback ?? (() => undefined);
}

/** Whether the sheet has just refused to close, for the control that would let it. */
export function useModalRefused(): boolean {
  return useContext(ModalContext)?.refused ?? false;
}

interface ModalProps {
  readonly onClose: () => void;
  readonly labelledBy: string;
  readonly width: string;
  /**
   * Whether a backdrop click should be refused.
   *
   * A dialog holding unsaved edits does not vanish because the mouse landed beside it; it
   * nudges instead. Escape and the close button still go through — those are decisions,
   * where a stray click is an accident.
   */
  readonly holdOnBackdrop?: boolean;
  readonly children: ReactNode;
}

/**
 * The dimmed-library sheet from screens 6a and 12b, and turn 13's Lift.
 *
 * Built on <dialog> rather than a hand-rolled overlay: the browser supplies the focus
 * trap, the inert background, Escape to close and the top layer, none of which are worth
 * re-implementing badly.
 *
 * The entrance is `@starting-style`, so the browser animates from a state that never
 * renders; the exit has to be run by hand, because the caller unmounts this component and
 * an element that is gone cannot transition. Every dismissal — the close button, Escape,
 * the backdrop, saving — takes the same 120ms exit. Nothing is faster: a keypress that
 * skips the animation reads as a crash.
 */
export function Modal({ onClose, labelledBy, width, holdOnBackdrop, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const [nudging, setNudging] = useState(false);
  /**
   * Where the gesture that is about to become a click started.
   *
   * Only a press that both started and ended outside the panel closes the sheet. Without
   * this, selecting the text in a field and releasing the mouse past the panel's edge
   * reads as a backdrop click and throws away what was being typed.
   */
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  /** Plays the exit, then hands over to the caller, which is what actually unmounts us. */
  const dismiss = useCallback(() => {
    setClosing((already) => {
      if (already) return already;
      window.setTimeout(onClose, DURATION.quick);
      return true;
    });
  }, [onClose]);

  const refuse = useCallback(() => {
    setNudging(true);
    window.setTimeout(() => setNudging(false), DURATION.quick * 2);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      data-closing={closing}
      // Escape fires `cancel`, and closing has to go through the caller so its state and
      // the dialog's visibility cannot drift apart.
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className={cn(
        "mc-lift-backdrop m-0 max-h-none max-w-none bg-transparent p-0",
        "fixed inset-0 h-full w-full",
      )}
    >
      {/*
       * The backdrop is this element, not the <dialog>: it is stretched over the whole
       * viewport to centre the panel, so every click outside the panel lands here and
       * never reaches the dialog itself. Comparing target with currentTarget is what
       * separates "the padding around the panel" from "anything inside it" — and unlike
       * a `contains` check it stays right when the clicked control unmounts itself.
       */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard gesture for this is
          Escape, which the browser already delivers to the dialog as `cancel`. */}
      <div
        className="flex h-full items-start justify-center p-6 pt-[70px]"
        onMouseDown={(event) => {
          pressedBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (pressedBackdrop.current && event.target === event.currentTarget) {
            if (holdOnBackdrop === true) refuse();
            else dismiss();
          }
          pressedBackdrop.current = false;
        }}
      >
        <ModalContext.Provider value={{ dismiss, refused: nudging }}>
          <div
            data-closing={closing}
            className={cn(
              "mc-lift flex max-h-full w-full flex-col overflow-hidden rounded-[14px]",
              "bg-paper text-ink shadow-[0_24px_60px_rgba(25,23,19,.28)]",
              nudging && "mc-nudge",
            )}
            style={{ maxWidth: width }}
          >
            {children}
          </div>
        </ModalContext.Provider>
      </div>
    </dialog>
  );
}

/** The close button the sheets put in their own header, so it sits with the title. */
export function ModalClose({
  onClose,
  label,
}: {
  readonly onClose: () => void;
  readonly label: string;
}) {
  const dismiss = useModalDismiss(onClose);
  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 flex-none items-center justify-center rounded-[7px]",
        "bg-ink/5 text-ink-muted transition-colors duration-(--mc-quick) hover:bg-ink/10",
      )}
    >
      <X size={15} strokeWidth={1.9} aria-hidden />
    </button>
  );
}
