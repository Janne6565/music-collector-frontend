import { confirmEmail } from "@/api/generated/auth/auth";
import { buttonClassName } from "@/components/ui";
import { AuthBrandPanel } from "@/features/auth/AuthBrandPanel";
import { Route } from "@/routes/confirm";
import { accountChanged } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * The other end of the confirmation link.
 *
 * There is nothing to fill in, so the screen redeems the token on mount and reports what
 * happened. The one thing it must not do is redeem twice: React 19 mounts effects twice in
 * development, and a one-time token spent by the first run would make the second report a
 * dead link on a confirmation that had in fact just worked.
 */
export function ConfirmEmailPage() {
  const { t } = useTranslation();
  const { token } = Route.useSearch();
  const dispatch = useAppDispatch();
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");
  const attempted = useRef(false);

  const confirm = useMutation({
    mutationFn: async () => confirmEmail({ token }),
    onSuccess: (user) => {
      // The account in the store still says unconfirmed; the server just handed back the
      // version that does not.
      if (signedIn) dispatch(accountChanged(user));
    },
  });

  const { mutate } = confirm;
  useEffect(() => {
    if (token === "" || attempted.current) return;
    attempted.current = true;
    mutate();
  }, [token, mutate]);

  const state =
    token === "" ? "noToken" : confirm.isError ? "invalid" : confirm.isSuccess ? "done" : "pending";

  return (
    <div className="flex min-h-screen bg-paper">
      <AuthBrandPanel mode="SIGN_IN" />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <h1 className="font-serif text-[32px] leading-[1.1]">
            {state === "done" ? t("auth.confirmDoneTitle") : t("auth.confirmTitle")}
          </h1>
          <p className="mt-3 text-sm text-ink-muted">{t(`auth.confirm.${state}`)}</p>

          {state === "done" && (
            <Link to="/" className={buttonClassName("primary", "mt-6 h-[46px] rounded-[9px]")}>
              {t("auth.confirmContinue")}
            </Link>
          )}
          {(state === "invalid" || state === "noToken") && (
            <Link to="/account" className="mt-6 block text-[13px] text-accent">
              {t("auth.confirmResendHint")}
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
