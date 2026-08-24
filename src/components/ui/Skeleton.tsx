import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

/** The deck's three bar weights, strongest first. */
export type SkeletonTone = "strong" | "soft" | "faint";

interface SkeletonProps {
  readonly tone?: SkeletonTone;
  readonly className?: string;
  /** For the one dimension that is data rather than layout — a bar's uneven width. */
  readonly style?: CSSProperties;
}

/**
 * One shimmering placeholder block (turn 9).
 *
 * Deliberately dimensionless: the rule the deck sets out is that a skeleton keeps the
 * dimensions of the content it replaces, so the caller — which is the only thing that
 * knows those dimensions — supplies them, and this contributes nothing but the shimmer.
 *
 * Hidden from assistive tech: a screen reader is told the list is loading by the live
 * region beside it, and reading out a dozen empty boxes says nothing that adds to that.
 */
export function Skeleton({ tone = "strong", className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        "mc-shimmer",
        tone === "soft" && "mc-shimmer-soft",
        tone === "faint" && "mc-shimmer-faint",
        className,
      )}
    />
  );
}

/**
 * "Searching MusicBrainz" with the three pulsing dots — the wait's caption.
 *
 * The dots carry the fact that something is still happening; the skeletons below only
 * describe what will land. Both are needed, because a stalled network leaves the
 * skeletons looking exactly like a request that finished with nothing in it.
 */
export function PulsingDots() {
  return (
    <span aria-hidden className="flex gap-[3px]">
      {[0, 0.18, 0.36].map((delay) => (
        <span
          key={delay}
          className="mc-pulse h-1 w-1 rounded-full bg-ink-subtle"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}

/**
 * The spinner that lives inside the field that caused the wait.
 *
 * Silent to assistive tech on purpose: it sits inside the search field's <label>, where
 * anything it announced would be read out as part of the input's name. The status message
 * that goes with it belongs beside the results, not in the label.
 */
export function FieldSpinner() {
  return (
    <span
      aria-hidden
      className="h-[15px] w-[15px] flex-none animate-spin rounded-full border-[1.8px] border-ink/20 border-t-ink"
    />
  );
}
