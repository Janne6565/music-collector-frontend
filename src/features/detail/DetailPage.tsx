import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import type { Copy, Release } from "@/domain/types";
import { CONDITION_SHORT, FORMAT_LABELS } from "@/domain/types";
import { CopyDetailsDialog } from "@/features/copy/CopyDetailsDialog";
import { type DetailChrome, chromeFor } from "@/features/detail/theme";
import { useDetailLogic } from "@/features/detail/useDetailLogic";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { PhotoStrip } from "@/features/photos/PhotoStrip";
import { usePhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { Link } from "@tanstack/react-router";
import { PencilLine, Star } from "lucide-react";
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
 * The shell stays in the app's own paper chrome while the page under it follows the sleeve
 * (turn 3, applied to web as the deck suggested). Only the content region is themed: a
 * sidebar that changed colour with whatever record you last opened would make the one
 * fixed thing on screen the least stable one.
 */
export function DetailPage({ copyId }: { readonly copyId: string }) {
  const { t } = useTranslation();
  const logic = useDetailLogic(copyId);
  const photos = usePhotoStripLogic(copyId);
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
  const chrome = chromeFor(release?.coverTheme ?? null);

  return (
    <AppShell stats={stats}>
      <header
        className="flex flex-none items-center justify-between gap-4 border-b px-8 py-4"
        style={{ background: chrome.background, borderColor: chrome.line }}
      >
        <Breadcrumb release={release} chrome={chrome} />
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

      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{ background: chrome.background, color: chrome.ink }}
      >
        <div className="flex gap-10 p-8">
          <div className="flex-none">
            <Cover release={release} previewSrc={photos.firstSrc} />
            <PhotoStrip
              logic={photos}
              chrome={chrome}
              hasCatalog={release?.coverArtUrl != null && release.coverArtUrl !== ""}
            />
          </div>

          <div className="min-w-0 flex-1">
            <Header copy={copy} release={release} chrome={chrome} />

            <Fields copy={copy} chrome={chrome} />

            <Notes
              copy={copy}
              chrome={chrome}
              saving={logic.saving}
              onKeep={(notes) => logic.save({ notes })}
            />
            {otherCopies.length > 0 && <OtherCopies copies={otherCopies} chrome={chrome} />}
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

/** "Library / Miles Davis / Bitches Brew" — the trail the deck puts above the sleeve. */
function Breadcrumb({ release, chrome }: { readonly release: Release | undefined } & WithChrome) {
  const { t } = useTranslation();
  const trail = [release?.artistName, release?.title].filter(
    (part): part is string => typeof part === "string" && part !== "",
  );

  return (
    <nav
      aria-label={t("detail.breadcrumb")}
      className="min-w-0 truncate text-[12.5px] font-medium"
      style={{ color: chrome.muted }}
    >
      <Link to="/" className="hover:underline">
        {t("nav.library")}
      </Link>
      {trail.map((part) => (
        <span key={part}> / {part}</span>
      ))}
    </nav>
  );
}

function Cover({
  release,
  previewSrc,
}: { readonly release: Release | undefined; readonly previewSrc: string | null }) {
  return (
    <div className="h-[340px] w-[340px] overflow-hidden rounded-lg shadow-[0_10px_30px_rgba(0,0,0,.25)]">
      <ReleaseArt release={release} loading="eager" variant="bleed" previewSrc={previewSrc} />
    </div>
  );
}

interface WithChrome {
  readonly chrome: DetailChrome;
}

function Header({
  copy,
  release,
  chrome,
}: { readonly copy: Copy; readonly release: Release | undefined } & WithChrome) {
  return (
    <>
      <div className="flex items-center gap-2">
        {release !== undefined && (
          <Badge chrome={chrome} strong>
            {FORMAT_LABELS[release.format]}
          </Badge>
        )}
        {copy.condition !== null && (
          <Badge chrome={chrome}>{CONDITION_SHORT[copy.condition]}</Badge>
        )}
      </div>
      <h1 className="mt-3.5 font-serif text-[38px] leading-[1.05]">{release?.title ?? "—"}</h1>
      {/* The pressing reads as part of the record's name here rather than as a field of
          its own — 12a's grid is the six things that are true of *your* copy. */}
      <p className="mt-1.5 text-[15px]" style={{ color: chrome.muted }}>
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
function Fields({ copy, chrome }: { readonly copy: Copy } & WithChrome) {
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
    [t("detail.yourRating"), <Rating key="rating" rating={copy.rating} chrome={chrome} />],
  ];

  return (
    <div className="mt-6.5 grid grid-cols-3 border-t" style={{ borderColor: chrome.line }}>
      {rows.map(([label, value]) => (
        <div key={label} className="border-b py-3.25 pr-4" style={{ borderColor: chrome.line }}>
          <div
            className="font-mono text-[9.5px] uppercase tracking-[0.09em]"
            style={{ color: chrome.muted }}
          >
            {label}
          </div>
          <div className="mt-1.25 truncate text-[15px] font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}

function Rating({ rating, chrome }: { readonly rating: number | null } & WithChrome) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          strokeWidth={1.5}
          aria-hidden
          style={{ color: star <= (rating ?? 0) ? chrome.accent : chrome.line }}
          fill={star <= (rating ?? 0) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function Notes({
  copy,
  chrome,
  onKeep,
  saving,
}: {
  readonly copy: Copy;
  readonly onKeep: (notes: string) => void;
  readonly saving: boolean;
} & WithChrome) {
  const { t } = useTranslation();
  return (
    <>
      <div className="mt-3.5 rounded-lg p-3.5" style={{ background: chrome.surface }}>
        <div
          className="font-mono text-[10px] uppercase tracking-[0.09em]"
          style={{ color: chrome.muted }}
        >
          {t("detail.notes")}
        </div>
        <p
          className="mt-1.5 text-sm leading-relaxed text-pretty"
          style={{ color: copy.notes === null ? chrome.muted : chrome.ink }}
        >
          {copy.notes ?? t("detail.notesEmpty")}
        </p>
      </div>
      {copy.notesConflict !== null && (
        <NotesConflict copy={copy} chrome={chrome} onKeep={onKeep} saving={saving} />
      )}
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
  chrome,
  onKeep,
  saving,
}: {
  readonly copy: Copy;
  readonly onKeep: (notes: string) => void;
  readonly saving: boolean;
} & WithChrome) {
  const { t } = useTranslation();
  return (
    <div
      className="mt-2 rounded-lg p-3.5"
      style={{ background: chrome.surface, boxShadow: `inset 0 0 0 1px ${chrome.accent}` }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.09em]"
        style={{ color: chrome.accent }}
      >
        {t("detail.conflict.title")}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-pretty" style={{ color: chrome.ink }}>
        {copy.notesConflict}
      </p>
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
  chrome,
}: { readonly copies: readonly { copy: Copy; release: Release | undefined }[] } & WithChrome) {
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
            className="flex-1 rounded-lg p-3.5"
            style={{ background: chrome.surface }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-[0.09em]"
              style={{ color: chrome.muted }}
            >
              {release === undefined ? "—" : FORMAT_LABELS[release.format]}
            </div>
            <div className="mt-1.5 text-[13.5px] font-semibold">
              {release?.year ?? ""}
              {copy.condition !== null && ` · ${CONDITION_SHORT[copy.condition]}`}
            </div>
            <div className="mt-0.5 text-xs" style={{ color: chrome.muted }}>
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
  chrome,
  strong = false,
}: { readonly children: React.ReactNode; readonly strong?: boolean } & WithChrome) {
  return (
    <span
      className="rounded-[5px] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em]"
      style={{
        background: chrome.surface,
        color: strong ? chrome.ink : chrome.muted,
      }}
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
