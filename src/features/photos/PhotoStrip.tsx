import { ReleaseArt } from "@/components/ReleaseArt";
import { type ShownImage, previewImage, sameImage } from "@/features/photos/shownImage";
import type { PhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { cn } from "@/lib/utils";
import type { Release } from "@janne6565/music-collector-shared";
import { catalogArtShown } from "@janne6565/music-collector-shared";
import { Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * One thumbnail, and the tile that holds its place until there is one.
 *
 * Two different waits land in the same frame. A photo whose bytes have not been pulled
 * down yet has no source at all and pulses; one that has a source is still a decode away
 * from being on screen, and fades in over the same tile when it gets there. Neither of
 * them changes the tile's size, so the strip does not reshuffle as photos arrive.
 */
function PhotoTile({ src, label }: { readonly src: string | null; readonly label: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div
        className={cn("absolute inset-0 rounded bg-surface", src === null && "mc-pulse")}
        aria-label={src === null ? label : undefined}
      />
      {src !== null && (
        <img
          ref={(node) => {
            if (node?.complete === true && node.naturalWidth > 0) setLoaded(true);
          }}
          src={src}
          alt=""
          onLoad={() => setLoaded(true)}
          className={cn(
            "absolute inset-0 h-full w-full rounded object-cover transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </>
  );
}

/** The star that says "this is the image the rest of the app shows for this copy". */
function PreviewStar({ label }: { readonly label: string }) {
  return (
    <span
      title={label}
      className="pointer-events-none absolute top-0.5 left-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-paper shadow-[0_1px_3px_rgba(25,23,19,.28)]"
    >
      <Star size={8} strokeWidth={2.4} fill="currentColor" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface PhotoStripProps {
  readonly logic: PhotoStripLogic;
  /** The release, for the catalogue tile — its artwork counts as one of the copy's images (turn 11). */
  readonly release: Release | undefined;
  /** Which image the hero above is showing, already resolved against the list. */
  readonly shown: ShownImage;
  readonly onShow: (shown: ShownImage) => void;
}

/**
 * The thumbnail row under the sleeve on screen 12a — a strip that shows, and now leafs.
 *
 * It used to add and remove here too. Turn 12 moved all of that into the edit modal, so
 * there is one place where a copy's pictures change rather than two that have to agree:
 * the page reads, "Edit copy" writes. Clicking a tile here is still reading — it swaps
 * what the hero is showing and writes nothing, so you can look through a copy's pictures
 * on the page you are already on instead of opening the editor to see them.
 *
 * That gives the tiles two things to say at once, so they say them in two ways: the ring
 * is the one you are looking at, and the star is the preview — the image the library grid
 * and every other screen use. They start out the same tile and come apart as you leaf.
 */
export function PhotoStrip({ logic, release, shown, onShow }: PhotoStripProps) {
  const { t } = useTranslation();
  const hasCatalog = catalogArtShown(
    { catalogArt: logic.catalogArt },
    release?.coverArtUrl != null && release.coverArtUrl !== "",
  );
  const preview = previewImage(logic.tiles, logic.catalogArt);
  const total = logic.tiles.length + (hasCatalog ? 1 : 0);
  if (total === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {logic.tiles.map(({ photo, src }) => {
          const current = shown.kind === "PHOTO" && shown.id === photo.id;
          return (
            <button
              type="button"
              key={photo.id}
              onClick={() => onShow({ kind: "PHOTO", id: photo.id })}
              aria-label={t("photos.show")}
              aria-current={current ? "true" : undefined}
              className={cn(
                "relative h-13.5 w-13.5 overflow-hidden rounded",
                current ? "ring-2 ring-accent" : "ring-1 ring-line hover:ring-ink/30",
              )}
            >
              <PhotoTile src={src} label={t("photos.pending")} />
              {sameImage(preview, { kind: "PHOTO", id: photo.id }) && (
                <PreviewStar label={t("photos.preview")} />
              )}
            </button>
          );
        })}
        {hasCatalog && (
          <button
            type="button"
            onClick={() => onShow({ kind: "CATALOG" })}
            aria-label={t("photos.show")}
            aria-current={shown.kind === "CATALOG" ? "true" : undefined}
            className={cn(
              "relative h-13.5 w-13.5 overflow-hidden rounded bg-surface",
              shown.kind === "CATALOG"
                ? "ring-2 ring-accent"
                : "ring-1 ring-line hover:ring-ink/30",
            )}
          >
            <ReleaseArt release={release} variant="bleed" />
            {preview.kind === "CATALOG" && <PreviewStar label={t("photos.preview")} />}
            <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center font-mono text-[7px] uppercase tracking-[0.06em] text-paper">
              {t("photos.catalog")}
            </span>
          </button>
        )}
      </div>

      <p className="mt-2 font-mono text-[10px] text-ink-muted">
        {t("photos.manageIn", { count: total })}
      </p>
    </div>
  );
}
