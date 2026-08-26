import { Button, buttonClassName } from "@/components/ui";
import { AuthBrandPanel } from "@/features/auth/AuthBrandPanel";
import { FirstSyncPrompt } from "@/features/auth/FirstSyncPrompt";
import { PasswordField } from "@/features/auth/PasswordField";
import type { AuthError } from "@/features/auth/useAuthLogic";
import { useAuthLogic } from "@/features/auth/useAuthLogic";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, HardDrive, Mail, User } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { Trans, useTranslation } from "react-i18next";

/** Screens 4c and 4d: a dark brand panel beside the form. */
export function SignInPage() {
  const { t } = useTranslation();
  const logic = useAuthLogic();

  if (logic.auth.firstSyncPending) {
    return <FirstSyncPrompt />;
  }

  const registering = logic.mode === "REGISTER";

  return (
    <div className="flex min-h-screen bg-paper">
      <AuthBrandPanel mode={logic.mode} />

      <main className="flex flex-1 items-center justify-center p-13 px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* Screens 4c and 4d both open with a way back. Sign-in is reachable from a
              library you were already looking at, and landing in it by accident should
              cost one click, not a browser gesture. */}
          <Link
            to="/"
            className="mb-5.5 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted hover:text-ink"
          >
            <ChevronLeft size={15} strokeWidth={1.9} aria-hidden />
            {t("common.back")}
          </Link>
          <h1 className="font-serif text-[32px] leading-[1.1]">
            {registering ? t("auth.createTitle") : t("auth.signInTitle")}
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-muted">
            {registering ? t("auth.createLede") : t("auth.signInLede")}
          </p>

          <form
            className="mt-7 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              logic.submit();
            }}
          >
            {registering && (
              <TextField
                label={t("auth.name")}
                icon={<User size={16} strokeWidth={1.75} aria-hidden />}
                value={logic.displayName}
                onChange={logic.setDisplayName}
                autoComplete="name"
                placeholder={t("auth.namePlaceholder")}
              />
            )}

            <TextField
              label={t("auth.email")}
              icon={<Mail size={16} strokeWidth={1.75} aria-hidden />}
              value={logic.email}
              onChange={logic.setEmail}
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
            />

            <PasswordField
              label={t("auth.password")}
              value={logic.password}
              onChange={logic.setPassword}
              autoComplete={registering ? "new-password" : "current-password"}
              placeholder={
                registering ? t("auth.newPasswordPlaceholder") : t("auth.passwordPlaceholder")
              }
              showStrength={registering}
              trailing={
                registering ? undefined : (
                  <Link to="/forgot" className="text-[11.5px] font-medium text-accent">
                    {t("auth.forgot")}
                  </Link>
                )
              }
            />

            {registering ? (
              <div className="flex flex-col gap-3.5">
                <Checkbox checked={logic.agreed} onChange={logic.setAgreed}>
                  <Trans
                    i18nKey="auth.agreeTerms"
                    components={{
                      terms: <LegalTextLink doc="nutzungsbedingungen" />,
                      privacy: <LegalTextLink doc="datenschutz" />,
                    }}
                  />
                </Checkbox>
                <Checkbox checked={logic.ageConfirmed} onChange={logic.setAgeConfirmed}>
                  {t("auth.confirmAge")}
                </Checkbox>
              </div>
            ) : (
              <Checkbox checked={logic.rememberMe} onChange={logic.setRememberMe}>
                {t("auth.rememberMe")}
              </Checkbox>
            )}

            {logic.failed.length > 0 && <AuthErrorMessages errors={logic.failed} />}

            <Button
              type="submit"
              loading={logic.submitting}
              disabled={!logic.canSubmit}
              className="h-[46px] rounded-[9px]"
            >
              {registering ? t("auth.create") : t("auth.signIn")}
            </Button>
          </form>

          {logic.availableProviders.length > 0 && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                  {t("auth.or")}
                </span>
                <div className="h-px flex-1 bg-line" />
              </div>
              {registering && (
                /* The provider buttons have no form to put tick boxes in, so the agreement
                   is stated beside them instead. The account they create records the same
                   consent a password sign-up does. */
                <p className="mb-3 text-[11px] leading-[1.55] text-ink-subtle">
                  <Trans
                    i18nKey="auth.providerConsent"
                    components={{
                      terms: <LegalTextLink doc="nutzungsbedingungen" />,
                      privacy: <LegalTextLink doc="datenschutz" />,
                    }}
                  />
                </p>
              )}
              <div className="flex gap-2.5">
                {logic.availableProviders.map((provider) => (
                  <a
                    key={provider.id}
                    // A full navigation, never fetch: the provider answers with a redirect
                    // the browser has to follow itself.
                    href={`/api/v1/auth/oauth/${provider.id}/authorize`}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[9px] border border-line bg-surface text-[13px] font-semibold hover:bg-canvas"
                  >
                    {provider.displayName}
                  </a>
                ))}
              </div>
            </>
          )}

          {/* The no-account path is a real control, not a footnote: it sits with the other
              ways in, at the same size as the OAuth buttons and above the sign-in/register
              switch. The app is fully usable without an account, and burying that would be
              a lie about what signing in is for. The darker border is the one thing that
              separates it from a provider button — it is a destination, not a handoff. */}
          <div className="mt-5 border-t border-line pt-5">
            <Link
              to="/"
              className={buttonClassName(
                "secondary",
                "h-[46px] w-full rounded-[9px] border-ink/40 text-[13.5px] hover:border-ink",
              )}
            >
              <HardDrive size={16} strokeWidth={1.75} className="text-ink-subtle" aria-hidden />
              {t("auth.continueWithout")}
            </Link>
            <p className="mt-2 text-center text-[11.5px] leading-relaxed text-ink-subtle">
              {t("auth.continueWithoutBody")}
            </p>
          </div>

          <p className="mt-6 text-center text-[13px] text-ink-muted">
            {registering ? t("auth.haveAccountPrefix") : t("auth.needAccountPrefix")}{" "}
            <button
              type="button"
              onClick={() => logic.setMode(registering ? "SIGN_IN" : "REGISTER")}
              className="font-semibold text-accent"
            >
              {registering ? t("auth.signIn") : t("auth.create")}
            </button>
          </p>

          <SignInLegalFooter />
        </div>
      </main>
    </div>
  );
}

/**
 * The three links at the foot of screen 17a.
 *
 * The sign-in screen is outside the app shell, so it does not inherit the sidebar's legal
 * row -- and it is the one screen where somebody is about to agree to two of the three.
 */
function SignInLegalFooter() {
  const { t } = useTranslation();
  return (
    <div className="mt-9 flex justify-center gap-4 text-[11px] text-ink-subtle">
      <LegalTextLink doc="impressum">{t("legal.impressum")}</LegalTextLink>
      <LegalTextLink doc="datenschutz">{t("legal.privacyShort")}</LegalTextLink>
      <LegalTextLink doc="nutzungsbedingungen">{t("legal.termsShort")}</LegalTextLink>
    </div>
  );
}

/**
 * A legal document link inside running text.
 *
 * Its children come from `<Trans>` when it is used inside a sentence, which is why they are
 * optional: the interpolated element carries the text, and only the standalone uses below
 * pass their own.
 */
function LegalTextLink({ doc, children }: { readonly doc: string; readonly children?: ReactNode }) {
  return (
    <Link
      to="/legal/$doc"
      params={{ doc }}
      className="border-b border-accent/35 font-semibold text-accent no-underline hover:border-accent"
    >
      {children}
    </Link>
  );
}

/**
 * Every reason the submit was refused, one line each.
 *
 * A form that reports only the first problem makes someone discover the rest one round
 * trip at a time, which is the same conversation the old single "something went wrong"
 * was having — just slower.
 */
function AuthErrorMessages({ errors }: { readonly errors: readonly AuthError[] }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col gap-1">
      {errors.map((error) => (
        <p key={error} className="text-sm text-accent">
          {t(`auth.error.${error}` as const)}
        </p>
      ))}
    </div>
  );
}

interface TextFieldProps {
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
  readonly autoComplete: string;
  /** An example of the shape wanted, never a restatement of the label. */
  readonly placeholder?: string;
}

export function TextField({
  label,
  icon,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: TextFieldProps) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle"
      >
        {label}
      </label>
      <div className="mt-1.5 flex h-[46px] items-center gap-2.5 rounded-[9px] border border-line bg-surface px-3.5 focus-within:border-ink">
        <span className="flex-none text-ink-subtle">{icon}</span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-subtle"
        />
      </div>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-[18px] w-[18px] flex-none accent-ink"
      />
      <label htmlFor={id} className="text-[12.5px] leading-[1.5] text-ink-muted">
        {children}
      </label>
    </div>
  );
}
