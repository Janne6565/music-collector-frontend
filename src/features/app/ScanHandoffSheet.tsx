import { Modal } from "@/components/ui";
import { androidIsTesterSignup, appStoreUrl, mobilePlatform } from "@/lib/appStores";
import { Camera, CloudOff, ScanBarcode } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 25c — the one interruptive mention of the app anywhere in the web app.
 *
 * It is interruptive and that is allowed, because it is the only one that is asked for:
 * nothing opens this sheet except tapping the row that says scanning is not here. The
 * banner (25b) is the opposite bargain, which is why it is a strip and not a sheet.
 *
 * The second button is a real way on rather than a courtesy. Most people who tap the scan
 * row still want to add the record in their hand right now, and sending them back to a
 * dead end after reading three bullets would be worse than never naming the limit.
 */
export function ScanHandoffSheet({
  onClose,
  onSearchInstead,
}: {
  readonly onClose: () => void;
  readonly onSearchInstead: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const platform = mobilePlatform();
  const url = appStoreUrl(platform);

  return (
    <Modal onClose={onClose} labelledBy={titleId} width="440px" phoneSheet>
      <div className="px-5.5 pt-1 pb-6 sm:px-6.5 sm:pt-5">
        <div className="flex size-13 items-center justify-center rounded-[13px] bg-ink">
          <ScanBarcode size={26} strokeWidth={1.6} className="text-paper" aria-hidden />
        </div>
        <h2 id={titleId} className="mt-4 font-serif text-[25px] leading-[1.2] text-pretty">
          {t("scanHandoff.title")}
        </h2>
        <p className="mt-2.5 text-[13px] leading-[1.65] text-ink/65 text-pretty">
          {t("scanHandoff.body", { app: t(`appBanner.app.${platform ?? "IOS"}`) })}
        </p>

        {/* The three capabilities, in the deck's order: scan, photos, offline. The same
            three the banner names in one sentence, which is the point of both. */}
        <div className="mt-4.5 overflow-hidden rounded-xl border border-line bg-surface">
          <Capability icon={<ScanBarcode size={15} strokeWidth={1.75} aria-hidden />}>
            {t("scanHandoff.bulletScan")}
          </Capability>
          <Capability icon={<Camera size={15} strokeWidth={1.75} aria-hidden />}>
            {t("scanHandoff.bulletPhotos")}
          </Capability>
          <Capability icon={<CloudOff size={15} strokeWidth={1.75} aria-hidden />} last>
            {t("scanHandoff.bulletOffline")}
          </Capability>
        </div>

        {url !== null && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-4.5 flex h-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper"
          >
            {platform === "ANDROID" && androidIsTesterSignup
              ? t("scanHandoff.joinTest", { app: t("appBanner.app.ANDROID") })
              : t("scanHandoff.get", { app: t(`appBanner.app.${platform ?? "IOS"}`) })}
          </a>
        )}
        <button
          type="button"
          onClick={onSearchInstead}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold"
        >
          {t("scanHandoff.searchInstead")}
        </button>
        {url !== null && (
          <p className="mt-3.5 text-center text-[11.5px] text-ink-subtle">
            {platform === "ANDROID" && androidIsTesterSignup
              ? t("scanHandoff.testNote")
              : t("scanHandoff.freeNote")}
          </p>
        )}
      </div>
    </Modal>
  );
}

function Capability({
  icon,
  last = false,
  children,
}: {
  readonly icon: React.ReactNode;
  readonly last?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-h-11 items-center gap-2.5 px-3.5 py-2.75 ${last ? "" : "border-b border-line"}`}
    >
      <span className="flex-none text-ink-muted">{icon}</span>
      <span className="text-[12.5px] leading-[1.45] text-pretty">{children}</span>
    </div>
  );
}
