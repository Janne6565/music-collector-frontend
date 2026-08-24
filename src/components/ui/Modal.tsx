import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  readonly onClose: () => void;
  readonly labelledBy: string;
  readonly width: string;
  readonly children: ReactNode;
}

/**
 * The dimmed-library sheet from screens 6a and 8d.
 *
 * Built on <dialog> rather than a hand-rolled overlay: the browser supplies the focus
 * trap, the inert background, Escape to close and the top layer, none of which are worth
 * re-implementing badly.
 */
export function Modal({ onClose, labelledBy, width, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
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

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      // Escape fires `cancel`, and closing has to go through the caller so its state and
      // the dialog's visibility cannot drift apart.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/35",
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
          if (pressedBackdrop.current && event.target === event.currentTarget) onClose();
          pressedBackdrop.current = false;
        }}
      >
        <div
          className="flex max-h-full w-full flex-col overflow-hidden rounded-[14px] bg-paper text-ink shadow-[0_24px_60px_rgba(25,23,19,.28)]"
          style={{ maxWidth: width }}
        >
          {children}
        </div>
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
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] bg-ink/5 text-ink-muted hover:bg-ink/10"
    >
      <X size={15} strokeWidth={1.9} aria-hidden />
    </button>
  );
}
