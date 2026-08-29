import type { AvatarCrop } from "@/api/avatar";
import { Button, Modal, ModalClose, useModalDismiss } from "@/components/ui";
import type { ChosenPicture } from "@/features/account/pictureFile";
import { cn } from "@/lib/utils";
import { Globe, Minus, Plus } from "lucide-react";
import { type CSSProperties, useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/** The circle inside the stage, in CSS pixels. The stage is 10px of dark wider all round. */
const CIRCLE = 280;
const PHONE_CIRCLE = 240;
const MAX_ZOOM = 4;

/**
 * Screen 27b — the one step between choosing a file and having a picture.
 *
 * <p>The crop is the person's, not the app's: it opens on the centre square, dragging
 * reframes and the slider zooms, so "Use this picture" is a single click for the common
 * case and still an answer for the picture where the face is off to one side.
 *
 * <p>It says the one thing that matters about this particular upload — that strangers see
 * it, across the bottom where the sentence has room to be read — and shows the crop at 56,
 * the size the profile header draws it at.
 */
export function FramingDialog({
  picture,
  onCancel,
  onConfirm,
}: {
  readonly picture: ChosenPicture;
  readonly onCancel: () => void;
  readonly onConfirm: (crop: AvatarCrop) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const framing = useFraming(picture);

  return (
    <Modal onClose={onCancel} labelledBy={titleId} width="620px" align="center" phoneSheet>
      <div className="flex min-h-0 flex-col overflow-y-auto px-6 pt-5 pb-5 sm:px-6.5 sm:pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={titleId} className="font-serif text-[22px] leading-[1.15] sm:text-2xl">
            {t("account.picture.framing.title")}
          </h2>
          {/* The X is the desktop dialog's; the phone sheet closes by its handle and its
              own Cancel, and a second dismissal in the corner is one control too many. */}
          <div className="hidden sm:block">
            <ModalClose onClose={onCancel} label={t("common.cancel")} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-6.5">
          <div className="flex-none">
            <Stage framing={framing} picture={picture} />
            <ZoomSlider
              value={framing.zoom}
              onChange={framing.setZoom}
              label={t("account.picture.framing.zoom")}
            />
            <p className="mt-2.5 hidden font-mono text-[10px] tracking-[0.06em] text-ink-subtle sm:block">
              {t("account.picture.framing.hint")}
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
              {t("account.picture.framing.howItLooks")}
            </span>
            {/*
             * One circle, at the size the profile header draws it. There used to be a second
             * at 24 for the feed, on the grounds that it is where a face becomes only a
             * colour — but that is the argument against showing it: nothing about a crop is
             * decided at 24, and it cost the column the width the sentence below needed.
             */}
            <div className="mt-3">
              <Preview
                framing={framing}
                picture={picture}
                size={56}
                label={t("account.picture.framing.atProfile")}
              />
            </div>

            <p className="mt-4 hidden font-mono text-[10.5px] break-all text-ink-subtle sm:block">
              {picture.name} · {megabytes(picture.bytes)} MB · {picture.width} × {picture.height}
            </p>
          </div>
        </div>

        {/*
         * Across the bottom, not down the side. Beside a 300 stage this sentence had about
         * fourteen characters a line and broke into eight of them; it is the one thing the
         * dialog has to actually say, and a column that narrow made it look like fine print.
         */}
        <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-line bg-paper px-3.5 py-3">
          <Globe
            size={15}
            strokeWidth={1.75}
            aria-hidden
            className="mt-0.5 flex-none text-ink-muted"
          />
          <span className="text-[12px] leading-[1.55] text-ink-muted text-pretty">
            {t("account.picture.framing.public")}
          </span>
        </div>

        <Actions onConfirm={() => onConfirm(framing.crop())} />
      </div>
    </Modal>
  );
}

/** Confirm and cancel, as a child so both leave through the sheet's own exit. */
function Actions({ onConfirm }: { readonly onConfirm: () => void }) {
  const { t } = useTranslation();
  const dismiss = useModalDismiss();

  return (
    <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-end sm:gap-4">
      <Button
        onClick={() => {
          onConfirm();
          dismiss();
        }}
        className="h-[46px] w-full rounded-[10px] text-[14px] whitespace-nowrap sm:h-9 sm:w-auto sm:rounded-lg sm:px-4 sm:text-[12.5px]"
      >
        {t("account.picture.framing.use")}
      </Button>
      <button
        type="button"
        onClick={dismiss}
        className="order-last text-[13px] font-medium text-ink-muted sm:order-first"
      >
        {t("common.cancel")}
      </button>
    </div>
  );
}

/** The dark square with the lit circle cut out of it, and the picture behind both. */
function Stage({
  framing,
  picture,
}: { readonly framing: Framing; readonly picture: ChosenPicture }) {
  return (
    /*
     * No keyboard equivalent on this surface, deliberately. Dragging is one of several ways
     * to say the same thing, and one of the others — the zoom slider beside it, over a crop
     * that already opens centred — is a complete answer on its own.
     *
     * `touch-none` is what makes the pinch reachable: without it the browser takes two
     * fingers for its own page zoom and the handlers below never see the second one.
     */
    <div
      ref={framing.stageRef}
      onPointerDown={framing.onPointerDown}
      onPointerMove={framing.onPointerMove}
      onPointerUp={framing.onPointerUp}
      onPointerCancel={framing.onPointerUp}
      onWheel={framing.onWheel}
      onDoubleClick={framing.onDoubleClick}
      className={cn(
        "relative touch-none overflow-hidden rounded-xl bg-[#141311]",
        "h-[280px] w-full cursor-grab active:cursor-grabbing sm:h-[300px] sm:w-[300px]",
      )}
    >
      {/* Held back for the one frame before the stage has a size. Drawing from a guess and
          correcting it is a visible jump on every open. */}
      {framing.measured && (
        <img
          src={picture.previewUrl}
          alt=""
          draggable={false}
          className="absolute max-w-none select-none"
          style={framing.imageStyle()}
        />
      )}
      {/* One element does the whole mask: an enormous spread shadow dims everything outside
          the circle, and the inset hairline is the lit edge of it. */}
      {framing.measured && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={framing.circleStyle()}
        />
      )}
    </div>
  );
}

function ZoomSlider({
  value,
  onChange,
  label,
}: {
  readonly value: number;
  readonly onChange: (zoom: number) => void;
  readonly label: string;
}) {
  return (
    <div className="mt-3.5 flex items-center gap-2.5">
      <Minus size={14} strokeWidth={2} aria-hidden className="flex-none text-ink-subtle" />
      <input
        type="range"
        aria-label={label}
        min={1}
        max={MAX_ZOOM}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "h-4 flex-1 cursor-pointer appearance-none bg-transparent",
          "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-ink/12",
          "[&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-canvas",
          "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-ink/12",
          "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-[1.5px] [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-canvas",
        )}
      />
      <Plus size={14} strokeWidth={2} aria-hidden className="flex-none text-ink-subtle" />
    </div>
  );
}

/** What the circle will actually look like at one of the sizes the app draws. */
function Preview({
  framing,
  picture,
  size,
  label,
}: {
  readonly framing: Framing;
  readonly picture: ChosenPicture;
  readonly size: number;
  readonly label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-[7px]">
      <div
        aria-hidden
        className="rounded-full bg-canvas shadow-[inset_0_0_0_1px_rgba(25,23,19,.12)]"
        style={{ backgroundImage: `url(${picture.previewUrl})`, ...framing.previewStyle(size) }}
      />
      <span className="hidden font-mono text-[9.5px] text-ink-subtle sm:block">{label}</span>
    </div>
  );
}

function megabytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1);
}

interface Framing {
  readonly zoom: number;
  /** False until the stage has a real size. Nothing is drawn over it before then. */
  readonly measured: boolean;
  readonly setZoom: (zoom: number) => void;
  readonly stageRef: React.RefObject<HTMLDivElement | null>;
  readonly onPointerDown: (event: React.PointerEvent) => void;
  readonly onPointerMove: (event: React.PointerEvent) => void;
  readonly onPointerUp: (event: React.PointerEvent) => void;
  readonly onWheel: (event: React.WheelEvent) => void;
  readonly onDoubleClick: (event: React.MouseEvent) => void;
  readonly imageStyle: () => CSSProperties;
  readonly circleStyle: () => CSSProperties;
  /** What one preview circle has to draw, at the size the app really uses it. */
  readonly previewStyle: (size: number) => CSSProperties;
  /** The framed square, in the picture's own pixels — what the server is told. */
  readonly crop: () => AvatarCrop;
}

/**
 * Where the circle sits over the picture.
 *
 * <p>Held as a scale and a translation of the picture's centre rather than as the crop
 * rectangle, because that is what the gestures move. The rectangle the server needs is
 * derived at the end, which also keeps the clamping in one place: the picture is never
 * allowed anywhere that would leave the circle with a corner of nothing in it.
 *
 * <p>The same arithmetic the phone uses, deliberately. Two implementations of one crop that
 * disagree about where the square is would be two different pictures from one framing.
 */
function useFraming(picture: ChosenPicture): Framing {
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoomState] = useState(1);
  const [at, setAt] = useState({ x: 0, y: 0 });
  /**
   * Measured rather than assumed. The dialog's stage is a fixed 300 square, but the phone
   * sheet's is as wide as the sheet, so both the circle and where it sits inside the dark
   * have to come from the element itself.
   */
  const [stage, setStage] = useState<{
    readonly width: number;
    readonly height: number;
    readonly diameter: number;
  } | null>(null);

  /**
   * Every finger currently down, by pointer id.
   *
   * A map rather than a single "dragging" flag because that is the whole difference between
   * this and what it replaces: with two of them a pinch is possible, and a touch screen is
   * where this dialog is hardest to use with a slider alone.
   */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ centre: { x: number; y: number }; spread: number } | null>(null);

  const box = stage ?? { width: 300, height: 300, diameter: CIRCLE };
  const diameter = box.diameter;
  const base = diameter / Math.min(picture.width, picture.height);
  const fitted = { width: picture.width * base, height: picture.height * base };

  /*
   * Watched, not measured once.
   *
   * A single `useLayoutEffect` read the stage before the dialog had been laid out and got
   * zero back, and every position here is derived from that width: the circle's own left is
   * `(width - diameter) / 2`, which at width zero is *minus* half a circle. The result was a
   * circle centred on the stage's top-left corner with the picture dragged off after it,
   * which is what "it doesn't seem to be centred" was.
   *
   * A zero is now ignored rather than believed, and an observer keeps the numbers right
   * through the dialog's own entrance and any resize after it.
   */
  useLayoutEffect(() => {
    const element = stageRef.current;
    if (element === null) return;
    const measure = () => {
      const next = stageBox(element.clientWidth, element.clientHeight);
      if (next !== null) setStage(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const limit = useCallback(
    (atScale: number) => ({
      x: Math.max(0, (picture.width * base * atScale - diameter) / 2),
      y: Math.max(0, (picture.height * base * atScale - diameter) / 2),
    }),
    [picture.width, picture.height, base, diameter],
  );

  /** Never past the edge: a corner of dark inside the circle is not a crop anyone meant. */
  const clamp = useCallback(
    (next: { x: number; y: number }, atScale: number) => {
      const bound = limit(atScale);
      return {
        x: Math.min(bound.x, Math.max(-bound.x, next.x)),
        y: Math.min(bound.y, Math.max(-bound.y, next.y)),
      };
    },
    [limit],
  );

  /**
   * Scale about a point rather than about the middle.
   *
   * The middle is right for the slider, which has no point of its own; it is wrong for a
   * wheel, a pinch or a double click, where the thing under the cursor is precisely what
   * somebody is asking to see more of, and where zooming about the centre slides it away.
   */
  const scaleAbout = useCallback(
    (next: number, focus: { x: number; y: number } | null) => {
      const capped = Math.min(MAX_ZOOM, Math.max(1, next));
      setZoomState(capped);
      setAt((previous) => {
        if (focus === null) return clamp(previous, capped);
        const k = capped / zoom;
        return clamp(
          { x: focus.x - (focus.x - previous.x) * k, y: focus.y - (focus.y - previous.y) * k },
          capped,
        );
      });
      return capped;
    },
    [clamp, zoom],
  );

  /** A point in the stage, measured from its centre — the space the translation lives in. */
  const fromCentre = useCallback((clientX: number, clientY: number) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (box === undefined) return { x: 0, y: 0 };
    return { x: clientX - box.left - box.width / 2, y: clientY - box.top - box.height / 2 };
  }, []);

  const track = () => {
    const points = [...pointers.current.values()];
    if (points.length === 0) return null;
    const centre = {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
    const [first, second] = points;
    const spread =
      first === undefined || second === undefined
        ? 0
        : Math.hypot(first.x - second.x, first.y - second.y);
    return { centre, spread };
  };

  return {
    zoom,
    // The slider has no point of its own to zoom about, so it uses the middle of the circle.
    setZoom: (next) => scaleAbout(next, null),
    stageRef,
    onPointerDown: (event) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      gesture.current = track();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const now = track();
      const before = gesture.current;
      if (now === null || before === null) return;
      gesture.current = now;

      // Two fingers say two things at once: the centroid moved (a drag) and the gap between
      // them changed (a zoom). Both are applied, which is what makes a pinch feel like one
      // gesture rather than like a zoom that fights a drag.
      if (now.spread > 0 && before.spread > 0) {
        const next = Math.min(MAX_ZOOM, Math.max(1, zoom * (now.spread / before.spread)));
        const focus = fromCentre(now.centre.x, now.centre.y);
        const k = next / zoom;
        setZoomState(next);
        setAt((previous) =>
          clamp(
            {
              x: focus.x - (focus.x - previous.x) * k + (now.centre.x - before.centre.x),
              y: focus.y - (focus.y - previous.y) * k + (now.centre.y - before.centre.y),
            },
            next,
          ),
        );
        return;
      }
      setAt((previous) =>
        clamp(
          {
            x: previous.x + (now.centre.x - before.centre.x),
            y: previous.y + (now.centre.y - before.centre.y),
          },
          zoom,
        ),
      );
    },
    onPointerUp: (event) => {
      pointers.current.delete(event.pointerId);
      // Re-measured rather than kept: lifting one finger of two moves the centroid, and a
      // drag measured across that jump is the lurch this used to end every pinch with.
      gesture.current = track();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    onWheel: (event) => {
      scaleAbout(zoom - event.deltaY * 0.002, fromCentre(event.clientX, event.clientY));
    },
    onDoubleClick: (event) => {
      const focus = fromCentre(event.clientX, event.clientY);
      if (zoom > 1.02) {
        setZoomState(1);
        setAt({ x: 0, y: 0 });
        return;
      }
      scaleAbout(2.5, focus);
    },
    /*
     * A transform, not `left`/`top`/`width`/`height`. Those four are layout, and a browser
     * re-lays-out the stage for every one of them; a translate and a scale are composited,
     * which is the difference between a picture that follows the pointer and one that
     * arrives after it.
     */
    measured: stage !== null,
    imageStyle: () => ({
      left: (box.width - fitted.width) / 2,
      top: (box.height - fitted.height) / 2,
      width: fitted.width,
      height: fitted.height,
      transform: `translate(${at.x}px, ${at.y}px) scale(${zoom})`,
      willChange: "transform",
    }),
    circleStyle: () => ({
      left: (box.width - diameter) / 2,
      top: (box.height - diameter) / 2,
      width: diameter,
      height: diameter,
      boxShadow: "0 0 0 999px rgba(20,19,17,.55), inset 0 0 0 1.5px rgba(255,255,255,.55)",
    }),
    previewStyle: (size) => {
      const k = size / diameter;
      return {
        width: size,
        height: size,
        backgroundSize: `${fitted.width * zoom * k}px ${fitted.height * zoom * k}px`,
        backgroundPosition: `${-((fitted.width * zoom) / 2 - diameter / 2 - at.x) * k}px ${
          -((fitted.height * zoom) / 2 - diameter / 2 - at.y) * k
        }px`,
      };
    },
    crop: () => squareOf({ picture, diameter, zoom, at }),
  };
}

/**
 * The framed square, in the picture's own pixels.
 *
 * Pulled out of the hook and exported so it can be checked: this is the one calculation in
 * the dialog whose being wrong is invisible — the stage would look right and the saved
 * picture would be of somewhere else.
 */
export function squareOf({
  picture,
  diameter,
  zoom,
  at,
}: {
  readonly picture: { readonly width: number; readonly height: number };
  readonly diameter: number;
  readonly zoom: number;
  readonly at: { readonly x: number; readonly y: number };
}): AvatarCrop {
  const base = diameter / Math.min(picture.width, picture.height);
  const scale = base * zoom;
  const fitted = { width: picture.width * base, height: picture.height * base };
  const size = diameter / scale;
  return {
    x: Math.min(
      Math.max(0, (fitted.width * zoom) / 2 - diameter / 2 - at.x) / scale,
      picture.width - size,
    ),
    y: Math.min(
      Math.max(0, (fitted.height * zoom) / 2 - diameter / 2 - at.y) / scale,
      picture.height - size,
    ),
    size,
  };
}

/**
 * What a measured stage means, or `null` if it has not been measured yet.
 *
 * Separate and exported for the zero: an unlaid-out element reports `0`, every position in
 * the dialog is derived from the box, and `(0 - diameter) / 2` puts the circle's centre on
 * the stage's top-left corner. Believing that measurement once is the bug this guards.
 */
export function stageBox(
  width: number,
  height: number,
): { readonly width: number; readonly height: number; readonly diameter: number } | null {
  if (width <= 0 || height <= 0) return null;
  const across = Math.min(width, height) < 300 ? PHONE_CIRCLE : CIRCLE;
  return { width, height, diameter: Math.min(across, Math.min(width, height)) };
}
