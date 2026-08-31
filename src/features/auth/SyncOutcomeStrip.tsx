import type { useLibraryLogic } from "@/features/library/useLibraryLogic";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 29e-5 — the one line the library says after the sign-in conflict is settled.
 *
 * It is also the only undo there is, which is why "Show them" filters the shelf rather
 * than linking anywhere: a banner that states a number and cannot show you which records
 * it is talking about is decoration, and there is nothing to check it against.
 */
export function SyncOutcomeStrip({
  logic,
}: {
  readonly logic: ReturnType<typeof useLibraryLogic>;
}) {
  const { t } = useTranslation();
  const outcome = logic.outcome;
  if (outcome === null || outcome === undefined) return null;

  return (
    <div className="flex-none px-4 pb-3 sm:px-7">
      <div className="flex items-center gap-2.5 rounded-[10px] bg-ink/5 px-3.25 py-2.75">
        <Check size={15} strokeWidth={2} className="flex-none text-ink-muted" aria-hidden />
        <p className="flex-1 text-[11.5px] leading-[1.5] text-ink-muted">
          {t(`conflict.banner.${outcome.resolution}` as const, {
            arrived: outcome.arrived,
            edits: outcome.edits,
          })}
        </p>
        {outcome.ids.length > 0 && !logic.showingArrived && (
          <button
            type="button"
            onClick={logic.showArrived}
            className="flex-none text-[11.5px] font-semibold text-accent hover:text-accent-strong"
          >
            {t("conflict.banner.show")}
          </button>
        )}
        <button
          type="button"
          onClick={logic.dismissOutcome}
          aria-label={t("common.close")}
          className="flex-none text-ink-subtle hover:text-ink"
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
