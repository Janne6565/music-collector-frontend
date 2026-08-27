import { changeEmail } from "@/api/generated/auth/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Card, SectionTitle } from "@/components/rows";
import { Button } from "@/components/ui";
import { useAccountLogic } from "@/features/account/useAccountLogic";
import { PasswordField } from "@/features/auth/PasswordField";
import { useAppSelector } from "@/store/hooks";
import { useMutation } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 21g — moving the account to a different address.
 *
 * The rule the whole screen is shaped by, and the reason it can afford to be calm: the
 * current address keeps working — signing in, resets, everything — until the new one
 * answers, so a typo cannot lock anybody out. The account is not un-confirmed while it
 * waits; it is confirmed at the old address and pending at the new.
 *
 * The password is asked for because a stray session should not be able to walk off with the
 * account. An account made through a provider has none, so the field is not shown rather
 * than shown and ignored.
 */
export function ChangeEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const status = useAppSelector((state) => state.auth.status);
  // The sidebar counts come from the same place the account screen reads them, so walking
  // one click deeper does not empty it out.
  const { stats } = useAccountLogic();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const start = useMutation({
    mutationFn: async () => changeEmail({ email: email.trim(), password }),
    onSuccess: () => void navigate({ to: "/account" }),
  });

  if (status === "anonymous") return <Navigate to="/signin" />;
  if (user === null) return null;

  const needsPassword = user.hasPassword !== false;

  return (
    <AppShell stats={stats} phoneBottom="none">
      <header className="flex h-13 flex-none items-center border-b border-line px-4 sm:h-auto sm:px-8 sm:py-4">
        <span className="text-[12.5px] font-medium text-ink-muted">
          {t("account.changeEmail.title")}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-7">
        <div className="max-w-[520px]">
          <h1 className="font-serif text-[28px] leading-[1.15]">
            {t("account.changeEmail.title")}
          </h1>
          <p className="mt-3 text-[13.5px] leading-[1.6] text-ink-muted">
            {t("account.changeEmail.lede")}
          </p>

          <SectionTitle>{t("account.changeEmail.current")}</SectionTitle>
          <Card>
            <div className="px-4 py-3.5">
              <div className="text-[13px] font-semibold">{user.email}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-muted">
                {user.emailVerified === false
                  ? t("account.changeEmail.currentUnconfirmed")
                  : t("account.changeEmail.currentConfirmed")}
              </div>
            </div>
          </Card>

          <form
            className="mt-7 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              start.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium">
                {t("account.changeEmail.newAddress")}
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-[46px] rounded-[9px] border border-line bg-surface px-3.5 text-[14px] outline-none"
              />
            </label>

            {needsPassword && (
              <div>
                <PasswordField
                  label={t("account.changeEmail.password")}
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
                <p className="mt-1.5 text-[11.5px] text-ink-subtle">
                  {t("account.changeEmail.passwordWhy")}
                </p>
              </div>
            )}

            <section className="mt-2 rounded-xl border border-line bg-canvas px-4 py-3.5">
              <h2 className="text-[12.5px] font-semibold">{t("account.changeEmail.next.title")}</h2>
              <ol className="mt-2 flex flex-col gap-1.5">
                {(["one", "two", "three", "four"] as const).map((step, index) => (
                  <li
                    key={step}
                    className="flex gap-2.5 text-[12.5px] leading-[1.55] text-ink-muted"
                  >
                    <span className="flex-none font-mono text-[11px] text-ink-subtle">
                      {index + 1}
                    </span>
                    {t(`account.changeEmail.next.${step}`, { email: user.email })}
                  </li>
                ))}
              </ol>
            </section>

            {start.isError && (
              <p className="text-sm text-accent">{t("account.changeEmail.failed")}</p>
            )}

            <div className="mt-1 flex items-center gap-3">
              <Button
                type="submit"
                loading={start.isPending}
                disabled={email.trim().length === 0 || (needsPassword && password.length === 0)}
                className="h-[46px] rounded-[9px] px-5"
              >
                {t("account.changeEmail.submit")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void navigate({ to: "/account" })}
                className="h-[46px] rounded-[9px] px-5"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
