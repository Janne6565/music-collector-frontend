import { cancelEmailChangeByToken } from "@/api/generated/auth/auth";
import { buttonClassName } from "@/components/ui";
import { Route } from "@/routes/email.cancel.$token";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * The undo in the notice sent to an address being moved away from (21g).
 *
 * The same shell as the confirm page and for the same reason: it is opened from a mailbox
 * that may no longer be able to sign in, so it shows nothing about the account. Undoing
 * signs every device out, including whoever asked for the change — which is the point.
 */
export function CancelEmailChangePage() {
  const { t } = useTranslation();
  const { token } = Route.useParams();
  const attempted = useRef(false);

  const cancel = useMutation({ mutationFn: async () => cancelEmailChangeByToken({ token }) });
  const { mutate } = cancel;
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    mutate();
  }, [mutate]);

  const state = cancel.isError ? "dead" : cancel.isSuccess ? "done" : "pending";

  return (
    <div className="flex min-h-full items-start justify-center bg-paper px-4 pt-8 pb-10 sm:items-center sm:px-6 sm:py-16">
      <div className="w-full max-w-[440px]">
        <div className="font-serif text-[19px] leading-none">Rekordo</div>
        <div className="mt-5 h-px bg-line" />
        <h1 className="mt-8 font-serif text-[30px] leading-[1.15]">
          {t(`auth.cancelChange.${state}.title`)}
        </h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-muted">
          {t(`auth.cancelChange.${state}.body`)}
        </p>
        {state === "done" && (
          <Link
            to="/signin"
            className={buttonClassName("primary", "mt-7 h-[46px] rounded-[9px] px-5")}
          >
            {t("auth.cancelChange.done.signIn")}
          </Link>
        )}
      </div>
    </div>
  );
}
