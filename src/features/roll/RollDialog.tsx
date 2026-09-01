import { ReleaseArt } from "@/components/ReleaseArt";
import { Modal, ModalClose, useModalDismiss } from "@/components/ui/Modal";
import { useCoverPhotos } from "@/features/photos/useCoverPhotos";
import { RollWheel } from "@/features/roll/RollWheel";
import { useRollRows } from "@/features/roll/useRollRows";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Format, RollGeometry, RollLogic, RollRow } from "@janne6565/rekordo-shared";
import {
  CONDITION_LABELS,
  FORMAT_LABELS,
  ROLL_PHONE_WHEEL,
  ROLL_POOL_COLLAPSE_MS,
  ROLL_SWAP_MS,
  ROLL_WIDE_WHEEL,
  catalogArtShown,
  copyFormat,
  copyPreviewSrc,
  isAnyPool,
  useRollLogic,
  visibleSlots,
} from "@janne6565/rekordo-shared";
import { useNavigate } from "@tanstack/react-router";
import { Dices } from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const FILTERS: readonly (Format | "ALL")[] = ["ALL", "VINYL", "CD", "CASSETTE", "DIGITAL"];

/** How many of the copies you turned down the line under the result names. */
const PASSED_ON_SHOWN = 3;

/** Where the dialog's wheel stops being a desk-width one and becomes the phone's. */
const WIDE_QUERY = "(min-width: 640px)";

/**
 * Turn 27 — let the shelf decide, in a browser.
 *
 * The same throw as the phone's, from the same shared module: the same pool means the same
 * candidates, and the same 2.4 seconds pass between the click and the named copy. What is
 * different is only the frame — a centred dialog with a desk-width wheel above 640px, and
 * the phone's sheet with the phone's wheel below it (27c). One component either way; the
 * deck is explicit that there is no separate mobile page.
 *
 * The pool is the dialog's own. Whatever the shelf behind it was filtered to is still
 * filtered to that when this closes, which is the reason the dice can sit in the toolbar.
 */
export function RollDialog({ onClose }: { readonly onClose: () => void }) {
  const titleId = useId();
  const { rows } = useRollRows();
  const reduced = useReducedMotion();
  const wide = useWide();
  /**
   * Where the wheel is at the instant of a click, so the throw can plant the pick in a
   * slot nobody is looking at. Without it the click resampled the whole lap and every
   * cover on screen changed at once, which read as the wheel being swapped rather than
   * thrown.
   */
  const position = useRef<(() => { offset: number; bandWidth: number }) | null>(null);
  const wheel = wide ? ROLL_WIDE_WHEEL : ROLL_PHONE_WHEEL;
  const logic = useRollLogic({
    rows,
    reducedMotion: reduced,
    visibleSlots: useCallback(() => {
      const at = position.current?.();
      return at === undefined ? [] : visibleSlots(at.offset, at.bandWidth, wheel);
    }, [wheel]),
  });
  const settled = logic.phase === "SETTLED" && logic.picked !== null;
  useRollKeys(logic);
  /**
   * The result as it was when it settled, held while it plays its exit.
   *
   * "Roll again" picks the next copy on the click, and the block saying so is still on
   * screen — so it relabelled itself with a record it was not showing, for the length of
   * one fade. Freezing the whole element rather than just the copy also holds the roll
   * count and the pool line still, which change on the same click.
   */
  const answer = useRef<ReactNode>(null);
  if (settled && logic.picked !== null) {
    answer.current = <Result logic={logic} picked={logic.picked} onClose={onClose} />;
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy={titleId}
      width="720px"
      align="center"
      phoneSheet
      // The question fits in a short sheet; the answer does not. Growing when the copy
      // lands is the same thing the phone's sheet does, and for the same reason.
      sheetHeight={settled ? "large" : "auto"}
    >
      {/*
       * A flex column that scrolls, and every child in it refuses to shrink.
       *
       * Without `flex-none` the children are squeezed when the dialog is taller than the
       * window, and the swap box clips rather than scrolls — so a short window simply took
       * the roll button away.
       *
       * The bottom padding is a spacer element rather than padding, for the same reason: a
       * scroll container's own end padding is not reliably part of what it will scroll to,
       * and the last thing in here is the button that throws.
       */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-5 sm:px-7 sm:pt-7">
        <Head logic={logic} titleId={titleId} onClose={onClose} />
        <Pool logic={logic} />
        {/*
         * The wheel and the copy it stopped on take turns in the same box. Both stay
         * mounted: the wheel because its position must survive a repeat throw, and the
         * result because "Roll again" needs something to leave rather than something to
         * unmount — which was the cut.
         */}
        <Swap
          showAnswer={settled}
          question={
            <>
              <Wheel logic={logic} wheel={wheel} reduced={reduced} position={position} />
              <Actions logic={logic} />
            </>
          }
          answer={answer.current}
        />
        <div aria-hidden className="h-5 flex-none sm:h-7" />
      </div>
    </Modal>
  );
}

function Head({
  logic,
  titleId,
  onClose,
}: {
  readonly logic: RollLogic;
  readonly titleId: string;
  readonly onClose: () => void;
}) {
  const { t } = useTranslation();
  const settled = logic.phase === "SETTLED" && logic.picked !== null;
  const throwing = logic.phase === "THROWING" || logic.phase === "SETTLING";

  return (
    <div className="flex flex-none items-start justify-between gap-4 sm:gap-5">
      <div>
        <h2 id={titleId} className="font-serif text-[21px] leading-tight sm:text-[26px]">
          {settled
            ? t("roll.rolledTitle", { pool: logic.poolCount, total: logic.totalCount })
            : throwing
              ? t("roll.throwingTitle", { pool: logic.poolCount })
              : t("roll.title", { pool: logic.poolCount, total: logic.totalCount })}
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted text-pretty sm:mt-1.75 sm:text-[12.5px]">
          {settled ? <Session logic={logic} /> : throwing ? t("roll.throwingLede") : t("roll.lede")}
        </p>
      </div>
      <ModalClose onClose={onClose} label={t("roll.close")} />
    </div>
  );
}

/**
 * The line under the result — which throw this is, and what it has already handed you.
 *
 * Nothing is written down: the deck leaves open whether a roll is recorded at all, so the
 * count and the list go when the dialog does.
 */
function Session({ logic }: { readonly logic: RollLogic }) {
  const { t } = useTranslation();
  // The three most recent, not the whole session. A tenth roll listing nine titles is a
  // paragraph where the deck draws a line, and the older ones are not what you passed on
  // just now.
  const passedOn = logic.passedOn.slice(0, PASSED_ON_SHOWN);
  const titles = passedOn.map((row) => row.release?.title ?? t("conflict.untitled")).join(", ");
  return (
    <>
      {t("roll.session", { count: logic.rollCount })}
      {passedOn.length > 0 && ` ${t("roll.passedLine", { titles })}`}
    </>
  );
}

/**
 * The pool, which stays on screen in every state on the web (27b) — unlike the phone,
 * where it folds away to make room. A desk has the room, and a pool you cannot see is a
 * pool you have to remember.
 */
function Pool({ logic }: { readonly logic: RollLogic }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "mt-4 flex flex-none flex-col gap-3 border-b border-line pb-4",
        "sm:mt-5 sm:flex-row sm:items-center sm:gap-4",
      )}
    >
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const active = logic.pool.format === filter;
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={active}
              onClick={() => logic.setFormat(filter)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-(--mc-quick)",
                active ? "bg-ink text-paper" : "border border-line text-ink-muted hover:bg-canvas",
              )}
            >
              {filter === "ALL" ? t("format.all") : FORMAT_LABELS[filter]}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2.5 border-t border-line pt-3 sm:ml-auto sm:border-0 sm:pt-0">
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
          {t("roll.minRating")}
        </span>
        <div className="ml-auto flex items-center sm:ml-0">
          {[1, 2, 3, 4, 5].map((step) => {
            const on = logic.pool.minRating !== null && step <= logic.pool.minRating;
            return (
              <button
                key={step}
                type="button"
                aria-pressed={on}
                aria-label={t("roll.atLeast", { count: step })}
                // Clicking the floor you already asked for takes it off again, which is the
                // only gesture that gets back to "any" without a sixth control.
                onClick={() => logic.setMinRating(logic.pool.minRating === step ? null : step)}
                className={cn(
                  "px-px text-[18px] leading-none tracking-[1px]",
                  on ? "text-accent" : "text-ink/18 hover:text-ink/35",
                )}
              >
                {on ? "★" : "☆"}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] font-medium text-ink-subtle">
          {logic.pool.minRating === null
            ? t("roll.ratingAny")
            : t("roll.ratingFloor", { count: logic.pool.minRating })}
        </span>
      </div>
    </div>
  );
}

/**
 * Two blocks that take turns in the same place.
 *
 * The app's Cross, and its rule: the old one leaves at `quick`, and only then does the new
 * one arrive at `base`. One height carries across both, measured from whichever side is
 * showing, so the dialog grows and shrinks with the content rather than jumping when it
 * changes.
 *
 * Measured in a layout effect rather than after paint, so the box is the right height on
 * the frame the dialog opens on.
 */
function Swap({
  showAnswer,
  question,
  answer,
}: {
  readonly showAnswer: boolean;
  readonly question: ReactNode;
  readonly answer: ReactNode;
}) {
  const asked = useRef<HTMLDivElement>(null);
  const answered = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  /**
   * Measured before paint so the box is right on the frame the dialog opens on, and then
   * watched, because a single reading is a reading of a layout that has not finished
   * settling — a web font landing a frame later left the box a few pixels short, and a box
   * that clips is short at the bottom of a button.
   *
   * Rounded up, and from the fractional rect rather than the integer `offsetHeight`: half
   * a pixel short still clips.
   */
  useLayoutEffect(() => {
    const measure = () => {
      const shown = showAnswer ? answered.current : asked.current;
      if (shown !== null) setHeight(Math.ceil(shown.getBoundingClientRect().height));
    };
    measure();
    // The dialog is shown in an effect, so on the first layout pass it is still
    // `display: none` and everything inside it measures nought. This catches that.
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    if (asked.current !== null) observer.observe(asked.current);
    if (answered.current !== null) observer.observe(answered.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [showAnswer]);

  const fade = (visible: boolean) =>
    visible
      ? "opacity var(--mc-base) var(--mc-enter) var(--mc-quick)"
      : "opacity var(--mc-quick) var(--mc-exit)";

  return (
    /*
     * Deliberately not `overflow-hidden`. The height here is measured, and a measurement
     * taken a frame early is a box that is a few pixels short — which, clipped, is the
     * bottom of the roll button gone. Nothing sits below this block, so letting it spill
     * costs nothing and a wrong number can no longer hide a control.
     */
    <div
      className="relative flex-none"
      style={{ height, transition: `height ${ROLL_SWAP_MS}ms var(--mc-move)` }}
    >
      {/*
       * `flow-root` on both, and it is load-bearing rather than tidy. Each of these opens
       * with a margin, and a plain block lets that margin collapse out through its own top
       * edge — so `offsetHeight` came back short by exactly that margin, the box was set to
       * the short number, and the roll button was clipped off the bottom of it.
       */}
      <div
        ref={asked}
        className={cn(
          "inset-x-0 top-0 flow-root",
          showAnswer && "pointer-events-none absolute opacity-0",
        )}
        style={{ transition: fade(!showAnswer) }}
      >
        {question}
      </div>
      <div
        ref={answered}
        className={cn(
          "absolute inset-x-0 top-0 flow-root",
          !showAnswer && "pointer-events-none opacity-0",
        )}
        style={{ transition: fade(showAnswer) }}
      >
        {answer}
      </div>
    </div>
  );
}

/**
 * The band.
 *
 * Kept mounted in every state, because the wheel's position is the thing that must not be
 * lost: "Roll again" re-enters the spin from where the strip already is, and a band that
 * unmounted with the result would start every repeat throw by snapping back to the top of
 * the lap.
 */
function Wheel({
  logic,
  wheel,
  reduced,
  position,
}: {
  readonly logic: RollLogic;
  readonly wheel: RollGeometry;
  readonly reduced: boolean;
  readonly position: RefObject<(() => { offset: number; bandWidth: number }) | null>;
}) {
  const throwing = logic.phase === "THROWING" || logic.phase === "SETTLING";

  return (
    /* Out to both edges of the dialog: the wheel passes behind it rather than sitting in
       it, which is what the fades at either end are for. */
    <div
      aria-hidden
      className="-mx-5 mt-4 sm:-mx-7 sm:mt-5"
      style={{
        transform: throwing ? "scale(1.06)" : undefined,
        transition: `transform ${ROLL_POOL_COLLAPSE_MS}ms cubic-bezier(.4,0,.2,1)`,
      }}
    >
      <RollWheel
        strip={logic.strip}
        phase={logic.phase}
        wheel={wheel}
        reduced={reduced}
        position={position}
      />
    </div>
  );
}

/** The line and the button under the wheel: everything before an answer exists. */
function Actions({ logic }: { readonly logic: RollLogic }) {
  const { t } = useTranslation();
  const throwing = logic.phase === "THROWING" || logic.phase === "SETTLING";
  const empty = logic.poolCount === 0;

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-5 sm:mt-5.5">
        {/* Silent while the wheel is running: "nothing rolled yet" is true right up to the
            moment it stops, and saying so over a spinning wheel reads as a stuck screen. */}
        <span className="hidden text-[11.5px] font-medium text-ink-subtle sm:block">
          {throwing ? "" : empty ? t("roll.emptyPool") : t("roll.hint")}
        </span>
        <button
          type="button"
          disabled={!logic.canRoll}
          onClick={logic.roll}
          className={cn(
            "flex h-11 w-full flex-none items-center justify-center gap-2 rounded-[9px]",
            "text-sm font-semibold sm:w-auto sm:px-5.5",
            logic.canRoll ? "bg-ink text-paper" : "bg-ink/14 text-ink-subtle",
          )}
        >
          <Dices size={16} strokeWidth={1.75} aria-hidden />
          {throwing ? t("roll.rolling") : t("roll.action", { count: logic.poolCount })}
        </button>
      </div>
      {empty && (
        <p className="mt-2.5 text-center text-[11px] font-medium text-ink-subtle sm:hidden">
          {t("roll.emptyPool")}
        </p>
      )}
    </>
  );
}

/**
 * 27b — the copy, beside its facts.
 *
 * The wheel is gone and the cover has taken its place at the same height, so the dialog
 * does not jump: 240px of artwork where 186px of band was, and the details fill the space
 * the fades were using.
 */
function Result({
  logic,
  picked,
  onClose,
}: {
  readonly logic: RollLogic;
  readonly picked: RollRow;
  readonly onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dismiss = useModalDismiss(onClose);
  const covers = useCoverPhotos([picked.copy.id]);
  const pool = usePoolLine(logic);
  const release = picked.release;

  const open = () => {
    dismiss();
    void navigate({ to: "/copies/$copyId", params: { copyId: picked.copy.id } });
  };

  /** Enter opens the copy, as the deck says. R is handled above and still rolls again. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || typing(event)) return;
      event.preventDefault();
      open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const rating = picked.copy.rating === null ? 0 : Math.min(5, Math.round(picked.copy.rating));

  return (
    <div className="mt-5 flex flex-col gap-4 sm:mt-5.5 sm:flex-row sm:gap-6">
      <div className="aspect-[1.2] w-full flex-none sm:h-60 sm:w-72">
        <ReleaseArt
          release={release}
          format={copyFormat(picked.copy, release)}
          previewSrc={copyPreviewSrc(picked.copy, covers.get(picked.copy.id) ?? null)}
          allowCatalogArt={catalogArtShown(picked.copy, true)}
          loading="eager"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="font-serif text-[26px] leading-tight text-pretty sm:text-[30px]">
          {release?.title ?? t("conflict.untitled")}
        </div>
        <div className="mt-1.5 font-serif text-sm text-ink-muted">
          {release === undefined
            ? ""
            : `${release.artistName} · ${release.year ?? t("common.unknownYear")}`}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4.5 gap-y-3.5 sm:mt-5">
          <Fact label={t("roll.factFormat")}>
            {FORMAT_LABELS[copyFormat(picked.copy, release)]}
          </Fact>
          <Fact label={t("roll.factCondition")}>
            {picked.copy.condition === null ? "—" : CONDITION_LABELS[picked.copy.condition]}
          </Fact>
          <Fact label={t("roll.factRating")}>
            {rating === 0 ? (
              "—"
            ) : (
              <span className="text-[15px] leading-none tracking-[1px]">
                <span className="text-accent">{"★".repeat(rating)}</span>
                <span className="text-ink/18">{"☆".repeat(5 - rating)}</span>
              </span>
            )}
          </Fact>
          <Fact label={t("roll.factAdded")}>
            {new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
              picked.copy.createdAt,
            )}
          </Fact>
        </dl>

        <div className="mt-auto flex flex-col gap-2.5 pt-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={open}
            className="h-11 rounded-[9px] bg-ink px-5.5 text-sm font-semibold text-paper"
          >
            {t("roll.openCopy")}
          </button>
          <button
            type="button"
            onClick={logic.roll}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-[9px] border border-line",
              "px-4.5 text-[13.5px] font-semibold text-accent hover:bg-canvas",
            )}
          >
            <Dices size={15} strokeWidth={1.75} aria-hidden />
            {t("roll.again")}
          </button>
          {!isAnyPool(logic.pool) && (
            <span className="truncate text-[11px] font-medium text-ink-subtle sm:ml-auto">
              {pool}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] tracking-[0.1em] text-ink-subtle uppercase">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium">{children}</dd>
    </div>
  );
}

/** What the pool was, in the words the chips use — "Vinyl · Rated 4 and up". */
function usePoolLine(logic: RollLogic): string {
  const { t } = useTranslation();
  const parts: string[] = [];
  if (logic.pool.format !== "ALL") parts.push(FORMAT_LABELS[logic.pool.format]);
  if (logic.pool.minRating !== null)
    parts.push(t("roll.poolRated", { count: logic.pool.minRating }));
  return parts.join(" · ");
}

/**
 * R throws, as the deck says. Not while somebody is typing, and not while one is already
 * in the air — the shared logic refuses that, so this only has to not fight it.
 *
 * Esc is the browser's, through the dialog's own cancel; Enter belongs to the result and
 * lives there, because there is nothing to open until one exists.
 */
function useRollKeys(logic: RollLogic) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "r" && event.key !== "R") return;
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event)) return;
      event.preventDefault();
      logic.roll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logic.roll]);
}

/** Whether the keystroke belongs to a field rather than to the dialog. */
function typing(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return target !== null && target.closest("input, textarea, [contenteditable]") !== null;
}

/** Which wheel the dialog is showing — the deck draws two, and they are not a scale. */
function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia?.(WIDE_QUERY).matches ?? true);
  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return wide;
}
