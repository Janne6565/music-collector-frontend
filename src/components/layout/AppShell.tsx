import type { CollectionStats } from "@/domain/types";
import { FORMAT_LABELS } from "@/domain/types";
import { SidebarAccount } from "@/features/auth/SidebarAccount";
import { Link } from "@tanstack/react-router";
import { Heart, LibraryBig } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface AppShellProps {
  readonly stats: CollectionStats | undefined;
  /**
   * Filters that belong to the page under the shell rather than to the shell itself — the
   * grade rail screen 1f draws below the format counts. Only the library has one, which is
   * exactly why it is passed in instead of living here.
   */
  readonly rail?: ReactNode;
  readonly children: ReactNode;
}

/** The sidebar layout from screen 1f, shared by the library and the item detail. */
export function AppShell({ stats, rail, children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-paper text-ink">
      <Sidebar stats={stats} rail={rail} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function Sidebar({
  stats,
  rail,
}: { readonly stats: CollectionStats | undefined; readonly rail: ReactNode }) {
  const { t } = useTranslation();
  return (
    <nav className="flex w-56 flex-none flex-col gap-6 border-r border-line p-4 pt-5">
      <div className="font-serif text-xl leading-none">{t("app.name")}</div>
      <div className="flex flex-col gap-0.5">
        <SidebarLink
          to="/"
          icon={<LibraryBig size={15} strokeWidth={1.75} aria-hidden />}
          count={stats?.copyCount}
        >
          {t("nav.library")}
        </SidebarLink>
        <SidebarLink to="/wishlist" icon={<Heart size={15} strokeWidth={1.75} aria-hidden />}>
          {t("nav.wishlist")}
        </SidebarLink>
        {/* Artists and Settings from screen 1f are not built yet. A link to a route that
            does not exist is worse than no link, so they appear when they work. */}
      </div>
      {stats !== undefined && <FormatCounts stats={stats} />}
      {rail}
      <SidebarAccount copyCount={stats?.copyCount} />
    </nav>
  );
}

function FormatCounts({ stats }: { readonly stats: CollectionStats }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="px-2.5 pb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
        {t("library.formats")}
      </div>
      {(["VINYL", "CD", "CASSETTE", "DIGITAL"] as const).map((format) => (
        <div
          key={format}
          className="flex items-center justify-between px-2.5 py-1.5 text-[12.5px] font-medium text-ink/70"
        >
          {FORMAT_LABELS[format]}
          <span className="font-mono text-[11px] text-ink-subtle">{stats.byFormat[format]}</span>
        </div>
      ))}
    </div>
  );
}

interface SidebarLinkProps {
  readonly to: string;
  readonly icon: ReactNode;
  readonly count?: number;
  readonly children: ReactNode;
}

function SidebarLink({ to, icon, count, children }: SidebarLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] font-medium text-ink/65 transition-colors hover:bg-surface"
      activeProps={{
        className: "bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(25,23,19,.06)]",
      }}
      activeOptions={{ exact: to === "/" }}
    >
      <span className="flex items-center gap-2.5">
        {icon}
        {children}
      </span>
      {count !== undefined && (
        <span className="font-mono text-[11px] text-ink-subtle">{count}</span>
      )}
    </Link>
  );
}
