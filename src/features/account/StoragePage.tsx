import { AppShell } from "@/components/layout/AppShell";
import { BackBar } from "@/components/layout/BackBar";
import { StorageMeterRow } from "@/features/account/StorageMeterRow";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { useAppSelector } from "@/store/hooks";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileDown, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Screen 25f — the allowance, on a page of its own.
 *
 * It is the same reading the account page carries, at its own URL, because two places now
 * point at it: the "Photo storage" row under You, and the sheet a refused upload puts up.
 * A sheet that says "show storage" and then drops somebody halfway down a long settings
 * page has not shown them anything.
 *
 * "Free some up" holds only what this app can actually do. The deck also draws a "largest
 * photos" list; nothing here can build one, because size lives on the server and there is
 * no endpoint that ranks by it, and a row that opens an empty screen is worse than a row
 * that is not there. The archive export is real and is the honest version of the same
 * offer: take the pictures out, then delete what you like.
 */
export function StoragePage() {
  const { t } = useTranslation();
  const stats = useCollectionStats();
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");

  return (
    <AppShell stats={stats} phoneBottom="none">
      <BackBar to="/account" label={t("account.title")} />

      <div className="min-h-0 flex-1 overflow-auto px-4 pt-4 pb-8 sm:px-7 sm:pt-6">
        <div className="max-w-[560px]">
          <h1 className="mb-3.5 font-serif text-2xl leading-tight">
            {t("account.storage.pageTitle")}
          </h1>
          {/*
           * The allowance is the server's count of what it is holding, so without an
           * account there is no figure and never will be. The meter would sit in its
           * loading state for ever here, which is a page that says it is about to tell you
           * something and never does.
           */}
          {signedIn ? (
            <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
              <StorageMeterRow />
            </div>
          ) : (
            <p className="rounded-[10px] border border-line bg-surface px-4 py-3.5 text-[12.5px] leading-[1.55] text-ink-muted text-pretty">
              {t("account.storage.guest")}
            </p>
          )}

          {signedIn && (
            <>
              <div className="mt-4.5 font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
                {t("account.storage.freeSomeUp")}
              </div>
              <div className="mt-1.75 overflow-hidden rounded-[10px] border border-line bg-surface">
                <Link
                  to="/legal/data"
                  className="flex min-h-14 items-center gap-3 px-3.5 py-2.5 transition-colors duration-(--mc-quick) hover:bg-canvas"
                >
                  <FileDown
                    size={16}
                    strokeWidth={1.75}
                    className="flex-none text-ink-muted"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px]">{t("account.storage.exportTitle")}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-subtle">
                      {t("account.storage.exportBody")}
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.75}
                    className="flex-none text-ink-subtle"
                    aria-hidden
                  />
                </Link>
              </div>
            </>
          )}

          <div className="mt-3.5 flex items-start gap-2.25">
            <Info
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 flex-none text-ink-subtle"
              aria-hidden
            />
            <p className="text-[11.5px] leading-[1.6] text-ink-muted text-pretty">
              {t("account.storage.photosOnly")}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
