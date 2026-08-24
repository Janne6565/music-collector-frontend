import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import type { Format } from "@/domain/types";
import { FORMAT_LABELS } from "@/domain/types";
import { AddDialog } from "@/features/add/AddDialog";
import { CopyDetailsDialog } from "@/features/add/CopyDetailsDialog";
import {
  type FormatFilter,
  type LibraryRow,
  useLibraryLogic,
} from "@/features/library/useLibraryLogic";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowDownNarrowWide, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const FILTERS: readonly FormatFilter[] = ["ALL", "VINYL", "CD", "CASSETTE", "DIGITAL"];

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
        {logic.stats !== undefined && (
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

  if (loading) return <p className="pt-8 text-sm text-ink-muted">…</p>;
  if (failed) return <p className="pt-8 text-sm text-ink-muted">{t("add.failed")}</p>;
  if (collectionEmpty) return <EmptyLibrary onAdd={onAdd} />;
  if (rows.length === 0)
    return <p className="pt-8 text-sm text-ink-muted">{t("library.noMatches")}</p>;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-5">
      {rows.map((row) => (
        <GridItem key={row.copy.id} row={row} />
      ))}
    </div>
  );
}

function GridItem({ row }: { readonly row: LibraryRow }) {
  const { t } = useTranslation();
  return (
    <Link to="/copies/$copyId" params={{ copyId: row.copy.id }} className="group block">
      <div className="relative aspect-square">
        <ReleaseArt
          release={row.release}
          className="rounded-sm shadow-[inset_0_0_0_1px_rgba(25,23,19,.08)]"
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
