import { Button } from "@/components/ui";
import { EntryRow } from "@/features/auth/SignInConflict";
import { conflictValueText } from "@/features/auth/conflictValues";
import type { useSignInConflictLogic } from "@/features/auth/useSignInConflictLogic";
import { cn } from "@/lib/utils";
import type { OneSidedEntry, ValueDifference } from "@janne6565/rekordo-shared";
import { differenceKey } from "@janne6565/rekordo-shared";
import { useTranslation } from "react-i18next";

/**
 * 29d — the per-item review, for people who will not accept "the later edit wins".
 *
 * One row per decision and a counter that says how far through it is. Undecided means
 * kept, never dropped, which is what makes leaving it half-finished safe — and it is why
 * Apply is always available rather than gated on the counter reaching the total.
 */
export function ConflictReview({
  logic,
}: {
  readonly logic: ReturnType<typeof useSignInConflictLogic>;
}) {
  const { t } = useTranslation();
  const comparison = logic.comparison;
  if (comparison === undefined) return null;

  const oneSided = [...comparison.onlyLocal, ...comparison.onlyAccount];
  const total = oneSided.length + comparison.values.length;

  return (
    // A native <dialog> is only modal once showModal() has been called on it, and it
    // closes on Escape — which is exactly what this one must not do.
    // biome-ignore lint/a11y/useSemanticElements: see above
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      className="flex max-h-full w-full max-w-[620px] flex-col overflow-hidden rounded-[14px] bg-paper shadow-[0_16px_50px_rgba(20,18,15,0.32)]"
    >
      <div className="flex-none border-b border-line px-6 pt-5 pb-4">
        <div className="flex items-baseline justify-between gap-3.5">
          <h2 id="review-title" className="font-serif text-[21px] leading-[1.2]">
            {t("conflict.review.title")}
          </h2>
          <span className="font-mono text-[11px] text-ink-subtle">
            {t("conflict.review.progress", { done: logic.decided, total })}
          </span>
        </div>
        <div className="mt-2.75 h-1 overflow-hidden rounded-full bg-ink/9">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-(--mc-quick)"
            style={{ width: `${total === 0 ? 0 : (logic.decided / total) * 100}%` }}
          />
        </div>
        <div className="mt-2.25 flex items-center justify-between gap-3">
          <p className="text-[11px] text-ink-subtle">{t("conflict.review.undecided")}</p>
          <button
            type="button"
            onClick={logic.keepAll}
            className="text-[11.5px] font-semibold text-accent"
          >
            {t("conflict.review.keepAll")}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-4">
        {comparison.values.length > 0 && (
          <>
            <Heading>{t("conflict.review.values", { count: comparison.values.length })}</Heading>
            <div className="flex flex-col gap-2.25">
              {comparison.values.map((value) => (
                <ValuePick key={differenceKey(value)} value={value} logic={logic} />
              ))}
            </div>
          </>
        )}

        {oneSided.length > 0 && (
          <>
            <Heading>{t("conflict.review.oneSided", { count: oneSided.length })}</Heading>
            <div className="flex flex-col gap-px overflow-hidden rounded-[11px] border border-ink/9 bg-ink/7">
              {oneSided.map((entry) => (
                <KeepOrDrop key={entry.id} entry={entry} logic={logic} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-none border-t border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            className="h-10 gap-2.25 px-5 text-[13.5px]"
            loading={logic.working}
            onClick={logic.applyReview}
          >
            {t("conflict.review.apply")}
            {/* The running answer to "what will I end up with", which is what makes the
                picks above legible as a total rather than as a list of opinions. */}
            <span className="font-mono text-[10.5px] font-medium text-paper/55">
              {t("conflict.review.applyTotal", {
                copies: logic.reviewedCopies,
                wishes: logic.reviewedWishes,
              })}
            </span>
          </Button>
          <button
            type="button"
            onClick={logic.back}
            className="text-[12.5px] font-semibold text-ink-muted hover:text-ink"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * One disputed value, as two panels.
 *
 * The picked side gets the ink fill and the other stays plain. A checkmark column would be
 * quieter, but ink-on-value keeps the value itself readable as the chosen one — which is
 * the thing being decided.
 */
function ValuePick({
  value,
  logic,
}: {
  readonly value: ValueDifference;
  readonly logic: ReturnType<typeof useSignInConflictLogic>;
}) {
  const { t, i18n } = useTranslation();
  const key = differenceKey(value);
  const picked = logic.pickedSide(key);
  const empty = t("conflict.emptyValue");

  return (
    <div className="rounded-[11px] border border-ink/9 bg-surface p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold leading-[1.3]">
            {value.title ?? t("conflict.untitled")}
          </div>
          <div className="truncate text-[11px] leading-[1.4] text-ink-subtle">
            {[value.artistName, t(`conflict.field.${value.field}` as const)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        {(["LOCAL", "ACCOUNT"] as const).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => logic.pick(key, side)}
            aria-pressed={picked === side}
            className={cn(
              "flex-1 rounded-[9px] px-2.5 py-2.25 text-left transition-colors duration-(--mc-quick)",
              picked === side
                ? "bg-ink text-paper"
                : "bg-ink/4 text-ink ring-1 ring-inset ring-ink/10 hover:bg-ink/8",
            )}
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.07em] opacity-65">
              {t(side === "LOCAL" ? "conflict.sides.local" : "conflict.sides.account")} ·{" "}
              {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(
                side === "LOCAL" ? value.localAt : value.accountAt,
              )}
            </div>
            <div className="mt-1 text-[11.5px] leading-[1.4] text-pretty">
              {conflictValueText(
                value.field,
                side === "LOCAL" ? value.local : value.account,
                "EUR",
                i18n.language,
                empty,
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function KeepOrDrop({
  entry,
  logic,
}: {
  readonly entry: OneSidedEntry;
  readonly logic: ReturnType<typeof useSignInConflictLogic>;
}) {
  const { t } = useTranslation();
  const dropping = logic.isDropped(entry.id);
  return (
    <EntryRow
      entry={entry}
      trailing={
        <div className="flex flex-none rounded-lg bg-ink/7 p-0.5">
          <Segment active={!dropping} onClick={() => logic.setDropped(entry.id, false)}>
            {t("conflict.review.keep")}
          </Segment>
          <Segment active={dropping} onClick={() => logic.setDropped(entry.id, true)}>
            {t("conflict.review.drop")}
          </Segment>
        </div>
      }
    />
  );
}

function Segment({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md px-2.25 py-1.25 text-[10.5px] font-semibold transition-colors duration-(--mc-quick)",
        active ? "bg-ink text-paper" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Heading({ children }: { readonly children: string }) {
  return (
    <div className="pt-4 pb-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-subtle">
      {children}
    </div>
  );
}
