import { ReleaseArt } from "@/components/ReleaseArt";
import { Button, Modal, ModalClose } from "@/components/ui";
import { FORMAT_LABELS } from "@/domain/types";
import { useCopyDetailsLogic } from "@/features/add/useCopyDetailsLogic";
import { ConditionScale } from "@/features/detail/ConditionScale";
import { Calendar, HardDrive, Star } from "lucide-react";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

interface CopyDetailsDialogProps {
  readonly copyId: string;
  readonly onClose: () => void;
  /** "Back" — returns to the add sheet the copy was picked in. */
  readonly onBack: () => void;
}

/**
 * Screen 8d — step two of adding, where the copy stops being a release and becomes yours.
 *
 * The copy already exists by the time this opens: it was written the moment "Add and edit
 * details" was pressed. Closing this without saving therefore loses the details, not the
 * copy, which is the right way round — a record you own is worth keeping even if you never
 * got round to grading it.
 */
export function CopyDetailsDialog({ copyId, onClose, onBack }: CopyDetailsDialogProps) {
  const { t } = useTranslation();
  const logic = useCopyDetailsLogic(copyId, onClose);
  const titleId = useId();

  const release = logic.release;

  return (
    <Modal onClose={onClose} labelledBy={titleId} width="720px">
      <div className="flex flex-none items-start justify-between gap-4 border-b border-line px-6 pt-5.5 pb-4.5">
        <div>
          <div className="flex items-center gap-2.25 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-subtle">
            {t("copyDetails.step")}
            <span className="h-0.5 w-6.5 bg-ink/20" aria-hidden />
            {t("copyDetails.yourCopy")}
          </div>
          <h2 id={titleId} className="mt-2 font-serif text-2xl leading-[1.1]">
            {release?.title ?? "—"}
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {release === undefined
              ? ""
              : [
                  release.artistName,
                  release.year ?? null,
                  FORMAT_LABELS[release.format],
                  release.label,
                  release.catalogNumber,
                  release.country,
                ]
                  .filter((part) => part !== null && part !== "")
                  .join(" · ")}
          </p>
        </div>
        <ModalClose onClose={onClose} label={t("common.close")} />
      </div>

      <form
        className="flex min-h-0 flex-1 gap-6 overflow-auto px-6 py-5.5"
        onSubmit={(event) => {
          event.preventDefault();
          logic.save();
        }}
        id={`${titleId}-form`}
      >
        <div className="flex-none">
          <div className="h-45 w-45">
            <ReleaseArt
              release={release}
              loading="eager"
              className="rounded-sm shadow-[inset_0_0_0_1px_rgba(25,23,19,.08)]"
            />
          </div>
          {/* The format belongs to the pressing you picked, not to your copy of it, so it
              is stated here rather than offered as a choice. */}
          <div className="mt-3.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-subtle">
            {t("copyDetails.format")}
          </div>
          <div className="mt-1.5 inline-flex rounded-full bg-ink px-2.5 py-1.25 text-[11.5px] font-semibold text-paper">
            {FORMAT_LABELS[release?.format ?? "OTHER"]}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <ConditionScale
              label={t("copyDetails.mediaCondition")}
              value={logic.fields.condition}
              onChange={(value) => logic.set("condition", value)}
            />
            <ConditionScale
              label={t("copyDetails.sleeveCondition")}
              value={logic.fields.sleeveCondition}
              onChange={(value) => logic.set("sleeveCondition", value)}
            />

            <Field
              label={t("copyDetails.price")}
              error={logic.priceInvalid ? t("editor.badPrice") : null}
            >
              {(id) => (
                <div className="flex h-10 items-center gap-2 rounded-[9px] border border-line bg-surface px-3.25">
                  <span className="text-[13px] text-ink-subtle">€</span>
                  <input
                    id={id}
                    inputMode="decimal"
                    value={logic.fields.price}
                    onChange={(event) => logic.set("price", event.target.value)}
                    placeholder="0.00"
                    className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-subtle"
                  />
                </div>
              )}
            </Field>

            <Field
              label={t("copyDetails.date")}
              error={logic.dateInvalid ? t("editor.badDate") : null}
            >
              {(id) => (
                <div className="flex h-10 items-center justify-between rounded-[9px] border border-line bg-surface px-3.25">
                  <input
                    id={id}
                    type="date"
                    value={logic.fields.purchasedOn}
                    onChange={(event) => logic.set("purchasedOn", event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
                  />
                  <Calendar size={15} strokeWidth={1.75} className="text-ink-subtle" aria-hidden />
                </div>
              )}
            </Field>

            <Field label={t("copyDetails.where")}>
              {(id) => (
                <input
                  id={id}
                  value={logic.fields.purchasedAt}
                  onChange={(event) => logic.set("purchasedAt", event.target.value)}
                  placeholder={t("editor.wherePlaceholder")}
                  className="h-10 w-full rounded-[9px] border border-line bg-surface px-3.25 text-[13.5px] outline-none placeholder:text-ink-subtle"
                />
              )}
            </Field>

            <fieldset>
              <legend className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                {t("copyDetails.rating")}
              </legend>
              <div className="flex h-10 items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    // Pressing the current rating clears it — otherwise a mis-tap sticks.
                    onClick={() => logic.set("rating", logic.fields.rating === star ? null : star)}
                    aria-label={t("editor.rate", { count: star })}
                    aria-pressed={star <= (logic.fields.rating ?? 0)}
                  >
                    <Star
                      size={19}
                      strokeWidth={1.5}
                      className={star <= (logic.fields.rating ?? 0) ? "text-accent" : "text-ink/20"}
                      fill={star <= (logic.fields.rating ?? 0) ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <Field label={t("detail.notes")} className="mt-4.5">
            {(id) => (
              <textarea
                id={id}
                rows={3}
                value={logic.fields.notes}
                onChange={(event) => logic.set("notes", event.target.value)}
                placeholder={t("editor.notesPlaceholder")}
                className="w-full resize-y rounded-[9px] border border-line bg-surface p-3.25 text-[13px] leading-relaxed outline-none placeholder:text-ink-subtle"
              />
            )}
          </Field>
        </div>
      </form>

      <div className="flex flex-none items-center justify-between gap-4 border-t border-line bg-surface px-6 py-3.5">
        <span className="flex items-center gap-1.75 text-[11.5px] text-ink-muted">
          <HardDrive size={14} strokeWidth={1.75} aria-hidden />
          {logic.signedIn ? t("copyDetails.storageSignedIn") : t("copyDetails.storageGuest")}
        </span>
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            onClick={onBack}
            className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
          >
            {t("common.back")}
          </Button>
          <Button
            type="submit"
            form={`${titleId}-form`}
            loading={logic.saving}
            className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
          >
            {t("copyDetails.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface FieldProps {
  readonly label: string;
  readonly error?: string | null;
  readonly className?: string;
  readonly children: (id: string) => ReactNode;
}

function Field({ label, error = null, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`font-mono text-[10px] uppercase tracking-[0.1em] ${error === null ? "text-ink-subtle" : "text-accent"}`}
      >
        {error ?? label}
      </label>
      <div className="mt-1.5">{children(id)}</div>
    </div>
  );
}
