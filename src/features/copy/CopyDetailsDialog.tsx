import { ReleaseArt } from "@/components/ReleaseArt";
import {
  Button,
  Field,
  Modal,
  ModalClose,
  useModalDismiss,
  useModalRefused,
} from "@/components/ui";
import { useCopyDetailsLogic } from "@/features/copy/useCopyDetailsLogic";
import { ConditionScale } from "@/features/detail/ConditionScale";
import { PhotoManager } from "@/features/photos/PhotoManager";
import { usePhotoStripLogic } from "@/features/photos/usePhotoStripLogic";
import { cn } from "@/lib/utils";
import type { Format } from "@janne6565/music-collector-shared";
import { FORMAT_LABELS } from "@janne6565/music-collector-shared";
import { Calendar, HardDrive, Star } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/**
 * Which of the two entry points opened it (turn 12).
 *
 * `ADD` is step two of the add flow (8d): the copy was written a moment ago and says
 * nothing about itself yet. `EDIT` is the same field set reached from the detail page
 * (12b), where the copy already has answers and its pictures are managed. One dialog
 * rather than two, because a second implementation of these seven fields is how the add
 * flow and the edit flow start disagreeing about what a copy can say.
 */
export type CopyDialogMode = "ADD" | "EDIT";

const MANUAL_INPUT =
  "h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-[13.5px] outline-none focus:border-ink placeholder:text-ink-subtle";

interface CopyDetailsDialogProps {
  readonly copyId: string;
  readonly mode?: CopyDialogMode;
  readonly onClose: () => void;
  /** "Back" — returns to the add sheet the copy was picked in. Add only. */
  readonly onBack?: () => void;
  /** "Remove copy" — the footer's destructive action. Edit only. */
  readonly onRemove?: () => void;
  readonly removing?: boolean;
}

/**
 * Screens 8d and 12b — where a copy stops being a release and becomes yours.
 *
 * The copy already exists by the time this opens, in both modes: adding writes it the
 * moment a release is picked. Closing without saving therefore loses the details, not the
 * copy, which is the right way round — a record you own is worth keeping even if you never
 * got round to grading it.
 *
 * What differs between the two is only the frame: the eyebrow, what fills the left column
 * (the sleeve while adding, the image editor while editing) and the footer. The fields
 * themselves are one set, written through one hook.
 */
export function CopyDetailsDialog({
  copyId,
  mode = "ADD",
  onClose,
  onBack,
  onRemove,
  removing = false,
}: CopyDetailsDialogProps) {
  const { t } = useTranslation();
  const logic = useCopyDetailsLogic(copyId, onClose);
  const photos = usePhotoStripLogic(copyId);
  const titleId = useId();

  const editing = mode === "EDIT";
  const release = logic.release;

  return (
    <Modal
      onClose={onClose}
      labelledBy={titleId}
      width={editing ? "780px" : "720px"}
      holdOnBackdrop={logic.dirty}
    >
      <div className="flex flex-none items-start justify-between gap-4 border-b border-line px-6 pt-5.5 pb-4.5">
        <div>
          <div className="flex items-center gap-2.25 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-subtle">
            {editing ? (
              t("copyDetails.editTitle")
            ) : (
              <>
                {t("copyDetails.step")}
                <span className="h-0.5 w-6.5 bg-ink/20" aria-hidden />
                {t("copyDetails.yourCopy")}
              </>
            )}
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
        {/* The sleeve while adding (8d), the whole image list while editing (12b): the
            pictures of a copy are worth managing where its other answers are, and the add
            step has none of them yet. */}
        <div className="flex-none">
          {editing ? (
            <PhotoManager logic={photos} release={release} />
          ) : (
            <div className="h-45 w-45">
              <ReleaseArt release={release} loading="eager" />
            </div>
          )}
          <div className="mt-4.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-subtle">
            {t("copyDetails.format")}
          </div>
          {/* A catalogued pressing's format is the archive's answer, not yours; a
              hand-entered one has nobody else to ask. */}
          <FormatChips
            format={logic.fields.format === "" ? (release?.format ?? "OTHER") : logic.fields.format}
            onSelect={logic.manual ? (format) => logic.set("format", format) : undefined}
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Only a hand-entered copy carries its pressing's facts, and only it can
              correct them — no archive is ever going to fix a typo in a bootleg. */}
          {logic.manual && (
            <div className="mb-5 border-b border-line pb-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                {t("manual.pressing")}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <Field label={t("manual.artist")} required>
                  {(id) => (
                    <input
                      id={id}
                      value={logic.fields.artist}
                      onChange={(event) => logic.set("artist", event.target.value)}
                      className={MANUAL_INPUT}
                    />
                  )}
                </Field>
                <Field label={t("manual.title")} required>
                  {(id) => (
                    <input
                      id={id}
                      value={logic.fields.title}
                      onChange={(event) => logic.set("title", event.target.value)}
                      className={MANUAL_INPUT}
                    />
                  )}
                </Field>
              </div>
              <div className="mt-3 flex gap-3">
                <Field label={t("manual.year")} className="w-20 flex-none">
                  {(id) => (
                    <input
                      id={id}
                      inputMode="numeric"
                      maxLength={4}
                      value={logic.fields.year}
                      onChange={(event) => logic.set("year", event.target.value)}
                      className={cn(MANUAL_INPUT, "font-mono")}
                    />
                  )}
                </Field>
                <Field label={t("manual.label")} className="min-w-0 flex-1">
                  {(id) => (
                    <input
                      id={id}
                      value={logic.fields.label}
                      onChange={(event) => logic.set("label", event.target.value)}
                      placeholder={t("manual.optional")}
                      className={MANUAL_INPUT}
                    />
                  )}
                </Field>
                <Field label={t("manual.catalogNumber")} className="min-w-0 flex-1">
                  {(id) => (
                    <input
                      id={id}
                      value={logic.fields.catalogNumber}
                      onChange={(event) => logic.set("catalogNumber", event.target.value)}
                      placeholder={t("manual.optional")}
                      className={MANUAL_INPUT}
                    />
                  )}
                </Field>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <ConditionScale
              scope="MEDIA"
              label={t("copyDetails.mediaCondition")}
              value={logic.fields.condition}
              onChange={(value) => logic.set("condition", value)}
            />
            {/* Right-hand column: the help panel is wider than the column, so it hangs
                from the right edge instead of running off the side of the modal. */}
            <ConditionScale
              scope="SLEEVE"
              align="end"
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
        {editing ? (
          // 12b puts removing the copy in the footer's quiet corner: it is the one thing
          // here that cannot be undone, and it belongs where you are already deciding what
          // this copy is rather than at the bottom of a page you were only reading.
          <Button
            variant="secondary"
            onClick={onRemove}
            loading={removing}
            className="h-[34px] border-0 bg-transparent px-0 text-[12px] font-medium text-accent"
          >
            {t("detail.remove")}
          </Button>
        ) : (
          <span className="flex items-center gap-1.75 text-[11.5px] text-ink-muted">
            <HardDrive size={14} strokeWidth={1.75} aria-hidden />
            {logic.signedIn ? t("copyDetails.storageSignedIn") : t("copyDetails.storageGuest")}
          </span>
        )}
        <DialogActions
          editing={editing}
          formId={`${titleId}-form`}
          canSave={logic.canSave}
          onBack={onBack}
          saving={logic.saving}
        />
      </div>
    </Modal>
  );
}

/**
 * Cancel and Save, as a child so they can reach the sheet's own dismiss.
 *
 * Cancel calls the caller's `onClose` nowhere: closing has to run the 120ms exit first,
 * and only the Modal knows when that is done. Save takes the accent ring while a backdrop
 * click is being refused — the click said "get me out of here", and this is the way out.
 */
function DialogActions({
  editing,
  formId,
  canSave,
  onBack,
  saving,
}: {
  readonly editing: boolean;
  readonly formId: string;
  readonly canSave: boolean;
  readonly onBack: (() => void) | undefined;
  readonly saving: boolean;
}) {
  const { t } = useTranslation();
  const dismiss = useModalDismiss();
  const refused = useModalRefused();

  return (
    <div className="flex gap-2.5">
      <Button
        variant="secondary"
        onClick={editing || onBack === undefined ? dismiss : onBack}
        className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
      >
        {editing ? t("common.cancel") : t("common.back")}
      </Button>
      <Button
        type="submit"
        form={formId}
        // A hand-entered copy with its artist or title cleared has nothing left to name it.
        disabled={!canSave}
        loading={saving}
        className={cn(
          "h-[34px] rounded-lg px-3.5 text-[12.5px] transition-shadow duration-(--mc-quick)",
          refused && "ring-2 ring-accent ring-offset-2 ring-offset-paper",
        )}
      >
        {editing ? t("copyDetails.saveChanges") : t("copyDetails.save")}
      </Button>
    </div>
  );
}

/** The formats screen 8d puts under the sleeve, of which the pressing's own is lit. */
const FORMAT_CHIPS: readonly Format[] = ["VINYL", "CD", "CASSETTE", "DIGITAL"];

/**
 * The whole scale, with this copy's place on it.
 *
 * The deck draws four chips here, and seeing "Vinyl" against the three it is not is what
 * makes the answer legible — one lone chip reads as a label, not a position. They are
 * inert all the same: a copy's format is the format of the pressing it is a copy of, and
 * changing it would mean pointing the copy at a different release entirely.
 */
/**
 * The format, as a rail of chips.
 *
 * Read-only for a copy of a catalogued release — the pressing's format is a fact about the
 * pressing, and changing it here would only make this copy disagree with the archive. A
 * hand-entered copy (14b) owns the answer, so there it is a picker.
 */
function FormatChips({
  format,
  onSelect,
}: {
  readonly format: Format;
  readonly onSelect?: (format: Format) => void;
}) {
  const { t } = useTranslation();
  const chips = FORMAT_CHIPS.includes(format) ? FORMAT_CHIPS : [...FORMAT_CHIPS, format];

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const className = cn(
          "rounded-full px-2.5 py-1.25 text-[11.5px]",
          chip === format
            ? "bg-ink font-semibold text-paper"
            : "border border-line bg-surface font-medium text-ink-subtle",
        );
        return onSelect === undefined ? (
          <span
            key={chip}
            aria-current={chip === format}
            title={t("copyDetails.formatFixed")}
            className={className}
          >
            {FORMAT_LABELS[chip]}
          </span>
        ) : (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            aria-pressed={chip === format}
            className={cn(className, chip !== format && "hover:text-ink")}
          >
            {FORMAT_LABELS[chip]}
          </button>
        );
      })}
    </div>
  );
}
