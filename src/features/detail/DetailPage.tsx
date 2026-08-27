import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button, buttonClassName } from "@/components/ui";
import { CopyDetailsDialog } from "@/features/copy/CopyDetailsDialog";
import { useDetailLogic } from "@/features/detail/useDetailLogic";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { PhotoStrip } from "@/features/photos/PhotoStrip";
import { type ShownImage, resolveShown } from "@/features/photos/shownImage";
import { usePhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { markBackNavigation } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Copy, Release } from "@janne6565/rekordo-shared";
import {
  CONDITION_SHORT,
  FORMAT_LABELS,
  catalogArtShown,
  copyFormat,
} from "@janne6565/rekordo-shared";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, PencilLine, Plus, Star } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screens 1g and 12a — the item detail, inside the sidebar shell the rest of the app
 * lives in.
 *
 * Read-only, with one action. Every field on this page used to be editable in place, and
 * turn 12 took all of it into the modal behind "Edit copy": one field set with two entry
 * points, so what you can say about a copy while adding it and what you can say about it
 * later cannot drift apart. What is left here is the record as it stands.
 *
 * The page stays in the app's own paper palette. Turn 3's cover-derived chrome — a page
 * that went dark for a dark sleeve — is a phone idea: there the record fills the screen
 * and the chrome is the sleeve's own surround. On web the same page is a panel beside a
 * fixed sidebar, so the colour change reads as the app flickering between two themes
 * rather than as one record's mood, and every second record disagrees with the one before
 * it. The mobile app keeps it.
 */
export function DetailPage({ copyId }: { readonly copyId: string }) {
  const { t } = useTranslation();
  const logic = useDetailLogic(copyId);
  const photos = usePhotoStripLogic(copyId);
  /** Which picture the hero is showing. Null until you pick one — see `resolveShown`. */
  const [shown, setShown] = useState<ShownImage | null>(null);

  const stats = useCollectionStats();
  const [editing, setEditing] = useState(false);

  if (logic.loading) {
    return (
      <AppShell stats={stats}>
        <div className="p-8 text-sm text-ink-muted">…</div>
      </AppShell>
    );
  }
  if (logic.data === null) {
    return (
      <AppShell stats={stats}>
        <div className="flex flex-col items-start gap-4 p-8">
          <p className="text-sm text-ink-muted">{t("detail.notFound")}</p>
          <Link
            to="/"
            viewTransition
            onClick={markBackNavigation}
            className="text-sm text-accent underline"
          >
            {t("detail.back")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const { copy, release, otherCopies } = logic.data;
  const currentImage = resolveShown(
    shown,
    photos.tiles,
    release?.coverArtUrl != null && release.coverArtUrl !== "",
    photos.catalogArt,
  );
  /**
   * `previewSrc` while nothing is picked, not the resolved tile's source: it is the first
   * photo whose *bytes are already here*, so a copy pulled down from another account
   * shows artwork rather than an empty frame while its images are still arriving. Once
   * you have picked a tile the answer is that tile, and null — the catalogue — for the
   * catalogue tile or for a photo whose bytes have not landed yet.
   */
  const heroSrc =
    shown === null
      ? photos.previewSrc
      : currentImage.kind === "PHOTO"
        ? (photos.tiles.find((tile) => tile.photo.id === currentImage.id)?.src ?? null)
        : null;

  return (
    // The tab bar gives way to this page's own bar (24c): the record is one level below
    // the four destinations, and Edit is the thing you came here to press.
    <AppShell stats={stats} phoneBottom="none">
      <header className="hidden flex-none items-center justify-between gap-4 border-b border-line bg-paper px-8 py-4 sm:flex">
        <div className="flex min-w-0 items-center gap-3.5">
          {/* 12a leads with the way out, spelled: an arrow and the word, not a bare
              chevron sitting in front of the trail. The breadcrumb that follows is the
              record, not the route. */}
          <Link
            to="/"
            // Returning is not an arrival: the grid was never gone, so it fades back in
            // without the 6px rise the forward swap has.
            viewTransition
            onClick={markBackNavigation}
            className={buttonClassName(
              "secondary",
              "h-[34px] flex-none gap-1.5 rounded-lg pr-3.5 pl-2.5 text-[12.5px] shadow-[0_1px_2px_rgba(25,23,19,.06)]",
            )}
          >
            <ArrowLeft size={15} strokeWidth={2} aria-hidden />
            {t("detail.back")}
          </Link>
          <Breadcrumb release={release} />
        </div>
        {/* 12a's one header action, and no Save beside it: saving belongs to the modal
            that does the editing. */}
        <Button
          onClick={() => setEditing(true)}
          className="h-[34px] flex-none rounded-lg px-3.5 text-[12.5px]"
        >
          <PencilLine size={14} strokeWidth={1.9} aria-hidden />
          {t("detail.edit")}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-paper text-ink">
        <div className="flex flex-col sm:flex-row sm:gap-10 sm:p-8">
          {/*
           * 24c: on a phone the sleeve is the first thing on the screen and it costs no
           * margin — full width, cropped to 320px. The desktop keeps its 340px square
           * beside the text, where a bleeding image would fight the sidebar.
           */}
          <PhoneHero
            copy={copy}
            release={release}
            previewSrc={heroSrc}
            allowCatalogArt={photos.catalogArt !== "HIDDEN"}
            photos={photos}
            shown={currentImage}
            onShow={setShown}
          />
          <div className="hidden flex-none sm:block">
            <Cover
              copy={copy}
              release={release}
              previewSrc={heroSrc}
              allowCatalogArt={photos.catalogArt !== "HIDDEN"}
            />
            <PhotoStrip logic={photos} release={release} shown={currentImage} onShow={setShown} />
          </div>

          <div className="min-w-0 flex-1 px-4 pt-4 pb-6 sm:px-0 sm:pt-0 sm:pb-0">
            <Header copy={copy} release={release} />

            <PhoneFields copy={copy} />
            <Fields copy={copy} />

            <Notes copy={copy} saving={logic.saving} onKeep={(notes) => logic.save({ notes })} />
            {otherCopies.length > 0 && <OtherCopies copies={otherCopies} />}
          </div>
        </div>
      </div>

      {/* The bar the tab bar stepped aside for. One action, the width of the screen. */}
      <div className="flex flex-none gap-2 border-t border-line bg-paper/95 px-4 pt-2.5 pb-3 pb-safe sm:hidden">
        <Button
          onClick={() => setEditing(true)}
          className="h-12 flex-1 rounded-xl text-sm font-bold"
        >
          <PencilLine size={16} strokeWidth={2} aria-hidden />
          {t("detail.edit")}
        </Button>
      </div>

      {/* Screen 12b — the add flow's step two, reached from here instead. Removing the
          copy lives in its footer, which is why this page no longer has a button for it. */}
      {editing && (
        <CopyDetailsDialog
          copyId={copyId}
          mode="EDIT"
          onClose={() => setEditing(false)}
          onRemove={logic.remove}
          removing={logic.removing}
        />
      )}
    </AppShell>
  );
}

/**
 * "Miles Davis / Bitches Brew" — the trail the deck puts beside the back button. Library
 * is not a segment here: the button next to it goes there, and 12a does not say it twice.
 */
function Breadcrumb({ release }: { readonly release: Release | undefined }) {
  const { t } = useTranslation();
  const trail = [release?.artistName, release?.title].filter(
    (part): part is string => typeof part === "string" && part !== "",
  );
  if (trail.length === 0) return null;

  return (
    <nav
      aria-label={t("detail.breadcrumb")}
      className="min-w-0 truncate text-[12.5px] font-medium text-ink-muted"
    >
      {trail.join(" / ")}
    </nav>
  );
}

/**
 * The phone's hero — screen 24c.
 *
 * The sleeve runs edge to edge and is cropped to 320px rather than shown whole. A square
 * at 390px would be 390px tall and push the title off the fold; the crop keeps the record
 * first and the title visible under it, which is the order the deck asks for.
 *
 * The way back and the pictures both sit *on* the artwork, in blurred pills: the header
 * bar this page has above 640px would be a second horizontal band over a photograph.
 */
function PhoneHero({
  copy,
  release,
  previewSrc,
  allowCatalogArt,
  photos,
  shown,
  onShow,
}: {
  readonly copy: Copy;
  readonly release: Release | undefined;
  readonly previewSrc: string | null;
  readonly allowCatalogArt: boolean;
  readonly photos: ReturnType<typeof usePhotoStripLogic>;
  readonly shown: ShownImage;
  readonly onShow: (shown: ShownImage) => void;
}) {
  const { t } = useTranslation();
  const hasCatalog = catalogArtShown(
    { catalogArt: photos.catalogArt },
    release?.coverArtUrl != null && release.coverArtUrl !== "",
  );
  /*
   * Four at most. The deck stops at four and sends the rest to a screen of their own;
   * until that screen exists the strip simply ends, because five 44px tiles plus their
   * gaps are wider than the 390px they would have to sit in.
   */
  const tiles = photos.tiles.slice(0, hasCatalog ? 3 : 4);

  return (
    <div className="relative h-80 overflow-hidden sm:hidden">
      <ReleaseArt
        release={release}
        format={copyFormat(copy, release)}
        loading="eager"
        variant="bleed"
        previewSrc={previewSrc}
        allowCatalogArt={allowCatalogArt}
      />
      {/* So a pale sleeve cannot swallow the tiles sitting on its bottom edge. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70px] bg-gradient-to-b from-transparent to-paper/90" />

      <Link
        to="/"
        viewTransition
        onClick={markBackNavigation}
        className="absolute top-3.5 left-3.5 flex h-10 items-center gap-1.5 rounded-full bg-paper/92 pr-3.5 pl-2.5 text-[12.5px] font-semibold backdrop-blur-sm"
      >
        <ArrowLeft size={17} strokeWidth={2.2} aria-hidden />
        {/* One level, not two: 12a's "artist / title" trail has no room here, and the
            artist is in the meta line under the title anyway. */}
        {t("nav.library")}
      </Link>

      {(tiles.length > 0 || hasCatalog) && (
        <div className="absolute bottom-2.5 left-4 flex gap-1.5">
          {tiles.map(({ photo, src }) => (
            <button
              type="button"
              key={photo.id}
              onClick={() => onShow({ kind: "PHOTO", id: photo.id })}
              aria-label={t("photos.show")}
              aria-current={shown.kind === "PHOTO" && shown.id === photo.id ? "true" : undefined}
              className={cn(
                "relative size-11 overflow-hidden rounded-[7px] shadow-[0_1px_3px_rgba(0,0,0,.15)]",
                shown.kind === "PHOTO" && shown.id === photo.id
                  ? "ring-2 ring-accent"
                  : "ring-1 ring-ink/10",
              )}
            >
              {src !== null && <img src={src} alt="" className="size-full object-cover" />}
            </button>
          ))}
          {hasCatalog && (
            <button
              type="button"
              onClick={() => onShow({ kind: "CATALOG" })}
              aria-label={t("photos.show")}
              aria-current={shown.kind === "CATALOG" ? "true" : undefined}
              className={cn(
                "relative size-11 overflow-hidden rounded-[7px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,.15)]",
                shown.kind === "CATALOG" ? "ring-2 ring-accent" : "ring-1 ring-ink/10",
              )}
            >
              <ReleaseArt release={release} variant="bleed" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Cover({
  copy,
  release,
  previewSrc,
  allowCatalogArt,
}: {
  readonly copy: Copy;
  readonly release: Release | undefined;
  readonly previewSrc: string | null;
  readonly allowCatalogArt: boolean;
}) {
  return (
    <div className="h-[340px] w-[340px] overflow-hidden rounded-lg shadow-[0_10px_30px_rgba(25,23,19,.16)]">
      <ReleaseArt
        release={release}
        format={copyFormat(copy, release)}
        loading="eager"
        variant="bleed"
        previewSrc={previewSrc}
        allowCatalogArt={allowCatalogArt}
      />
    </div>
  );
}

function Header({ copy, release }: { readonly copy: Copy; readonly release: Release | undefined }) {
  return (
    <>
      <div className="flex items-center gap-2">
        {/* The copy's format, not the release's: a tape of a record listed as vinyl is
            still a tape on your shelf. */}
        <Badge strong>{FORMAT_LABELS[copyFormat(copy, release)]}</Badge>
        {copy.condition !== null && <Badge>{CONDITION_SHORT[copy.condition]}</Badge>}
      </div>
      <h1 className="mt-3.5 font-serif text-[30px] leading-[1.12] text-pretty sm:text-[38px] sm:leading-[1.05]">
        {release?.title ?? "—"}
      </h1>
      {/* The pressing reads as part of the record's name here rather than as a field of
          its own — 12a's grid is the six things that are true of *your* copy. */}
      <p className="mt-1.5 text-[13px] leading-relaxed text-pretty text-ink-muted sm:text-[15px]">
        {[
          release?.artistName,
          release?.year,
          release?.label,
          release?.catalogNumber,
          release?.country,
        ]
          .filter((part) => part != null && part !== "")
          .join(" · ")}
      </p>
    </>
  );
}

/**
 * The six answers 12a rules off under the title.
 *
 * Ruled rows rather than the cards this used to be: a card each said every one of them
 * was worth the same amount of attention, and half of them are usually a dash.
 */
interface DetailField {
  readonly label: string;
  readonly value: ReactNode;
  /** Nothing was ever entered here. Six of these in a row are not information (24c). */
  readonly empty: boolean;
}

/** The six answers, in one place, so the phone and the desktop cannot list them differently. */
function useDetailFields(copy: Copy): readonly DetailField[] {
  const { t } = useTranslation();
  return [
    {
      label: t("detail.mediaCondition"),
      value: copy.condition === null ? "—" : CONDITION_SHORT[copy.condition],
      empty: copy.condition === null,
    },
    {
      label: t("detail.sleeveCondition"),
      value: copy.sleeveCondition === null ? "—" : CONDITION_SHORT[copy.sleeveCondition],
      empty: copy.sleeveCondition === null,
    },
    {
      label: t("detail.paid"),
      value: formatMoney(copy.pricePaidCents, copy.currency),
      empty: copy.pricePaidCents === null,
    },
    { label: t("detail.bought"), value: copy.purchasedOn ?? "—", empty: copy.purchasedOn === null },
    { label: t("detail.where"), value: copy.purchasedAt ?? "—", empty: copy.purchasedAt === null },
    {
      label: t("detail.yourRating"),
      value: <Rating key="rating" rating={copy.rating} />,
      empty: copy.rating === null,
    },
  ];
}

function Fields({ copy }: { readonly copy: Copy }) {
  const fields = useDetailFields(copy);

  return (
    <div className="mt-6.5 hidden grid-cols-3 border-t border-line sm:grid">
      {fields.map(({ label, value }) => (
        <div key={label} className="border-b border-line py-3.25 pr-4">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-ink-muted">
            {label}
          </div>
          <div className="mt-1.25 truncate text-[15px] font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * The same six answers under 640px — two columns, and the blank ones folded away (24c).
 *
 * Three columns of 122px cannot hold "Hüllenzustand" above a value, and a copy that was
 * added in ten seconds has four of these empty: a grid of dashes tells you nothing except
 * that the grid exists. The row underneath names what is missing, so the fields are still
 * discoverable — that is the trade the deck makes, and it only works if the row says
 * *which* ones rather than just how many.
 */
function PhoneFields({ copy }: { readonly copy: Copy }) {
  const { t } = useTranslation();
  const fields = useDetailFields(copy);
  const [showAll, setShowAll] = useState(false);
  const missing = fields.filter((field) => field.empty);
  const shown = showAll ? fields : fields.filter((field) => !field.empty);

  return (
    <div className="sm:hidden">
      {shown.length > 0 && (
        // 1px gaps over the border colour: the hairlines between the cells are the gaps
        // themselves, so no cell has to know whether it is in the last row.
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
          {shown.map(({ label, value }) => (
            <div key={label} className="bg-surface px-3 py-2.75">
              <div className="font-mono text-[9.5px] tracking-[0.07em] text-ink-subtle uppercase">
                {label}
              </div>
              <div className="mt-1 text-sm font-semibold">{value}</div>
            </div>
          ))}
        </div>
      )}
      {missing.length > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 flex h-11 items-center gap-1.5 text-[12.5px] font-semibold text-accent"
        >
          <Plus size={14} strokeWidth={2.2} aria-hidden />
          {t("detail.showEmpty", {
            count: missing.length,
            fields: missing.map((field) => field.label).join(", "),
          })}
        </button>
      )}
    </div>
  );
}

function Rating({ rating }: { readonly rating: number | null }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          strokeWidth={1.5}
          aria-hidden
          className={star <= (rating ?? 0) ? "text-accent" : "text-line"}
          fill={star <= (rating ?? 0) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function Notes({
  copy,
  onKeep,
  saving,
}: {
  readonly copy: Copy;
  readonly onKeep: (notes: string) => void;
  readonly saving: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="mt-3.5 rounded-lg bg-surface p-3.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.09em] text-ink-muted">
          {t("detail.notes")}
        </div>
        <p
          className={`mt-1.5 text-sm leading-relaxed text-pretty ${
            copy.notes === null ? "text-ink-muted" : "text-ink"
          }`}
        >
          {copy.notes ?? t("detail.notesEmpty")}
        </p>
      </div>
      {copy.notesConflict !== null && <NotesConflict copy={copy} onKeep={onKeep} saving={saving} />}
    </>
  );
}

/**
 * Another device wrote different notes, and the merge kept that version instead of
 * discarding it. Shown until the person picks one: sync can tell that two versions differ,
 * but not which of them anybody has actually read.
 */
function NotesConflict({
  copy,
  onKeep,
  saving,
}: {
  readonly copy: Copy;
  readonly onKeep: (notes: string) => void;
  readonly saving: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 rounded-lg bg-surface p-3.5 ring-1 ring-accent">
      <div className="font-mono text-[10px] uppercase tracking-[0.09em] text-accent">
        {t("detail.conflict.title")}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-pretty text-ink">{copy.notesConflict}</p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          loading={saving}
          onClick={() => onKeep(copy.notesConflict as string)}
          className="h-8 rounded-full px-3 text-xs"
        >
          {t("detail.conflict.keepThis")}
        </Button>
        <Button
          variant="secondary"
          loading={saving}
          onClick={() => onKeep(copy.notes ?? "")}
          className="h-8 rounded-full px-3 text-xs"
        >
          {t("detail.conflict.keepMine")}
        </Button>
      </div>
    </div>
  );
}

function OtherCopies({
  copies,
}: { readonly copies: readonly { copy: Copy; release: Release | undefined }[] }) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="mt-7 mb-2.5 text-[13px] font-semibold">{t("detail.otherCopies")}</h2>
      <div className="flex gap-3">
        {copies.map(({ copy, release }) => (
          <Link
            key={copy.id}
            to="/copies/$copyId"
            params={{ copyId: copy.id }}
            viewTransition
            className="flex-1 rounded-lg bg-surface p-3.5"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.09em] text-ink-muted">
              {release === undefined && copy.manualFormat === null
                ? "—"
                : FORMAT_LABELS[copyFormat(copy, release)]}
            </div>
            <div className="mt-1.5 text-[13.5px] font-semibold">
              {release?.year ?? ""}
              {copy.condition !== null && ` · ${CONDITION_SHORT[copy.condition]}`}
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">
              {formatMoney(copy.pricePaidCents, copy.currency)}
              {copy.purchasedAt !== null && ` · ${copy.purchasedAt}`}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Badge({
  children,
  strong = false,
}: { readonly children: ReactNode; readonly strong?: boolean }) {
  return (
    <span
      className={`rounded-[5px] bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${
        strong ? "text-ink" : "text-ink-muted"
      }`}
    >
      {children}
    </span>
  );
}

/** Exported for testing. */
export function formatMoney(cents: number | null, currency: string): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}
