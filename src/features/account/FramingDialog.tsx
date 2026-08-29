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
 * it — and shows the two sizes that actually decide whether a crop works: 56, where the
 * profile header draws it, and 24, where the feed does and a face is only a colour.
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
            {/* Desktop stacks the two previews under a label; the phone stands them beside
                the public line, which is the only place there is room for either. */}
            <span className="hidden font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase sm:block">
              {t("account.picture.framing.howItLooks")}
            </span>
            <div className="mt-0 flex items-center justify-between gap-4 sm:mt-3 sm:items-end sm:justify-start sm:gap-[18px]">
              <div className="flex items-center gap-3 sm:contents">
                <Preview
                  framing={framing}
                  picture={picture}
                  size={56}
                  label={t("account.picture.framing.atProfile")}
                />
                <Preview
                  framing={framing}
                  picture={picture}
                  size={24}
                  label={t("account.picture.framing.atFeed")}
                />
              </div>
              <p className="max-w-[190px] text-right text-[12px] leading-[1.5] text-ink-muted text-pretty sm:hidden">
                {t("account.picture.framing.publicShort")}
              </p>
            </div>

            <p className="mt-4 hidden font-mono text-[10.5px] text-ink-subtle sm:block">
              {picture.name} · {megabytes(picture.bytes)} MB · {picture.width} × {picture.height}
            </p>

            <div className="mt-3.5 hidden items-start gap-2.5 rounded-[10px] border border-line bg-paper px-3.5 py-3 sm:flex">
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
        </div>
      </div>
    </Modal>
  );
}

/** Confirm and cancel, as a child so both leave through the sheet's own exit. */
function Actions({ onConfirm }: { readonly onConfirm: () => void }) {
  const { t } = useTranslation();
  const dismiss = useModalDismiss();

  return (
    <div className="mt-4 flex flex-col items-center gap-3 sm:mt-auto sm:flex-row sm:justify-end sm:gap-4 sm:pt-4">
      <Button
        onClick={() => {
          onConfirm();
          dismiss();
        }}
        className="h-[46px] w-full rounded-[10px] text-[14px] sm:h-9 sm:w-auto sm:rounded-lg sm:px-4 sm:text-[12.5px]"
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
     * No keyboard equivalent on this surface, deliberately. Dragging is one of two ways to
     * say the same thing, and the other one — the zoom slider beside it, over a crop that
     * already opens centred — is a complete answer on its own.
     */
    <div
      ref={framing.stageRef}
      onPointerDown={framing.onPointerDown}
      onPointerMove={framing.onPointerMove}
      onPointerUp={framing.onPointerUp}
      onPointerCancel={framing.onPointerUp}
      onWheel={framing.onWheel}
      className={cn(
        "relative touch-none overflow-hidden rounded-xl bg-[#141311]",
        "h-[280px] w-full cursor-grab active:cursor-grabbing sm:h-[300px] sm:w-[300px]",
      )}
    >
      <img
        src={picture.previewUrl}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={framing.imageStyle()}
      />
      {/* One element does the whole mask: an enormous spread shadow dims everything outside
          the circle, and the inset hairline is the lit edge of it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={framing.circleStyle()}
      />
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
  const crop = framing.crop();
  const scale = size / crop.size;

  return (
    <div className="flex flex-col items-center gap-[7px]">
      <div
        aria-hidden
        className="rounded-full bg-canvas shadow-[inset_0_0_0_1px_rgba(25,23,19,.12)]"
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${picture.previewUrl})`,
          backgroundSize: `${picture.width * scale}px ${picture.height * scale}px`,
          backgroundPosition: `${-crop.x * scale}px ${-crop.y * scale}px`,
        }}
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
  readonly setZoom: (zoom: number) => void;
  readonly stageRef: React.RefObject<HTMLDivElement | null>;
  readonly onPointerDown: (event: React.PointerEvent) => void;
  readonly onPointerMove: (event: React.PointerEvent) => void;
  readonly onPointerUp: (event: React.PointerEvent) => void;
  readonly onWheel: (event: React.WheelEvent) => void;
  readonly imageStyle: () => CSSProperties;
  readonly circleStyle: () => CSSProperties;
  /** The framed square, in the picture's own pixels — what the server is told. */
  readonly crop: () => AvatarCrop;
}

/**
 * Where the circle sits over the picture.
 *
 * <p>Held as a zoom and an offset in stage pixels rather than as the crop rectangle itself,
 * because that is the thing the two gestures move: dragging is an offset and the slider is
 * a zoom. The rectangle the server needs is derived at the end, which also means the
 * clamping only has to be right in one place — the offset is never allowed anywhere that
 * would leave the circle with a corner of nothing in it.
 */
function useFraming(picture: ChosenPicture): Framing {
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoomState] = useState(1);
  /**
   * Measured rather than assumed. The dialog's stage is a fixed 300 square, but the phone
   * sheet's is as wide as the sheet, so both the circle and where it sits inside the dark
   * have to come from the element itself.
   */
  const [stage, setStage] = useState({ width: 300, height: 300, diameter: CIRCLE });
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const diameter = stage.diameter;
  const base = diameter / Math.min(picture.width, picture.height);
  const scale = base * zoom;
  const insetX = (stage.width - diameter) / 2;
  const insetY = (stage.height - diameter) / 2;

  /** Never past the edge: a corner of dark inside the circle is not a crop anyone meant. */
  const clamp = useCallback(
    (next: { x: number; y: number }, atScale: number, across: number) => ({
      x: Math.min(0, Math.max(across - picture.width * atScale, next.x)),
      y: Math.min(0, Math.max(across - picture.height * atScale, next.y)),
    }),
    [picture.width, picture.height],
  );

  /** The centre square, which is where 27b opens and what "Use this picture" means unmoved. */
  const centred = useCallback(
    (across: number, atScale: number) => ({
      x: (across - picture.width * atScale) / 2,
      y: (across - picture.height * atScale) / 2,
    }),
    [picture.width, picture.height],
  );

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (stage === null) return;
    const across = stage.clientWidth < 300 ? PHONE_CIRCLE : CIRCLE;
    setStage({ width: stage.clientWidth, height: stage.clientHeight, diameter: across });
    setOffset(centred(across, across / Math.min(picture.width, picture.height)));
  }, [centred, picture.width, picture.height]);

  const at = offset ?? centred(diameter, scale);

  const setZoom = (next: number) => {
    const after = base * next;
    // Zooms about the middle of the circle rather than the corner, so the face somebody
    // just centred stays centred while the slider moves.
    const centre = { x: diameter / 2 - at.x, y: diameter / 2 - at.y };
    setZoomState(next);
    setOffset(
      clamp(
        {
          x: diameter / 2 - (centre.x / scale) * after,
          y: diameter / 2 - (centre.y / scale) * after,
        },
        after,
        diameter,
      ),
    );
  };

  return {
    zoom,
    setZoom,
    stageRef,
    onPointerDown: (event) => {
      dragging.current = { x: event.clientX - at.x, y: event.clientY - at.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event) => {
      const from = dragging.current;
      if (from === null) return;
      setOffset(clamp({ x: event.clientX - from.x, y: event.clientY - from.y }, scale, diameter));
    },
    onPointerUp: (event) => {
      dragging.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    onWheel: (event) => {
      setZoom(Math.min(MAX_ZOOM, Math.max(1, zoom - event.deltaY * 0.002)));
    },
    imageStyle: () => ({
      left: insetX + at.x,
      top: insetY + at.y,
      width: picture.width * scale,
      height: picture.height * scale,
    }),
    circleStyle: () => ({
      left: insetX,
      top: insetY,
      width: diameter,
      height: diameter,
      boxShadow: "0 0 0 999px rgba(20,19,17,.55), inset 0 0 0 1.5px rgba(255,255,255,.55)",
    }),
    crop: () => ({ x: -at.x / scale, y: -at.y / scale, size: diameter / scale }),
  };
}
