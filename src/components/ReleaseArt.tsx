import { FormatThumb } from "@/components/FormatThumb";
import { cn } from "@/lib/utils";
import type { Format } from "@janne6565/music-collector-shared";
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
  /**
   * Where the artwork sits.
   *
   * `sleeve` draws it into the sleeve panel of the format thumbnail, which is how the
   * deck composes every grid tile and result row: the record still sticks out past its
   * cover, the CD still sits in front of one. `bleed` is the item detail's hero (3a, 1j),
   * which the deck draws as an edge-to-edge cover with no format furniture at all.
   */
  readonly variant?: "sleeve" | "bleed";
  /**
   * The copy's preview image — the first picture in its own list.
   *
   * It outranks the catalogue's artwork rather than standing in for it (turn 11): the
   * images of a copy are one ordered list with the catalogue art among them, and starring
   * a photo is what puts it at the front. A preview that ranked below the archive would
   * make that gesture do nothing on the four records in ten the archive does have. The
   * catalogue cover is still the next candidate, so a preview whose bytes are not on this
   * device yet shows artwork rather than a placeholder.
   */
  readonly previewSrc?: string | null;
}

/**
 * A release's cover.
 *
 * The format thumbnail underneath is not decoration, and it is not only a fallback. The
 * server builds the Cover Art Archive URL from the release mbid, and for a release it has
 * not probed it cannot yet know whether any bytes sit behind it — around four in ten do
 * not. So the thumbnail holds the frame in all three cases: while the cover is on its way
 * (with a sweep over the sleeve to say so), when it turns out there is nothing behind the
 * URL, and when there was never a URL at all.
 *
 * The cover is layered into the sleeve rather than over the tile. Replacing the whole
 * composition would bury the very thing the silhouette is there to say — which format
 * this copy is — in the one view where a release appears four times, once per format.
 *
 * The loaded and failed URLs are remembered rather than booleans, so the component
 * self-corrects when it is handed a different release without needing to be re-keyed by
 * the caller — a new URL is neither loaded nor failed, which is exactly "loading".
 */
export function ReleaseArt({
  release,
  className,
  loading = "lazy",
  variant = "sleeve",
  previewSrc = null,
}: ReleaseArtProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  // A set rather than one URL: with a preview there are two addresses in play, and
  // remembering only the last failure would let the first one look untried again.
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const cover = release?.coverArtUrl ?? null;
  // Preview first, catalogue second, and whichever has already failed is skipped.
  const url =
    [previewSrc, cover].find((candidate) => candidate != null && !failed.has(candidate)) ?? null;

  const gone = url === null;
  const shown = !gone && loadedUrl === url;

  const art = gone ? null : (
    <img
      // The browser fires neither load nor error for an image it already has, so a cached
      // cover is read straight off the element as it mounts. Doing it in the ref callback
      // means the state is set before the first paint, and the sweep never appears for
      // artwork that was never actually awaited.
      ref={(node) => {
        if (node?.complete === true && node.naturalWidth > 0) setLoadedUrl(url);
      }}
      src={url}
      alt=""
      loading={loading}
      onLoad={() => setLoadedUrl(url)}
      onError={() => setFailed((seen) => new Set(seen).add(url))}
      className={cn(
        "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
        shown ? "opacity-100" : "opacity-0",
      )}
    />
  );

  if (variant === "bleed") {
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)}>
        {/* Kept mounted underneath rather than swapped out: an image that decodes with a
            transparent edge would otherwise flash whatever is behind the frame. */}
        {!shown && <FormatThumb format={release?.format ?? "OTHER"} sweep={!gone} />}
        {art}
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <FormatThumb format={release?.format ?? "OTHER"} cover={art} sweep={!gone && !shown} />
    </div>
  );
}
