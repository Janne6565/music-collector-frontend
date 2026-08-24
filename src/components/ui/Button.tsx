import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly loading?: boolean;
  readonly variant?: "primary" | "secondary";
  readonly children: ReactNode;
}

/**
 * Every control that fires a request goes through here: `loading` both disables the
 * button and shows the spinner, so no caller hand-rolls a `busy` boolean.
 */
export function Button({
  loading = false,
  variant = "primary",
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled === true || loading}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ink text-paper hover:bg-black",
        variant === "secondary" && "border border-line bg-surface text-ink hover:bg-canvas",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
