import type { Format } from "@/domain/types";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

interface FormatThumbProps {
  readonly format: Format;
  readonly className?: string;
}

const SLEEVE: CSSProperties = {
  background: "repeating-linear-gradient(135deg,#e3ded4 0 5px,#eae6de 5px 10px)",
};

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
export function FormatThumb({ format, className }: FormatThumbProps) {
  return (
    <div className={cn("relative h-full w-full", className)} aria-hidden>
      {format === "VINYL" && <Vinyl />}
      {format === "CD" && <Disc />}
      {format === "CASSETTE" && <Cassette />}
      {(format === "DIGITAL" || format === "OTHER") && <Digital />}
    </div>
  );
}

function Vinyl() {
  return (
    <>
      {/* The record, peeking out to the right of the sleeve. */}
      <div
        className="absolute right-0 top-[10%] h-[80%] w-[80%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%,#a2573a 0 8%,#15130f 8.5% 10%,#26231d 10% 46%,#1c1a16 46.5% 48%,#26231d 48% 100%)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.25)",
        }}
      />
      <div
        className="absolute left-0 top-[6%] h-[88%] w-[88%] rounded-[3px]"
        style={{
          ...SLEEVE,
          boxShadow: "inset 0 0 0 1px rgba(25,23,19,.1),3px 0 7px rgba(25,23,19,.14)",
        }}
      />
    </>
  );
}

function Disc() {
  return (
    <>
      <div
        className="absolute left-0 top-[6%] h-[88%] w-[88%] rounded-[3px]"
        style={{ ...SLEEVE, boxShadow: "inset 0 0 0 1px rgba(25,23,19,.1)" }}
      />
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

function Cassette() {
  return (
    <>
      <div
        className="absolute left-0 top-[6%] h-[88%] w-[88%] rounded-[3px]"
        style={{ ...SLEEVE, boxShadow: "inset 0 0 0 1px rgba(25,23,19,.1)" }}
      />
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

function Digital() {
  return (
    <>
      {/* Stacked sleeves, suggesting a folder of files rather than one object. */}
      <div
        className="absolute left-[8%] top-0 h-[88%] w-[88%] rounded-[3px]"
        style={{ background: "#f4f2ee", boxShadow: "inset 0 0 0 1px rgba(25,23,19,.14)" }}
      />
      <div
        className="absolute left-[4%] top-[3%] h-[88%] w-[88%] rounded-[3px]"
        style={{ background: "#efece6", boxShadow: "inset 0 0 0 1px rgba(25,23,19,.14)" }}
      />
      <div
        className="absolute left-0 top-[6%] h-[88%] w-[88%] rounded-[3px]"
        style={{
          ...SLEEVE,
          boxShadow: "inset 0 0 0 1px rgba(25,23,19,.12),0 2px 6px rgba(25,23,19,.12)",
        }}
      />
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
