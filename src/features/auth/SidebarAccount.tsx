import { buttonClassName } from "@/components/ui";
import { useSidebarAccountLogic } from "@/features/auth/useSidebarAccountLogic";
import { Link } from "@tanstack/react-router";
import { CloudOff, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * The account block pinned to the foot of the sidebar, from screen 7b.
 *
 * It is present in both states rather than only when signed in, because the thing it has
 * to say is different but equally important either way: signed in, whose collection this
 * is and how to leave; signed out, that the collection is on this device only. A footer
 * that appeared only for accounts would make the guest state invisible, which is exactly
 * the state where the person most needs to know where their records live.
 */
export function SidebarAccount({ copyCount }: { readonly copyCount: number | undefined }) {
  const { t } = useTranslation();
  const account = useSidebarAccountLogic();

  // Until the silent refresh has run we do not know which state is true, and flashing
  // "not signed in" at somebody who is would be worse than showing nothing.
  if (account.status === "unknown") {
    return <div className="mt-auto h-14 border-t border-line" />;
  }

  if (account.status === "anonymous") {
    return (
      <div className="mt-auto border-t border-line pt-3.5">
        <div className="rounded-[10px] bg-surface p-3 shadow-[0_1px_2px_rgba(25,23,19,.06)]">
          <div className="flex items-center gap-2">
            <CloudOff size={15} strokeWidth={1.75} className="text-ink-subtle" aria-hidden />
            <span className="text-xs font-semibold">{t("account.guest.title")}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-normal text-ink-muted">
            {copyCount === undefined
              ? t("account.guest.bodyUnknown")
              : t("account.guest.body", { count: copyCount })}
          </p>
          <Link
            to="/signin"
            className={buttonClassName(
              "primary",
              "mt-2.5 h-[30px] w-full rounded-md text-[11.5px]",
            )}
          >
            {t("account.guest.action")}
          </Link>
        </div>
      </div>
    );
  }

  if (account.firstSyncPending) {
    return (
      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3.5">
        <p className="text-[11px] leading-snug text-accent">{t("account.syncPaused")}</p>
        <Link to="/signin" className={buttonClassName("secondary", "h-8 rounded-full text-xs")}>
          {t("account.finishSetup")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-3.5">
      <Link
        to="/account"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[9px] bg-surface px-2 py-1.5 shadow-[0_1px_2px_rgba(25,23,19,.06)] hover:bg-canvas"
        activeProps={{ className: "shadow-[0_1px_2px_rgba(25,23,19,.06),0_0_0_1.5px_#191713]" }}
      >
        <div className="h-7 w-7 flex-none rounded-full bg-canvas shadow-[inset_0_0_0_1px_rgba(25,23,19,.08)]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold">{account.name}</div>
          <div className="truncate text-[10.5px] text-ink-subtle">{account.email}</div>
        </div>
      </Link>
      {/* Its own control beside the name, not inside it: a link that also logs you out
          depending on where you click is a trap. */}
      <button
        type="button"
        onClick={account.signOut}
        disabled={account.signingOut}
        aria-label={t("auth.signOut")}
        title={t("auth.signOut")}
        className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-line text-ink-subtle hover:text-ink disabled:opacity-50"
      >
        <LogOut size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
