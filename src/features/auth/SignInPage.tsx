import { Button } from "@/components/ui";
import { AuthBrandPanel } from "@/features/auth/AuthBrandPanel";
import { FirstSyncPrompt } from "@/features/auth/FirstSyncPrompt";
import { PasswordField } from "@/features/auth/PasswordField";
import type { AuthError } from "@/features/auth/useAuthLogic";
import { useAuthLogic } from "@/features/auth/useAuthLogic";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, HardDrive, Mail, User } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

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
              <Checkbox checked={logic.agreed} onChange={logic.setAgreed}>
                {t("auth.agreeTerms")}
              </Checkbox>
            ) : (
              <Checkbox checked={logic.rememberMe} onChange={logic.setRememberMe}>
                {t("auth.rememberMe")}
              </Checkbox>
            )}

            {logic.failed !== null && <AuthErrorMessage error={logic.failed} />}

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

          <p className="mt-6 text-[13px] text-ink-muted">
            {registering ? t("auth.haveAccountPrefix") : t("auth.needAccountPrefix")}{" "}
            <button
              type="button"
              onClick={() => logic.setMode(registering ? "SIGN_IN" : "REGISTER")}
              className="font-semibold text-accent"
            >
              {registering ? t("auth.signIn") : t("auth.create")}
            </button>
          </p>

          {/* The no-account path, given the same weight as the form above it: the app is
              fully usable without an account, and burying that would be a lie about what
              signing in is for. */}
          <div className="mt-5 border-t border-line pt-5">
            <Link to="/" className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <HardDrive size={16} strokeWidth={1.75} className="text-ink-subtle" aria-hidden />
              {t("auth.continueWithout")}
            </Link>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-subtle">
              {t("auth.continueWithoutBody")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function AuthErrorMessage({ error }: { readonly error: AuthError }) {
  const { t } = useTranslation();
  const message =
    error === "badCredentials"
      ? t("auth.error.badCredentials")
      : error === "emailTaken"
        ? t("auth.error.emailTaken")
        : t("auth.error.generic");
  return <p className="text-sm text-accent">{message}</p>;
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
