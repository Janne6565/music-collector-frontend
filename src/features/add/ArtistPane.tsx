import { ReleaseArt } from "@/components/ReleaseArt";
import { Button, Skeleton } from "@/components/ui";
import type { Album, Artist, Release } from "@/domain/types";
import { FORMAT_LABELS } from "@/domain/types";
import { ArtistAvatar } from "@/features/add/ArtistResults";
import { artistMeta } from "@/features/add/useArtistSearchLogic";
import {
  PRIMARY_TYPES,
  type PrimaryType,
  useDiscographyLogic,
} from "@/features/add/useDiscographyLogic";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronUp, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ArtistPaneProps {
  readonly artist: Artist;
  /** The search this artist was opened from, so "Back" can name it. */
  readonly fromQuery: string;
  readonly onBack: () => void;
  readonly onAdd: (release: Release) => void;
  readonly addingMbid: string | undefined;
  readonly isOwned: (release: Release) => boolean;
}

/**
 * Screen 10d — an artist's discography, inside the add modal rather than on a route.
 *
 * A pane, not a page: opening an artist is a detour inside adding a record, and a route
 * change would throw away the search you would come straight back to.
 */
export function ArtistPane({
  artist,
  fromQuery,
  onBack,
  onAdd,
  addingMbid,
  isOwned,
}: ArtistPaneProps) {
  const { t } = useTranslation();
  const logic = useDiscographyLogic(artist);
  const meta = artistMeta(artist);

  return (
    <>
      <div className="flex flex-none items-center justify-between gap-4 px-6 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <ChevronLeft size={15} strokeWidth={2} aria-hidden />
          {t("artists.backToResults", { query: fromQuery })}
        </button>
      </div>

      <header className="flex flex-none gap-4 border-b border-line px-6 pt-4 pb-4.5">
        <ArtistAvatar name={artist.name} size={62} />
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[27px] leading-[1.05]">{artist.name}</h2>
          {artist.disambiguation !== "" && (
            <p className="mt-1.5 text-[12.5px] leading-normal text-ink-muted">
              {artist.disambiguation}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.75">
            {meta !== "" && <Chip>{meta}</Chip>}
            <Chip>{t("artists.releaseCount", { count: logic.total })}</Chip>
          </div>
        </div>
        <div className="flex w-[220px] flex-none flex-col gap-2.25">
          <label className="flex h-9 items-center gap-2.25 rounded-lg border border-line bg-surface px-3 focus-within:border-ink">
            <Search
              size={15}
              strokeWidth={1.75}
              className="flex-none text-ink-subtle"
              aria-hidden
            />
            <input
              value={logic.filter}
              onChange={(event) => logic.setFilter(event.target.value)}
              placeholder={t("artists.filterPlaceholder", { name: artist.name })}
              aria-label={t("artists.filterPlaceholder", { name: artist.name })}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-ink-subtle"
            />
          </label>
          {logic.filtering && (
            <span className="font-mono text-[10px] text-ink-subtle">
              {t("artists.filterMatches", { shown: logic.matching, total: logic.total })}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-none flex-wrap gap-1.75 px-6 pt-3.5 pb-3">
        {PRIMARY_TYPES.map((type) => (
          <TypeChip
            key={type}
            type={type}
            active={logic.type === type}
            count={logic.totals[type]}
            onClick={() => logic.setType(type)}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-1">
        {logic.loading ? (
          <AlbumSkeletons />
        ) : logic.failed ? (
          <p className="pt-6 text-sm text-ink-muted">{t("add.failed")}</p>
        ) : logic.albums.length === 0 ? (
          <p className="pt-6 text-sm text-ink-muted">
            {logic.filtering ? t("artists.noneMatchFilter") : t("artists.noneOfType")}
          </p>
        ) : (
          logic.albums.map((album) => (
            <AlbumRow
              key={album.albumId}
              album={album}
              expanded={logic.expandedAlbum === album.albumId}
              onToggle={() => logic.toggleAlbum(album)}
              pressings={logic.pressings}
              pressingsLoading={logic.pressingsLoading}
              pressingsFailed={logic.pressingsFailed}
              onAdd={onAdd}
              addingMbid={addingMbid}
              isOwned={isOwned}
            />
          ))
        )}
      </div>
    </>
  );
}

function Chip({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-ink/7 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
      {children}
    </span>
  );
}

/**
 * A type chip, with its count once that type has been opened.
 *
 * The deck puts a number on every chip. Each one is its own upstream query and MusicBrainz
 * allows one request per second, so drawing all five would cost five seconds before the
 * first album appeared. The chip you are on is always exact; the rest fill in behind you.
 */
function TypeChip({
  type,
  active,
  count,
  onClick,
}: {
  readonly type: PrimaryType;
  readonly active: boolean;
  readonly count: number | null;
  readonly onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-2.75 py-1.25 text-[11.5px] transition-colors",
        active
          ? "bg-ink font-semibold text-paper"
          : "border border-line bg-surface font-medium text-ink-muted hover:bg-canvas",
      )}
    >
      {t(`artists.type.${type}`)}
      {count !== null && (
        <span className={cn("ml-1.5", active ? "text-paper/55" : "text-ink-subtle")}>{count}</span>
      )}
    </button>
  );
}

interface AlbumRowProps {
  readonly album: Album;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly pressings: readonly Release[];
  readonly pressingsLoading: boolean;
  readonly pressingsFailed: boolean;
  readonly onAdd: (release: Release) => void;
  readonly addingMbid: string | undefined;
  readonly isOwned: (release: Release) => boolean;
}

function AlbumRow({
  album,
  expanded,
  onToggle,
  pressings,
  pressingsLoading,
  pressingsFailed,
  onAdd,
  addingMbid,
  isOwned,
}: AlbumRowProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        expanded && "rounded-b-[10px] bg-surface shadow-[0_1px_3px_rgba(25,23,19,.07)]",
      )}
    >
      <div
        className={cn("flex items-center gap-3.5 border-t border-line py-3", expanded && "px-3.5")}
      >
        <div className="h-[46px] w-[46px] flex-none">
          {/* An album's own cover, from the archive's release-group endpoint — picking one
              of its pressings' covers would be arbitrary. */}
          <ReleaseArt release={album} className="rounded-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold leading-tight">{album.title}</div>
          <div className="truncate text-[11.5px] leading-snug text-ink-muted">
            {[album.year, album.primaryType].filter(Boolean).join(" · ")}
            {expanded &&
              pressings.length > 0 &&
              ` · ${t("artists.pressingCount", { count: pressings.length })}`}
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={onToggle}
          aria-expanded={expanded}
          className="h-8 flex-none rounded-lg px-3 text-xs"
        >
          {t("artists.pressings")}
          {expanded ? (
            <ChevronUp size={14} strokeWidth={2} aria-hidden />
          ) : (
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="px-3.5 pb-3">
          {pressingsLoading ? (
            <PressingSkeletons />
          ) : pressingsFailed ? (
            <p className="py-3 text-[12.5px] text-ink-muted">{t("add.failed")}</p>
          ) : pressings.length === 0 ? (
            <p className="py-3 text-[12.5px] text-ink-muted">{t("artists.noPressings")}</p>
          ) : (
            <PressingTable
              pressings={pressings}
              onAdd={onAdd}
              addingMbid={addingMbid}
              isOwned={isOwned}
            />
          )}
        </div>
      )}
    </div>
  );
}

const COLUMNS = "grid-cols-[52px_1fr_1fr_112px_84px]";

function PressingTable({
  pressings,
  onAdd,
  addingMbid,
  isOwned,
}: {
  readonly pressings: readonly Release[];
  readonly onAdd: (release: Release) => void;
  readonly addingMbid: string | undefined;
  readonly isOwned: (release: Release) => boolean;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <div
        className={cn(
          "grid gap-2.5 px-2 pb-1.75 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-subtle",
          COLUMNS,
        )}
      >
        <span>{t("artists.column.year")}</span>
        <span>{t("artists.column.label")}</span>
        <span>{t("artists.column.catalog")}</span>
        <span>{t("artists.column.format")}</span>
        <span />
      </div>
      <div className="border-t border-line">
        {pressings.map((pressing) => (
          <PressingRow
            key={pressing.id}
            pressing={pressing}
            owned={isOwned(pressing)}
            adding={addingMbid === pressing.id}
            onAdd={() => onAdd(pressing)}
          />
        ))}
      </div>
      <p className="px-2 pt-2.5 text-[11px] text-ink-subtle">{t("artists.pickLater")}</p>
    </div>
  );
}

function PressingRow({
  pressing,
  owned,
  adding,
  onAdd,
}: {
  readonly pressing: Release;
  readonly owned: boolean;
  readonly adding: boolean;
  readonly onAdd: () => void;
}) {
  const { t } = useTranslation();
  const details = [
    pressing.releaseDate,
    pressing.barcode === null ? null : `${t("artists.detail.barcode")} ${pressing.barcode}`,
    pressing.trackCount === null
      ? null
      : t("artists.detail.tracks", { tracks: pressing.trackCount, discs: pressing.discCount ?? 1 }),
  ]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join(" · ");

  return (
    <div className={cn("grid items-center gap-2.5 border-b border-line/60 px-2 py-2.25", COLUMNS)}>
      <span className="text-xs font-semibold">{pressing.year ?? "—"}</span>
      <span className="truncate text-xs text-ink/70">
        {[pressing.label, pressing.country].filter(Boolean).join(" · ") || "—"}
      </span>
      <span className="truncate font-mono text-[11px] text-ink-subtle">
        {pressing.catalogNumber ?? "—"}
      </span>
      <span className="flex items-center gap-1.75 text-[11.5px] font-medium text-ink/70">
        <span className="h-[18px] w-[18px] flex-none">
          <ReleaseArt release={pressing} className="rounded-[2px]" />
        </span>
        {FORMAT_LABELS[pressing.format]}
      </span>
      {owned ? (
        <span className="text-right font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-subtle">
          {t("addDialog.inLibrary")}
        </span>
      ) : (
        <Button onClick={onAdd} loading={adding} className="h-7 rounded-md px-2.5 text-[11.5px]">
          {!adding && <Plus size={13} strokeWidth={2} aria-hidden />}
          {t("addDialog.add")}
        </Button>
      )}
      {details !== "" && (
        <p className="col-span-5 px-0 pt-0.5 font-mono text-[10px] text-ink-subtle">{details}</p>
      )}
    </div>
  );
}

function AlbumSkeletons() {
  return (
    <>
      {["64%", "48%", "56%"].map((width) => (
        <div key={width} className="flex items-center gap-3.5 border-t border-line py-3">
          <Skeleton className="h-[46px] w-[46px] flex-none rounded-sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
            <Skeleton className="h-[11px] rounded-[3px]" style={{ width }} />
            <Skeleton tone="soft" className="h-[9px] rounded-[3px]" style={{ width: "38%" }} />
          </div>
          <div className="h-8 w-[92px] flex-none rounded-lg bg-ink/5" aria-hidden />
        </div>
      ))}
    </>
  );
}

function PressingSkeletons() {
  return (
    <div className="pt-2">
      {["70%", "58%", "64%"].map((width) => (
        <div key={width} className="flex items-center gap-2.5 py-2.25">
          <Skeleton className="h-[10px] w-10 rounded-[3px]" />
          <Skeleton tone="soft" className="h-[10px] rounded-[3px]" style={{ width }} />
        </div>
      ))}
    </div>
  );
}
