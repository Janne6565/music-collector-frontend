import { FormatThumb } from "@/components/FormatThumb";
import type { Release } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ReleaseArtProps {
  readonly release: Release | undefined;
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
 * The failed URL is remembered rather than a boolean, so the component self-corrects when
 * it is handed a different release without needing to be re-keyed by the caller.
 */
export function ReleaseArt({ release, className, loading = "lazy" }: ReleaseArtProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = release?.coverArtUrl ?? null;

  if (url === null || failedUrl === url) {
    return <FormatThumb format={release?.format ?? "OTHER"} />;
  }

  return (
    <img
      src={url}
      alt=""
      loading={loading}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailedUrl(url)}
    />
  );
}
