import { releaseDisambiguation } from "@/api/releases";
import { FormatThumb } from "@/components/FormatThumb";
import { Button } from "@/components/ui";
import type { Release } from "@/domain/types";
import { FORMAT_LABELS } from "@/domain/types";
import { useAddLogic } from "@/features/add/useAddLogic";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AddPage() {
  const { t } = useTranslation();
  const logic = useAddLogic();

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col px-6">
      <div className="flex flex-none items-center gap-3 pt-6 pb-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          {t("detail.back")}
        </Link>
      </div>

      <h1 className="flex-none font-serif text-3xl">{t("add.title")}</h1>
      <p className="flex-none pt-1.5 pb-5 text-sm text-ink-muted">{t("add.hint")}</p>

      <form
        className="flex flex-none gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          logic.submit();
        }}
      >
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-full border border-line bg-surface px-4">
          <Search size={16} strokeWidth={1.75} className="flex-none text-ink-subtle" aria-hidden />
          <input
            value={logic.term}
            onChange={(event) => logic.setTerm(event.target.value)}
            placeholder={t("add.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-subtle"
          />
        </label>
        <Button type="submit" loading={logic.searching} disabled={!logic.canSubmit}>
          {t("add.title")}
        </Button>
      </form>

      <div className="min-h-0 flex-1 overflow-auto pt-5 pb-8">
        <Results {...logic} />
      </div>
    </main>
  );
}

function Results({
  searching,
  failed,
  results,
  hasSearched,
  addRelease,
  addingMbid,
  wishFor,
  wishingMbid,
}: ReturnType<typeof useAddLogic>) {
  const { t } = useTranslation();

  if (searching) return <p className="text-sm text-ink-muted">{t("add.searching")}</p>;
  if (failed) return <p className="text-sm text-ink-muted">{t("add.failed")}</p>;
  if (!hasSearched) return null;
  if (results.length === 0) return <p className="text-sm text-ink-muted">{t("add.noResults")}</p>;

  return (
    <>
      <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
        {t("add.resultCount", { count: results.length })}
      </p>
      {results.map((release) => (
        <ResultRow
          key={release.mbid}
          release={release}
          onAdd={() => addRelease(release)}
          adding={addingMbid === release.mbid}
          onWish={() => wishFor(release)}
          wishing={wishingMbid === release.mbid}
        />
      ))}
    </>
  );
}

interface ResultRowProps {
  readonly release: Release;
  readonly onAdd: () => void;
  readonly adding: boolean;
  readonly onWish: () => void;
  readonly wishing: boolean;
}

/** One row per release *and* format, as screen 2a lists them. */
function ResultRow({ release, onAdd, adding, onWish, wishing }: ResultRowProps) {
  const { t } = useTranslation();
  const subtitle = releaseDisambiguation(release);

  return (
    <div className="flex items-center gap-3.5 border-t border-line py-3">
      <div className="h-12 w-12 flex-none">
        <FormatThumb format={release.format} />
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
      <Button
        variant="secondary"
        onClick={onWish}
        loading={wishing}
        aria-label={t("wishlist.addToWishlist")}
        title={t("wishlist.addToWishlist")}
        className="h-9 w-9 flex-none rounded-full px-0 text-ink-muted"
      >
        {!wishing && <Heart size={15} strokeWidth={1.75} aria-hidden />}
      </Button>
      <Button
        variant="secondary"
        onClick={onAdd}
        loading={adding}
        aria-label={t("add.add")}
        title={t("add.add")}
        className="h-9 w-9 flex-none rounded-full px-0"
      >
        {!adding && <Plus size={16} strokeWidth={1.75} aria-hidden />}
      </Button>
    </div>
  );
}
