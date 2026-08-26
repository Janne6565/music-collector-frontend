import type { NotificationPreferenceDtoCategory } from "@/api/generated/musicCollectorAPI.schemas";
import { AppShell } from "@/components/layout/AppShell";
import { Toggle } from "@/components/ui";
import { useNotificationsLogic } from "@/features/notifications/useNotificationsLogic";
import { Link, Navigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const ORDER: readonly NotificationPreferenceDtoCategory[] = [
  "FRIEND_REQUEST",
  "FRIEND_ACTIVITY",
  "SECURITY",
  "PRODUCT_NEWS",
];

/**
 * Screen 22a, with 22e's off states folded in — they are the same screen, not a different
 * one. There is no empty state and no "turn something back on" plea: the grid *is* the
 * screen, on or off, and the only thing that changes when everything is muted is one line
 * at the top saying what the silence means.
 *
 * Two levels, deliberately: *what* may reach you belongs to the account, *which device*
 * buzzes belongs to the device. Only the first exists today — there is no push transport, so
 * there is no device that could receive one, and the column says that rather than showing
 * switches that would quietly do nothing.
 */
export function NotificationsPage() {
  const { t } = useTranslation();
  const logic = useNotificationsLogic();

  if (logic.status === "anonymous") return <Navigate to="/signin" />;

  return (
    <AppShell stats={logic.stats}>
      <header className="flex flex-none items-center gap-2 border-b border-line px-8 py-4">
        <Link to="/settings" className="text-[12.5px] font-medium text-ink-muted hover:text-ink">
          {t("nav.settings")}
        </Link>
        <span className="text-[12.5px] text-ink-subtle">/</span>
        <span className="text-[12.5px] font-medium">{t("notifications.title")}</span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-8 pt-8 pb-10">
        <div className="max-w-[720px]">
          <h1 className="font-serif text-[32px] leading-[1.05]">{t("notifications.title")}</h1>
          <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-ink-muted">
            {t("notifications.scope")}
          </p>

          {/* 22e: the only line that appears when everything is muted. It says what silence
              means rather than asking for anything back. */}
          {logic.allQuiet && (
            <div className="mt-6 rounded-xl border border-line bg-canvas px-4 py-3.5">
              <h2 className="text-[13px] font-semibold">{t("notifications.allQuiet.title")}</h2>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-muted">
                {t("notifications.allQuiet.body")}
              </p>
            </div>
          )}

          <h2 className="mt-8 font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
            {t("notifications.grid.heading")}
          </h2>

          <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center gap-4 border-b border-line px-4 py-2.5">
              <div className="min-w-0 flex-1" />
              <div className="w-[92px] text-center font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
                {t("notifications.channel.mail")}
              </div>
              <div className="w-[92px] text-center font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
                {t("notifications.channel.push")}
                {!logic.pushAvailable && (
                  <span className="mt-0.5 block text-[9px] normal-case tracking-normal">
                    {t("notifications.channel.pushNeedsApp")}
                  </span>
                )}
              </div>
            </div>

            {logic.loading
              ? ORDER.map((category) => (
                  <div key={category} className="h-[68px] border-b border-line last:border-b-0" />
                ))
              : ORDER.map((category) => {
                  const row = logic.categories.find((candidate) => candidate.category === category);
                  if (row === undefined) return null;
                  const locked = row.mailLocked === true;
                  return (
                    <div
                      key={category}
                      className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">
                          {t(`notifications.category.${category}.title`)}
                        </div>
                        <div className="mt-0.5 text-[11.5px] leading-[1.5] text-ink-muted">
                          {t(`notifications.category.${category}.body`)}
                        </div>
                      </div>

                      <div className="flex w-[92px] justify-center">
                        {locked ? (
                          // A lock where the switch would be. Leaving the row out entirely
                          // would look like an oversight rather than a decision.
                          <span
                            className="flex items-center gap-1 text-[11px] text-ink-subtle"
                            title={t("notifications.locked")}
                          >
                            <Lock size={13} strokeWidth={1.75} aria-hidden />
                            {t("notifications.always")}
                          </span>
                        ) : !logic.emailReachable ? (
                          <Link
                            to="/account"
                            className="text-center text-[11px] leading-[1.4] text-accent"
                          >
                            {t("notifications.noConfirmedAddress")}
                          </Link>
                        ) : (
                          <Toggle
                            checked={row.mail === true}
                            onChange={(on) => logic.setChannel(category, "mail", on)}
                            label={t(`notifications.category.${category}.title`)}
                          />
                        )}
                      </div>

                      <div className="flex w-[92px] justify-center">
                        {logic.pushAvailable ? (
                          <Toggle
                            checked={row.push === true}
                            onChange={(on) => logic.setChannel(category, "push", on)}
                            label={t(`notifications.category.${category}.title`)}
                          />
                        ) : (
                          <span aria-hidden className="text-[13px] text-ink-subtle">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>

          {logic.failed && (
            <p className="mt-3 text-[12.5px] text-accent">{t("notifications.failed")}</p>
          )}

          {/* Only while the column can do nothing. Once a phone has registered, the
              switches above are the answer and this block would be repeating itself. */}
          {!logic.pushAvailable && (
            <div className="mt-4 rounded-xl border border-line bg-canvas px-4 py-3.5">
              <h3 className="text-[13px] font-semibold">{t("notifications.noPush.title")}</h3>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-muted">
                {t("notifications.noPush.body")}
              </p>
            </div>
          )}

          <h2 className="mt-8 font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
            {t("notifications.devices.heading")}
          </h2>
          <p className="mt-2 max-w-[560px] text-[12.5px] leading-[1.55] text-ink-muted">
            {t("notifications.devices.explainer")}
          </p>
          <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface">
            {logic.devices.length === 0 ? (
              <div className="px-4 py-3.5">
                <div className="text-[13px] font-semibold">{t("notifications.devices.none")}</div>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">
                  {t("notifications.devices.thisBrowser")}
                </p>
              </div>
            ) : (
              logic.devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold">
                      {device.label ?? device.platform ?? ""}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-ink-muted">
                      {device.mutedAt === undefined || device.mutedAt === null
                        ? t("notifications.devices.allowed")
                        : t("notifications.devices.muted")}
                    </div>
                  </div>
                  <Toggle
                    checked={device.mutedAt === undefined || device.mutedAt === null}
                    onChange={(on) => logic.setMuted(device.id ?? "", !on)}
                    label={device.label ?? device.platform ?? ""}
                  />
                </div>
              ))
            )}
          </div>

          <p className="mt-6 text-[11.5px] text-ink-subtle">{t("notifications.savesAsYouGo")}</p>
        </div>
      </div>
    </AppShell>
  );
}
