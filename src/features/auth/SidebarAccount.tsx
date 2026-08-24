import { buttonClassName } from "@/components/ui";
import { useSidebarAccountLogic } from "@/features/auth/useSidebarAccountLogic";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * The account block at the foot of the sidebar, from screen 1f.
 *
 * Says plainly whether sync is on, because that is the only thing an account changes —
 * and it is the sole way into sign-in from the web app.
 */
export function SidebarAccount() {
  const { t } = useTranslation();
  const account = useSidebarAccountLogic();

  // Until the silent refresh has run we do not know which state is true, and flashing
  // "not signed in" at somebody who is would be worse than showing nothing.
  if (account.status === "unknown") {
    return <div className="mt-auto h-14 border-t border-line" />;
  }

  if (account.status === "anonymous") {
    return (
      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
        <p className="text-[11px] leading-snug text-ink-subtle">{t("account.anonymous")}</p>
        <Link to="/signin" className={buttonClassName("secondary", "h-8 rounded-full text-xs")}>
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  if (account.firstSyncPending) {
    return (
      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
        <p className="text-[11px] leading-snug text-accent">{t("account.syncPaused")}</p>
        <Link to="/signin" className={buttonClassName("secondary", "h-8 rounded-full text-xs")}>
          {t("account.finishSetup")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-4">
      <div className="h-8 w-8 flex-none rounded-full bg-canvas shadow-[inset_0_0_0_1px_rgba(25,23,19,.08)]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold">{account.name}</div>
        <div className="truncate text-[11px] text-ink-subtle">{t("account.syncOn")}</div>
      </div>
      <button
        type="button"
        onClick={account.signOut}
        disabled={account.signingOut}
        aria-label={t("auth.signOut")}
        title={t("auth.signOut")}
        className="flex-none rounded-md p-1.5 text-ink-subtle hover:text-ink disabled:opacity-50"
      >
        <LogOut size={15} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
