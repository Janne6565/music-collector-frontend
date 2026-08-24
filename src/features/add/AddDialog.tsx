import { releaseDisambiguation } from "@/api/releases";
import { ReleaseArt } from "@/components/ReleaseArt";
import { Button, FieldSpinner, Modal, ModalClose, PulsingDots, Skeleton } from "@/components/ui";
import type { Format, Release } from "@/domain/types";
import { FORMAT_LABELS } from "@/domain/types";
import {
  type AddFormatFilter,
  type AddTab,
  useAddDialogLogic,
} from "@/features/add/useAddDialogLogic";
import { cn } from "@/lib/utils";
import {
  ArrowUpLeft,
  Clock,
  FileUp,
  Pencil,
  Plus,
  ScanBarcode,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";

const FILTERS: readonly AddFormatFilter[] = ["ALL", "VINYL", "CD", "CASSETTE", "DIGITAL"];
const TABS: readonly AddTab[] = ["SEARCH", "BARCODE", "CSV"];

/**
 * Four placeholder rows, in the widths the deck draws them.
 *
 * Four rather than "as many as fit": it fills the visible list without promising a result
 * count nobody knows yet. The uneven widths are what stop the block reading as a table.
 */
const SKELETON_ROWS: readonly (readonly [string, string, string])[] = [
  ["62%", "44%", "30%"],
  ["48%", "56%", "24%"],
  ["70%", "38%", "34%"],
  ["54%", "48%", "28%"],
];

interface AddDialogProps {
  readonly onClose: () => void;
  /** Opens the details step (screen 8d) for the copy that was just created. */
  readonly onEditDetails: (copyId: string) => void;
}

/** Screen 6a — the add sheet over a dimmed library. */
export function AddDialog({ onClose, onEditDetails }: AddDialogProps) {
  const { t } = useTranslation();
  const logic = useAddDialogLogic(onClose);
  const titleId = useId();

  return (
    <Modal onClose={onClose} labelledBy={titleId} width="660px">
      <div className="flex flex-none items-start justify-between gap-4 px-6 pt-5.5">
        <div>
          <h2 id={titleId} className="font-serif text-2xl leading-[1.1]">
            {t("addDialog.title")}
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-muted">{t("addDialog.lede")}</p>
        </div>
        <ModalClose onClose={onClose} label={t("common.close")} />
      </div>

      <div className="flex flex-none gap-5 border-b border-line px-6 pt-5">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => logic.setTab(tab)}
            aria-current={logic.tab === tab}
            className={cn(
              "pb-2.5 text-[12.5px] whitespace-nowrap",
              logic.tab === tab
                ? "border-b-2 border-ink font-semibold"
                : "font-medium text-ink-muted hover:text-ink",
            )}
          >
            {t(`addDialog.tab.${tab}`)}
          </button>
        ))}
        {/* Manual entry is in the deck but its form has not been designed. Shown here
            rather than hidden, so the way in is discoverable before it works — disabled
            and labelled, so it never looks like something that failed to respond. */}
        <button
          type="button"
          disabled
          title={t("addDialog.manualSoon")}
          className="flex cursor-default items-center gap-1.5 pb-2.5 text-[12.5px] font-medium whitespace-nowrap text-ink-subtle"
        >
          {t("addDialog.tab.MANUAL")}
          <span className="rounded-full bg-ink/6 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]">
            {t("addDialog.soon")}
          </span>
        </button>
      </div>

      {logic.tab === "CSV" ? (
        <CsvTab logic={logic} />
      ) : (
        <SearchTab logic={logic} onEditDetails={onEditDetails} />
      )}
    </Modal>
  );
}

type Logic = ReturnType<typeof useAddDialogLogic>;

function SearchTab({
  logic,
  onEditDetails,
}: {
  readonly logic: Logic;
  readonly onEditDetails: (copyId: string) => void;
}) {
  const { t } = useTranslation();
  const barcode = logic.tab === "BARCODE";

  return (
    <>
      <form
        className="flex-none px-6 pt-4.5"
        onSubmit={(event) => {
          event.preventDefault();
          logic.submit();
        }}
      >
        <label className="flex h-11 items-center gap-2.5 rounded-[9px] border border-line bg-surface px-3.5 focus-within:border-ink">
          {barcode ? (
            <ScanBarcode
              size={16}
              strokeWidth={1.75}
              className="flex-none text-ink-muted"
              aria-hidden
            />
          ) : (
            <Search size={16} strokeWidth={1.75} className="flex-none text-ink-muted" aria-hidden />
          )}
          <input
            // Remounted per tab so the barcode field starts empty rather than holding a
            // half-typed album title that can never match a barcode.
            key={logic.tab}
            value={logic.term}
            onChange={(event) => logic.setTerm(event.target.value)}
            inputMode={barcode ? "numeric" : "text"}
            placeholder={t(
              barcode ? "addDialog.barcodePlaceholder" : "addDialog.searchPlaceholder",
            )}
            aria-label={t(barcode ? "addDialog.tab.BARCODE" : "addDialog.tab.SEARCH")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-subtle"
          />
          <button type="submit" disabled={!logic.canSubmit} className="sr-only">
            {t("addDialog.tab.SEARCH")}
          </button>
          {/* The spinner belongs to the field that caused the wait, so the cause and the
              wait are in the same place. It replaces the clear button rather than sitting
              beside it, which keeps the field's width from twitching mid-search. */}
          {logic.searching ? (
            <FieldSpinner />
          ) : logic.term !== "" ? (
            <button
              type="button"
              onClick={() => logic.setTerm("")}
              aria-label={t("addDialog.clearSearch")}
              className="flex-none text-ink-subtle hover:text-ink"
            >
              <X size={15} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </label>

        {!barcode && (
          <div className="mt-3 flex gap-1.5">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => logic.setFormat(filter)}
                aria-pressed={logic.format === filter}
                className={cn(
                  "rounded-full px-2.75 py-1.25 text-[11.5px] transition-colors",
                  logic.format === filter
                    ? "bg-ink font-semibold text-paper"
                    : "border border-line bg-surface font-medium text-ink-muted hover:bg-canvas",
                )}
              >
                {filter === "ALL" ? t("addDialog.allFormats") : FORMAT_LABELS[filter as Format]}
              </button>
            ))}
          </div>
        )}
      </form>

      <div className="min-h-0 flex-1 overflow-auto px-6 pt-2 pb-1">
        <Results logic={logic} />
      </div>

      <div className="flex flex-none items-center justify-between gap-4 border-t border-line bg-surface px-6 py-3.5">
        <span className="text-[11.5px] text-ink-muted">{t("addDialog.footerHint")}</span>
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            onClick={logic.close}
            className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={async () => {
              if (logic.selected === null) return;
              onEditDetails(await logic.addAndEdit(logic.selected));
            }}
            disabled={logic.selected === null}
            className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
          >
            {t("addDialog.addAndEdit")}
          </Button>
        </div>
      </div>
    </>
  );
}

function Results({ logic }: { readonly logic: Logic }) {
  const { t } = useTranslation();

  if (logic.searching) return <SearchingRows />;
  if (logic.failed) return <p className="pt-4 text-sm text-ink-muted">{t("add.failed")}</p>;
  if (!logic.hasSearched) return <RecentSearches logic={logic} />;
  if (logic.results.length === 0) return <NoMatches logic={logic} />;

  return (
    <>
      <p className="pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
        {t("addDialog.matchCount", { count: logic.results.length })}
      </p>
      {logic.results.map((release) => (
        <ResultRow key={release.mbid} release={release} logic={logic} />
      ))}
    </>
  );
}

/** Screen 5a's list, before anything has been typed. */
function RecentSearches({ logic }: { readonly logic: Logic }) {
  const { t } = useTranslation();
  if (logic.tab === "BARCODE" || logic.recentSearches.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between pt-3 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
          {t("addDialog.recent")}
        </span>
        <button
          type="button"
          onClick={logic.clearRecent}
          className="text-[11.5px] font-medium text-ink-muted hover:text-ink"
        >
          {t("addDialog.clearRecent")}
        </button>
      </div>
      {logic.recentSearches.map((term) => (
        <button
          key={term}
          type="button"
          onClick={() => logic.repeatSearch(term)}
          className="flex w-full items-center gap-3 border-t border-line py-3 text-left"
        >
          <Clock size={16} strokeWidth={1.75} className="flex-none text-ink-subtle" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">{term}</span>
          <ArrowUpLeft size={15} strokeWidth={1.75} className="text-ink-subtle" aria-hidden />
        </button>
      ))}
    </>
  );
}

/**
 * The wait, in the shape of what is coming (screen 9a).
 *
 * Every dimension here is copied from ResultRow below — the 52px sleeve, the three lines,
 * the round add button — so the results replace the placeholders without moving anything
 * the reader had already started looking at.
 */
function SearchingRows() {
  const { t } = useTranslation();

  return (
    <>
      <output className="flex items-center gap-2.5 pt-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
        {t("addDialog.searchingSource")}
        <PulsingDots />
      </output>
      {SKELETON_ROWS.map(([first, second, third]) => (
        <div key={first + second} className="flex items-center gap-3.5 border-t border-line py-3">
          <Skeleton className="h-13 w-13 flex-none rounded-sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
            <Skeleton className="h-[11px] rounded-[3px]" style={{ width: first }} />
            <Skeleton tone="soft" className="h-[9px] rounded-[3px]" style={{ width: second }} />
            <Skeleton tone="faint" className="h-2 rounded-[3px]" style={{ width: third }} />
          </div>
          <div className="h-8 w-[68px] flex-none rounded-lg bg-ink/5" aria-hidden />
        </div>
      ))}
    </>
  );
}

/**
 * Screen 9b — the search ran and matched nothing.
 *
 * The point of the screen is the two ways out: a barcode is the one identifier that is
 * printed on the sleeve and cannot be misspelled, and manual entry is the way in for a
 * pressing the archive has never heard of. Manual entry has not been designed yet, so it
 * is shown plainly disabled rather than omitted — the same treatment it gets in the tab
 * strip, for the same reason.
 */
function NoMatches({ logic }: { readonly logic: Logic }) {
  const { t } = useTranslation();
  const barcode = logic.tab === "BARCODE";

  return (
    <div className="flex flex-col items-center px-5 pt-10 pb-9 text-center">
      <SearchX size={28} strokeWidth={1.5} className="text-ink-subtle" aria-hidden />
      <h3 className="mt-4 font-serif text-[21px] leading-tight">
        {t("addDialog.noMatches.title")}
      </h3>
      <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-pretty text-ink-muted">
        {barcode
          ? t("addDialog.noBarcodeMatch", { barcode: logic.submittedTerm })
          : t("addDialog.noMatches.body")}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <Button
          variant="secondary"
          onClick={() => logic.setTab(barcode ? "SEARCH" : "BARCODE")}
          className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
        >
          {barcode ? (
            <Search size={15} strokeWidth={1.75} aria-hidden />
          ) : (
            <ScanBarcode size={15} strokeWidth={1.75} aria-hidden />
          )}
          {t(barcode ? "addDialog.noMatches.byTitle" : "addDialog.noMatches.scan")}
        </Button>
        <Button
          variant="secondary"
          disabled
          title={t("addDialog.manualSoon")}
          className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
        >
          <Pencil size={15} strokeWidth={1.75} aria-hidden />
          {t("addDialog.tab.MANUAL")}
          <span className="rounded-full bg-ink/6 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]">
            {t("addDialog.soon")}
          </span>
        </Button>
      </div>
    </div>
  );
}

function ResultRow({ release, logic }: { readonly release: Release; readonly logic: Logic }) {
  const { t } = useTranslation();
  const owned = logic.isOwned(release);
  const selected = logic.selected?.mbid === release.mbid;
  const subtitle = releaseDisambiguation(release);

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 border-t border-line py-3",
        selected && "bg-canvas/60",
      )}
    >
      {/* Selecting a row is what the footer's "Add and edit details" acts on. */}
      <button
        type="button"
        onClick={() => logic.select(release.mbid)}
        aria-pressed={selected}
        className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
      >
        {/* The real cover, not just the format silhouette. Picking between four pressings
            of the same album is largely a visual job, and the sleeve is the thing people
            recognise. The format is still named in the line below, and ReleaseArt falls
            back to the silhouette whenever the archive has nothing. */}
        <div className="h-13 w-13 flex-none">
          <ReleaseArt release={release} className="rounded-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold leading-tight">{release.title}</div>
          <div className="truncate text-[11.5px] leading-snug text-ink-muted">
            {release.artistName}
            {release.year !== null && ` · ${release.year}`}
            {` · ${FORMAT_LABELS[release.format]}`}
          </div>
          {subtitle !== "" && (
            <div className="truncate font-mono text-[10px] leading-snug text-ink-subtle">
              {subtitle}
            </div>
          )}
        </div>
      </button>

      {owned ? (
        // A statement, not a disabled button: owning a copy is no reason you cannot own a
        // second one, and the row's Add stays available for exactly that.
        <span className="flex-none px-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-subtle">
          {t("addDialog.inLibrary")}
        </span>
      ) : null}
      <Button
        onClick={() => logic.addRelease(release)}
        loading={logic.addingMbid === release.mbid}
        className="h-8 flex-none rounded-lg px-3 text-xs"
      >
        {logic.addingMbid !== release.mbid && <Plus size={14} strokeWidth={2} aria-hidden />}
        {t("addDialog.add")}
      </Button>
    </div>
  );
}

function CsvTab({ logic }: { readonly logic: Logic }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-surface p-6">
          <FileUp size={20} strokeWidth={1.6} className="text-ink-muted" aria-hidden />
          <div className="text-[13px] font-semibold">{t("addDialog.csv.title")}</div>
          <p className="max-w-md text-[11.5px] leading-normal text-ink-muted">
            {t("addDialog.csv.body")}
          </p>
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) logic.importCsv(file);
              // Cleared so re-picking the same file fires change again.
              event.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            onClick={() => input.current?.click()}
            loading={logic.importing}
            className="mt-1 h-[34px] rounded-lg px-3.5 text-[12.5px]"
          >
            {t("addDialog.csv.choose")}
          </Button>
          {logic.importResult !== undefined && (
            <p className="text-[11.5px] text-ink-muted">
              {t("addDialog.csv.done", {
                added: logic.importResult.added,
                skipped: logic.importResult.skipped,
              })}
            </p>
          )}
          {logic.importFailed && (
            <p className="text-[11.5px] text-accent">{t("addDialog.csv.failed")}</p>
          )}
        </div>
      </div>
      <div className="flex flex-none items-center justify-end border-t border-line bg-surface px-6 py-3.5">
        <Button
          variant="secondary"
          onClick={logic.close}
          className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
        >
          {t("common.close")}
        </Button>
      </div>
    </>
  );
}
