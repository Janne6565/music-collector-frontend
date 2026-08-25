import { ReleaseArt } from "@/components/ReleaseArt";
import type { PhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { cn } from "@/lib/utils";
import type { Release } from "@janne6565/music-collector-shared";
import { ImagePlus, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * What the column can show large: one of your photos, or the catalogue's own artwork.
 *
 * The catalogue cover is not a Photo and never will be — nobody uploaded it, it belongs to
 * the release rather than to your copy, and it is already on every other screen. Screen 11
 * still wants it *in* the list, because "which picture stands for this record" is one
 * question and answering it should not depend on where the picture came from.
 */
type Shown = { readonly kind: "PHOTO"; readonly id: string } | { readonly kind: "CATALOG" };

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
  const [shown, setShown] = useState<Shown | null>(null);
  /** The tile being dragged, so the drop target knows what is landing on it. */
  const [dragging, setDragging] = useState<string | null>(null);

  const hasCatalog = release?.coverArtUrl != null && release.coverArtUrl !== "";
  const first = logic.tiles[0];
  /**
   * Nothing is selected until you click something: the large tile follows the list, so a
   * remembered selection would survive the photo it pointed at and strand the column on a
   * blank frame.
   */
  const current: Shown =
    shown !== null &&
    (shown.kind === "CATALOG" ? hasCatalog : logic.tiles.some((tile) => tile.photo.id === shown.id))
      ? shown
      : first !== undefined
        ? { kind: "PHOTO", id: first.photo.id }
        : { kind: "CATALOG" };

  const shownTile =
    current.kind === "PHOTO" ? logic.tiles.find((tile) => tile.photo.id === current.id) : undefined;
  /** The preview is the first image, so the large tile is the preview only when it is that one. */
  const showingPreview =
    current.kind === "PHOTO" ? first?.photo.id === current.id : logic.tiles.length === 0;

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
          current.kind === "PHOTO" &&
          shownTile !== undefined && (
            <button
              type="button"
              onClick={() => logic.setPreview(shownTile.photo)}
              disabled={logic.reordering}
              className="absolute top-2 left-2 flex items-center gap-1.5 rounded-[5px] bg-ink/70 px-1.75 py-1 font-mono text-[8px] uppercase tracking-[0.07em] text-paper hover:bg-ink"
            >
              <Star size={9} strokeWidth={2.4} aria-hidden />
              {t("photos.makePreview")}
            </button>
          )
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
              index === 0 ? "ring-2 ring-accent" : "ring-1 ring-line",
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
            {/* The preview marker, on the tiles rather than only on the large frame: the
                large frame only offers it once you have already clicked the right
                thumbnail, which hides the whole choice behind a step nobody takes. The
                first tile wears a filled star because it *is* the preview — see `move`. */}
            {index === 0 ? (
              <span
                title={t("photos.preview")}
                className="pointer-events-none absolute top-0.75 left-0.75 flex h-3.75 w-3.75 items-center justify-center rounded-full bg-accent text-paper shadow-[0_1px_3px_rgba(25,23,19,.28)]"
              >
                <Star size={9} strokeWidth={2.4} fill="currentColor" aria-hidden />
                <span className="sr-only">{t("photos.preview")}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => logic.setPreview(photo)}
                disabled={logic.reordering}
                aria-label={t("photos.makePreview")}
                title={t("photos.makePreview")}
                className="absolute top-0.75 left-0.75 hidden h-3.75 w-3.75 items-center justify-center rounded-full bg-paper text-ink shadow-[0_1px_3px_rgba(25,23,19,.28)] hover:bg-accent hover:text-paper group-hover:flex disabled:opacity-50"
              >
                <Star size={9} strokeWidth={2.4} aria-hidden />
              </button>
            )}
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
          <button
            type="button"
            onClick={() => setShown({ kind: "CATALOG" })}
            aria-current={current.kind === "CATALOG" ? "true" : undefined}
            className={cn(
              "relative aspect-square overflow-hidden rounded-[5px] bg-canvas",
              logic.tiles.length === 0 ? "ring-2 ring-accent" : "ring-1 ring-line",
            )}
          >
            <ReleaseArt release={release} variant="bleed" />
            <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center font-mono text-[7px] uppercase tracking-[0.06em] text-paper">
              {t("photos.catalog")}
            </span>
          </button>
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

      <p className="mt-2 text-[11px] leading-normal text-ink-muted text-pretty">
        {t("photos.managerHint")}
      </p>
      {logic.rejected === "type" && (
        <p className="mt-2 text-xs text-accent">{t("photos.wrongType")}</p>
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
