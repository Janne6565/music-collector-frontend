import { type ReactNode, useId } from "react";

interface FieldProps {
  readonly label: string;
  /** Replaces the label while it stands, in the accent — the mistake is where you look. */
  readonly error?: string | null;
  /** A quiet marker beside the label for the fields a form will not save without. */
  readonly required?: boolean;
  readonly className?: string;
  readonly children: (id: string) => ReactNode;
}

/**
 * A labelled form field, in the deck's monospace-eyebrow style.
 *
 * The label owns the generated id and hands it to the control, so every field is properly
 * associated without each call site inventing one. Shared by the copy details dialog (8d,
 * 12b) and manual entry (14b) — two forms drawing the same rows two ways is how they start
 * disagreeing about what a copy can say.
 */
export function Field({ label, error = null, required = false, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`font-mono text-[10px] uppercase tracking-[0.1em] ${error === null ? "text-ink-subtle" : "text-accent"}`}
      >
        {error ?? label}
        {required && error === null && (
          <span aria-hidden className="ml-1 text-accent">
            ·
          </span>
        )}
      </label>
      <div className="mt-1.5">{children(id)}</div>
    </div>
  );
}
