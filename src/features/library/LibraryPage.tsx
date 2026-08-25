import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Skeleton } from "@/components/ui";
import type { Format } from "@/domain/types";
import { FORMAT_LABELS } from "@/domain/types";
import { AddDialog } from "@/features/add/AddDialog";
import { CopyDetailsDialog } from "@/features/add/CopyDetailsDialog";
import {
  type FormatFilter,
  type LibraryRow,
  useLibraryLogic,
} from "@/features/library/useLibraryLogic";
import { useCoverPhotos } from "@/features/photos/useCoverPhotos";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowDownNarrowWide, Search } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [detailsFor, setDetailsFor] = useState<string | null>(null);

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
        <LibraryBody {...logic} onAdd={() => setAdding(true)} />
      </div>

      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onEditDetails={(copyId) => {
            setAdding(false);
            setDetailsFor(copyId);
          }}
        />
      )}
      {detailsFor !== null && (
        <CopyDetailsDialog
          copyId={detailsFor}
          onClose={() => setDetailsFor(null)}
          onBack={() => {
            setDetailsFor(null);
            setAdding(true);
          }}
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
}: Pick<ReturnType<typeof useLibraryLogic>, "loading" | "failed" | "rows" | "collectionEmpty"> & {
  readonly onAdd: () => void;
}) {
  const { t } = useTranslation();

  if (loading) return <LibrarySkeleton />;
  if (failed) return <p className="pt-8 text-sm text-ink-muted">{t("add.failed")}</p>;
  if (collectionEmpty) return <EmptyLibrary onAdd={onAdd} />;
  if (rows.length === 0)
    return <p className="pt-8 text-sm text-ink-muted">{t("library.noMatches")}</p>;

  return <LibraryGrid rows={rows} />;
}

/**
 * Split out because the photo lookup is a hook, and the body above returns early for
 * loading, failure and both kinds of empty before there are ever any rows to look up.
 */
function LibraryGrid({ rows }: { readonly rows: readonly LibraryRow[] }) {
  const covers = useCoverPhotos(useMemo(() => rows.map((row) => row.copy.id), [rows]));

  return (
    <div className={GRID_CLASS}>
      {rows.map((row) => (
        <GridItem key={row.copy.id} row={row} fallbackSrc={covers.get(row.copy.id) ?? null} />
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
  fallbackSrc,
}: { readonly row: LibraryRow; readonly fallbackSrc: string | null }) {
  const { t } = useTranslation();
  return (
    <Link to="/copies/$copyId" params={{ copyId: row.copy.id }} className="group block">
      <div className="relative aspect-square">
        <ReleaseArt release={row.release} fallbackSrc={fallbackSrc} />
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
        "flex-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
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
