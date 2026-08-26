import { cn } from "@/lib/utils";
import { OPERATOR } from "@janne6565/music-collector-shared";
import { Link } from "@tanstack/react-router";
import { LogOut, Settings, User } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface SignOutControl {
  readonly run: () => void;
  readonly pending: boolean;
}

interface AccountMenuProps {
  readonly id: string;
  /** Closes the menu once a link has been followed — the sidebar itself never unmounts. */
  readonly onNavigate: () => void;
  /** Absent for a guest: there is no account page to open and nothing to sign out of. */
  readonly signOut?: SignOutControl;
}

/**
 * The account menu from screen 19a, opening upward out of the sidebar's footer.
 *
 * Impressum, Datenschutz and AGB used to be a second footer under the account card, which
 * gave the sidebar two stacked blocks with two borders. They are rarely-clicked links, so
 * one click deep is the right depth — and putting sign-out in here too means the account
 * row no longer needs a control beside it either.
 */
export function AccountMenu({ id, onNavigate, signOut }: AccountMenuProps) {
  const { t } = useTranslation();
  return (
    <div
      id={id}
      role="menu"
      className={cn(
        "absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-[11px]",
        "border border-line bg-surface p-1.5 shadow-[0_14px_32px_rgba(25,23,19,.16)]",
      )}
    >
      {signOut !== undefined && (
        <>
          <MenuLink to="/account" onNavigate={onNavigate}>
            <User size={14} strokeWidth={1.75} className="flex-none text-ink-subtle" aria-hidden />
            {t("account.title")}
          </MenuLink>
          {/* Designed in 19a, not built: there is no settings route yet. Shown disabled and
              labelled rather than dropped, so the menu matches the deck and says why. */}
          <button
            type="button"
            role="menuitem"
            disabled
            className={cn(itemClassName, "w-full cursor-default text-ink-subtle")}
          >
            <Settings size={14} strokeWidth={1.75} className="flex-none" aria-hidden />
            {t("nav.settings")}
            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.08em]">
              {t("account.menu.soon")}
            </span>
          </button>
          <Divider />
        </>
      )}

      <div className="px-2.5 pb-1 pt-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-subtle">
        {t("legal.section")}
      </div>
      <MenuLink to="/legal/$doc" params={{ doc: "impressum" }} onNavigate={onNavigate}>
        {t("legal.impressum")}
      </MenuLink>
      <MenuLink to="/legal/$doc" params={{ doc: "datenschutz" }} onNavigate={onNavigate}>
        {t("legal.privacyShort")}
      </MenuLink>
      <MenuLink to="/legal/$doc" params={{ doc: "nutzungsbedingungen" }} onNavigate={onNavigate}>
        {t("legal.termsShort")}
      </MenuLink>

      {signOut !== undefined && (
        <>
          <Divider />
          <button
            type="button"
            role="menuitem"
            onClick={signOut.run}
            disabled={signOut.pending}
            className={cn(itemClassName, "w-full hover:bg-canvas disabled:opacity-50")}
          >
            <LogOut
              size={14}
              strokeWidth={1.75}
              className="flex-none text-ink-subtle"
              aria-hidden
            />
            {t("auth.signOut")}
          </button>
        </>
      )}

      <div className="px-2.5 pb-1 pt-2 text-[10px] text-ink-subtle">
        {t("legal.copyright", { year: new Date().getFullYear(), name: OPERATOR.name })}
      </div>
    </div>
  );
}

const itemClassName =
  "flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[12.5px] font-medium text-ink/75 transition-colors duration-(--mc-quick)";

function Divider() {
  return <div className="my-1.5 h-px bg-line" />;
}

interface MenuLinkProps {
  readonly to: string;
  readonly params?: Record<string, string>;
  readonly onNavigate: () => void;
  readonly children: ReactNode;
}

function MenuLink({ to, params, onNavigate, children }: MenuLinkProps) {
  return (
    <Link
      to={to}
      params={params}
      role="menuitem"
      onClick={onNavigate}
      className={cn(itemClassName, "hover:bg-canvas hover:text-ink")}
      activeProps={{ className: "bg-canvas font-semibold text-ink" }}
    >
      {children}
    </Link>
  );
}
