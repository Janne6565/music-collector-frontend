import { Button } from "@/components/ui";
import { FirstSyncPrompt } from "@/features/auth/FirstSyncPrompt";
import type { AuthError } from "@/features/auth/useAuthLogic";
import { useAuthLogic } from "@/features/auth/useAuthLogic";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function SignInPage() {
  const { t } = useTranslation();
  const logic = useAuthLogic();

  if (logic.auth.firstSyncPending) {
    return <FirstSyncPrompt />;
  }

  const registering = logic.mode === "REGISTER";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6">
      <div>
        <h1 className="font-serif text-3xl">
          {registering ? t("auth.createTitle") : t("auth.signInTitle")}
        </h1>
        {/* The point of the whole account system, said plainly on the screen that asks for one. */}
        <p className="mt-2 text-sm text-ink-muted">{t("auth.optional")}</p>
      </div>

      <form
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          logic.submit();
        }}
      >
        <Field
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          value={logic.email}
          onChange={logic.setEmail}
        />
        <Field
          label={t("auth.password")}
          type="password"
          autoComplete={registering ? "new-password" : "current-password"}
          value={logic.password}
          onChange={logic.setPassword}
        />
        {logic.failed !== null && <AuthErrorMessage error={logic.failed} />}
        <Button
          type="submit"
          loading={logic.submitting}
          disabled={!logic.canSubmit}
          className="mt-1"
        >
          {registering ? t("auth.create") : t("auth.signIn")}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => logic.setMode(registering ? "SIGN_IN" : "REGISTER")}
        className="text-sm text-ink-muted underline"
      >
        {registering ? t("auth.haveAccount") : t("auth.needAccount")}
      </button>

      <Link to="/" className="text-sm text-ink-subtle">
        {t("auth.continueWithout")}
      </Link>
    </main>
  );
}

/** Typed i18n rejects a template key, and rightly so — a typo would be a runtime miss. */
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

interface FieldProps {
  readonly label: string;
  readonly type: string;
  readonly autoComplete: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

function Field({ label, type, autoComplete, value, onChange }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.09em] text-ink-subtle">
        {label}
      </span>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-line bg-surface px-3.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
