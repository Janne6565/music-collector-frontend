import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button, buttonClassName } from "@/components/ui";
import { CopyDetailsDialog } from "@/features/copy/CopyDetailsDialog";
import { useDetailLogic } from "@/features/detail/useDetailLogic";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { PhotoStrip } from "@/features/photos/PhotoStrip";
import { type ShownImage, resolveShown } from "@/features/photos/shownImage";
import { usePhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import type { Copy, Release } from "@janne6565/music-collector-shared";
import { CONDITION_SHORT, FORMAT_LABELS } from "@janne6565/music-collector-shared";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, PencilLine, Star } from "lucide-react";
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
          <Link to="/" className="text-sm text-accent underline">
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
  );
  /**
   * `firstSrc` while nothing is picked, not the resolved tile's source: it is the first
   * photo whose *bytes are already here*, so a copy pulled down from another account
   * shows artwork rather than an empty frame while its images are still arriving. Once
   * you have picked a tile the answer is that tile, and null — the catalogue — for the
   * catalogue tile or for a photo whose bytes have not landed yet.
   */
  const heroSrc =
    shown === null
      ? photos.firstSrc
      : currentImage.kind === "PHOTO"
        ? (photos.tiles.find((tile) => tile.photo.id === currentImage.id)?.src ?? null)
        : null;

  return (
    <AppShell stats={stats}>
      <header className="flex flex-none items-center justify-between gap-4 border-b border-line bg-paper px-8 py-4">
        <div className="flex min-w-0 items-center gap-3.5">
          {/* 12a leads with the way out, spelled: an arrow and the word, not a bare
              chevron sitting in front of the trail. The breadcrumb that follows is the
              record, not the route. */}
          <Link
            to="/"
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
        <div className="flex gap-10 p-8">
          <div className="flex-none">
            <Cover release={release} previewSrc={heroSrc} />
            <PhotoStrip logic={photos} release={release} shown={currentImage} onShow={setShown} />
          </div>

          <div className="min-w-0 flex-1">
            <Header copy={copy} release={release} />

            <Fields copy={copy} />

            <Notes copy={copy} saving={logic.saving} onKeep={(notes) => logic.save({ notes })} />
            {otherCopies.length > 0 && <OtherCopies copies={otherCopies} />}
          </div>
        </div>
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

function Cover({
  release,
  previewSrc,
}: { readonly release: Release | undefined; readonly previewSrc: string | null }) {
  return (
    <div className="h-[340px] w-[340px] overflow-hidden rounded-lg shadow-[0_10px_30px_rgba(25,23,19,.16)]">
      <ReleaseArt release={release} loading="eager" variant="bleed" previewSrc={previewSrc} />
    </div>
  );
}

function Header({ copy, release }: { readonly copy: Copy; readonly release: Release | undefined }) {
  return (
    <>
      <div className="flex items-center gap-2">
        {release !== undefined && <Badge strong>{FORMAT_LABELS[release.format]}</Badge>}
        {copy.condition !== null && <Badge>{CONDITION_SHORT[copy.condition]}</Badge>}
      </div>
      <h1 className="mt-3.5 font-serif text-[38px] leading-[1.05]">{release?.title ?? "—"}</h1>
      {/* The pressing reads as part of the record's name here rather than as a field of
          its own — 12a's grid is the six things that are true of *your* copy. */}
      <p className="mt-1.5 text-[15px] text-ink-muted">
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
function Fields({ copy }: { readonly copy: Copy }) {
  const { t } = useTranslation();
  const rows: readonly (readonly [string, ReactNode])[] = [
    [t("detail.mediaCondition"), copy.condition === null ? "—" : CONDITION_SHORT[copy.condition]],
    [
      t("detail.sleeveCondition"),
      copy.sleeveCondition === null ? "—" : CONDITION_SHORT[copy.sleeveCondition],
    ],
    [t("detail.paid"), formatMoney(copy.pricePaidCents, copy.currency)],
    [t("detail.bought"), copy.purchasedOn ?? "—"],
    [t("detail.where"), copy.purchasedAt ?? "—"],
    [t("detail.yourRating"), <Rating key="rating" rating={copy.rating} />],
  ];

  return (
    <div className="mt-6.5 grid grid-cols-3 border-t border-line">
      {rows.map(([label, value]) => (
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
            className="flex-1 rounded-lg bg-surface p-3.5"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.09em] text-ink-muted">
              {release === undefined ? "—" : FORMAT_LABELS[release.format]}
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
