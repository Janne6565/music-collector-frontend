import type { DetailChrome } from "@/features/detail/theme";
import { usePhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { cn } from "@/lib/utils";
import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * One thumbnail, and the tile that holds its place until there is one.
 *
 * Two different waits land in the same frame. A photo whose bytes have not been pulled
 * down yet has no source at all and pulses; one that has a source is still a decode away
 * from being on screen, and fades in over the same tile when it gets there. Neither of
 * them changes the tile's size, so the strip does not reshuffle as photos arrive.
 */
function PhotoTile({
  src,
  label,
  chrome,
}: {
  readonly src: string | null;
  readonly label: string;
  readonly chrome: DetailChrome;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div
        className={cn("absolute inset-0 rounded", src === null && "mc-pulse")}
        style={{ background: chrome.surface }}
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
  readonly copyId: string;
  readonly chrome: DetailChrome;
}

/**
 * The thumbnail row from screen 1g: your own pictures of this copy, next to an add tile.
 *
 * Works with no account — the photos live on the device. Signing in uploads them and makes
 * them appear on your other devices.
 */
export function PhotoStrip({ copyId, chrome }: PhotoStripProps) {
  const { t } = useTranslation();
  const logic = usePhotoStripLogic(copyId);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {logic.tiles.map(({ photo, src }) => (
          <div key={photo.id} className="group relative h-14 w-14">
            <PhotoTile src={src} label={t("photos.pending")} chrome={chrome} />
            <button
              type="button"
              onClick={() => logic.remove(photo)}
              disabled={logic.removing === photo.id}
              aria-label={t("photos.remove")}
              className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full group-hover:flex"
              style={{ background: chrome.ink, color: chrome.background }}
            >
              <Trash2 size={11} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={logic.adding}
          aria-label={t("photos.add")}
          title={t("photos.add")}
          className="flex h-14 w-14 items-center justify-center rounded border border-dashed disabled:opacity-50"
          style={{ borderColor: chrome.line, color: chrome.muted }}
        >
          <ImageUp size={17} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {logic.rejected === "type" && (
        <p className="mt-2 text-xs" style={{ color: chrome.accent }}>
          {t("photos.wrongType")}
        </p>
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
