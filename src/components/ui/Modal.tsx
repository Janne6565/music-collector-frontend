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

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    // The keyboard equivalent of the backdrop click below is Escape, which the browser
    // already delivers as `cancel`; there is no second key gesture to add.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape is handled by onCancel
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      // Escape fires `cancel`, and closing has to go through the caller so its state and
      // the dialog's visibility cannot drift apart.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clicks land on the dialog itself only in the backdrop area, since the panel
        // below stops them.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/35",
        "fixed inset-0 h-full w-full",
      )}
    >
      <div className="flex h-full items-start justify-center p-6 pt-[70px]">
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
