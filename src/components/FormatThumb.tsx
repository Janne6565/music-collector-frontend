import { cn } from "@/lib/utils";
import type { Format } from "@janne6565/rekordo-shared";
import type { CSSProperties, ReactNode } from "react";

interface FormatThumbProps {
  readonly format: Format;
  readonly className?: string;
  /**
   * The real cover, drawn into the cover panel.
   *
   * Artwork fills the cover and nothing is drawn over it. The object leans out on the
   * right instead, which is the whole point of the mark: a cover you can actually read,
   * and a format you can read beside it. The node is layered over the paper rather than
   * swapped for it, so a cover that has not arrived — or never will — leaves the
   * placeholder underneath intact.
   */
  readonly cover?: ReactNode;
  /** Runs the loading sweep over the cover, which is the part the artwork will fill. */
  readonly sweep?: boolean;
}

/**
 * How much wider the mark is than its cover.
 *
 * The cover is square and the object leans out beside it, so the composition is 6:5. It is
 * stated here as an aspect on an inner frame rather than assumed of the caller's box: a
 * mark squeezed into a square would draw its record as an ellipse, and there are 47 places
 * that hand this component a box.
 */
const FRAME = "aspect-[6/5]";

const PAPER: CSSProperties = {
  background: "repeating-linear-gradient(135deg,#e3ded4 0 6px,#eae6de 6px 12px)",
};

/** The hairline the cover carries, drawn over the artwork rather than under it. */
const COVER_EDGE: CSSProperties = { boxShadow: "inset 0 0 0 1px rgba(25,23,19,.12)" };

/**
 * The cover panel — a square, the same in every format, and the one the artwork fills.
 *
 * The edge is a sibling rather than this element's own inset shadow, because an inset
 * shadow paints under the element's content and the cover would swallow it. The drop
 * shadow goes on the outer element, which does not clip, since a view that clips its own
 * contents clips its shadow with them.
 */
function Cover({ cover, sweep }: { readonly cover?: ReactNode; readonly sweep?: boolean }) {
  return (
    <div
      className="absolute left-0 top-0 h-full w-[83.333%] rounded-[2px]"
      style={{ boxShadow: "3px 1px 8px rgba(25,23,19,.16)" }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[2px]" style={PAPER}>
        {cover}
        <div className={cn("absolute inset-0", sweep === true && "mc-sweep")} style={COVER_EDGE} />
      </div>
    </div>
  );
}

/**
 * The format mark, ported from Format Marks.dc.html.
 *
 * One rule for all four formats: the cover stays whole and unobscured, and the thing you
 * own leans out from behind it on the right. The format is read from the shape of the
 * sliver rather than from a badge, which is what lets it work at 44px in a dense grid,
 * before any text is legible — vinyl and CD separate on value alone at that size, dark
 * against cream, and the cassette and the plug hold because their edges are straight.
 *
 * It replaced four unrelated compositions: a jewel case, a cassette lying on its case and
 * nine waveform bars, each of which claimed a different amount of the tile and two of
 * which were drawn *over* the artwork. Everything here is CSS gradients and shadows, so
 * there are no image requests and it stays crisp at any size.
 */
export function FormatThumb({ format, className, cover, sweep }: FormatThumbProps) {
  return (
    // Decorative throughout, cover included: the row beside it already names the release,
    // and "album artwork" read out per tile is noise in a grid of two hundred.
    <div className={cn("relative flex h-full w-full", className)} aria-hidden>
      <div className={cn("relative h-full", FRAME)}>
        {format === "VINYL" && <Vinyl />}
        {format === "CD" && <Disc />}
        {format === "CASSETTE" && <Cassette />}
        {format === "DIGITAL" && <Plug />}
        {/* `OTHER` leans nothing out. It is not a format but the absence of one — the
            answer for a copy whose release this client cannot describe yet — so there is
            no object to draw. A bare cover is what "not known" actually looks like. */}
        <Cover cover={cover} sweep={sweep} />
      </div>
    </div>
  );
}

/** The disc box both round formats share: a circle in a 6:5 frame, leaning out on the right. */
const DISC = "absolute right-0 top-[8%] h-[84%] w-[70%] rounded-full";

function Vinyl() {
  return (
    <div
      className={DISC}
      style={{
        // Accent label, then the groove rings the deck cuts: dark on dark, so the disc
        // reads as an object rather than as a black hole in the tile.
        background:
          "radial-gradient(circle at 50% 50%,#a2573a 0 15%,#1a1814 15.5% 17.5%,#26231d 17.5% 42%,#191713 42.6% 44.4%,#2a2620 44.4% 66%,#191713 66.6% 68.4%,#2a2620 68.4% 100%)",
        boxShadow: "0 2px 7px rgba(25,23,19,.28),inset 0 0 0 1px rgba(0,0,0,.35)",
      }}
    />
  );
}

function Disc() {
  return (
    <>
      {/* The same silhouette as the vinyl, and that is deliberate: both are discs, and what
          separates them at 44px is value, not outline. White and faintly iridescent. */}
      <div
        className={DISC}
        style={{
          background:
            "conic-gradient(from 210deg,rgba(255,255,255,.92),rgba(250,248,245,.72),rgba(255,255,255,.95),rgba(238,240,242,.7),rgba(255,255,255,.9))",
          boxShadow: "0 2px 7px rgba(25,23,19,.18),inset 0 0 0 1px rgba(25,23,19,.16)",
        }}
      />
      <div
        className="absolute right-[24%] top-[39%] h-[22%] w-[22%] rounded-full"
        style={{
          background: "rgba(239,236,230,.9)",
          boxShadow: "inset 0 0 0 1px rgba(25,23,19,.14)",
        }}
      />
    </>
  );
}

/** The shell seen end-on: the window and the two hubs are what read at a glance. */
function Cassette() {
  return (
    <>
      <div
        className="absolute right-0 top-[13%] h-[74%] w-[33%] rounded-[2px_3px_3px_2px]"
        style={{
          background: "linear-gradient(90deg,#2c2822 0 40%,#22201b 100%)",
          boxShadow: "0 2px 7px rgba(25,23,19,.3),inset 0 0 0 1px rgba(0,0,0,.4)",
        }}
      />
      <div
        className="absolute right-[8%] top-[22%] h-[56%] w-[17%] rounded-[2px]"
        style={{
          background: "rgba(250,248,245,.34)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.35)",
        }}
      />
      {[28, 58].map((top) => (
        <div
          key={top}
          className="absolute right-[11.5%] h-[14%] w-[10%] rounded-full"
          style={{
            top: `${top}%`,
            background: "#191713",
            boxShadow: "inset 0 0 0 1.5px rgba(250,248,245,.55)",
          }}
        />
      ))}
    </>
  );
}

/**
 * A USB-A plug leaning out, which is what "digital" is when you actually own a copy of it.
 *
 * It replaced a waveform, which drew a sound rather than a thing — the other three marks
 * are all objects you can hold, and a file on a stick is the honest member of that set.
 */
function Plug() {
  return (
    <>
      {/* The body behind the shell, and the light on it. */}
      <div
        className="absolute right-[13.5%] top-[37%] h-[26%] w-[30%] rounded-[3px]"
        style={{
          background: "linear-gradient(180deg,#3a352d 0 10%,#2a2620 34%,#1d1b17 74%,#26231d 100%)",
          boxShadow:
            "0 3px 7px rgba(25,23,19,.3),inset 0 0 0 1px rgba(0,0,0,.45),inset 0 1px 0 rgba(250,248,245,.14)",
        }}
      />
      <div
        className="absolute right-[15.5%] top-[41.5%] h-[5%] w-[3.5%] rounded-full"
        style={{ background: "#a2573a", boxShadow: "0 0 6px rgba(162,87,58,.85)" }}
      />
      {/* The metal shell, stamped. */}
      <div
        className="absolute right-0 top-[40.5%] h-[19%] w-[15.5%] rounded-[1px_2px_2px_1px]"
        style={{
          background:
            "linear-gradient(180deg,#e3dfd6 0 12%,#c6c1b7 36%,#9c978e 64%,#87827a 84%,#b8b3a8 100%)",
          boxShadow:
            "0 2px 5px rgba(25,23,19,.26),inset 0 0 0 1px rgba(25,23,19,.4),inset -1.5px 0 0 rgba(255,255,255,.35)",
        }}
      />
      {[44, 51.4].map((top) => (
        <div
          key={top}
          className="absolute right-[4.5%] h-[4.6%] w-[3.8%] rounded-[.5px]"
          style={{
            top: `${top}%`,
            background: "#6b665e",
            boxShadow: "inset 0 .5px 1px rgba(25,23,19,.6)",
          }}
        />
      ))}
      {/* Where the shell meets the body. */}
      <div
        className="absolute right-[15.5%] top-[39.5%] h-[21%] w-[.8%]"
        style={{ background: "rgba(0,0,0,.5)" }}
      />
    </>
  );
}
