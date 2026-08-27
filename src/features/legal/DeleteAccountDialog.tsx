import { Button, Modal, useModalDismiss } from "@/components/ui";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * The word that has to be typed before the account goes.
 *
 * German even in the English interface, because it is the word the screen prints and the
 * point of it is to be copied deliberately rather than recognised and dismissed. The
 * umlaut-free spelling is accepted too — a keyboard without an Ö is not a reason to be
 * unable to delete your own account.
 */
const CONFIRM_WORDS = ["löschen", "loeschen"];

export function isDeletionConfirmed(typed: string): boolean {
  return CONFIRM_WORDS.includes(typed.trim().toLowerCase());
}

interface DeleteAccountDialogProps {
  readonly copyCount: number | undefined;
  readonly handle: string | null;
  readonly onExport: () => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly deleting: boolean;
}

/** Screen 17h — the confirm, with the export offered on the way out. */
export function DeleteAccountDialog({
  copyCount,
  handle,
  onExport,
  onConfirm,
  onCancel,
  deleting,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const fieldId = useId();
  const [typed, setTyped] = useState("");
  const confirmed = isDeletionConfirmed(typed);

  return (
    <Modal onClose={onCancel} labelledBy={titleId} width="400px" holdOnBackdrop phoneSheet>
      <div className="px-6 pt-5.5 pb-5">
        <h2 id={titleId} className="font-serif text-[25px] leading-[1.15]">
          {t("legal.delete.title")}
        </h2>
        <p className="mt-2.5 text-[13px] leading-[1.65] text-ink-muted text-pretty">
          {/* Two sentences rather than one with a placeholder: an account with no handle
              has nothing to lose there, and "your handle (none)" reads like a bug. */}
          {handle === null
            ? t("legal.delete.body", { count: copyCount ?? 0 })
            : t("legal.delete.bodyWithHandle", { count: copyCount ?? 0, handle })}
        </p>

        {/* The offer, not a warning: somebody who wanted a copy is one click from it rather
            than having to cancel, find the export and come back. */}
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3">
          <span className="flex-1 text-[12.5px] font-medium">{t("legal.delete.exportFirst")}</span>
          <button
            type="button"
            onClick={onExport}
            className="text-[11.5px] font-semibold text-accent hover:text-accent-hover"
          >
            {t("legal.delete.exportAction")}
          </button>
        </div>

        <label
          htmlFor={fieldId}
          className="mt-4.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle"
        >
          {t("legal.delete.typeToConfirm")}
        </label>
        <input
          id={fieldId}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="mt-2 h-12 w-full rounded-[10px] border-[1.5px] border-ink bg-surface px-3.5 font-mono text-[15px] tracking-[0.06em] outline-none"
        />
      </div>
      <div className="flex flex-none flex-col gap-2.5 border-t border-line bg-surface px-6 py-4">
        <Button
          onClick={onConfirm}
          disabled={!confirmed}
          loading={deleting}
          className="h-[46px] rounded-full bg-accent-strong text-[15px] hover:bg-accent-strong"
        >
          {t("legal.delete.confirm")}
        </Button>
        <KeepAccountButton onCancel={onCancel} />
      </div>
    </Modal>
  );
}

/**
 * The way out, as a child of the sheet so it leaves through the sheet's own exit animation
 * rather than blinking away underneath it.
 */
function KeepAccountButton({ onCancel }: { readonly onCancel: () => void }) {
  const { t } = useTranslation();
  const dismiss = useModalDismiss(onCancel);
  return (
    <button
      type="button"
      onClick={dismiss}
      className="text-center text-[13px] font-semibold text-ink-muted transition-colors duration-(--mc-quick) hover:text-ink"
    >
      {t("legal.delete.keep")}
    </button>
  );
}
