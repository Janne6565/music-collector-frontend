import { EntryRow } from "@/features/auth/SignInConflict";
import { conflictValueText } from "@/features/auth/conflictValues";
import type { OneSidedEntry, ShelfComparison, ValueDifference } from "@janne6565/rekordo-shared";
import { ChevronUp, Cloud, GitCompare, Monitor } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * 29c — the difference, open.
 *
 * One scrolling list with both sides in it, grouped by what the group means for the
 * decision rather than by kind: what only this browser has, what only the account has, and
 * the values that exist on both with two answers. Nothing here is a control. Reading is
 * not deciding, and a list where every row could be clicked would make it look like it is.
 */
export function ConflictDifference({
  comparison,
  onHide,
}: {
  readonly comparison: ShelfComparison;
  readonly onHide: () => void;
}) {
  const { t } = useTranslation();
  const total =
    comparison.onlyLocal.length + comparison.onlyAccount.length + comparison.values.length;

  return (
    <section className="mt-3 border-t border-line pt-3.5">
      <div className="flex items-baseline justify-between gap-3.5">
        <h3 className="font-serif text-[19px] leading-[1.2]">{t("conflict.difference.title")}</h3>
        <button
          type="button"
          onClick={onHide}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-accent"
        >
          <ChevronUp size={13} strokeWidth={2} aria-hidden />
          {t("conflict.difference.hide")}
        </button>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-[1.55] text-ink-subtle">
        {t("conflict.difference.lede", {
          count: total,
          copies: comparison.identicalCopies,
          wishes: comparison.identicalWishes,
        })}
      </p>

      <Group
        icon={<Monitor size={13} strokeWidth={1.9} aria-hidden />}
        label={t("conflict.difference.onlyLocal", { count: comparison.onlyLocal.length })}
        entries={comparison.onlyLocal}
      />
      <Group
        icon={<Cloud size={13} strokeWidth={1.9} aria-hidden />}
        label={t("conflict.difference.onlyAccount", { count: comparison.onlyAccount.length })}
        entries={comparison.onlyAccount}
      />

      {comparison.values.length > 0 && (
        <>
          <Heading icon={<GitCompare size={13} strokeWidth={1.9} aria-hidden />}>
            {t("conflict.difference.both", { count: comparison.values.length })}
          </Heading>
          <div className="flex flex-col gap-2 pb-2">
            {comparison.values.map((value) => (
              <ValueCard key={`${value.id}:${value.field}`} value={value} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Group({
  icon,
  label,
  entries,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly entries: readonly OneSidedEntry[];
}) {
  const { t, i18n } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <>
      <Heading icon={icon}>{label}</Heading>
      <div className="flex flex-col gap-px overflow-hidden rounded-[10px] border border-ink/9 bg-ink/7">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            trailing={
              <div className="flex-none text-right">
                <div className="font-mono text-[10px] text-ink-subtle">
                  {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(
                    entry.changedAt,
                  )}
                </div>
                <div className="mt-0.75 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-subtle/70">
                  {t(entry.kind === "COPY" ? "conflict.kind.copy" : "conflict.kind.wish")}
                </div>
              </div>
            }
          />
        ))}
      </div>
    </>
  );
}

function ValueCard({ value }: { readonly value: ValueDifference }) {
  const { t, i18n } = useTranslation();
  const empty = t("conflict.emptyValue");
  const render = (raw: unknown) => conflictValueText(value.field, raw, "EUR", i18n.language, empty);

  return (
    <div className="rounded-[10px] border border-ink/9 bg-surface p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold leading-[1.3]">
            {value.title ?? t("conflict.untitled")}
          </div>
          <div className="truncate text-[11px] leading-[1.4] text-ink-subtle">
            {[value.artistName, value.year].filter(Boolean).join(" · ")}
          </div>
        </div>
        <span className="flex-none font-mono text-[9px] uppercase tracking-[0.06em] text-ink-subtle/70">
          {t(`conflict.field.${value.field}` as const)}
        </span>
      </div>
      <div className="mt-2.25 flex gap-2">
        <Side label={t("conflict.sides.local")} at={value.localAt} text={render(value.local)} />
        <Side
          label={t("conflict.sides.account")}
          at={value.accountAt}
          text={render(value.account)}
        />
      </div>
      <p className="mt-1.75 font-mono text-[9.5px] text-ink-subtle">
        {t("conflict.difference.wins", {
          side: t(value.winner === "LOCAL" ? "conflict.sides.local" : "conflict.sides.account"),
        })}
      </p>
    </div>
  );
}

function Side({
  label,
  at,
  text,
}: {
  readonly label: string;
  readonly at: number;
  readonly text: string;
}) {
  const { i18n } = useTranslation();
  return (
    <div className="flex-1 rounded-lg bg-ink/4 px-2.5 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.07em] text-ink-subtle">
        {label} · {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(at)}
      </div>
      <div className="mt-1 text-[11.5px] leading-[1.45] text-pretty">{text}</div>
    </div>
  );
}

function Heading({ icon, children }: { readonly icon: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-4.5 pb-2 text-ink-subtle">
      {icon}
      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]">{children}</span>
    </div>
  );
}
