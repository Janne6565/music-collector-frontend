import type { DetailChrome } from "@/features/detail/theme";
import { usePhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { ImageUp, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

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
            {src === null ? (
              <div
                className="h-full w-full rounded"
                style={{ background: chrome.surface }}
                aria-label={t("photos.pending")}
              />
            ) : (
              <img src={src} alt="" className="h-full w-full rounded object-cover" />
            )}
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
