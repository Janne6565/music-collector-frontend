import { ReleaseArt } from "@/components/ReleaseArt";
import { Button, ModalClose, Skeleton } from "@/components/ui";
import { ArtistAvatar } from "@/features/add/ArtistResults";
import { artistMeta } from "@/features/add/useArtistSearchLogic";
import {
  PRIMARY_TYPES,
  type PrimaryType,
  useDiscographyLogic,
} from "@/features/add/useDiscographyLogic";
import { cn } from "@/lib/utils";
import type { Album, Artist, Release } from "@janne6565/rekordo-shared";
import { FORMAT_LABELS } from "@janne6565/rekordo-shared";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CopyPlus,
  Heart,
  LibraryBig,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ArtistPaneProps {
  readonly artist: Artist;
  /** The search this artist was opened from, so "Back" can name it. */
  readonly fromQuery: string;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly onAdd: (release: Release) => void;
  readonly addingMbid: string | undefined;
  readonly isOwned: (release: Release) => boolean;
  readonly onWish: (release: Release) => void;
  readonly wishingMbid: string | undefined;
  /** The pressing the sheet's footer will act on, picked by clicking its row. */
  readonly selected: Release | null;
  readonly onSelect: (release: Release | null) => void;
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
  onClose,
  onAdd,
  addingMbid,
  isOwned,
  onWish,
  wishingMbid,
  selected,
  onSelect,
}: ArtistPaneProps) {
  const { t } = useTranslation();
  const logic = useDiscographyLogic(artist);
  const meta = artistMeta(artist);

  return (
    <>
      <div className="flex flex-none items-center justify-between gap-4 px-4 sm:px-6 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <ChevronLeft size={15} strokeWidth={2} className="flex-none" aria-hidden />
          {t("artists.backToResults", { query: fromQuery })}
        </button>
        <ModalClose onClose={onClose} label={t("common.close")} />
      </div>

      <header className="flex flex-none flex-col gap-4 border-b border-line px-4 pt-4 pb-4 sm:flex-row sm:px-4 sm:px-6 sm:pb-4.5">
        <ArtistAvatar name={artist.name} size={62} mbid={artist.mbid} />
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[22px] leading-[1.08] text-pretty sm:text-[27px] sm:leading-[1.05]">
            {artist.name}
          </h2>
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
        {/* Its own row under 640px: 220px beside a 62px avatar and a name leaves the
            artist's name about 90px, which is not a name. */}
        <div className="flex w-full flex-none flex-col gap-2.25 sm:w-[220px]">
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

      <div className="flex flex-none flex-wrap gap-1.75 px-4 sm:px-6 pt-3.5 pb-3">
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

      <div className="min-h-0 flex-1 overflow-auto px-4 sm:px-6 pb-1">
        {logic.loading ? (
          <AlbumSkeletons />
        ) : logic.failed ? (
          <p className="py-6 text-sm text-ink-muted">{t("add.failed")}</p>
        ) : logic.albums.length === 0 ? (
          <p className="py-6 text-sm text-ink-muted">
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
              onWish={onWish}
              wishingMbid={wishingMbid}
              selected={selected}
              onSelect={onSelect}
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
        "rounded-full px-2.75 py-1.25 text-[11.5px] transition-colors duration-(--mc-quick)",
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
  readonly onWish: (release: Release) => void;
  readonly wishingMbid: string | undefined;
  readonly selected: Release | null;
  readonly onSelect: (release: Release | null) => void;
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
  onWish,
  wishingMbid,
  selected,
  onSelect,
}: AlbumRowProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "mb-1",
        expanded && "rounded-b-[10px] bg-surface shadow-[0_1px_3px_rgba(25,23,19,.07)]",
      )}
    >
      <div
        className={cn("flex items-center gap-3.5 border-t border-line py-3", expanded && "px-3.5")}
      >
        <div className="h-[46px] w-[55px] flex-none">
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
          // Open, the button sits on the album's own white card, so the deck drops its
          // border for a flat fill rather than drawing a box inside a box.
          className={cn(
            "h-8 flex-none rounded-lg px-3 text-xs",
            expanded && "border-transparent bg-ink/8 hover:bg-ink/12",
          )}
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
              onWish={onWish}
              wishingMbid={wishingMbid}
              selected={selected}
              onSelect={onSelect}
            />
          )}
        </div>
      )}
    </div>
  );
}

const COLUMNS = "grid-cols-[52px_1fr_1fr_96px_62px_84px]";

function PressingTable({
  pressings,
  onAdd,
  addingMbid,
  isOwned,
  onWish,
  wishingMbid,
  selected,
  onSelect,
}: {
  readonly pressings: readonly Release[];
  readonly onAdd: (release: Release) => void;
  readonly addingMbid: string | undefined;
  readonly isOwned: (release: Release) => boolean;
  readonly onWish: (release: Release) => void;
  readonly wishingMbid: string | undefined;
  readonly selected: Release | null;
  readonly onSelect: (release: Release | null) => void;
}) {
  const { t } = useTranslation();
  /**
   * Which pressing has its facts open. One at a time, like the album above it: the whole
   * point of the table is comparing rows, and a stack of open panels pushes the rows you
   * were comparing off the bottom of the sheet.
   */
  const [openDetails, setOpenDetails] = useState<string | null>(null);

  return (
    <div>
      <div
        className={cn(
          "hidden gap-2.5 px-2 pb-1.75 font-mono text-[9.5px] tracking-[0.1em] text-ink-subtle uppercase sm:grid",
          COLUMNS,
        )}
      >
        <span>{t("artists.column.year")}</span>
        <span>{t("artists.column.label")}</span>
        <span>{t("artists.column.catalog")}</span>
        <span>{t("artists.column.format")}</span>
        <span />
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
            wishing={wishingMbid === pressing.id}
            onWish={() => onWish(pressing)}
            selected={selected?.id === pressing.id}
            onSelect={() => onSelect(selected?.id === pressing.id ? null : pressing)}
            detailsOpen={openDetails === pressing.id}
            onToggleDetails={() =>
              setOpenDetails((current) => (current === pressing.id ? null : pressing.id))
            }
          />
        ))}
      </div>
      <div className="flex items-center justify-end border-t border-line px-2 pt-2.5">
        <p className="text-[11px] text-ink-subtle">{t("artists.pickLater")}</p>
      </div>
    </div>
  );
}

interface PressingRowProps {
  readonly pressing: Release;
  readonly owned: boolean;
  readonly adding: boolean;
  readonly onAdd: () => void;
  readonly wishing: boolean;
  readonly onWish: () => void;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly detailsOpen: boolean;
  readonly onToggleDetails: () => void;
}

function PressingRow({
  pressing,
  owned,
  adding,
  onAdd,
  wishing,
  onWish,
  selected,
  onSelect,
  detailsOpen,
  onToggleDetails,
}: PressingRowProps) {
  const { t } = useTranslation();

  return (
    <>
      <div
        className={cn(
          // 24e: six columns become one row of two lines under 640px. The last child —
          // "all details" — wraps onto a line of its own rather than stealing width from
          // the two lines that actually tell two pressings apart.
          "flex flex-wrap items-center gap-2.5 border-b border-line/60 px-2 py-2.5",
          "sm:grid sm:items-center sm:py-2.25",
          COLUMNS,
          selected && "bg-canvas/60",
          detailsOpen && "border-b-0",
        )}
      >
        {/* The row itself picks the pressing for the footer, the way a search result does.
            It stops short of the two controls to its right, which do their own jobs. */}
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="col-span-4 flex min-w-0 flex-1 flex-col gap-0.5 text-left sm:grid sm:flex-none sm:items-center sm:gap-2.5"
          style={{ gridTemplateColumns: "52px 1fr 1fr 96px" }}
        >
          {/*
           * Year · country · format, and nothing else. Those are the three that separate
           * two pressings of the same album; a fourth would not fit and a thumbnail tells
           * two pressings of one record apart not at all.
           */}
          <span className="truncate text-[13px] font-semibold sm:hidden">
            {[
              pressing.year === null ? t("artists.unknownYear") : String(pressing.year),
              pressing.country ?? t("artists.unknownCountry"),
              FORMAT_LABELS[pressing.format],
            ].join(" · ")}
          </span>
          {/* Label and catalogue number, when MusicBrainz has them — and a line saying so
              when it does not, because "no catalogue number" is itself an answer here. */}
          <span className="truncate text-[11.5px] text-ink-muted sm:hidden">
            {[pressing.label, pressing.catalogNumber].filter(Boolean).join(" · ") ||
              t("artists.noCatalog")}
          </span>

          <span className="hidden text-xs font-semibold sm:block">{pressing.year ?? "—"}</span>
          <span className="hidden truncate text-xs text-ink/70 sm:block">
            {[pressing.label, pressing.country].filter(Boolean).join(" · ") || "—"}
          </span>
          <span className="hidden truncate font-mono text-[11px] text-ink-subtle sm:block">
            {pressing.catalogNumber ?? "—"}
          </span>
          <span className="hidden items-center gap-1.75 text-[11.5px] font-medium text-ink/70 sm:flex">
            <span className="h-[18px] w-[22px] flex-none">
              <ReleaseArt release={pressing} className="rounded-[2px]" />
            </span>
            {FORMAT_LABELS[pressing.format]}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleDetails}
          aria-expanded={detailsOpen}
          className={cn(
            "order-last flex h-9 w-full items-center gap-1 text-[11px] font-semibold",
            "sm:order-none sm:h-auto sm:w-auto",
            detailsOpen ? "text-ink/65" : "text-ink-subtle hover:text-ink",
          )}
        >
          {t("artists.column.details")}
          {detailsOpen ? (
            <ChevronUp size={12} strokeWidth={2} aria-hidden />
          ) : (
            <ChevronDown size={12} strokeWidth={2} aria-hidden />
          )}
        </button>

        {/* Both destinations, as they are on every other row that offers a release. A
            pressing three levels into a discography is as much a record you might covet as
            one in the search list, and owning one does not take either away — it renames
            the right-hand pill and leaves the choice where it was. */}
        <div className="flex flex-none justify-end gap-1.5">
          <Button
            variant={owned ? "secondary" : "primary"}
            onClick={onWish}
            loading={wishing}
            className="h-9 flex-none rounded-full px-3 text-[12px] sm:h-7 sm:px-2.5 sm:text-[11.5px]"
          >
            {!wishing && <Heart size={13} strokeWidth={2} aria-hidden />}
            {t("addDialog.wishlist")}
          </Button>
          <Button
            variant={owned ? "secondary" : "primary"}
            onClick={onAdd}
            loading={adding}
            className="h-9 flex-none whitespace-nowrap rounded-full px-3 text-[12px] sm:h-7 sm:px-2.5 sm:text-[11.5px]"
          >
            {!adding &&
              (owned ? (
                <CopyPlus size={13} strokeWidth={2} aria-hidden />
              ) : (
                <LibraryBig size={13} strokeWidth={2} aria-hidden />
              ))}
            {owned ? t("addDialog.secondCopy") : t("addDialog.shelf")}
          </Button>
        </div>
      </div>

      {detailsOpen && <PressingDetails pressing={pressing} />}
    </>
  );
}

/**
 * What one pressing is, spelled out (10d).
 *
 * The four facts that separate two pressings a catalog number does not: the exact date, a
 * barcode you can check against the sleeve in your hand, how many discs it came on, and
 * whether there is any artwork to expect. Each says "none" or "unknown" out loud rather
 * than disappearing — a missing barcode is itself the answer to "is this the CD reissue?".
 */
function PressingDetails({ pressing }: { readonly pressing: Release }) {
  const { t } = useTranslation();
  const facts: readonly (readonly [string, string])[] = [
    [t("artists.detail.released"), pressing.releaseDate ?? t("artists.detail.unknown")],
    [t("artists.detail.barcode"), pressing.barcode ?? t("artists.detail.none")],
    [
      t("artists.detail.tracks"),
      pressing.trackCount === null
        ? t("artists.detail.unknown")
        : t("artists.detail.trackCount", {
            tracks: pressing.trackCount,
            discs: pressing.discCount ?? 1,
          }),
    ],
    [
      t("artists.detail.sleeveArt"),
      pressing.coverArtUrl === null ? t("artists.detail.noArt") : t("artists.detail.hasArt"),
    ],
  ];

  return (
    <div className="mx-2 mb-2.5 flex flex-col gap-3.5 rounded-[9px] bg-paper p-3 shadow-[inset_0_0_0_1px_rgba(25,23,19,.08)] sm:flex-row">
      <div className="h-24 w-[115px] flex-none">
        <ReleaseArt release={pressing} className="rounded-sm" />
      </div>
      <dl className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-4.5 gap-y-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-subtle">
              {label}
            </dt>
            <dd className="mt-0.5 truncate text-xs">{value}</dd>
          </div>
        ))}
      </dl>
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
