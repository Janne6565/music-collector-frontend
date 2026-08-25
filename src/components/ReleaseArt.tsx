import { FormatThumb } from "@/components/FormatThumb";
import type { Format } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * Everything the art actually needs: a URL to try, and a format to fall back to.
 *
 * Structural rather than `Release`, because an album (a release group) has a cover too and
 * has no format of its own — its placeholder is the generic sleeve. Widening the prop is
 * cheaper than casting an album into a shape it is not.
 */
export interface CoverSubject {
  readonly coverArtUrl: string | null;
  readonly format?: Format;
}

interface ReleaseArtProps {
  readonly release: CoverSubject | undefined;
  readonly className?: string;
  readonly loading?: "lazy" | "eager";
}

/**
 * A release's cover, falling back to the format placeholder.
 *
 * The fallback is not decoration. The server builds the Cover Art Archive URL from the
 * release mbid, and for a release it has not probed it cannot yet know whether any bytes
 * sit behind it — around four in ten do not. Hiding the broken image, which is what the
 * library used to do, left an empty square where the placeholder belonged.
 *
 * The same placeholder also holds the frame while the bytes are on their way, with a
 * sweep over it to say the wait is still running. Using the silhouette rather than a grey
 * skeleton is what keeps the two kinds of missing cover from reading as different things:
 * the frame never changes shape, the cover fades in over it, and a release that turns out
 * to have no cover simply keeps what was already on screen once the sweep stops.
 *
 * The loaded and failed URLs are remembered rather than booleans, so the component
 * self-corrects when it is handed a different release without needing to be re-keyed by
 * the caller — a new URL is neither loaded nor failed, which is exactly "loading".
 */
export function ReleaseArt({ release, className, loading = "lazy" }: ReleaseArtProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = release?.coverArtUrl ?? null;

  const gone = url === null || failedUrl === url;
  const shown = !gone && loadedUrl === url;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {/* Kept mounted underneath rather than swapped out: an image that decodes with a
          transparent edge would otherwise flash whatever is behind the frame. */}
      {!shown && (
        <FormatThumb
          format={release?.format ?? "OTHER"}
          className={gone ? undefined : "mc-sweep"}
        />
      )}
      {!gone && (
        <img
          // The browser fires neither load nor error for an image it already has, so a
          // cached cover is read straight off the element as it mounts. Doing it in the
          // ref callback means the state is set before the first paint, and the sweep
          // never appears for artwork that was never actually awaited.
          ref={(node) => {
            if (node?.complete === true && node.naturalWidth > 0) setLoadedUrl(url);
          }}
          src={url}
          alt=""
          loading={loading}
          onLoad={() => setLoadedUrl(url)}
          onError={() => setFailedUrl(url)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            shown ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
