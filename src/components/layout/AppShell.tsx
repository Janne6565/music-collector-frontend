import { SidebarAccount } from "@/features/auth/SidebarAccount";
import type { CollectionStats } from "@janne6565/music-collector-shared";
import { FORMAT_LABELS, OPERATOR } from "@janne6565/music-collector-shared";
import { Link } from "@tanstack/react-router";
import { Heart, LibraryBig, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface AppShellProps {
  readonly stats: CollectionStats | undefined;
  readonly children: ReactNode;
}

/** The sidebar layout from screen 1f, shared by the library and the item detail. */
export function AppShell({ stats, children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-paper text-ink">
      <Sidebar stats={stats} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function Sidebar({ stats }: { readonly stats: CollectionStats | undefined }) {
  const { t } = useTranslation();
  return (
    /*
     * Outside the route transition. It is the same element on both routes, and a sidebar
     * that blinks when the pane beside it changes is the fastest way to make a cross-fade
     * look like a page load. Its own view-transition-name is what takes it out of the
     * root's group.
     */
    <nav className="mc-vt-sidebar flex w-56 flex-none flex-col gap-6 border-r border-line p-4 pt-5">
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
        <SidebarLink to="/friends" icon={<Users size={15} strokeWidth={1.75} aria-hidden />}>
          {t("nav.friends")}
        </SidebarLink>
        {/* Artists and Settings from screen 1f are not built yet. A link to a route that
            does not exist is worse than no link, so they appear when they work. */}
      </div>
      {stats !== undefined && <FormatCounts stats={stats} />}
      <SidebarAccount copyCount={stats?.copyCount} />
      <LegalFooter />
    </nav>
  );
}

/**
 * The three links § 5 DDG and Art. 13 DSGVO expect to be reachable from every page.
 *
 * In the sidebar's footer rather than a page footer: the app's panes scroll on their own,
 * so a footer under the content is a footer nobody reaches. The sidebar is on every screen
 * and always ends in the same place.
 */
function LegalFooter() {
  const { t } = useTranslation();
  return (
    /* No mt-auto of its own: SidebarAccount above already claims the free space, and a
       second auto margin would split it between the two and leave a gap. */
    <div className="flex flex-col gap-2.5 pt-4">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11.5px] text-ink-muted">
        <LegalLink doc="impressum">{t("legal.impressum")}</LegalLink>
        <LegalLink doc="datenschutz">{t("legal.privacyShort")}</LegalLink>
        <LegalLink doc="nutzungsbedingungen">{t("legal.termsShort")}</LegalLink>
      </div>
      <div className="text-[10.5px] text-ink-subtle">
        {t("legal.copyright", { year: new Date().getFullYear(), name: OPERATOR.name })}
      </div>
    </div>
  );
}

function LegalLink({ doc, children }: { readonly doc: string; readonly children: ReactNode }) {
  return (
    <Link
      to="/legal/$doc"
      params={{ doc }}
      className="border-b border-ink/15 transition-colors duration-(--mc-quick) hover:border-ink/35 hover:text-ink"
      activeProps={{ className: "border-ink/25 font-semibold text-ink" }}
    >
      {children}
    </Link>
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
      className="flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] font-medium text-ink/65 transition-colors duration-(--mc-quick) hover:bg-surface"
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
