import { ReleaseArt } from "@/components/ReleaseArt";
import { useCoverPhotos } from "@/features/photos/useCoverPhotos";
import { cn } from "@/lib/utils";
import type { RollGeometry, RollPhase, RollStrip } from "@janne6565/rekordo-shared";
import {
  ROLL_BLUR_PX,
  ROLL_MIN_SPIN_MS,
  ROLL_PICK_GROW_DELAY_MS,
  ROLL_PICK_GROW_MS,
  ROLL_PICK_LAP,
  ROLL_PICK_SCALE,
  ROLL_SETTLE_EASING,
  ROLL_SETTLE_MS,
  ROLL_SPIN_EASING,
  ROLL_STRIP_LAPS,
  catalogArtShown,
  copyFormat,
  copyPreviewSrc,
  rollBandHeight,
  rollLapWidth,
  rollRestOffset,
  rollThrowPlan,
} from "@janne6565/rekordo-shared";
import { type RefObject, useEffect, useMemo, useRef } from "react";

const SETTLE_EASING = `cubic-bezier(${ROLL_SETTLE_EASING.join(",")})`;
const SPIN_EASING = `cubic-bezier(${ROLL_SPIN_EASING.join(",")})`;

/**
 * The wheel — turn 27's band of covers, drifting, thrown, and stopped on one of them.
 *
 * Driven through the Web Animations API rather than CSS classes, for one reason the deck
 * is explicit about: "Roll again re-enters Throwing from the current position rather than
 * resetting to zero". A keyframe animation always starts from its own first frame, so
 * every repeat throw would snap the strip back to the top of the lap. With WAAPI the
 * current offset can be read off the running animation and handed to the next one, which
 * makes the whole throw — drift, spin, settle — one continuous object.
 *
 * The strip is the lap three times over, so there are covers either side of every resting
 * place, and no cover is ever remounted mid-throw.
 */
export function RollWheel({
  strip,
  phase,
  wheel,
  reduced,
  position,
}: {
  readonly strip: RollStrip;
  readonly phase: RollPhase;
  readonly wheel: RollGeometry;
  readonly reduced: boolean;
  /**
   * Where the strip is, and how wide the band is, for whoever needs to know at the moment
   * of a click. A ref rather than a prop back up: the position is a running animation, not
   * state, and rendering on every frame of it would be absurd.
   */
  readonly position?: RefObject<(() => { offset: number; bandWidth: number }) | null>;
}) {
  const band = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const running = useRef<Animation | null>(null);
  const lapWidth = rollLapWidth(strip, wheel);

  useEffect(() => {
    const element = track.current;
    const box = band.current;
    if (element === null || box === null || lapWidth === 0) return;

    // Read before cancelling: cancelling drops the animation's contribution and the
    // element snaps back to its base style, which would lose the position we are about to
    // continue from.
    const current = offsetOf(element);
    running.current?.cancel();

    if (reduced) {
      // No drift and no blur. The pick is simply where it is; the dialog cross-fades the
      // result in instead, which is the whole of the movement under this setting.
      element.style.transform =
        phase === "IDLE"
          ? "translateX(0)"
          : `translateX(${rollRestOffset(box.clientWidth, strip, wheel)}px)`;
      return;
    }

    const rest = rollRestOffset(box.clientWidth, strip, wheel);

    if (phase === "THROWING") {
      // The spin is planned all the way to the resting place, so it can end at the speed
      // the settle needs to be handed. Moving the start whole laps from where the wheel
      // already is changes nothing on screen — the strip repeats every lap — and is what
      // stops a repeat throw from snapping back to the top.
      const plan = rollThrowPlan(current, rest, lapWidth);
      running.current = element.animate(
        [
          { transform: `translateX(${plan.from}px)` },
          { transform: `translateX(${plan.handover}px)` },
        ],
        { duration: ROLL_MIN_SPIN_MS, easing: SPIN_EASING, fill: "forwards" },
      );
      return;
    }

    if (phase === "SETTLING" || phase === "SETTLED") {
      running.current = element.animate(
        [{ transform: `translateX(${current}px)` }, { transform: `translateX(${rest}px)` }],
        {
          // A dialog that mounts already settled — reopened after a throw — has nothing to
          // animate; the transform is simply where it ended up.
          duration: phase === "SETTLED" ? 0 : ROLL_SETTLE_MS,
          easing: SETTLE_EASING,
          fill: "forwards",
        },
      );
      return;
    }

    // Picked up from where the strip already is rather than from nought.
    const from = current % lapWidth > 0 ? (current % lapWidth) - lapWidth : current % lapWidth;
    running.current = element.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${from - lapWidth}px)` }],
      { duration: wheel.idleLapMs, easing: "linear", iterations: Number.POSITIVE_INFINITY },
    );
  }, [phase, strip, wheel, lapWidth, reduced]);

  useEffect(() => {
    if (position === undefined) return;
    position.current = () => ({
      offset: track.current === null ? 0 : offsetOf(track.current),
      bandWidth: band.current?.clientWidth ?? 0,
    });
    return () => {
      position.current = null;
    };
  }, [position]);

  useEffect(() => () => running.current?.cancel(), []);

  const slots = useMemo(
    () => Array.from({ length: ROLL_STRIP_LAPS }, () => strip.lap).flat(),
    [strip],
  );
  const covers = useCoverPhotos(useMemo(() => strip.lap.map((row) => row.copy.id), [strip]));

  return (
    /* Taller than the covers, so the picked one has room to lean forward without the
       clipping box slicing its top and bottom off. */
    <div ref={band} className="relative overflow-hidden" style={{ height: rollBandHeight(wheel) }}>
      <div
        ref={track}
        className="absolute top-0 bottom-0 left-0 flex items-center will-change-transform"
        style={{
          gap: wheel.gap,
          // Comes on as the wheel gets up to speed and clears as it slows, on the same
          // curves — a blur that snapped on would undo the ramp it is meant to describe.
          filter: phase === "THROWING" && !reduced ? `blur(${ROLL_BLUR_PX}px)` : undefined,
          transition:
            phase === "THROWING"
              ? `filter ${ROLL_MIN_SPIN_MS}ms ${SPIN_EASING}`
              : `filter ${ROLL_SETTLE_MS}ms ${SETTLE_EASING}`,
        }}
      >
        {slots.map((row, index) => {
          // The one slot the wheel is stopping on — the copy in the lap the settle aims at,
          // not every appearance of that record on the strip.
          const chosen = index === strip.pickSlot + ROLL_PICK_LAP * strip.lap.length;
          const growing = chosen && !reduced && (phase === "SETTLING" || phase === "SETTLED");
          return (
            <div
              // The same copy legitimately appears once a lap, so the key has to say which
              // slot as well as which record.
              key={`${index}:${row.copy.id}`}
              className={cn("relative flex-none", growing && "z-10")}
              style={{
                width: wheel.cover,
                height: wheel.band,
                transform: growing ? `scale(${ROLL_PICK_SCALE})` : undefined,
                // Delayed rather than driven by a second timer: the browser starts it at
                // the right moment on its own, and it lands exactly as the wheel stops.
                transition: `transform ${ROLL_PICK_GROW_MS}ms ${SETTLE_EASING} ${
                  phase === "SETTLING" ? ROLL_PICK_GROW_DELAY_MS : 0
                }ms`,
              }}
            >
              <ReleaseArt
                release={row.release}
                format={copyFormat(row.copy, row.release)}
                previewSrc={copyPreviewSrc(row.copy, covers.get(row.copy.id) ?? null)}
                allowCatalogArt={catalogArtShown(row.copy, true)}
                loading="eager"
              />
            </div>
          );
        })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 left-0 bg-gradient-to-r from-paper via-paper/85 to-transparent"
        style={{ width: wheel.fade }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 bottom-0 bg-gradient-to-l from-paper via-paper/85 to-transparent"
        style={{ width: wheel.fade }}
      />
    </div>
  );
}

/** Where the strip currently sits, read off whatever is moving it. */
function offsetOf(element: HTMLElement): number {
  const transform = window.getComputedStyle(element).transform;
  if (transform === "none" || transform === "") return 0;
  try {
    return new DOMMatrixReadOnly(transform).m41;
  } catch {
    return 0;
  }
}
