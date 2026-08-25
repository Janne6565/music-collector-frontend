import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import type { Copy, Release } from "@/domain/types";
import { CONDITION_LABELS, CONDITION_SHORT, FORMAT_LABELS } from "@/domain/types";
import { CopyEditor } from "@/features/detail/CopyEditor";
import { type DetailChrome, chromeFor } from "@/features/detail/theme";
import { useDetailLogic } from "@/features/detail/useDetailLogic";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { PhotoStrip } from "@/features/photos/PhotoStrip";
import { usePhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { Link } from "@tanstack/react-router";
import { Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 1g — the item detail, inside the sidebar shell the rest of the app lives in.
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
        {/* The deck's one header action. While the editor is open it governs its own
            saving, so a second Save up here would be two buttons for one job. */}
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            className="h-[34px] flex-none rounded-lg px-3.5 text-[12.5px]"
          >
            <Pencil size={14} strokeWidth={1.75} aria-hidden />
            {t("detail.edit")}
          </Button>
        )}
      </header>

      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{ background: chrome.background, color: chrome.ink }}
      >
        <div className="flex gap-10 p-8">
          <div className="flex-none">
            <Cover release={release} fallbackSrc={photos.firstSrc} />
            <PhotoStrip logic={photos} chrome={chrome} />
          </div>

          <div className="min-w-0 flex-1">
            <Header copy={copy} release={release} chrome={chrome} />

            {editing ? (
              <CopyEditor
                copy={copy}
                chrome={chrome}
                saving={logic.saving}
                onSave={(patch) => {
                  logic.save(patch);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <Fields copy={copy} release={release} chrome={chrome} />
            )}

            <Notes
              copy={copy}
              chrome={chrome}
              saving={logic.saving}
              onKeep={(notes) => logic.save({ notes })}
            />
            {otherCopies.length > 0 && <OtherCopies copies={otherCopies} chrome={chrome} />}

            <Button
              variant="secondary"
              onClick={logic.remove}
              loading={logic.removing}
              className="mt-8 h-9 border-0 px-4 text-[13px]"
              style={{ background: chrome.surface, color: chrome.muted }}
            >
              <Trash2 size={15} strokeWidth={1.75} aria-hidden />
              {t("detail.remove")}
            </Button>
          </div>
        </div>
      </div>
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
  fallbackSrc,
}: { readonly release: Release | undefined; readonly fallbackSrc: string | null }) {
  return (
    <div className="h-[340px] w-[340px] overflow-hidden rounded-lg shadow-[0_10px_30px_rgba(0,0,0,.25)]">
      <ReleaseArt release={release} loading="eager" variant="bleed" fallbackSrc={fallbackSrc} />
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
  const { t } = useTranslation();
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
      <p className="mt-1.5 text-[15px]" style={{ color: chrome.muted }}>
        {release?.artistName}
        {release?.year != null && ` · ${release.year}`}
      </p>
      <div className="mt-3.5 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={15}
            strokeWidth={1.5}
            aria-hidden
            style={{ color: star <= (copy.rating ?? 0) ? chrome.accent : chrome.line }}
            fill={star <= (copy.rating ?? 0) ? "currentColor" : "none"}
          />
        ))}
        <span className="ml-2 text-xs" style={{ color: chrome.muted }}>
          {t("detail.yourRating")}
        </span>
      </div>
    </>
  );
}

function Fields({
  copy,
  release,
  chrome,
}: { readonly copy: Copy; readonly release: Release | undefined } & WithChrome) {
  const { t } = useTranslation();
  const rows: readonly (readonly [string, string])[] = [
    [t("detail.mediaCondition"), copy.condition === null ? "—" : CONDITION_LABELS[copy.condition]],
    [
      t("detail.sleeveCondition"),
      copy.sleeveCondition === null ? "—" : CONDITION_LABELS[copy.sleeveCondition],
    ],
    [t("detail.paid"), formatMoney(copy.pricePaidCents, copy.currency)],
    [t("detail.bought"), copy.purchasedOn ?? "—"],
    [t("detail.where"), copy.purchasedAt ?? "—"],
    [
      t("detail.pressing"),
      [release?.label, release?.catalogNumber, release?.country].filter(Boolean).join(" · ") || "—",
    ],
  ];

  return (
    <div className="mt-7 grid grid-cols-2 gap-3.5">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg p-3.5" style={{ background: chrome.surface }}>
          <div
            className="font-mono text-[10px] uppercase tracking-[0.09em]"
            style={{ color: chrome.muted }}
          >
            {label}
          </div>
          <div className="mt-1.5 text-[15px] font-semibold">{value}</div>
        </div>
      ))}
    </div>
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
