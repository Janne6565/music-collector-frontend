import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * The way back on the pages that sit a level below the four tabs — 24h.
 *
 * Those pages give up the tab bar: five destinations with none of them lit is worse than
 * none, and the way out of Settings is *back*, not sideways. Above 640px this is the same
 * quiet breadcrumb strip the pages have always had, because there the sidebar is still
 * beside it and nobody needs a second way home.
 */
export function BackBar({
  to,
  label,
  children,
}: {
  /** Where "back" goes on a phone. Almost always the You tab these pages hang off. */
  readonly to: string;
  /** What that destination is called, spelled — a bare chevron says nothing. */
  readonly label: string;
  /** The page's own trailing content, e.g. Account's sign-out button. */
  readonly children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <header className="flex h-13 flex-none items-center justify-between gap-3 border-b border-line px-4 sm:h-auto sm:px-8 sm:py-4">
      <Link
        to={to}
        className="flex min-w-0 items-center gap-1 text-[12.5px] font-medium text-ink-muted hover:text-ink"
        aria-label={t("common.backTo", { page: label })}
      >
        <ChevronLeft size={16} strokeWidth={2} className="flex-none sm:hidden" aria-hidden />
        <span className="truncate">{label}</span>
      </Link>
      {children}
    </header>
  );
}
