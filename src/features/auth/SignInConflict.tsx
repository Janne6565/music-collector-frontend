import { FormatThumb } from "@/components/FormatThumb";
import { Button } from "@/components/ui";
import { ConflictDifference } from "@/features/auth/ConflictDifference";
import { ConflictReview } from "@/features/auth/ConflictReview";
import { useSignInConflictLogic } from "@/features/auth/useSignInConflictLogic";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import type { OneSidedEntry, ShelfSide } from "@janne6565/rekordo-shared";
import { ChevronDown, ChevronRight, FileDown, Image, List } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * Turn 29 — signing in onto data that already exists.
 *
 * Mounted above the router rather than on the sign-in page, for the reason the design
 * gives: this is a question about the library, so it is asked over the library. The one
 * state that is not a question — the account could not be read — is also the one state
 * that does not block.
 */
export function SignInConflictGate() {
  const pending = useAppSelector((state) => state.auth.firstSyncPending);
  return pending ? <SignInConflict /> : null;
}

function SignInConflict() {
  const { t } = useTranslation();
  const logic = useSignInConflictLogic();
  const email = useAppSelector((state) => state.auth.user?.email ?? "");

  if (logic.view === "REVIEW") {
    return (
      <Scrim>
        <ConflictReview logic={logic} />
      </Scrim>
    );
  }

  return (
    <Scrim>
      {/* biome-ignore lint/a11y/useSemanticElements: a native <dialog> is only modal once
          showModal() has been called on it, and it closes on Escape — which is exactly
          what this one must not do. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        className="flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[14px] bg-paper shadow-[0_16px_50px_rgba(20,18,15,0.32)]"
      >
        {logic.view === "COMPARING" && (
          <Panel>
            <Title>{t("conflict.comparing.title")}</Title>
            <Lede>{t("conflict.comparing.body", { count: logic.localCount })}</Lede>
            <Bar />
          </Panel>
        )}

        {logic.view === "UNREACHABLE" && (
          <Panel>
            <Title>{t("conflict.unreachable.title")}</Title>
            <Lede>{t("conflict.unreachable.body")}</Lede>
            <div className="mt-4 flex items-center gap-2.5">
              <Button className="h-9 px-4.5 text-[12.5px]" onClick={logic.dismissUnreachable}>
                {t("conflict.unreachable.open")}
              </Button>
              <Quiet onClick={logic.retry}>{t("conflict.unreachable.retry")}</Quiet>
            </div>
          </Panel>
        )}

        {logic.view === "UPLOADING" && (
          <Panel>
            <Title>{t("conflict.uploading.title", { count: logic.localCount })}</Title>
            <Lede>{t("conflict.uploading.body")}</Lede>
            <Bar />
            {logic.failed && <Failed onRetry={logic.keepBoth} />}
          </Panel>
        )}

        {logic.view === "NO_LOSS" && logic.comparison !== undefined && (
          <Panel>
            <SignedInAs email={email} />
            <Title>
              {t("conflict.noLoss.title", { count: logic.comparison.onlyAccount.length })}
            </Title>
            <Lede>
              {t("conflict.noLoss.body", {
                copies: logic.mergedCopies,
                wishes: logic.mergedWishes,
              })}
            </Lede>
            <Timestamps
              local={logic.comparison.localChangedAt}
              account={logic.comparison.accountChangedAt}
            />
            <div className="mt-5 flex items-center justify-between gap-4">
              <Disclosure
                onClick={logic.openDifference}
                icon={<List size={13} strokeWidth={2} aria-hidden />}
              >
                {t("conflict.noLoss.show", { count: logic.comparison.onlyAccount.length })}
              </Disclosure>
              <Button
                className="h-9.5 px-5.5 text-[13px]"
                loading={logic.working}
                onClick={logic.keepBoth}
              >
                {t("conflict.noLoss.continue")}
              </Button>
            </div>
            {logic.failed && <Failed onRetry={logic.keepBoth} />}
          </Panel>
        )}

        {(logic.view === "CONFLICT" || logic.view === "DIFFERENCE") &&
          logic.comparison !== undefined && (
            <ConflictQuestion logic={logic} email={email} open={logic.view === "DIFFERENCE"} />
          )}

        {logic.view === "DROP" && logic.pendingKeep !== null && (
          <DropConfirmation logic={logic} side={logic.pendingKeep} />
        )}
      </div>
    </Scrim>
  );
}

type Logic = ReturnType<typeof useSignInConflictLogic>;

/**
 * 29b and 29c in one element.
 *
 * The difference expands the panel rather than replacing it, and the three buttons stay
 * pinned below the scroll: opening the difference must never cost you the way out.
 */
function ConflictQuestion({
  logic,
  email,
  open,
}: {
  readonly logic: Logic;
  readonly email: string;
  readonly open: boolean;
}) {
  const { t } = useTranslation();
  const comparison = logic.comparison;
  if (comparison === undefined) return null;

  return (
    <>
      <div className="flex-none px-6.5 pt-6">
        <SignedInAs email={email} />
        <Title>{t("conflict.conflict.title")}</Title>
        <Lede>{t("conflict.conflict.body")}</Lede>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6.5 pt-4">
        <Arithmetic logic={logic} />
        {open ? (
          <ConflictDifference comparison={comparison} onHide={logic.back} />
        ) : (
          <button
            type="button"
            onClick={logic.openDifference}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-[11px] border border-ink/15 px-3.5 py-3 hover:bg-canvas"
          >
            <span className="text-[12.5px] font-semibold text-accent">
              {t("conflict.seeDifference")}
            </span>
            <span className="flex items-center gap-1.75 font-mono text-[11px] text-ink-subtle">
              {t("conflict.entries", { count: differenceTotal(logic) })}
              <ChevronDown size={14} strokeWidth={2} aria-hidden />
            </span>
          </button>
        )}
      </div>

      <div className="flex-none border-t border-line px-6.5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            className="h-10 gap-2.25 px-5 text-[13.5px]"
            loading={logic.working}
            onClick={logic.keepBoth}
          >
            {t("conflict.keepBoth")}
            <span className="font-mono text-[11px] font-medium text-paper/55">
              {t("conflict.copies", { count: logic.mergedCopies })}
            </span>
          </Button>
          <Button
            variant="secondary"
            className="h-10 px-4 text-[13px]"
            disabled={logic.working}
            onClick={() => logic.askKeep("LOCAL")}
          >
            {t("conflict.keepLocal")}
          </Button>
          <Button
            variant="secondary"
            className="h-10 px-4 text-[13px]"
            disabled={logic.working}
            onClick={() => logic.askKeep("ACCOUNT")}
          >
            {t("conflict.keepAccount")}
          </Button>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <p className="text-[11px] leading-[1.5] text-ink-subtle">
            {t("conflict.keepCost", { count: comparison.onlyLocal.length })}
          </p>
          {comparison.values.length > 0 && (
            <Quiet onClick={logic.openReview} tone="accent">
              {t("conflict.decideMyself", { count: comparison.values.length })}
            </Quiet>
          )}
        </div>
        {logic.failed && <Failed onRetry={logic.keepBoth} />}
      </div>
    </>
  );
}

/** The four rows of arithmetic that answer it for most people. */
function Arithmetic({ logic }: { readonly logic: Logic }) {
  const { t } = useTranslation();
  const comparison = logic.comparison;
  if (comparison === undefined) return null;
  const oneSided = (side: ShelfSide, kind: "COPY" | "WISH") =>
    (side === "LOCAL" ? comparison.onlyLocal : comparison.onlyAccount).filter(
      (entry) => entry.kind === kind,
    ).length;

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-surface">
      <div className="grid grid-cols-[1fr_92px_92px] border-b border-ink/7 bg-ink/3 px-3.75 py-2.25">
        <Column>{t("conflict.rows.header")}</Column>
        <Column right>{t("conflict.sides.local")}</Column>
        <Column right>{t("conflict.sides.account")}</Column>
      </div>
      <CountRow
        label={t("conflict.rows.copies")}
        local={oneSided("LOCAL", "COPY")}
        account={oneSided("ACCOUNT", "COPY")}
      />
      <CountRow
        label={t("conflict.rows.wishes")}
        local={oneSided("LOCAL", "WISH")}
        account={oneSided("ACCOUNT", "WISH")}
      />
      <div className="border-b border-ink/7 px-3.75 py-2.75">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="text-[13px] font-semibold">{t("conflict.rows.values")}</span>
          <span className="font-mono text-[12.5px] font-medium">
            {t("conflict.rows.valuesCount", { count: comparison.values.length })}
          </span>
        </div>
        <p className="mt-0.75 text-[11px] leading-[1.5] text-ink-subtle">
          {t("conflict.rows.valuesBody")}
        </p>
      </div>
      {/* Under the rule rather than in it: no choice offered above ever deletes a photo. */}
      <div className="flex items-start gap-2.25 bg-ink/3 px-3.75 py-2.75">
        <Image
          size={14}
          strokeWidth={1.75}
          className="mt-0.5 flex-none text-ink-subtle"
          aria-hidden
        />
        <p className="text-[11px] leading-[1.55] text-ink-subtle">
          {t("conflict.rows.photos", { count: comparison.photos })}
        </p>
      </div>
    </div>
  );
}

/** 29e-3 and 29e-4: the only two taps in the flow that delete anything. */
function DropConfirmation({ logic, side }: { readonly logic: Logic; readonly side: ShelfSide }) {
  const { t } = useTranslation();
  const entries = logic.droppedBy(side);
  const copies = entries.filter((entry) => entry.kind === "COPY").length;
  const wishes = entries.length - copies;

  return (
    <Panel>
      <Title>
        {t(side === "LOCAL" ? "conflict.drop.localTitle" : "conflict.drop.accountTitle", {
          count: entries.length,
        })}
      </Title>
      <Lede>
        {t(side === "LOCAL" ? "conflict.drop.localBody" : "conflict.drop.accountBody", {
          copies,
          wishes,
          edits: logic.comparison?.values.length ?? 0,
          photos: logic.comparison?.photos ?? 0,
        })}
      </Lede>
      <button
        type="button"
        onClick={logic.exportDropped}
        className="mt-4 flex w-full items-center gap-2.5 rounded-[10px] bg-ink/5 px-3 py-2.5 text-left hover:bg-ink/8"
      >
        <FileDown size={15} strokeWidth={1.75} className="flex-none text-ink-subtle" aria-hidden />
        <span className="flex-1 text-[11.5px] leading-[1.5] text-ink-muted">
          {t("conflict.drop.export", { count: entries.length })}
        </span>
        <ChevronRight size={14} strokeWidth={2} className="flex-none text-ink-subtle" aria-hidden />
      </button>
      <div className="mt-4 flex items-center gap-2.5">
        <Button
          className="h-9 px-4.5 text-[12.5px]"
          loading={logic.working}
          onClick={logic.confirmKeep}
        >
          {t(side === "LOCAL" ? "conflict.keepLocal" : "conflict.keepAccount")}
        </Button>
        <Quiet onClick={logic.back}>{t("common.back")}</Quiet>
      </div>
      {logic.failed && <Failed onRetry={logic.confirmKeep} />}
    </Panel>
  );
}

function differenceTotal(logic: Logic): number {
  const comparison = logic.comparison;
  if (comparison === undefined) return 0;
  return comparison.onlyLocal.length + comparison.onlyAccount.length + comparison.values.length;
}

/**
 * The dim, and the one thing on the page while it is up.
 *
 * `fixed` rather than a portal: the dialogue is mounted above the router, so there is no
 * route it can be scrolled out of, and the scrim covering the whole viewport is the whole
 * of "this blocks the library".
 */
function Scrim({ children }: { readonly children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 sm:p-6">
      {children}
    </div>
  );
}

function Panel({ children }: { readonly children: ReactNode }) {
  return <div className="overflow-auto px-6.5 py-6">{children}</div>;
}

function Title({ children }: { readonly children: ReactNode }) {
  return (
    <h2 id="conflict-title" className="mt-2.75 font-serif text-[24px] leading-[1.2] text-pretty">
      {children}
    </h2>
  );
}

function Lede({ children }: { readonly children: ReactNode }) {
  return (
    <p className="mt-2.25 text-[12.5px] leading-[1.6] text-ink-muted text-pretty">{children}</p>
  );
}

function SignedInAs({ email }: { readonly email: string }) {
  const { t } = useTranslation();
  return (
    <p className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-ink-subtle">
      {t("conflict.signedInAs", { email })}
    </p>
  );
}

/**
 * An indeterminate bar, deliberately.
 *
 * The design draws a filled percentage, and there is no honest one to draw: the comparison
 * is a handful of round trips whose length is not known in advance, and a bar that invents
 * its own progress is a bar that stalls at 90%.
 */
function Bar() {
  return (
    <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-ink/9">
      <div className="mc-indeterminate h-full w-1/3 rounded-full bg-ink" />
    </div>
  );
}

function Timestamps({
  local,
  account,
}: {
  readonly local: number | null;
  readonly account: number | null;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="mt-4 flex items-center gap-4.5 rounded-[11px] border border-ink/10 bg-surface px-3.5 py-3">
      <Stamp label={t("conflict.sides.local")} at={local} language={i18n.language} />
      <div className="w-px self-stretch bg-ink/10" />
      <Stamp label={t("conflict.sides.account")} at={account} language={i18n.language} />
    </div>
  );
}

function Stamp({
  label,
  at,
  language,
}: {
  readonly label: string;
  readonly at: number | null;
  readonly language: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex-1">
      <div className="text-[11.5px] text-ink-subtle">{label}</div>
      <div className="mt-0.75 font-mono text-[11px] font-medium">
        {at === null
          ? t("conflict.never")
          : new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(
              at,
            )}
      </div>
    </div>
  );
}

function Column({ children, right }: { readonly children: ReactNode; readonly right?: boolean }) {
  return (
    <span
      className={cn(
        "font-mono text-[9px] uppercase tracking-[0.09em] text-ink-subtle",
        right === true && "text-right",
      )}
    >
      {children}
    </span>
  );
}

function CountRow({
  label,
  local,
  account,
}: {
  readonly label: string;
  readonly local: number;
  readonly account: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_92px_92px] items-baseline border-b border-ink/7 px-3.75 py-2.75">
      <span className="text-[13px] font-semibold">{label}</span>
      <span className="text-right font-mono text-[12.5px] font-medium">{local}</span>
      <span className="text-right font-mono text-[12.5px] font-medium">{account}</span>
    </div>
  );
}

function Disclosure({
  onClick,
  icon,
  children,
}: {
  readonly onClick: () => void;
  readonly icon: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent hover:text-accent-strong"
    >
      {icon}
      {children}
    </button>
  );
}

function Quiet({
  onClick,
  tone = "muted",
  children,
}: {
  readonly onClick: () => void;
  readonly tone?: "muted" | "accent";
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[12.5px] font-semibold",
        tone === "accent"
          ? "text-accent hover:text-accent-strong"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Failed({ onRetry }: { readonly onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <p role="alert" className="mt-3 text-[12.5px] text-accent">
      {t("conflict.failed")}{" "}
      <button type="button" onClick={onRetry} className="font-semibold underline">
        {t("conflict.unreachable.retry")}
      </button>
    </p>
  );
}

/** One row of the difference and the review — the same thumbnail, name and detail. */
export function EntryRow({
  entry,
  trailing,
}: {
  readonly entry: Pick<OneSidedEntry, "title" | "artistName" | "year" | "format">;
  readonly trailing?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 bg-surface px-3 py-2.25">
      <div className="h-10 w-12 flex-none">
        <FormatThumb format={entry.format} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold leading-[1.3]">
          {entry.title ?? t("conflict.untitled")}
        </div>
        <div className="truncate text-[11px] leading-[1.4] text-ink-subtle">
          {[entry.artistName, entry.year].filter(Boolean).join(" · ")}
        </div>
      </div>
      {trailing}
    </div>
  );
}
