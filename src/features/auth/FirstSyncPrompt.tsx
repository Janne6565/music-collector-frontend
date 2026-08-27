import { Button } from "@/components/ui";
import { useFirstSyncLogic } from "@/features/auth/useFirstSyncLogic";
import { cn } from "@/lib/utils";
import type { FirstSyncStrategy } from "@janne6565/music-collector-shared";
import { Check, FileDown } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Screen 8a — a guest signs in and already has a collection here.
 *
 * Two options rather than three: "keep the local one and discard the account" was a way to
 * throw away a whole synced collection from a screen someone reaches by accident. Merging
 * never overwrites, so it is the safe default; keeping the account version leaves the local
 * copies exactly where they are, unsynced, and reversible.
 */
export function FirstSyncPrompt() {
  const { t } = useTranslation();
  const logic = useFirstSyncLogic();

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-5 px-6 py-12">
      <div>
        <h1 className="font-serif text-[26px] leading-[1.15]">
          {t("firstSync.title", { count: logic.localCount })}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
          {t("firstSync.body", { count: logic.accountCount })}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <Choice
          strategy="MERGE"
          selected={logic.choice}
          onSelect={logic.setChoice}
          title={t("firstSync.merge.title")}
          body={t("firstSync.merge.body", {
            added: logic.willAdd,
            skipped: logic.alreadyThere,
          })}
        />
        <Choice
          strategy="KEEP_ACCOUNT"
          selected={logic.choice}
          onSelect={logic.setChoice}
          title={t("firstSync.keepAccount.title")}
          body={t("firstSync.keepAccount.body", { count: logic.localCount })}
        />
      </div>

      <button
        type="button"
        onClick={logic.exportCsv}
        disabled={logic.exporting}
        className="flex items-center gap-2.25 rounded-[10px] bg-accent/7 px-3.25 py-2.75 text-left text-[11.5px] leading-snug text-ink-muted hover:bg-accent/10 disabled:opacity-60"
      >
        <FileDown
          size={15}
          strokeWidth={1.75}
          className="flex-none text-accent-strong"
          aria-hidden
        />
        {t("firstSync.exportFirst")}
      </button>

      {logic.failed && <p className="text-sm text-accent">{t("firstSync.failed")}</p>}

      <div className="flex flex-col items-center gap-3.5">
        <Button
          onClick={logic.confirm}
          loading={logic.working}
          disabled={logic.loading}
          className="h-12 w-full"
        >
          {t(logic.choice === "MERGE" ? "firstSync.confirmMerge" : "firstSync.confirmKeep")}
        </Button>
        <button
          type="button"
          onClick={logic.decideLater}
          className="text-[13px] font-medium text-ink-muted hover:text-ink"
        >
          {t("firstSync.later")}
        </button>
      </div>
    </main>
  );
}

interface ChoiceProps {
  readonly strategy: FirstSyncStrategy;
  readonly selected: FirstSyncStrategy;
  readonly onSelect: (strategy: FirstSyncStrategy) => void;
  readonly title: string;
  readonly body: string;
}

function Choice({ strategy, selected, onSelect, title, body }: ChoiceProps) {
  const chosen = selected === strategy;
  return (
    <label
      className={cn(
        // `relative` contains the sr-only radio below; without it the absolutely
        // positioned input is laid out against the document and can stretch it.
        "relative flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-3.5 transition-colors duration-(--mc-quick)",
        chosen ? "border-[1.5px] border-ink" : "border border-line hover:bg-canvas",
      )}
    >
      <input
        type="radio"
        name="firstSync"
        checked={chosen}
        onChange={() => onSelect(strategy)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-4.75 w-4.75 flex-none items-center justify-center rounded-full",
          chosen ? "bg-ink text-paper" : "border-[1.5px] border-ink/20",
        )}
      >
        {chosen && <Check size={13} strokeWidth={2.5} />}
      </span>
      <span>
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="mt-0.75 block text-[11.5px] leading-normal text-ink-muted">{body}</span>
      </span>
    </label>
  );
}
