import { Modal } from "@/components/ui";
import { formatMegabytes } from "@/features/account/storageReading";
import { useStorageMeter } from "@/features/account/useStorageMeter";
import { Link } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 25f — the upload that was refused before it started.
 *
 * The number is the same on both clients; the failure is not, and the sheet is about the
 * difference. On the phone the photo is kept and goes up by itself once there is room, so
 * a refusal there is a delay. Here there is nowhere to keep it: this tab is the only place
 * the file exists, so the honest thing is to attach nothing and say so while the picker is
 * still fresh in mind.
 *
 * The app is named once, at the bottom, as the reason the two behave differently. It is
 * deliberately not a button: somebody whose photo has just been turned away is owed an
 * explanation, not an advert.
 */
export function StorageFullSheet({ onClose }: { readonly onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const reading = useStorageMeter();

  const quota = "quota" in reading ? formatMegabytes(reading.quota, i18n.language) : null;
  const used = "used" in reading ? formatMegabytes(reading.used, i18n.language) : null;
  return (
    <Modal onClose={onClose} labelledBy={titleId} width="440px" phoneSheet>
      <div className="px-5.5 pt-1 pb-6 sm:px-6.5 sm:pt-5">
        <h2 id={titleId} className="font-serif text-2xl leading-[1.2] text-pretty">
          {t("photos.full.title")}
        </h2>
        <p className="mt-2.5 text-[13px] leading-[1.65] text-ink/65 text-pretty">
          {used !== null && quota !== null
            ? t("photos.full.body", { used, quota })
            : t("photos.full.bodyUnknown")}
        </p>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]">
          {/* Accent, and only here. The meter itself never changes colour — an allowance
              filling up is not a danger — but this is the one moment something was
              actually refused, and the bar is what refused it. */}
          <div className="h-full rounded-full bg-accent" style={{ width: "100%" }} />
        </div>

        <Link
          to="/account/storage"
          onClick={onClose}
          className="mt-4.5 flex h-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper"
        >
          {t("photos.full.showStorage")}
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold"
        >
          {t("photos.full.notNow")}
        </button>

        <div className="mt-3.5 flex items-start gap-2">
          <Smartphone
            size={13}
            strokeWidth={1.75}
            className="mt-0.5 flex-none text-ink-subtle"
            aria-hidden
          />
          <p className="text-[11.5px] leading-[1.55] text-ink-muted text-pretty">
            {t("photos.full.inTheApp")}
          </p>
        </div>
      </div>
    </Modal>
  );
}
