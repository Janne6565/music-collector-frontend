import {
  type MobilePlatform,
  androidIsTesterSignup,
  appStoreUrl,
  getLabelKey,
  mobilePlatform,
} from "@/lib/appStores";
import { ScanBarcode } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * The offer, as a row rather than as an interruption — screen 25a.
 *
 * Dismissing the banner does not remove the offer, it moves it here, where it is a row
 * like any other and never interrupts. That is the whole reason dismissal can be silent
 * and permanent: nothing is actually given up.
 *
 * It is not tied to the banner's dismissal in either direction. Somebody who never saw the
 * banner still gets the row, and somebody who dismissed it still gets the row; what they
 * dismissed was being asked, not the app.
 */
export function AppRow() {
  const { t } = useTranslation();
  const platform: MobilePlatform | null = mobilePlatform();
  const url = appStoreUrl(platform);
  // On a desktop there is no phone to install onto, and no store to send anyone to. The
  // section label above the row belongs to the row, so both go together.
  if (platform === null || url === null) return null;

  return (
    <>
      <div className="mt-4.5 font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
        {t("appRow.section")}
      </div>
      <div className="mt-1.75 overflow-hidden rounded-[10px] border border-line bg-surface">
        <div className="flex min-h-14 items-center gap-3 px-3.5 py-2.5">
          <ScanBarcode
            size={17}
            strokeWidth={1.75}
            className="flex-none text-ink-muted"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px]">{t(`appBanner.app.${platform}`)}</div>
            <div className="mt-0.5 text-[11px] leading-[1.5] text-ink-subtle text-pretty">
              {platform === "ANDROID" && androidIsTesterSignup
                ? t("appRow.bodyTest")
                : t("appRow.body")}
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 flex-none items-center rounded-full bg-ink px-4 text-[12.5px] font-semibold text-paper"
          >
            {t(getLabelKey(platform))}
          </a>
        </div>
      </div>
    </>
  );
}
