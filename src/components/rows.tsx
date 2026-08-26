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
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon !== undefined && <span className="flex-none text-ink-subtle">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="truncate text-[11.5px] text-ink-muted">{body}</div>
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
      className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 no-underline transition-colors duration-(--mc-quick) last:border-b-0 hover:bg-canvas"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex-none text-ink-subtle">{icon}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="truncate text-[11.5px] text-ink-muted">{body}</div>
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
