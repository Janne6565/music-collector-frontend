import type { PhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { cn } from "@/lib/utils";
import type { DetailChrome } from "@janne6565/music-collector-shared";
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

interface PhotoStripProps {
  readonly logic: PhotoStripLogic;
  /** The catalogue's own artwork counts as one of the copy's images (turn 11). */
  readonly hasCatalog: boolean;
}

/**
 * The thumbnail row under the sleeve on screen 12a — a strip that only shows.
 *
 * It used to add and remove here too. Turn 12 moved all of that into the edit modal, so
 * there is one place where a copy's pictures change rather than two that have to agree:
 * the page reads, "Edit copy" writes. The caption is the pointer, and the first tile is
 * marked because the first image is the preview the rest of the app shows.
 */
export function PhotoStrip({ logic, hasCatalog }: PhotoStripProps) {
  const { t } = useTranslation();
  const total = logic.tiles.length + (hasCatalog ? 1 : 0);
  if (total === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {logic.tiles.map(({ photo, src }, index) => (
          <div
            key={photo.id}
            className={cn(
              "relative h-13.5 w-13.5 overflow-hidden rounded",
              index === 0 && "ring-2 ring-accent",
            )}
          >
            <PhotoTile src={src} label={t("photos.pending")} />
          </div>
        ))}
        {hasCatalog && (
          <div
            className={cn(
              "relative h-13.5 w-13.5 overflow-hidden rounded bg-surface",
              logic.tiles.length === 0 && "ring-2 ring-accent",
            )}
          >
            <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center font-mono text-[7px] uppercase tracking-[0.06em] text-paper">
              {t("photos.catalog")}
            </span>
          </div>
        )}
      </div>

      <p className="mt-2 font-mono text-[10px] text-ink-muted">
        {t("photos.manageIn", { count: total })}
      </p>
    </div>
  );
}
