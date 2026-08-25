import { Button, Modal } from "@/components/ui";
import { useId } from "react";

interface ConfirmDialogProps {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * A small sheet that asks before doing something, on top of whatever is already open.
 *
 * `<dialog>` stacks in the top layer, so this sits above the sheet that raised it with its
 * own focus trap and its own Escape — which is why it can be rendered from inside another
 * modal without either of them having to know about the other.
 *
 * Deliberately not `window.confirm`: that one blocks the whole tab, cannot be styled, and
 * on a phone reads as the browser asking rather than the app.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Modal onClose={onCancel} labelledBy={titleId} width="380px">
      <div className="px-6 pt-5.5 pb-4.5">
        <h2 id={titleId} className="font-serif text-lg leading-[1.15]">
          {title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted text-pretty">{body}</p>
      </div>
      <div className="flex flex-none justify-end gap-2.5 border-t border-line bg-surface px-6 py-3.5">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
        >
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} className="h-[34px] rounded-lg px-3.5 text-[12.5px]">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
