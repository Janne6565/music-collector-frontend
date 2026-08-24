import { Button } from "@/components/ui";
import type { Condition, Copy } from "@/domain/types";
import { CONDITIONS, CONDITION_LABELS } from "@/domain/types";
import type { DetailChrome } from "@/features/detail/theme";
import { useCopyEditorLogic } from "@/features/detail/useCopyEditorLogic";
import type { CopyDraft } from "@/local/copyWrites";
import { Star } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

interface CopyEditorProps {
  readonly copy: Copy;
  readonly chrome: DetailChrome;
  readonly saving: boolean;
  readonly onSave: (patch: Partial<CopyDraft>) => void;
  readonly onCancel: () => void;
}

/** The editable fields beside the sleeve, from screen 1g. */
export function CopyEditor({ copy, chrome, saving, onSave, onCancel }: CopyEditorProps) {
  const { t } = useTranslation();
  const editor = useCopyEditorLogic(copy, onSave);

  const inputStyle = { color: chrome.ink };
  const inputClass = "w-full bg-transparent text-[15px] font-semibold outline-none";

  return (
    <form
      className="mt-7 flex flex-col gap-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        editor.submit();
      }}
    >
      <div className="grid grid-cols-2 gap-3.5">
        <Field label={t("detail.condition")} chrome={chrome}>
          {(id) => (
            <select
              id={id}
              value={editor.fields.condition}
              onChange={(event) => editor.set("condition", event.target.value as Condition | "")}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">{t("editor.unset")}</option>
              {CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {CONDITION_LABELS[condition]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label={t("detail.paid")}
          chrome={chrome}
          error={editor.priceInvalid ? t("editor.badPrice") : null}
        >
          {(id) => (
            <input
              id={id}
              inputMode="decimal"
              value={editor.fields.price}
              onChange={(event) => editor.set("price", event.target.value)}
              placeholder="0.00"
              className={inputClass}
              style={inputStyle}
            />
          )}
        </Field>

        <Field
          label={t("detail.bought")}
          chrome={chrome}
          error={editor.dateInvalid ? t("editor.badDate") : null}
        >
          {(id) => (
            <input
              id={id}
              type="date"
              value={editor.fields.purchasedOn}
              onChange={(event) => editor.set("purchasedOn", event.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          )}
        </Field>

        <Field label={t("detail.where")} chrome={chrome}>
          {(id) => (
            <input
              id={id}
              value={editor.fields.purchasedAt}
              onChange={(event) => editor.set("purchasedAt", event.target.value)}
              placeholder={t("editor.wherePlaceholder")}
              className={inputClass}
              style={inputStyle}
            />
          )}
        </Field>
      </div>

      <RatingField label={t("detail.rating")} chrome={chrome}>
        <div className="flex items-center gap-1 pt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              // Tapping the current rating clears it — otherwise a mis-tap is permanent.
              onClick={() => editor.set("rating", editor.fields.rating === star ? null : star)}
              aria-label={t("editor.rate", { count: star })}
            >
              <Star
                size={18}
                strokeWidth={1.5}
                style={{ color: star <= (editor.fields.rating ?? 0) ? chrome.accent : chrome.line }}
                fill={star <= (editor.fields.rating ?? 0) ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
      </RatingField>

      <Field label={t("detail.notes")} chrome={chrome}>
        {(id) => (
          <textarea
            id={id}
            value={editor.fields.notes}
            onChange={(event) => editor.set("notes", event.target.value)}
            rows={3}
            placeholder={t("editor.notesPlaceholder")}
            className="w-full resize-y bg-transparent text-sm leading-relaxed outline-none"
            style={inputStyle}
          />
        )}
      </Field>

      <div className="flex gap-2">
        <Button type="submit" loading={saving} className="h-9 rounded-full px-4 text-[13px]">
          {t("common.save")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            editor.reset();
            onCancel();
          }}
          className="h-9 rounded-full border-0 px-4 text-[13px]"
          style={{ background: chrome.surface, color: chrome.muted }}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  readonly label: string;
  readonly chrome: DetailChrome;
  readonly error?: string | null;
  /**
   * Receives the id to put on the control, so the label points at it explicitly rather
   * than relying on nesting — which assistive technology handles less consistently, and
   * which static analysis cannot verify at all.
   */
  readonly children: (id: string) => React.ReactNode;
}

function Field({ label, chrome, error = null, children }: FieldProps) {
  const id = useId();
  return (
    <div className="rounded-lg p-3.5" style={{ background: chrome.surface }}>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.09em]"
        style={{ color: error === null ? chrome.muted : chrome.accent }}
      >
        {error ?? label}
      </label>
      <div className="mt-1.5">{children(id)}</div>
    </div>
  );
}

/**
 * The rating is a row of buttons rather than one control, so it gets a fieldset and a
 * legend instead of a label pointing at nothing.
 */
function RatingField({
  label,
  chrome,
  children,
}: {
  readonly label: string;
  readonly chrome: DetailChrome;
  readonly children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg p-3.5" style={{ background: chrome.surface }}>
      <legend
        className="font-mono text-[10px] uppercase tracking-[0.09em]"
        style={{ color: chrome.muted }}
      >
        {label}
      </legend>
      <div className="mt-1.5">{children}</div>
    </fieldset>
  );
}
