import { Modal, useModalDismiss } from "@/components/ui";
import { FramingDialog } from "@/features/account/FramingDialog";
import { PICTURE_ACCEPT } from "@/features/account/pictureFile";
import type { ProfilePictureLogic } from "@/features/account/useProfilePictureLogic";
import { Avatar } from "@/features/friends/Avatar";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 27a — the only place in the app that offers a profile picture.
 *
 * <p>One row, above the display name, with a 44 circle showing exactly what everyone else
 * sees and one verb beside it. Nothing anywhere else asks for a picture, nudges towards one
 * or marks its absence, which is how turn 15's quietness survives a turn that adds a face:
 * a list where nine of twelve people are initials has to look intended, and it only does
 * if nothing ever suggested otherwise.
 *
 * <p>The circle here never previews the upload. It changes on the server's word and not
 * before (27d), so a failure never has to un-show a face.
 */
export function PictureRow({
  logic,
  name,
  handle,
  copies,
}: {
  readonly logic: ProfilePictureLogic;
  readonly name: string;
  /** Passed straight through to the framing dialog, which shows the row you appear in. */
  readonly copies: number | undefined;
  /** For the line that says where the picture is public. Null until a handle is claimed. */
  readonly handle: string | null;
}) {
  const { t } = useTranslation();
  const id = useId();
  const { state } = logic;
  const failed =
    state.kind === "wrongType" || state.kind === "tooLarge" || state.kind === "unavailable";

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 py-3 min-h-11",
          // The failure states put the accent on the row's own border rather than raising a
          // banner: what went wrong is about this row, and it is answered from this row.
          failed && "rounded-t-xl border border-accent/35",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Progress logic={logic}>
            <Avatar name={name} src={logic.url} size={state.kind === "uploading" ? 42 : 44} />
          </Progress>
          <div className="min-w-0">
            <div id={id} className="text-[13px] font-semibold">
              {t("account.picture.title")}
            </div>
            <div
              className={cn(
                "mt-0.5 text-[11.5px] max-sm:leading-[1.5]",
                failed ? "text-accent-strong leading-[1.5]" : "text-ink-muted",
              )}
            >
              <Caption logic={logic} handle={handle} />
            </div>
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5">
          <Verbs logic={logic} labelledBy={id} />
        </div>
      </div>

      {/* Off-screen rather than absent: the row's own button is what opens it, and a visible
          file input beside a designed row is the one control the deck does not draw. */}
      <input
        ref={logic.inputRef}
        type="file"
        accept={PICTURE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared straight away so choosing the same file twice in a row still fires.
          event.target.value = "";
          if (file !== undefined) logic.chose(file);
        }}
      />

      {state.kind === "framing" && (
        <FramingDialog
          picture={state.picture}
          name={name}
          copies={copies}
          onCancel={logic.cancelFraming}
          onConfirm={logic.confirmFraming}
        />
      )}
      {logic.confirmingRemove && (
        <RemoveDialog
          name={name}
          src={logic.url}
          handle={handle}
          onCancel={logic.cancelRemove}
          onConfirm={logic.confirmRemove}
        />
      )}
    </>
  );
}

/**
 * The ring around the circle while the bytes are going up.
 *
 * Determinate, because it can be: a 12 MB picture on a phone connection is long enough to
 * watch, and a spinner over a long wait says only that something is happening.
 */
function Progress({
  logic,
  children,
}: {
  readonly logic: ProfilePictureLogic;
  readonly children: React.ReactNode;
}) {
  if (logic.state.kind !== "uploading") return <>{children}</>;
  const { sent, total } = logic.state;
  const done = total === 0 ? 0 : Math.min(1, sent / total);

  return (
    <div className="relative h-[52px] w-[52px] flex-none">
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(var(--color-accent) 0 ${done * 100}%, rgba(25,23,19,.12) ${done * 100}% 100%)`,
        }}
      />
      <div aria-hidden className="absolute inset-[2.5px] rounded-full bg-surface" />
      <div className="absolute inset-[5px]">{children}</div>
    </div>
  );
}

/** The sentence under "Picture", which is different in every one of 27d's seven states. */
function Caption({
  logic,
  handle,
}: {
  readonly logic: ProfilePictureLogic;
  readonly handle: string | null;
}) {
  const { t } = useTranslation();
  const where = handle === null ? null : `${window.location.host}/@${handle}`;

  switch (logic.state.kind) {
    case "choosing":
      return <>{t("account.picture.choosing")}</>;
    case "uploading":
      return (
        <>
          {t("account.picture.uploading", {
            sent: (logic.state.sent / 1_000_000).toFixed(1),
            total: (logic.state.total / 1_000_000).toFixed(1),
          })}
        </>
      );
    case "wrongType":
      return <>{t("account.picture.wrongType", { name: logic.state.name })}</>;
    case "tooLarge":
      return (
        <>
          {t("account.picture.tooLarge", {
            name: logic.state.name,
            size: (logic.state.bytes / 1_000_000).toFixed(1),
          })}
        </>
      );
    case "unavailable":
      return <>{t("account.picture.unavailable")}</>;
    default:
      if (logic.url === null) return <>{t("account.picture.notSet")}</>;
      if (logic.justUpdated) {
        return where === null ? (
          <>{t("account.picture.updated")}</>
        ) : (
          <>{t("account.picture.updatedAt", { url: where })}</>
        );
      }
      return where === null ? (
        <>{t("account.picture.publicNoHandle")}</>
      ) : (
        <>{t("account.picture.publicAt", { url: where })}</>
      );
  }
}

/** Add, or Replace and Remove — and after a failure, the way out of it. */
function Verbs({
  logic,
  labelledBy,
}: { readonly logic: ProfilePictureLogic; readonly labelledBy: string }) {
  const { t } = useTranslation();
  const { state } = logic;

  if (state.kind === "unavailable") {
    return (
      <Verb onClick={logic.retry} labelledBy={labelledBy}>
        {t("account.picture.tryAgain")}
      </Verb>
    );
  }
  if (state.kind === "wrongType" || state.kind === "tooLarge") {
    return (
      <Verb onClick={logic.pick} labelledBy={labelledBy}>
        {t("account.picture.chooseAnother")}
      </Verb>
    );
  }
  if (state.kind === "uploading") {
    return (
      <Verb onClick={logic.cancelUpload} labelledBy={labelledBy} quiet>
        {t("common.cancel")}
      </Verb>
    );
  }
  if (state.kind === "framing") {
    return (
      <span className="text-[12px] font-semibold text-ink/35">{t("account.picture.replace")}</span>
    );
  }
  if (state.kind === "choosing") {
    return (
      <span className="text-[12px] font-semibold text-ink/35">{t("account.picture.add")}</span>
    );
  }
  if (logic.url === null) {
    return (
      <Verb onClick={logic.pick} labelledBy={labelledBy}>
        {t("account.picture.add")}
      </Verb>
    );
  }
  return (
    <>
      <Verb onClick={logic.pick} labelledBy={labelledBy}>
        {t("account.picture.replace")}
      </Verb>
      <Verb onClick={logic.askRemove} labelledBy={labelledBy} quiet>
        {t("account.picture.remove")}
      </Verb>
    </>
  );
}

function Verb({
  onClick,
  labelledBy,
  quiet,
  children,
}: {
  readonly onClick: () => void;
  readonly labelledBy: string;
  readonly quiet?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-describedby={labelledBy}
      className={cn(
        "text-[12px] font-semibold transition-colors duration-(--mc-quick)",
        quiet === true ? "text-ink-muted hover:text-ink" : "text-accent hover:text-accent-strong",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Screen 27e — removing, which the web asks about because the trigger is a bare text link.
 *
 * <p>It draws the answer rather than describing it: the picture, an arrow, and the initials
 * circle it is going back to. There is no grey silhouette in this app to fall to, and the
 * dialog is the one place that is worth showing rather than saying.
 */
function RemoveDialog({
  name,
  src,
  handle,
  onCancel,
  onConfirm,
}: {
  readonly name: string;
  readonly src: string | null;
  readonly handle: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const where = handle === null ? null : `${window.location.host}/@${handle}`;

  return (
    <Modal onClose={onCancel} labelledBy={titleId} width="390px" phoneSheet>
      <div className="px-6 pt-5.5 pb-4.5">
        <div className="flex items-center gap-3.5">
          <Avatar name={name} src={src} size={56} />
          <ArrowRight size={16} strokeWidth={1.75} aria-hidden className="flex-none text-ink/35" />
          <Avatar name={name} size={56} />
        </div>
        <h2 id={titleId} className="mt-4 font-serif text-[22px] leading-[1.2]">
          {t("account.picture.removeDialog.title")}
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted text-pretty">
          {where === null
            ? t("account.picture.removeDialog.bodyNoHandle")
            : t("account.picture.removeDialog.body", { url: where })}
        </p>
      </div>
      <RemoveActions onConfirm={onConfirm} />
    </Modal>
  );
}

function RemoveActions({ onConfirm }: { readonly onConfirm: () => void }) {
  const { t } = useTranslation();
  const dismiss = useModalDismiss();

  return (
    <div className="flex flex-none flex-col-reverse gap-2.5 border-t border-line bg-surface px-6 py-3.5 pb-safe sm:flex-row sm:justify-end sm:pb-3.5">
      <button
        type="button"
        onClick={dismiss}
        className="h-11 text-[13px] font-medium text-ink-muted sm:h-[34px] sm:px-1"
      >
        {t("account.picture.removeDialog.keep")}
      </button>
      <button
        type="button"
        onClick={() => {
          onConfirm();
          dismiss();
        }}
        className={cn(
          "h-11 rounded-lg border border-accent/40 px-3.5 text-[13px] font-semibold text-accent-strong",
          "transition-colors duration-(--mc-quick) hover:bg-accent/8 sm:h-[34px] sm:text-[12.5px]",
        )}
      >
        {t("account.picture.remove")}
      </button>
    </div>
  );
}
