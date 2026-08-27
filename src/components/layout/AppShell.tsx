import { TabBar } from "@/components/layout/TabBar";
import { SidebarAccount } from "@/features/auth/SidebarAccount";
import type { CollectionStats } from "@janne6565/rekordo-shared";
import { FORMAT_LABELS } from "@janne6565/rekordo-shared";
import { Link } from "@tanstack/react-router";
import { Heart, LibraryBig, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface AppShellProps {
  readonly stats: CollectionStats | undefined;
  /**
   * What the phone gets at the bottom of the screen (24a).
   *
   * `tabs` is the four destinations. `none` is for the two kinds of screen that are a
   * level below them: the item detail, which puts its own Edit bar there, and the account
   * pages, which carry a back link at the top instead — five visible destinations with
   * none of them active is worse than none.
   *
   * Above 640px this changes nothing: the sidebar is always there.
   */
  readonly phoneBottom?: "tabs" | "none";
  readonly children: ReactNode;
}

/** The sidebar layout from screen 1f, shared by the library and the item detail. */
export function AppShell({ stats, phoneBottom = "tabs", children }: AppShellProps) {
  return (
    // h-full rather than h-screen: the height chain starts at <html> so that iOS Safari's
    // collapsing bar cannot resize the shell out from under a scroll position. See the
    // note on the chain in styles.css — under 640px no layout gets a viewport unit.
    <div className="flex h-full bg-paper text-ink">
      <Sidebar stats={stats} />
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        {phoneBottom === "tabs" && <TabBar />}
      </div>
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
     *
     * Hidden rather than unmounted under 640px so that it stays the same element across a
     * resize, and so the phone tab bar is never a second copy of a live sidebar.
     */
    <nav className="mc-vt-sidebar hidden w-56 flex-none flex-col gap-6 border-r border-line p-4 pt-5 sm:flex">
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
      {/* The legal links live in this block's menu since 19a — the sidebar used to end
          in two stacked footers, each with its own border and weight. */}
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
