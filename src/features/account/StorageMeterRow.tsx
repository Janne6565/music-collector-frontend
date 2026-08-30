import {
  type StorageReading,
  fillPercent,
  formatMegabytes,
  tickPercent,
} from "@/features/account/storageReading";
import { useStorageMeter } from "@/features/account/useStorageMeter";
import { useTranslation } from "react-i18next";

/**
 * The allowance, at the top of the Storage card (design 28a) and finally earning that card
 * its name.
 *
 * Two rules from the board, both about restraint. **The count leads and the bytes trail**:
 * "34 photos" is a number a person can picture and "10.2 MB" is not, so the megabytes sit
 * on the right in mono where a measurement belongs, and no percentage appears in words
 * anywhere. **Nothing here ever changes colour.** Accent is the app's deletion colour, and
 * an allowance filling up is not a danger; full and over are carried entirely by the bar
 * and the sentence under it. There is no amber state because there is nothing to alarm
 * about: the photo is always kept, only the upload waits.
 *
 * The profile picture is a quarter of one percent of the bar, under half a pixel at this
 * width. It is named in the sentence and never drawn as a segment.
 */
export function StorageMeterRow() {
  const { t, i18n } = useTranslation();
  const reading = useStorageMeter();
  const locale = i18n.language;

  const quota = "quota" in reading ? formatMegabytes(reading.quota, locale) : "";
  // Loading and offline have no number yet, so they sit a shade back and the row reads as
  // waiting rather than as an account with nothing in it.
  const waiting = reading.kind === "loading" || reading.kind === "offline";

  const title =
    reading.kind === "loading" || reading.kind === "offline"
      ? t("account.storage.photosLabel")
      : reading.kind === "empty"
        ? t("account.storage.empty.title")
        : t("account.storage.photos", { count: reading.photos });

  const figure =
    reading.kind === "loading"
      ? "···"
      : reading.kind === "offline"
        ? t("account.storage.offlineFigure")
        : reading.kind === "empty"
          ? t("account.storage.free", { mb: formatMegabytes(reading.freeBytes, locale) })
          : t("account.storage.ofQuota", {
              used: formatMegabytes(reading.used, locale),
              quota,
            });

  return (
    <div className="border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className={`text-[13px] font-semibold ${waiting ? "text-ink-muted" : ""}`}>
          {title}
        </span>
        <span className="flex-none font-mono text-[11px] text-ink-muted">{figure}</span>
      </div>

      <Track reading={reading} />

      {/* Loading is the one reading with no sentence: it has not said anything yet, and a
          placeholder line would be a sentence about nothing. */}
      {reading.kind !== "loading" && (
        <p className="mt-2.5 text-[11.5px] leading-[1.55] text-ink-muted text-pretty">
          {reading.kind === "offline"
            ? t("account.storage.offline.body")
            : reading.kind === "empty"
              ? t("account.storage.empty.body")
              : reading.kind === "nearlyFull"
                ? t("account.storage.nearlyFull.body", { count: reading.roomForPhotos })
                : reading.kind === "full"
                  ? t("account.storage.full.body")
                  : reading.kind === "over"
                    ? t("account.storage.over.body", {
                        over: formatMegabytes(reading.overBy, locale),
                        quota,
                      })
                    : t("account.storage.shared.body", { quota })}
        </p>
      )}
    </div>
  );
}

function Track({ reading }: { readonly reading: StorageReading }) {
  // Past the allowance the scale flips: the whole width becomes what is stored, the tick
  // marks where 20 MB ended, and the excess is hatched. In ink, not accent, because over is
  // a fact with a fix rather than a fault.
  if (reading.kind === "over") {
    const tick = tickPercent(reading);
    return (
      <div className="relative mt-2.5 h-1.5">
        <div
          className="absolute top-0 left-0 h-1.5 rounded-l-full bg-ink"
          style={{ width: `${tick}%` }}
        />
        <div
          className="absolute top-0 right-0 h-1.5 rounded-r-full"
          style={{
            left: `${tick}%`,
            backgroundImage:
              "repeating-linear-gradient(135deg, #191713 0 3px, #8a857c 3px 6px)",
          }}
        />
        <div className="absolute top-[-4px] h-3.5 w-0.5 bg-ink" style={{ left: `${tick}%` }} />
      </div>
    );
  }

  const fill = fillPercent(reading);
  return (
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]">
      {/* Empty keeps the full track and no fill at all: a 0% sliver would read as stalled,
          and the words carry the zero. */}
      {fill > 0 && <div className="h-full rounded-full bg-ink" style={{ width: `${fill}%` }} />}
    </div>
  );
}
