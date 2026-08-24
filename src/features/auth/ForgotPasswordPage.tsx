import { forgotPassword } from "@/api/generated/auth/auth";
import { Button } from "@/components/ui";
import { AuthBrandPanel } from "@/features/auth/AuthBrandPanel";
import { TextField } from "@/features/auth/SignInPage";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");

  const request = useMutation({
    // Errors are swallowed on purpose: a failure that looked different for a registered
    // address would turn this screen into a way to find out who has an account.
    mutationFn: async () => forgotPassword({ email: email.trim() }).catch(() => undefined),
  });

  return (
    <div className="flex min-h-screen bg-paper">
      <AuthBrandPanel mode="SIGN_IN" />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <h1 className="font-serif text-[32px] leading-[1.1]">{t("auth.forgotTitle")}</h1>

          {request.isSuccess ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t("auth.forgotSent")}</p>
              <Link to="/signin" className="mt-6 block text-[13px] text-accent">
                {t("auth.backToSignIn")}
              </Link>
            </>
          ) : (
            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                request.mutate();
              }}
            >
              <p className="text-[13.5px] text-ink-muted">{t("auth.forgotLede")}</p>
              <TextField
                label={t("auth.email")}
                icon={<Mail size={16} strokeWidth={1.75} aria-hidden />}
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
              />
              <Button
                type="submit"
                loading={request.isPending}
                disabled={email.trim().length === 0}
                className="h-[46px] rounded-[9px]"
              >
                {t("auth.forgotSubmit")}
              </Button>
              <Link to="/signin" className="text-[13px] text-ink-subtle">
                {t("auth.backToSignIn")}
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
