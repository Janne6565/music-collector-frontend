import { useAppBannerLogic } from "@/features/app/useAppBannerLogic";
import { androidIsTesterSignup, getLabelKey } from "@/lib/appStores";
import { Disc3, X } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * The one place the web app offers the native app on its own initiative — screen 25b.
 *
 * Page furniture, not an overlay. It is a row in the shell's flex column above the tab
 * bar, so it shortens the scroll area instead of covering the last record in the grid,
 * and the tab bar keeps its place at the bottom edge of the page.
 *
 * The copy names capabilities the browser genuinely does not have, in the deck's order:
 * scan, photos, offline. Never speed, never quality, and never "install" — a reader who
 * does not need a camera in a record shop can dismiss it without wondering what they gave
 * up. That is also why there is no second ask: see {@link useAppBannerLogic}.
 */
export function AppBanner({ context = "OWN" }: { readonly context?: BannerContext }) {
  const { t } = useTranslation();
  const banner = useAppBannerLogic();
  if (banner === null) return null;

  // "Rekordo for iPhone" or "Rekordo for Android" — the one string both readings need, and
  // the only place the platform is spoken aloud.
  const app = t(`appBanner.app.${banner.platform}`);

  return (
    <aside className="flex flex-none items-center gap-2.5 border-t border-line bg-surface py-2.5 pr-2 pl-3 sm:hidden">
      <div className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-ink">
        <Disc3 size={21} strokeWidth={1.6} className="text-paper" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold">
          {context === "SHARED" ? t("appBanner.shared.title") : app}
        </div>
        <p className="mt-0.5 text-[11px] leading-[1.45] text-ink-muted text-pretty">
          {context === "SHARED" ? t("appBanner.shared.body", { app }) : t("appBanner.body")}
        </p>
        {/* The closed test, named where the offer is made. Somebody who taps Join and lands
            on a form asking for their address should have been told that here. */}
        {banner.platform === "ANDROID" && androidIsTesterSignup && (
          <p className="mt-1 font-mono text-[9.5px] tracking-[0.06em] text-ink-subtle uppercase">
            {t("appBanner.closedTest")}
          </p>
        )}
      </div>
      <a
        href={banner.url}
        target="_blank"
        rel="noreferrer"
        className="flex h-11 flex-none items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-paper"
      >
        {t(getLabelKey(banner.platform))}
      </a>
      {/* 44 × 44, the same target as Get: putting it away has to be as easy as taking it. */}
      <button
        type="button"
        onClick={banner.dismiss}
        aria-label={t("appBanner.dismiss")}
        className="flex size-11 flex-none items-center justify-center text-ink-subtle"
      >
        <X size={16} strokeWidth={1.9} aria-hidden />
      </button>
    </aside>
  );
}

/**
 * Which of the two readings the banner is for.
 *
 * `OWN` is somebody looking at their own shelf: the app is named first, because they know
 * what Rekordo is. `SHARED` is somebody who arrived from a link to a stranger's shelf and
 * has no shelf of their own, so the offer leads with what they would get rather than with
 * a product name they have not adopted.
 */
export type BannerContext = "OWN" | "SHARED";
