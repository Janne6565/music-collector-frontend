import type { Condition } from "@/domain/types";
import { CONDITION_SHORT } from "@/domain/types";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * The grades the deck puts on the scale (screen 8d). Not the whole of `CONDITIONS`: G+,
 * Fair and Poor exist in the data and are honoured below, but putting eight chips on one
 * row makes the five that people actually use harder to hit.
 */
const SCALE = ["M", "NM", "VG_PLUS", "VG", "G"] as const;

/**
 * Which half of the copy is being graded.
 *
 * The grades are the same five either way — that is how sellers list them, and it is what
 * `condition` and `sleeveCondition` both store — but what they *mean* is not. "No surface
 * noise" says nothing about a jacket, so each scope brings its own descriptions: playback
 * for the media, ring wear and seams for the sleeve.
 */
export type GradingScope = "MEDIA" | "SLEEVE";

interface ConditionScaleProps {
  readonly label: string;
  readonly value: Condition | null;
  readonly onChange: (value: Condition | null) => void;
  readonly scope: GradingScope;
  /**
   * Which edge the help panel hangs from. The panel is wider than the column it sits in,
   * so the right-hand column has to open leftwards or it is clipped by the modal.
   */
  readonly align?: "start" | "end";
}

/**
 * One row of grades, with the grading help behind the info button.
 *
 * The help is a real disclosure rather than a hover tooltip: the deck shows it on hover,
 * but hover does not exist on a phone and this is the one place in the app where the
 * vocabulary is genuinely unfamiliar to a new collector. Being a disclosure, it also has
 * to close like one — clicking anywhere else or pressing Escape dismisses it, because a
 * panel that only the button it came from can close is a panel in the way.
 */
export function ConditionScale({
  label,
  value,
  onChange,
  scope,
  align = "start",
}: ConditionScaleProps) {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();
  const root = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    if (!helpOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      // The trigger lives inside the fieldset, so this deliberately ignores it: closing
      // here as well would race the button's own toggle and reopen on the next click.
      if (!root.current?.contains(event.target as Node)) setHelpOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // Stopped, or the modal would take the same Escape and close the whole editor.
      if (event.key === "Escape") {
        event.stopPropagation();
        setHelpOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [helpOpen]);

  // A grade the scale does not show but the copy actually has: keep it visible and
  // selected, or opening the editor would silently look like it had none.
  const grades: readonly Condition[] =
    value !== null && !(SCALE as readonly Condition[]).includes(value) ? [...SCALE, value] : SCALE;

  const scopeKey = scope === "SLEEVE" ? "sleeve" : "media";

  return (
    <fieldset ref={root} className="relative">
      <legend className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
        {label}
        <button
          type="button"
          onClick={() => setHelpOpen((open) => !open)}
          aria-expanded={helpOpen}
          aria-controls={helpId}
          aria-label={t("grading.help")}
          className="text-ink-subtle hover:text-ink"
        >
          <Info size={13} strokeWidth={1.9} aria-hidden />
        </button>
      </legend>

      {helpOpen && (
        <div
          id={helpId}
          className={cn(
            "absolute top-[54px] z-10 w-[284px] max-w-[calc(100vw-2rem)] rounded-[10px] bg-ink p-3.5 shadow-[0_12px_30px_rgba(25,23,19,.3)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <div className="text-[11.5px] font-semibold text-paper">
            {t(`grading.${scopeKey}.title`)}
          </div>
          <dl className="mt-2 flex flex-col gap-1.5">
            {SCALE.map((grade) => (
              <div key={grade} className="flex gap-2.5">
                <dt className="w-[26px] flex-none font-mono text-[10px] font-semibold text-white/90">
                  {CONDITION_SHORT[grade]}
                </dt>
                <dd className="text-[11px] leading-snug text-white/60">
                  {t(`grading.${scopeKey}.scale.${grade}`)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2.5 text-[10.5px] leading-normal text-white/40">
            {t("grading.footnote")}
          </p>
        </div>
      )}

      <div className="mt-1.5 flex gap-1.5">
        {grades.map((grade) => (
          <button
            key={grade}
            type="button"
            aria-pressed={value === grade}
            // Pressing the current grade clears it: a mis-tap is otherwise permanent, and
            // "not recorded" is a real answer.
            onClick={() => onChange(value === grade ? null : grade)}
            className={cn(
              "flex-1 rounded-[7px] py-1.5 text-center text-[11.5px] transition-colors",
              value === grade
                ? "bg-ink font-semibold text-paper"
                : "border border-line bg-surface font-medium text-ink-muted hover:bg-canvas",
            )}
          >
            {CONDITION_SHORT[grade]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
