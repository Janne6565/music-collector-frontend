import { buttonClassName } from "@/components/ui";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { useAccountMenuLogic } from "@/features/auth/useAccountMenuLogic";
import { useSidebarAccountLogic } from "@/features/auth/useSidebarAccountLogic";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, CloudOff } from "lucide-react";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

/**
 * The account block pinned to the foot of the sidebar — screen 7b, reshaped by 19a.
 *
 * It is present in both states rather than only when signed in, because the thing it has
 * to say is different but equally important either way: signed in, whose collection this
 * is; signed out, that the collection is on this device only. A footer that appeared only
 * for accounts would make the guest state invisible, which is exactly the state where the
 * person most needs to know where their records live.
 *
 * Every state is now one block with one border and one weight, and every state's top row
 * opens the same menu — which is where the legal links moved to, so the sidebar no longer
 * ends in two footers stacked on each other.
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
      <FooterBlock
        trigger={
          <>
            <CloudOff
              size={15}
              strokeWidth={1.75}
              className="flex-none text-ink-subtle"
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">
              {t("account.guest.title")}
            </span>
          </>
        }
      >
        <p className="px-2 text-[11px] leading-normal text-ink-muted">
          {copyCount === undefined
            ? t("account.guest.bodyUnknown")
            : t("account.guest.body", { count: copyCount })}
        </p>
        {/* Stays in the open, unlike the legals: it is the one thing this state is asking
            for, and a call to action one click deep is a call to action nobody takes. */}
        <Link
          to="/signin"
          className={buttonClassName("primary", "mt-2.5 h-[30px] w-full rounded-md text-[11.5px]")}
        >
          {t("account.guest.action")}
        </Link>
      </FooterBlock>
    );
  }

  if (account.firstSyncPending) {
    return (
      <FooterBlock
        trigger={
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-accent">
            {t("account.finishSetup")}
          </span>
        }
      >
        <p className="px-2 text-[11px] leading-snug text-ink-muted">{t("account.syncPaused")}</p>
        <Link
          to="/signin"
          className={buttonClassName(
            "secondary",
            "mt-2.5 h-[30px] w-full rounded-md text-[11.5px]",
          )}
        >
          {t("account.finishSetup")}
        </Link>
      </FooterBlock>
    );
  }

  return (
    <FooterBlock
      signOut={{ run: account.signOut, pending: account.signingOut }}
      trigger={
        <>
          <div className="h-[30px] w-[30px] flex-none rounded-full bg-canvas shadow-[inset_0_0_0_1px_rgba(25,23,19,.08)]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{account.name}</div>
            <div className="truncate text-[10.5px] text-ink-subtle">{account.email}</div>
          </div>
        </>
      }
    />
  );
}

interface FooterBlockProps {
  /** The row that opens the menu — whatever this state has to say about the account. */
  readonly trigger: ReactNode;
  readonly signOut?: { readonly run: () => void; readonly pending: boolean };
  readonly children?: ReactNode;
}

/** One block, one border, one menu — the shape 19a gives every state of the footer. */
function FooterBlock({ trigger, signOut, children }: FooterBlockProps) {
  const { t } = useTranslation();
  const menuId = useId();
  const menu = useAccountMenuLogic();

  return (
    <div ref={menu.root} className="relative mt-auto border-t border-line pt-3.5">
      {menu.open && <AccountMenu id={menuId} onNavigate={menu.close} signOut={signOut} />}
      <button
        type="button"
        onClick={menu.toggle}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menuId}
        aria-label={t("account.menu.open")}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left",
          "transition-colors duration-(--mc-quick) hover:bg-surface",
        )}
      >
        {trigger}
        {/* Up when closed, down when open: the menu rises out of the footer, so the
            chevron points at where it will appear rather than at a fixed direction. */}
        {menu.open ? (
          <ChevronDown
            size={15}
            strokeWidth={1.75}
            className="flex-none text-ink-subtle"
            aria-hidden
          />
        ) : (
          <ChevronUp
            size={15}
            strokeWidth={1.75}
            className="flex-none text-ink-subtle"
            aria-hidden
          />
        )}
      </button>
      {children}
    </div>
  );
}
