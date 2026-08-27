import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The furniture the settings-shaped pages are built from.
 *
 * Lifted out of the account page when Settings (20b) arrived: the two screens are the same
 * list of labelled rows in bordered cards, and two copies of it would drift the moment one
 * of them changed a padding.
 */

export function SectionTitle({ children }: { readonly children: ReactNode }) {
  return (
    <h2 className="mt-8 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
      {children}
    </h2>
  );
}

export function Card({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface">
      {children}
    </div>
  );
}

export interface RowProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly body: string;
  readonly trailing?: ReactNode;
}

export function Row({ icon, title, body, trailing }: RowProps) {
  return (
    /*
     * 24k: the control drops onto a line of its own under 640px.
     *
     * The deck asks for that only where the label is wider than half the row, which is a
     * measurement no stylesheet can make — and which changes with the language, since the
     * German labels here run 30–40% longer than the English ones. So the phone stacks
     * every row: predictable in both languages, and never a picker squeezed into 90px
     * because a translation grew. Above 640px the row is unchanged.
     */
    <div className="flex flex-col gap-2.5 border-b border-line px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon !== undefined && <span className="flex-none text-ink-subtle">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-pretty">{title}</div>
          {/* Wraps on a phone rather than truncating: it is the sentence that says what
              the control above it does, and half of it is not the sentence. */}
          <div className="text-[11.5px] text-ink-muted max-sm:leading-[1.5] sm:truncate">
            {body}
          </div>
        </div>
      </div>
      {trailing}
    </div>
  );
}

export interface LinkRowProps {
  readonly to: string;
  readonly params?: Record<string, string>;
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: string;
}

export function LinkRow({ to, params, icon, title, body }: LinkRowProps) {
  return (
    <Link
      to={to}
      params={params}
      className="flex min-h-13 items-center justify-between gap-4 border-b border-line px-4 py-3.5 no-underline transition-colors duration-(--mc-quick) last:border-b-0 hover:bg-canvas"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex-none text-ink-subtle">{icon}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-pretty">{title}</div>
          <div className="text-[11.5px] text-ink-muted max-sm:leading-[1.5] sm:truncate">
            {body}
          </div>
        </div>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="flex-none text-ink-subtle"
      />
    </Link>
  );
}
