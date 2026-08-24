import { FormatThumb } from "@/components/FormatThumb";
import { AppShell } from "@/components/layout/AppShell";
import { buttonClassName } from "@/components/ui";
import type { Format } from "@/domain/types";
import { FORMAT_LABELS } from "@/domain/types";
import {
  type FormatFilter,
  type LibraryRow,
  useLibraryLogic,
} from "@/features/library/useLibraryLogic";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowDownNarrowWide, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

const FILTERS: readonly FormatFilter[] = ["ALL", "VINYL", "CD", "CASSETTE", "DIGITAL"];

export function LibraryPage() {
  const { t } = useTranslation();
  const logic = useLibraryLogic();

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
        <Link to="/add" className={buttonClassName("primary", "h-9 rounded-lg px-4 text-[13px]")}>
          {t("library.addItem")}
        </Link>
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
        <LibraryBody {...logic} />
      </div>
    </AppShell>
  );
}

function LibraryBody({
  loading,
  failed,
  rows,
  collectionEmpty,
}: Pick<ReturnType<typeof useLibraryLogic>, "loading" | "failed" | "rows" | "collectionEmpty">) {
  const { t } = useTranslation();

  if (loading) return <p className="pt-8 text-sm text-ink-muted">…</p>;
  if (failed) return <p className="pt-8 text-sm text-ink-muted">{t("add.failed")}</p>;
  if (collectionEmpty) return <EmptyLibrary />;
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
        {row.release?.coverArtUrl === null || row.release === undefined ? (
          <FormatThumb format={row.release?.format ?? "OTHER"} />
        ) : (
          <img
            src={row.release.coverArtUrl}
            alt=""
            loading="lazy"
            className="h-full w-full rounded-sm object-cover shadow-[inset_0_0_0_1px_rgba(25,23,19,.08)]"
            onError={(event) => {
              // Cover Art Archive 404s are routine; fall back to the placeholder art.
              event.currentTarget.style.display = "none";
            }}
          />
        )}
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

function EmptyLibrary() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-3 pt-16">
      <h2 className="font-serif text-2xl">{t("library.empty.title")}</h2>
      <p className="max-w-sm text-sm text-ink-muted">{t("library.empty.body")}</p>
      <Link to="/add" className={buttonClassName("primary", "mt-2")}>
        {t("library.empty.action")}
      </Link>
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
      {count !== undefined && <span className="ml-1.5 text-ink-subtle">{count}</span>}
    </button>
  );
}

function sortKey(
  sort: ReturnType<typeof useLibraryLogic>["sort"],
): "addedDesc" | "artistAsc" | "yearDesc" {
  return sort === "ADDED_DESC" ? "addedDesc" : sort === "ARTIST_ASC" ? "artistAsc" : "yearDesc";
}
