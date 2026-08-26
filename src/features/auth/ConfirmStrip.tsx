import { useStore } from "@/local/StoreProvider";
import { claimConfirmStrip } from "@/local/settings";
import { useAppSelector } from "@/store/hooks";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 21b — the one time verification is allowed to speak unprompted.
 *
 * A strip on the library somebody was already heading for, not a screen. A dedicated
 * "check your inbox" page would stop a person who came here to add a record in order to
 * tell them about a mailbox they can read later, and its only button would be "skip".
 *
 * It appears once per device and does not come back: the flag is claimed the moment it is
 * first asked for, so a reload does not earn a second showing. Everywhere else verification
 * is banned from speaking — no badge, no dot, no modal, and never over the grid on a later
 * visit (21a).
 *
 * Two rows rather than one because German runs the subhead onto a second line.
 */
export function ConfirmStrip() {
  const { t } = useTranslation();
  const { store } = useStore();
  const user = useAppSelector((state) => state.auth.user);
  const unconfirmed = user !== null && user.emailVerified === false;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!unconfirmed) return;
    let cancelled = false;
    void claimConfirmStrip(store).then((claimed) => {
      if (!cancelled && claimed) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [unconfirmed, store]);

  if (!visible || user === null) return null;

  return (
    <aside className="flex flex-none items-start gap-4 border-b border-line bg-canvas px-7 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{t("auth.strip.title", { email: user.email })}</p>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-muted">{t("auth.strip.body")}</p>
      </div>
      <Link to="/account/email" className="mt-0.5 flex-none text-[12.5px] font-medium text-accent">
        {t("auth.strip.wrongAddress")}
      </Link>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label={t("common.close")}
        className="-mr-1 mt-0.5 flex-none text-ink-subtle hover:text-ink"
      >
        <X size={16} strokeWidth={1.75} aria-hidden />
      </button>
    </aside>
  );
}
