import { Button } from "@/components/ui";
import { ProfileBody } from "@/features/friends/ProfilePage";
import { useProfileLogic } from "@/features/friends/useProfileLogic";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/**
 * Screen 15i — the public link, opened by somebody with no account.
 *
 * The same body as the signed-in profile, in a page with no sidebar: there is no library
 * behind it to navigate back to, and the only two things a visitor can do here are look and
 * start a shelf of their own.
 */
export function PublicProfilePage() {
  const { t } = useTranslation();
  const { handle } = useParams({ from: "/$handle" });
  const logic = useProfileLogic(handle.replace(/^@/, ""));

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex flex-none items-center justify-between gap-4 border-b border-line px-7 py-3.5">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[17px] leading-none">{t("app.name")}</span>
          <span className="font-mono text-[11px] text-ink-subtle">
            {window.location.host}/@{logic.handle}
          </span>
        </div>
        <div className="flex flex-none items-center gap-3">
          {!logic.signedIn && (
            <>
              <Link
                to="/signin"
                className="text-[12.5px] text-ink-muted no-underline hover:text-ink"
              >
                {t("public.signIn")}
              </Link>
              <Link to="/signin">
                <Button className="h-9 rounded-lg px-3.5 text-[12.5px]">
                  {t("public.startYourOwn")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <ProfileBody logic={logic} />
      </main>

      <footer className="flex-none border-t border-line px-7 py-3 text-center text-[11px] text-ink-subtle">
        {t("public.footer")}
      </footer>
    </div>
  );
}
