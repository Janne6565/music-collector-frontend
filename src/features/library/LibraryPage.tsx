import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Skeleton } from "@/components/ui";
import { AddDialog } from "@/features/add/AddDialog";
import { CopyDetailsDialog } from "@/features/copy/CopyDetailsDialog";
import { useUndo } from "@/features/detail/UndoDelete";
import {
  type FormatFilter,
  type LibraryRow,
  useLibraryLogic,
} from "@/features/library/useLibraryLogic";
import { useCoverPhotos } from "@/features/photos/useCoverPhotos";
import { useMark, useSettle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Format } from "@janne6565/music-collector-shared";
import { catalogArtShown, copyFormat, copyPreviewSrc } from "@janne6565/music-collector-shared";
import { FORMAT_LABELS } from "@janne6565/music-collector-shared";
import { Link } from "@tanstack/react-router";
import { ArrowDownNarrowWide, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const FILTERS: readonly FormatFilter[] = ["ALL", "VINYL", "CD", "CASSETTE", "DIGITAL"];

/**
 * A grid page's worth of placeholders, in the widths the deck draws them.
 *
 * Enough to fill the fold at the widths the grid actually lands on, and no more: the
 * point is that the page has its shape before the data arrives, not that the count is
 * guessed right.
 */
const SKELETON_CARDS: readonly (readonly [string, string])[] = [
  ["78%", "56%"],
  ["62%", "44%"],
  ["88%", "62%"],
  ["54%", "38%"],
  ["72%", "50%"],
  ["84%", "46%"],
  ["58%", "60%"],
  ["76%", "40%"],
  ["66%", "54%"],
  ["90%", "48%"],
  ["60%", "36%"],
  ["80%", "58%"],
];

/** Shared so the skeleton grid cannot drift away from the real one. */
const GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-5";

export function LibraryPage() {
  const { t } = useTranslation();
  const logic = useLibraryLogic();
  /**
   * Which sheet is over the library, if any. Local state rather than a route: the library
   * underneath stays mounted and keeps its scroll position, which is the whole reason
   * screen 6a is a modal instead of the page it replaced.
   */
  const [adding, setAdding] = useState(false);
  /** The copy whose details step is open over the sheet, if any (screen 8d). */
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  /**
   * The record that was just added, and the ring saying where it went.
   *
   * No toast and no "added" banner: the grid is already re-sorted with the record in its
   * rightful place, and the ring answers the only question the reader has — which one is
   * it — in the place where the answer lives.
   */
  const mark = useMark();
  /**
   * A record taken back out of the bin rings the same way a new one does. From the grid's
   * point of view they are the same event: something is here now that was not a moment
   * ago, and the only question is which one.
   */
  const { restored } = useUndo();
  useEffect(() => {
    if (restored !== null) mark.mark(restored);
  }, [restored, mark.mark]);

  return (
    <AppShell stats={logic.stats}>
      <header className="flex flex-none items-center gap-4 border-b border-line px-7 py-4">
        <label className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3.5">
          <Search size={16} strokeWidth={1.75} className="flex-none text-ink-subtle" aria-hidden />
          <input
            type="search"
            value={logic.search}
            onChange={(event) => logic.handleSearch(event.target.value)}
            placeholder={t("library.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-subtle"
          />
        </label>
        <button
          type="button"
          onClick={logic.cycleSort}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted"
        >
          <ArrowDownNarrowWide size={15} strokeWidth={1.75} aria-hidden />
          {t(`library.sort.${sortKey(logic.sort)}`)}
        </button>
        <Button onClick={() => setAdding(true)} className="h-9 rounded-lg px-4 text-[13px]">
          {t("library.addItem")}
        </Button>
      </header>

      <div className="flex flex-none items-baseline justify-between px-7 pt-4 pb-1.5">
        <h1 className="font-serif text-[26px] leading-none">{t("library.title")}</h1>
        {logic.stats === undefined ? (
          logic.loading && (
            <output className="font-mono text-xs text-ink-subtle">{t("library.loading")}</output>
          )
        ) : (
          <span className="font-mono text-xs text-ink-subtle">
            {t("library.counts", {
              copies: logic.stats.copyCount,
              releases: logic.stats.releaseGroupCount,
            })}
          </span>
        )}
      </div>

      <div className="flex flex-none gap-1.5 px-7 pb-3">
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter}
            active={logic.format === filter}
            onClick={() => logic.handleFormat(filter)}
            label={filter === "ALL" ? t("format.all") : FORMAT_LABELS[filter as Format]}
            count={filter === "ALL" ? undefined : logic.stats?.byFormat[filter as Format]}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-7 pb-7">
        <LibraryBody {...logic} onAdd={() => setAdding(true)} marked={mark.marked} />
      </div>

      {adding && <AddDialog onClose={() => setAdding(false)} onAdded={setDetailsFor} />}
      {/*
       * Stacked over the add sheet rather than replacing it (screen 8d): both are native
       * modal dialogs, so the browser puts the details step on top, makes the sheet inert
       * and sends Escape to the right one. Leaving the sheet mounted is what makes the
       * step safe to open after *every* add — dismissing it lands you back on the results
       * you added from, with the query and the scroll position still there.
       */}
      {detailsFor !== null && (
        <CopyDetailsDialog
          copyId={detailsFor}
          onClose={() => {
            // The sheet is gone and the grid holds the answer, so this is the moment the
            // ring means something.
            const added = detailsFor;
            setDetailsFor(null);
            mark.mark(added);
          }}
          onBack={() => setDetailsFor(null)}
        />
      )}
    </AppShell>
  );
}

function LibraryBody({
  loading,
  failed,
  rows,
  collectionEmpty,
  onAdd,
  marked,
}: Pick<ReturnType<typeof useLibraryLogic>, "loading" | "failed" | "rows" | "collectionEmpty"> & {
  readonly onAdd: () => void;
  readonly marked: string | null;
}) {
  const { t } = useTranslation();

  if (loading) return <LibrarySkeleton />;
  if (failed) return <p className="pt-8 text-sm text-ink-muted">{t("add.failed")}</p>;
  // The only slow entrance in the app, and the only place that earns one: an empty screen
  // has no content to carry the eye. As one piece — never headline, then body, then button.
  if (collectionEmpty)
    return (
      <div className="mc-entrance">
        <EmptyLibrary onAdd={onAdd} />
      </div>
    );
  // The reader typed, so they are watching: a Cross, not an entrance.
  if (rows.length === 0)
    return <p className="mc-cross pt-8 text-sm text-ink-muted">{t("library.noMatches")}</p>;

  return <LibraryGrid rows={rows} marked={marked} />;
}

/**
 * Split out because the photo lookup is a hook, and the body above returns early for
 * loading, failure and both kinds of empty before there are ever any rows to look up.
 */
function LibraryGrid({
  rows,
  marked,
}: { readonly rows: readonly LibraryRow[]; readonly marked: string | null }) {
  const covers = useCoverPhotos(useMemo(() => rows.map((row) => row.copy.id), [rows]));
  const grid = useRef<HTMLDivElement>(null);

  /**
   * Settle. The order of the ids is what changes when a filter, a sort or the search term
   * does, so it is what the measure keys off — a tile whose neighbours moved has moved.
   */
  useSettle(
    grid,
    useMemo(() => rows.map((row) => row.copy.id).join(), [rows]),
  );

  return (
    <div ref={grid} className={GRID_CLASS}>
      {rows.map((row) => (
        <GridItem
          key={row.copy.id}
          row={row}
          previewSrc={copyPreviewSrc(row.copy, covers.get(row.copy.id) ?? null)}
          allowCatalogArt={catalogArtShown(row.copy, true)}
          marked={marked === row.copy.id}
        />
      ))}
    </div>
  );
}

/**
 * Screen 9c — the same shimmer as the add dialog, in the shape of a cover card.
 *
 * The grid class and every dimension below are the ones GridItem uses, so the covers drop
 * into the boxes the placeholders were already holding open and the page does not reflow
 * under a reader who has started scrolling it.
 */
function LibrarySkeleton() {
  return (
    <div className={GRID_CLASS}>
      {SKELETON_CARDS.map(([title, subtitle]) => (
        <div key={title + subtitle}>
          <Skeleton className="aspect-square rounded-sm" />
          <Skeleton className="mt-1.5 h-[11px] rounded-[3px]" style={{ width: title }} />
          <Skeleton tone="faint" className="mt-1.5 h-2 rounded-[3px]" style={{ width: subtitle }} />
        </div>
      ))}
    </div>
  );
}

function GridItem({
  row,
  previewSrc,
  allowCatalogArt,
  marked,
}: {
  readonly row: LibraryRow;
  readonly previewSrc: string | null;
  readonly allowCatalogArt: boolean;
  readonly marked: boolean;
}) {
  const { t } = useTranslation();
  const marker = useRef<HTMLElement | null>(null);

  /**
   * A record that landed below the fold is not findable by a ring nobody can see, so the
   * grid goes to it first and the ring starts on arrival.
   */
  useEffect(() => {
    if (!marked) return;
    marker.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [marked]);

  return (
    <Link
      ref={(element) => {
        marker.current = element;
      }}
      to="/copies/$copyId"
      params={{ copyId: row.copy.id }}
      // The route swap is a Cross. Where the browser has no view transitions this is
      // simply ignored and the swap is what it is today.
      viewTransition
      data-settle-key={row.copy.id}
      className={cn("group block", marked && "mc-mark")}
    >
      <div className="relative aspect-square">
        <ReleaseArt
          release={row.release}
          format={copyFormat(row.copy, row.release)}
          previewSrc={previewSrc}
          allowCatalogArt={allowCatalogArt}
        />
      </div>
      <div className="mt-1.5 truncate text-[12.5px] font-semibold leading-tight group-hover:text-accent">
        {row.release?.title ?? "—"}
      </div>
      <div className="truncate text-[11.5px] leading-tight text-ink-muted">
        {row.release === undefined
          ? ""
          : `${row.release.artistName} · ${row.release.year ?? t("common.unknownYear")}`}
      </div>
    </Link>
  );
}

function EmptyLibrary({ onAdd }: { readonly onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-3 pt-16">
      <h2 className="font-serif text-2xl">{t("library.empty.title")}</h2>
      <p className="max-w-sm text-sm text-ink-muted">{t("library.empty.body")}</p>
      <Button onClick={onAdd} className="mt-2">
        {t("library.empty.action")}
      </Button>
    </div>
  );
}

interface FilterChipProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly label: string;
  readonly count?: number;
}

function FilterChip({ active, onClick, label, count }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-(--mc-quick)",
        active
          ? "bg-ink font-semibold text-paper"
          : "border border-line bg-surface hover:bg-canvas",
      )}
    >
      {label}
      {count !== undefined && (
        // The active chip is ink-on-ink, so the count needs the inverse muted tone or it
        // vanishes into the pill rather than dimming inside it.
        <span className={cn("ml-1.5", active ? "text-paper/55" : "text-ink-subtle")}>{count}</span>
      )}
    </button>
  );
}

function sortKey(
  sort: ReturnType<typeof useLibraryLogic>["sort"],
): "addedDesc" | "artistAsc" | "yearDesc" {
  return sort === "ADDED_DESC" ? "addedDesc" : sort === "ARTIST_ASC" ? "artistAsc" : "yearDesc";
}
