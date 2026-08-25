import { ReleaseArt } from "@/components/ReleaseArt";
import { ConfirmDialog } from "@/components/ui";
import {
  type ShownImage,
  previewImage,
  resolveShown,
  sameImage,
} from "@/features/photos/shownImage";
import type { PhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { cn } from "@/lib/utils";
import type { Release } from "@janne6565/music-collector-shared";
import { catalogArtShown } from "@janne6565/music-collector-shared";
import { ImagePlus, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface PhotoManagerProps {
  readonly logic: PhotoStripLogic;
  readonly release: Release | undefined;
}

/**
 * The images column of screen 12b — the 11c editor, moved inside the edit modal.
 *
 * The list is the editor: the big tile is whichever image you last clicked, the thumbnails
 * under it are the whole list in the order the rest of the app reads it, and star, remove
 * and drag all act where you can see the result. The detail page (12a) deliberately has
 * none of this — it shows the strip and points here, so there is one place where a copy's
 * pictures change.
 *
 * Order is the preview. The first image is what the library grid and the detail hero show,
 * so starring is a move to the front rather than a flag of its own — see the note on
 * `move` in usePhotoStripLogic.
 */
export function PhotoManager({ logic, release }: PhotoManagerProps) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState<ShownImage | null>(null);
  /** The tile being dragged, so the drop target knows what is landing on it. */
  const [dragging, setDragging] = useState<string | null>(null);
  /** Open while the copy is being asked whether to drop the catalogue's artwork. */
  const [confirmingHide, setConfirmingHide] = useState(false);

  const releaseHasArt = release?.coverArtUrl != null && release.coverArtUrl !== "";
  // A copy that has dropped the artwork has no catalogue tile at all — not a greyed one.
  const hasCatalog = catalogArtShown({ catalogArt: logic.catalogArt }, releaseHasArt);
  // Shared with the detail page's strip, so the two views resolve a selection the same way.
  const current = resolveShown(shown, logic.tiles, hasCatalog, logic.catalogArt);
  const preview = previewImage(logic.tiles, logic.catalogArt);

  const shownTile =
    current.kind === "PHOTO" ? logic.tiles.find((tile) => tile.photo.id === current.id) : undefined;
  const showingPreview = sameImage(current, preview);

  useEffect(() => {
    if (shown?.kind === "CATALOG" && !hasCatalog) setShown(null);
  }, [shown, hasCatalog]);

  const total = logic.tiles.length + (hasCatalog ? 1 : 0);

  return (
    <div className="flex-none">
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
        {t("photos.count", { count: total })}
      </div>

      <div className="relative mt-2 h-53 w-53 overflow-hidden rounded-lg bg-canvas ring-2 ring-accent">
        {current.kind === "CATALOG" || shownTile === undefined ? (
          <ReleaseArt release={release} loading="eager" variant="bleed" />
        ) : shownTile.src === null ? (
          <div className="mc-pulse h-full w-full" aria-label={t("photos.pending")} />
        ) : (
          <img src={shownTile.src} alt="" className="h-full w-full object-cover" />
        )}

        {showingPreview ? (
          <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-[5px] bg-accent px-1.75 py-1 font-mono text-[8px] uppercase tracking-[0.07em] text-paper">
            <Star size={9} strokeWidth={2.4} fill="currentColor" aria-hidden />
            {t("photos.preview")}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => logic.setPreview(current)}
            disabled={logic.reordering}
            className="absolute top-2 left-2 flex items-center gap-1.5 rounded-[5px] bg-ink/70 px-1.75 py-1 font-mono text-[8px] uppercase tracking-[0.07em] text-paper hover:bg-ink"
          >
            <Star size={9} strokeWidth={2.4} aria-hidden />
            {t("photos.makePreview")}
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.75">
        {logic.tiles.map(({ photo, src }, index) => (
          <div
            key={photo.id}
            draggable
            onDragStart={() => setDragging(photo.id)}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragging !== null && dragging !== photo.id) logic.moveTo(dragging, index);
              setDragging(null);
            }}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-[5px] bg-canvas",
              dragging === photo.id && "opacity-40",
              // The ring is what you are looking at and the star is the preview — the same
              // two signals the detail strip uses. They start on one tile and come apart.
              current.kind === "PHOTO" && current.id === photo.id
                ? "ring-2 ring-accent"
                : "ring-1 ring-line",
            )}
          >
            <button
              type="button"
              onClick={() => setShown({ kind: "PHOTO", id: photo.id })}
              aria-label={t("photos.show")}
              aria-current={
                current.kind === "PHOTO" && current.id === photo.id ? "true" : undefined
              }
              className="absolute inset-0"
            >
              {src === null ? (
                <span className="mc-pulse block h-full w-full" />
              ) : (
                <img src={src} alt="" className="h-full w-full object-cover" />
              )}
            </button>
            <StarBadge
              isPreview={sameImage(preview, { kind: "PHOTO", id: photo.id })}
              disabled={logic.reordering}
              onStar={() => logic.setPreview({ kind: "PHOTO", id: photo.id })}
              previewLabel={t("photos.preview")}
              starLabel={t("photos.makePreview")}
            />
            <button
              type="button"
              onClick={() => logic.remove(photo)}
              disabled={logic.removing === photo.id}
              aria-label={t("photos.remove")}
              className="absolute top-0.75 right-0.75 hidden h-3.75 w-3.75 items-center justify-center rounded-full bg-paper text-ink shadow-[0_1px_3px_rgba(25,23,19,.28)] group-hover:flex"
            >
              <X size={9} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        ))}

        {hasCatalog && (
          <div className="group relative aspect-square">
            <StarBadge
              isPreview={preview.kind === "CATALOG"}
              disabled={logic.reordering}
              onStar={() => logic.setPreview({ kind: "CATALOG" })}
              previewLabel={t("photos.preview")}
              starLabel={t("photos.makePreview")}
            />
            <button
              type="button"
              onClick={() => setShown({ kind: "CATALOG" })}
              aria-current={current.kind === "CATALOG" ? "true" : undefined}
              className={cn(
                "absolute inset-0 overflow-hidden rounded-[5px] bg-canvas",
                current.kind === "CATALOG" ? "ring-2 ring-accent" : "ring-1 ring-line",
              )}
            >
              <ReleaseArt release={release} variant="bleed" />
              <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center font-mono text-[7px] uppercase tracking-[0.06em] text-paper">
                {t("photos.catalog")}
              </span>
            </button>
            {/* The same gesture as removing a photo, though it removes rather less: the
                artwork stays in the archive and on every other copy of the release, and
                this copy can take it back below. */}
            <button
              type="button"
              onClick={() => setConfirmingHide(true)}
              aria-label={t("photos.hideCatalog")}
              className="absolute top-0.75 right-0.75 hidden h-3.75 w-3.75 items-center justify-center rounded-full bg-paper text-ink shadow-[0_1px_3px_rgba(25,23,19,.28)] group-hover:flex"
            >
              <X size={9} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={logic.adding}
          aria-label={t("photos.add")}
          title={t("photos.add")}
          className="flex aspect-square items-center justify-center rounded-[5px] border border-dashed border-ink/25 text-ink-muted disabled:opacity-50"
        >
          <ImagePlus size={14} strokeWidth={1.9} aria-hidden />
        </button>
      </div>

      {/* Dropping the artwork has to be undoable from where it was dropped, or the tile
          simply vanishes and nothing on the screen says it could come back. */}
      {releaseHasArt && !hasCatalog && (
        <button
          type="button"
          onClick={logic.restoreCatalogArt}
          disabled={logic.choosing}
          className="mt-2 text-[11px] font-medium text-accent underline-offset-2 hover:underline disabled:opacity-50"
        >
          {t("photos.restoreCatalog")}
        </button>
      )}

      <p className="mt-2 text-[11px] leading-normal text-ink-muted text-pretty">
        {t("photos.managerHint")}
      </p>
      {logic.rejected === "type" && (
        <p className="mt-2 text-xs text-accent">{t("photos.wrongType")}</p>
      )}

      {confirmingHide && (
        <ConfirmDialog
          title={t("photos.hideCatalogTitle")}
          body={t("photos.hideCatalogBody")}
          confirmLabel={t("photos.hideCatalogConfirm")}
          cancelLabel={t("common.cancel")}
          onCancel={() => setConfirmingHide(false)}
          onConfirm={() => {
            logic.hideCatalogArt();
            setConfirmingHide(false);
          }}
        />
      )}

      <input
        ref={input}
        type="file"
        accept={logic.accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) logic.add(file);
          // Cleared so picking the same file twice still fires a change event.
          event.target.value = "";
        }}
      />
    </div>
  );
}

interface StarBadgeProps {
  readonly isPreview: boolean;
  readonly disabled: boolean;
  readonly onStar: () => void;
  readonly previewLabel: string;
  readonly starLabel: string;
}

/**
 * The corner star: filled and lit on the preview, offered on hover everywhere else.
 *
 * On the tiles rather than only on the large frame, because the large frame only offers
 * the choice once you have already clicked the right thumbnail — which hides it behind a
 * step nobody takes. The catalogue tile wears the same badge as a photo does: it is one of
 * the things a copy can be shown as, and which of them is the preview should not depend on
 * where the picture came from.
 */
function StarBadge({ isPreview, disabled, onStar, previewLabel, starLabel }: StarBadgeProps) {
  if (isPreview) {
    return (
      <span
        title={previewLabel}
        className="pointer-events-none absolute top-0.75 left-0.75 z-10 flex h-3.75 w-3.75 items-center justify-center rounded-full bg-accent text-paper shadow-[0_1px_3px_rgba(25,23,19,.28)]"
      >
        <Star size={9} strokeWidth={2.4} fill="currentColor" aria-hidden />
        <span className="sr-only">{previewLabel}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onStar}
      disabled={disabled}
      aria-label={starLabel}
      title={starLabel}
      className="absolute top-0.75 left-0.75 z-10 hidden h-3.75 w-3.75 items-center justify-center rounded-full bg-paper text-ink shadow-[0_1px_3px_rgba(25,23,19,.28)] hover:bg-accent hover:text-paper group-hover:flex disabled:opacity-50"
    >
      <Star size={9} strokeWidth={2.4} aria-hidden />
    </button>
  );
}
