import type { Format } from "@/domain/types";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

interface FormatThumbProps {
  readonly format: Format;
  readonly className?: string;
  /**
   * The real cover, drawn into the sleeve panel.
   *
   * Artwork belongs on the sleeve, not over the whole tile: a record sticks out past its
   * cover, a CD sits in front of one, and replacing the entire composition with the image
   * throws away the thing that tells you which of the four formats you are looking at.
   * The node is layered over the stripes rather than swapped for them, so a cover that
   * has not arrived — or never will — leaves the placeholder underneath intact.
   */
  readonly cover?: ReactNode;
  /** Runs the loading sweep over the sleeve, which is the part the cover will fill. */
  readonly sweep?: boolean;
}

const SLEEVE: CSSProperties = {
  background: "repeating-linear-gradient(135deg,#e3ded4 0 5px,#eae6de 5px 10px)",
};

/** The hairline every format's sleeve carries, drawn over the cover rather than under. */
const SLEEVE_EDGE: CSSProperties = { boxShadow: "inset 0 0 0 1px rgba(25,23,19,.1)" };

/**
 * The sleeve panel — the same box in all four formats, and the one the cover fills.
 *
 * The edge is a sibling rather than this element's own inset shadow, because an inset
 * shadow paints under the element's content and the cover would swallow it.
 */
function Sleeve({
  cover,
  sweep,
  shadow,
}: {
  readonly cover?: ReactNode;
  readonly sweep?: boolean;
  readonly shadow?: string;
}) {
  return (
    <div
      className="absolute left-0 top-[6%] h-[88%] w-[88%] overflow-hidden rounded-[3px]"
      style={{ ...SLEEVE, boxShadow: shadow }}
    >
      {cover}
      <div className={cn("absolute inset-0", sweep === true && "mc-sweep")} style={SLEEVE_EDGE} />
    </div>
  );
}

/**
 * The placeholder artwork from the design deck, ported from FormatThumb.dc.html.
 *
 * It stands in wherever a release has no cover art — which is common on MusicBrainz — and
 * it carries information rather than just filling space: the silhouette tells you the
 * format at a glance in a dense grid, before any text is legible.
 *
 * Everything is CSS gradients and shadows, so there are no image requests and it stays
 * crisp at any size.
 */
export function FormatThumb({ format, className, cover, sweep }: FormatThumbProps) {
  const sleeve = <Sleeve cover={cover} sweep={sweep} />;

  return (
    // Decorative throughout, cover included: the row beside it already names the release,
    // and "album artwork" read out per tile is noise in a grid of two hundred.
    <div className={cn("relative h-full w-full", className)} aria-hidden>
      {format === "VINYL" && <Vinyl cover={cover} sweep={sweep} />}
      {format === "CD" && <Disc sleeve={sleeve} />}
      {format === "CASSETTE" && <Cassette sleeve={sleeve} />}
      {(format === "DIGITAL" || format === "OTHER") && <Digital sleeve={sleeve} />}
    </div>
  );
}

function Vinyl({ cover, sweep }: { readonly cover?: ReactNode; readonly sweep?: boolean }) {
  return (
    <>
      {/* The record, peeking out to the right of the sleeve — which is why the cover goes
          inside the sleeve and not over the tile: it would bury the record. */}
      <div
        className="absolute right-0 top-[10%] h-[80%] w-[80%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%,#a2573a 0 8%,#15130f 8.5% 10%,#26231d 10% 46%,#1c1a16 46.5% 48%,#26231d 48% 100%)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.25)",
        }}
      />
      <Sleeve cover={cover} sweep={sweep} shadow="3px 0 7px rgba(25,23,19,.14)" />
    </>
  );
}

function Disc({ sleeve }: { readonly sleeve: ReactNode }) {
  return (
    <>
      {sleeve}
      <div
        className="absolute left-[13%] top-[19%] h-[62%] w-[62%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%,rgba(255,255,255,0) 44%,rgba(25,23,19,.07) 45% 46.5%,rgba(255,255,255,0) 47%),conic-gradient(from 200deg,#e9e5de,#f8f6f2,rgba(168,196,214,.75),#efece6,rgba(214,180,168,.7),#f8f6f2,#dedad2,#e9e5de)",
          boxShadow: "inset 0 0 0 1px rgba(25,23,19,.16),0 1px 4px rgba(25,23,19,.18)",
        }}
      />
      <div
        className="absolute left-[37%] top-[43%] h-[14%] w-[14%] rounded-full"
        style={{
          background: "#faf8f5",
          boxShadow: "0 0 0 1px rgba(25,23,19,.16),inset 0 0 0 2px rgba(255,255,255,.9)",
        }}
      />
      {/* Jewel case front, catching the light. */}
      <div
        className="absolute left-[4%] top-[10%] h-[80%] w-[80%] rounded-[4px]"
        style={{
          background:
            "linear-gradient(118deg,rgba(255,255,255,.5) 0 30%,rgba(255,255,255,.06) 30% 100%)",
          boxShadow: "inset 0 0 0 1px rgba(25,23,19,.3),0 2px 6px rgba(25,23,19,.14)",
        }}
      />
      <div
        className="absolute left-[4%] top-[16%] h-[68%] w-[4%] rounded-[1px]"
        style={{
          background:
            "repeating-linear-gradient(180deg,rgba(25,23,19,.22) 0 3px,rgba(25,23,19,0) 3px 8px)",
          boxShadow: "inset -1px 0 0 rgba(25,23,19,.18)",
        }}
      />
    </>
  );
}

function Cassette({ sleeve }: { readonly sleeve: ReactNode }) {
  return (
    <>
      {sleeve}
      <div
        className="absolute left-[4%] top-[10%] h-[80%] w-[80%] rounded-[4px]"
        style={{
          background:
            "linear-gradient(118deg,rgba(255,255,255,.42) 0 34%,rgba(255,255,255,.06) 34% 100%)",
          boxShadow: "inset 0 0 0 1px rgba(25,23,19,.3),0 2px 6px rgba(25,23,19,.14)",
        }}
      />
      <div
        className="absolute left-[11%] top-[52%] h-[32%] w-[66%] rounded-[3px]"
        style={{
          background: "rgba(25,23,19,.34)",
          boxShadow: "inset 0 0 0 1px rgba(25,23,19,.22)",
        }}
      />
      {/* The two spools. */}
      {[24, 52].map((left) => (
        <div
          key={left}
          className="absolute top-[60%] h-[12%] w-[12%] rounded-full"
          style={{
            left: `${left}%`,
            background: "rgba(250,248,245,.55)",
            boxShadow: "inset 0 0 0 2px rgba(25,23,19,.35)",
          }}
        />
      ))}
      <div
        className="absolute left-[11%] top-[47%] h-[3%] w-[66%]"
        style={{ background: "rgba(25,23,19,.22)" }}
      />
    </>
  );
}

/** Waveform bar heights, from the deck. */
const WAVEFORM = [10, 18, 28, 20, 34, 24, 14, 22, 12] as const;

function Digital({ sleeve }: { readonly sleeve: ReactNode }) {
  return (
    <>
      {/* One sleeve, like every other format. The waveform is what says "file". */}
      {sleeve}
      {WAVEFORM.map((height, index) => (
        <div
          // Bars are positional, so the index is the identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: bars have no identity beyond position
          key={index}
          className="absolute rounded-[2px]"
          style={{
            left: `${13 + index * 7.25}%`,
            top: `${50 - height / 2}%`,
            width: "4%",
            height: `${height}%`,
            background: `rgba(25,23,19,${0.38 + height / 100})`,
          }}
        />
      ))}
    </>
  );
}
