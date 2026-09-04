import { useSectionActive } from "@/components/layout/navActive";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { CircleUser, Heart, LibraryBig, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * The four tabs the 224px sidebar becomes under 640px — screen 24a.
 *
 * It is the same three destinations the sidebar had plus "You", which is where everything
 * that used to sit in the sidebar's footer menu went. Four is the ceiling: a fifth tab on
 * a 390px screen gives every label under 78px, and "Benachrichtigungen" does not fit in
 * 78px in any weight.
 *
 * Not fixed-positioned. It is the last row of the shell's flex column, so it sits above
 * whatever Safari draws at the bottom rather than under it — the tab bar is part of the
 * page, and the browser's own bar is the browser's.
 */
export function TabBar() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("nav.tabs")}
      className={cn(
        "flex flex-none border-t border-line bg-paper/94 backdrop-blur-md sm:hidden",
        // The inset, not a margin: the bar's own background has to reach the bottom edge,
        // and only its contents move up out of the home indicator's way.
        "pb-safe",
      )}
    >
      <Tab
        to="/"
        alsoActiveOn={["/copies"]}
        icon={<LibraryBig size={20} strokeWidth={1.75} aria-hidden />}
      >
        {t("nav.library")}
      </Tab>
      <Tab to="/wishlist" icon={<Heart size={20} strokeWidth={1.75} aria-hidden />}>
        {t("nav.wishlist")}
      </Tab>
      <Tab to="/friends" icon={<Users size={20} strokeWidth={1.75} aria-hidden />}>
        {t("nav.friends")}
      </Tab>
      <Tab to="/you" icon={<CircleUser size={20} strokeWidth={1.75} aria-hidden />}>
        {t("nav.you")}
      </Tab>
    </nav>
  );
}

/**
 * One class list, so the router's own match and ours cannot drift apart.
 *
 * Ink, not accent (25a). Rust was doing two jobs at once here: it is the colour of a link
 * and of the wording next to a deletion, and a tab bar in which one of four cells is
 * permanently rust reads as one cell being a warning. The active tab is the darkest thing
 * in the row instead, which is what the native app settled on.
 */
const ACTIVE_TAB = "text-ink [&_span]:font-semibold";

function Tab({
  to,
  alsoActiveOn,
  icon,
  children,
}: {
  readonly to: string;
  /** Sections that live outside this entry's own path — a record, opened from the shelf. */
  readonly alsoActiveOn?: readonly string[];
  readonly icon: ReactNode;
  readonly children: ReactNode;
}) {
  const active = useSectionActive(alsoActiveOn === undefined ? [] : [to, ...alsoActiveOn]);
  return (
    <Link
      to={to}
      // 56px, which clears the 44px minimum on its own — the label under the icon is not a
      // tap target of its own, so the whole cell has to be one.
      className={cn(
        "flex h-14 flex-1 flex-col items-center justify-center gap-[5px] text-ink-muted",
        active && ACTIVE_TAB,
      )}
      activeProps={{ className: ACTIVE_TAB }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon}
      {/* 10px, the native app's size. The German labels this was shrunk for are the long
          case, not the default: "Wunschliste" is eleven characters in a 97px cell and
          wraps to nothing at 10px either, and the icon above it is what is actually read
          in both languages. */}
      <span className="text-[10px] font-medium tracking-[0.01em]">{children}</span>
    </Link>
  );
}
