import { cn } from "@/lib/utils";

interface ToggleProps {
  readonly checked: boolean;
  readonly onChange?: (checked: boolean) => void;
  readonly label: string;
  /** Explains why the control cannot move, and is read out with the label. */
  readonly disabledReason?: string;
}

/**
 * The pill switch from screens 7a and 8b.
 *
 * A real checkbox underneath rather than a styled div: it keeps keyboard focus, the
 * checked state and the accessible role without any of it having to be re-implemented.
 */
export function Toggle({ checked, onChange, label, disabledReason }: ToggleProps) {
  const disabled = onChange === undefined;
  return (
    <label
      className={cn(
        "relative inline-flex h-[22px] w-[38px] flex-none items-center rounded-full p-0.5 transition-colors duration-(--mc-quick)",
        checked ? "bg-ink" : "bg-line",
        disabled ? "cursor-default opacity-60" : "cursor-pointer",
      )}
      title={disabledReason}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        aria-label={disabledReason === undefined ? label : `${label}, ${disabledReason}`}
        className="peer absolute inset-0 cursor-inherit opacity-0"
      />
      <span
        aria-hidden
        className={cn(
          "h-[18px] w-[18px] rounded-full bg-surface shadow-sm transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
          checked && "translate-x-4",
        )}
      />
    </label>
  );
}
