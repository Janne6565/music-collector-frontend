import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Heart, LibraryBig, User, Users } from "lucide-react";
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
      <Tab to="/" icon={<LibraryBig size={21} strokeWidth={2} aria-hidden />}>
        {t("nav.library")}
      </Tab>
      <Tab to="/wishlist" icon={<Heart size={21} strokeWidth={2} aria-hidden />}>
        {t("nav.wishlist")}
      </Tab>
      <Tab to="/friends" icon={<Users size={21} strokeWidth={2} aria-hidden />}>
        {t("nav.friends")}
      </Tab>
      <Tab to="/you" icon={<User size={21} strokeWidth={2} aria-hidden />}>
        {t("nav.you")}
      </Tab>
    </nav>
  );
}

function Tab({
  to,
  icon,
  children,
}: {
  readonly to: string;
  readonly icon: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <Link
      to={to}
      // 56px, which clears the 44px minimum on its own — the label under the icon is not a
      // tap target of its own, so the whole cell has to be one.
      className="flex h-14 flex-1 flex-col items-center justify-center gap-[3px] text-ink/50"
      activeProps={{ className: "text-accent [&_span]:font-semibold" }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon}
      {/* 9.5px is small, and deliberate: "Wunschliste" is eleven characters and the cell is
          97px wide at 390px. The icon above it is what is actually read. */}
      <span className="text-[9.5px] font-medium tracking-[0.01em]">{children}</span>
    </Link>
  );
}
