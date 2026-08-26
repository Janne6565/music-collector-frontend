import { ReleaseArt } from "@/components/ReleaseArt";
import { Button, Modal, ModalClose, useModalDismiss } from "@/components/ui";
import { formatRelativeTime } from "@/domain/relativeTime";
import { useWishDetailsLogic } from "@/features/wishlist/useWishDetailsLogic";
import { cn } from "@/lib/utils";
import type { WishFormat } from "@janne6565/music-collector-shared";
import { FORMAT_LABELS } from "@janne6565/music-collector-shared";
import { Check, Disc3, ImagePlus, LibraryBig, Trash2 } from "lucide-react";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Giving one entry a picture of its own, and taking it back off (19b).
 *
 * Under the tile rather than beside the fields: it is about the frame above it, and the
 * line between the two already says which of the three sources is being shown. No Save,
 * like everything else in this modal — choosing the file is the decision.
 */
function CoverPicture({ logic }: { readonly logic: ReturnType<typeof useWishDetailsLogic> }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const own = logic.pictureSrc !== null;

  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={logic.savingImage}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-50"
        >
          <ImagePlus size={13} strokeWidth={1.75} aria-hidden />
          {t(own ? "wishlist.coverImageReplace" : "wishlist.coverImageAction")}
        </button>
        {own && (
          <button
            type="button"
            onClick={logic.dropImage}
            disabled={logic.savingImage}
            className="text-[11.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-50"
          >
            {t("wishlist.coverImageRemove")}
          </button>
        )}
      </div>
      {logic.imageRejected !== null && (
        <p className="mt-1 text-[11px] leading-snug text-ink-muted">
          {t(
            logic.imageRejected === "size"
              ? "wishlist.coverImageTooBig"
              : "wishlist.coverImageWrongType",
          )}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept={logic.acceptedImages}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) logic.chooseImage(file);
          // Cleared so picking the same file twice still fires a change.
          event.target.value = "";
        }}
      />
    </div>
  );
}

/** The four chips of the wanted format, in the deck's order. */
const CHIPS: readonly (WishFormat | null)[] = ["VINYL", "CD", "CASSETTE", null];

/** Shared by every section label in the modal. */
const EYEBROW = "font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-subtle";

interface WishDetailsDialogProps {
  readonly wishId: string;
  readonly onClose: () => void;
  /** Opens the add flow with this entry's search already run — 16j's primary action. */
  readonly onFound: () => void;
  /** Opens the copy that took the entry off the list (16r). */
  readonly onSeeCopy: (copyId: string) => void;
}

/**
 * Screen 16j — one wishlist entry, lifted over the list it came from.
 *
 * A modal rather than a page, for the same reason the copy detail is one: a wish holds no
 * pressing, so everything it knows fits here, and the list behind it is the workspace you
 * are actually in.
 *
 * Format and note edit in place. There is no Save because there is nothing to confirm —
 * two fields, each of which is a fact about the entry the moment you change it.
 */
export function WishDetailsDialog({ wishId, onClose, onFound, onSeeCopy }: WishDetailsDialogProps) {
  const { t, i18n } = useTranslation();
  const logic = useWishDetailsLogic(wishId, onClose);
  const titleId = useId();
  const entry = logic.entry;

  if (entry === null) return null;

  const added = new Date(entry.createdAt);
  const addedOn = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(added);

  return (
    <Modal onClose={onClose} labelledBy={titleId} width="720px" holdOnBackdrop={logic.removing}>
      {logic.satisfied ? (
        <SatisfiedElsewhere
          logic={logic}
          titleId={titleId}
          onClose={onClose}
          onSeeCopy={onSeeCopy}
        />
      ) : (
        <>
          {/* The whole entry eases back while a removal runs (16q) — it is on its way out,
              and the footer is the only part still saying anything. */}
          <div
            className={cn(
              "transition-opacity duration-(--mc-base)",
              logic.removing && "pointer-events-none opacity-45",
            )}
          >
            <div className="flex items-center justify-between px-[22px] pt-4">
              <span className={EYEBROW}>
                {t(logic.manual ? "wishlist.entryEyebrowManual" : "wishlist.entryEyebrow")}
              </span>
              <ModalClose onClose={onClose} label={t("common.close")} />
            </div>

            <div className="flex gap-[22px] px-[22px] pt-3.5">
              <div className="w-[152px] flex-none">
                <div className="h-[152px] w-[152px]">
                  <ReleaseArt
                    release={{ coverArtUrl: logic.coverArtUrl }}
                    previewSrc={logic.pictureSrc}
                    format={entry.desiredFormat ?? "OTHER"}
                    loading="eager"
                  />
                </div>
                {/* Says where the picture came from, or why there is none. The frame never
                    moves between the cases (16l): only this line changes. */}
                <p className="mt-[9px] font-mono text-[9.5px] leading-[1.5] text-ink-subtle">
                  {logic.pictureSrc !== null
                    ? t("wishlist.artYours")
                    : logic.manual
                      ? t("wishlist.artManual")
                      : logic.coverArtUrl === null
                        ? t("wishlist.artNone")
                        : logic.coverFromPressing
                          ? t("wishlist.artPressing")
                          : t("wishlist.artMirrored")}
                </p>
                <CoverPicture logic={logic} />
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  className="font-serif text-[30px] leading-[1.1] tracking-[-0.01em]"
                >
                  {entry.title}
                </h2>
                <p className="mt-[7px] text-[13.5px] text-ink-muted">
                  {entry.artistName}
                  {entry.year === null
                    ? ` · ${t("common.unknownYear").toLowerCase()}`
                    : ` · ${entry.year}`}
                </p>

                <div className="mt-5">
                  <span className={EYEBROW}>{t("wishlist.wantedFormat")}</span>
                  <div className="mt-2 flex gap-1.5">
                    {CHIPS.map((chip) => (
                      <button
                        key={chip ?? "ANY"}
                        type="button"
                        onClick={() => logic.setFormat(chip)}
                        aria-pressed={entry.desiredFormat === chip}
                        className={cn(
                          "rounded-[7px] px-3 py-1.5 text-[11.5px] transition-colors duration-(--mc-quick)",
                          entry.desiredFormat === chip
                            ? "bg-ink font-semibold text-paper"
                            : "border border-line bg-surface font-medium text-ink-muted hover:bg-canvas",
                        )}
                      >
                        {chip === null ? t("wishlist.anyFormat") : FORMAT_LABELS[chip]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-[18px] flex gap-[34px]">
                  <div>
                    <span className={EYEBROW}>{t("wishlist.column.added")}</span>
                    <p className="mt-[5px] text-[12.5px]">
                      {addedOn} · {formatRelativeTime(entry.createdAt, i18n.language)}
                    </p>
                  </div>
                  {/* Only once somebody has dragged this entry somewhere. "Never placed"
                      is not position 1, and saying so would invent a decision. */}
                  {logic.position !== null && (
                    <div>
                      <span className={EYEBROW}>{t("wishlist.position")}</span>
                      <p className="mt-[5px] text-[12.5px]">
                        {t("wishlist.positionValue", {
                          count: logic.position,
                          ordinal: true,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-[22px] pt-5">
              <label className={EYEBROW} htmlFor={`${titleId}-note`}>
                {t("wishlist.note")}
              </label>
              <textarea
                id={`${titleId}-note`}
                value={logic.note}
                onChange={(event) => logic.setNote(event.target.value)}
                rows={2}
                placeholder={t("wishlist.notePlaceholderLong")}
                className={cn(
                  "mt-2 w-full resize-none rounded-[9px] border border-line bg-surface px-[13px] py-[11px]",
                  "text-[13px] leading-[1.55] outline-none focus:border-ink placeholder:text-ink-subtle",
                )}
              />
              <p className="mt-[7px] flex items-center gap-1.5 font-mono text-[10.5px] text-ink-subtle">
                <Check size={12} strokeWidth={2.25} aria-hidden />
                {t("wishlist.savedAsYouType")}
              </p>

              {logic.alsoOwned > 0 && (
                <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-muted">
                  <LibraryBig
                    size={13}
                    strokeWidth={1.75}
                    className="text-ink-subtle"
                    aria-hidden
                  />
                  {t("wishlist.alsoOwn", {
                    count: logic.alsoOwned,
                    artist: entry.artistName,
                  })}
                </p>
              )}
            </div>

            <Pressings logic={logic} />
          </div>

          <Footer logic={logic} onClose={onClose} onFound={onFound} />
        </>
      )}
    </Modal>
  );
}

type Logic = ReturnType<typeof useWishDetailsLogic>;

/**
 * The optional lookup (16m, 16n).
 *
 * Folded until asked for, because it is a second request that can take a second or two and
 * can fail, for a table that is reference material — a wish names an album, not a press.
 * Both of its failures stay inside this box; nothing else on the entry depends on it.
 */
function Pressings({ logic }: { readonly logic: Logic }) {
  const { t } = useTranslation();

  if (logic.pressingsState === "UNAVAILABLE") {
    // A line of text, not a disabled button: there is nothing here to enable (16o).
    return (
      <p className="mx-[22px] mt-[18px] rounded-[9px] bg-canvas px-3.5 py-3 text-[12px] leading-relaxed text-ink-muted">
        {t("wishlist.pressingsManual")}
      </p>
    );
  }

  const open = logic.pressingsState !== "IDLE";
  const total = logic.pressings.length;
  const visible = logic.pressings.slice(0, logic.pressingsShown);

  return (
    <div className="mx-[22px] mt-[18px] rounded-[9px] border border-line bg-surface">
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-[9px]">
          <Disc3 size={15} strokeWidth={1.75} className="text-ink-subtle" aria-hidden />
          <span className="text-[12.5px] font-semibold">{t("wishlist.pressings")}</span>
          <span className="font-mono text-[10.5px] text-ink-subtle">
            {logic.pressingsState === "LOADING"
              ? t("wishlist.pressingsSlow")
              : logic.pressingsState === "LOADED" && total > 0
                ? t("wishlist.pressingsCount", { total, shown: visible.length })
                : t("wishlist.pressingsOptional")}
          </span>
        </div>
        <button
          type="button"
          onClick={open ? logic.hidePressings : logic.lookUpPressings}
          className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-muted hover:text-ink"
        >
          {t(open ? "wishlist.hidePressings" : "wishlist.lookUp")}
        </button>
      </div>

      {logic.pressingsState === "FAILED" && (
        <div className="border-t border-line px-3.5 py-3">
          <p className="text-[12px] leading-relaxed text-ink-muted">
            {t("wishlist.pressingsFailed")}
          </p>
          <button
            type="button"
            onClick={logic.retryPressings}
            className="mt-2 text-[11.5px] font-semibold text-accent hover:text-accent-hover"
          >
            {t("wishlist.pressingsRetry")}
          </button>
        </div>
      )}

      {logic.pressingsState === "LOADED" &&
        (total === 0 ? (
          <p className="border-t border-line px-3.5 py-3 text-[12px] text-ink-muted">
            {t("wishlist.pressingsNone")}
          </p>
        ) : (
          <div className="border-t border-line">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_56px_56px] gap-3 px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-subtle">
              <span>{t("wishlist.pressingLabel")}</span>
              <span>{t("wishlist.pressingCatalog")}</span>
              <span>{t("wishlist.pressingCountry")}</span>
              <span>{t("wishlist.pressingYear")}</span>
            </div>
            {visible.map((release) => (
              <div
                key={release.id}
                className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_56px_56px] gap-3 border-t border-line px-3.5 py-2 text-[12px]"
              >
                <span className="truncate">{release.label ?? "—"}</span>
                <span className="truncate font-mono text-[11px] text-ink-muted">
                  {release.catalogNumber ?? "—"}
                </span>
                <span className="text-ink-muted">{release.country ?? "—"}</span>
                <span className="font-mono text-[11px] text-ink-muted">{release.year ?? "—"}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5">
              {total > visible.length ? (
                <button
                  type="button"
                  onClick={logic.showAllPressings}
                  className="text-[11.5px] font-semibold text-ink-muted hover:text-ink"
                >
                  {t("wishlist.pressingsMore", { count: total - visible.length })}
                </button>
              ) : (
                <span />
              )}
              <span className="font-mono text-[10px] text-ink-subtle">
                {t("wishlist.pressingsReference")}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}

/**
 * 16j's footer, and 16q's.
 *
 * "I found a copy" stands alone as the primary; Remove is a quiet text action at the far
 * end, because a wish is cheap to lose and expensive to lose by accident. The confirm
 * appears here rather than in a second dialog — the question belongs where the action was.
 */
function Footer({
  logic,
  onClose,
  onFound,
}: {
  readonly logic: Logic;
  readonly onClose: () => void;
  readonly onFound: () => void;
}) {
  const { t } = useTranslation();
  const dismiss = useModalDismiss(onClose);

  if (logic.removing) {
    return (
      <div className="mt-[18px] flex items-center gap-3 border-t border-line bg-canvas px-[22px] py-3.5">
        <span className="text-[12px] font-medium text-ink-muted">{t("wishlist.removing")}</span>
        <span className="font-mono text-[10.5px] text-ink-subtle">
          {t("wishlist.removingHint")}
        </span>
      </div>
    );
  }

  if (logic.confirmingRemoval) {
    return (
      <div className="mt-[18px] flex items-center justify-between gap-4 border-t border-line bg-canvas px-[22px] py-3.5">
        <span className="text-[12px] text-ink-muted">{t("wishlist.removeConfirm")}</span>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={logic.cancelRemoval}
            className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={logic.remove} className="h-[34px] rounded-lg px-3.5 text-[12.5px]">
            {t("wishlist.removeConfirmAction")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-[18px] flex items-center justify-between gap-4 border-t border-line bg-canvas px-[22px] py-3.5">
      <button
        type="button"
        onClick={logic.askToRemove}
        className="flex items-center gap-[7px] text-[12px] font-medium text-ink-muted hover:text-ink"
      >
        <Trash2 size={14} strokeWidth={1.75} aria-hidden />
        {t("wishlist.remove")}
      </button>
      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          onClick={dismiss}
          className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
        >
          {t("common.close")}
        </Button>
        <Button onClick={onFound} className="h-[34px] rounded-lg px-3.5 text-[12.5px]">
          {t("wishlist.foundACopy")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Screen 16r — it left the list while you were reading it.
 *
 * The album stays where it was and only the parts that stopped being true are swapped, so
 * this reads as news rather than as the dialog falling over. Same wording as the
 * auto-removal line on 16e, because it is the same event.
 */
function SatisfiedElsewhere({
  logic,
  titleId,
  onClose,
  onSeeCopy,
}: {
  readonly logic: Logic;
  readonly titleId: string;
  readonly onClose: () => void;
  readonly onSeeCopy: (copyId: string) => void;
}) {
  const { t } = useTranslation();
  const dismiss = useModalDismiss(onClose);
  const entry = logic.entry;
  if (entry === null) return null;

  return (
    <>
      <div className="flex items-center justify-between px-[22px] pt-4">
        <span className={EYEBROW}>{t("wishlist.noLongerOnList")}</span>
        <ModalClose onClose={onClose} label={t("common.close")} />
      </div>

      <div className="flex gap-[22px] px-[22px] pt-3.5 pb-1">
        <div className="h-[104px] w-[104px] flex-none">
          <ReleaseArt
            release={{ coverArtUrl: logic.coverArtUrl }}
            previewSrc={logic.pictureSrc}
            format={entry.desiredFormat ?? "OTHER"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-serif text-[24px] leading-[1.1]">
            {entry.title}
          </h2>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {entry.artistName}
            {entry.year === null ? "" : ` · ${entry.year}`}
          </p>
          <p className="mt-3.5 text-[12.5px] leading-relaxed text-ink-muted">
            {t("wishlist.satisfiedElsewhere")}
          </p>
        </div>
      </div>

      <div className="mt-[18px] flex items-center justify-between gap-4 border-t border-line bg-canvas px-[22px] py-3.5">
        <span className="font-mono text-[10.5px] text-ink-subtle">
          {t("wishlist.satisfiedNoUndo")}
        </span>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={dismiss}
            className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
          >
            {t("wishlist.backToWishlist")}
          </Button>
          {logic.satisfiedCopyId !== null && (
            <Button
              onClick={() => onSeeCopy(logic.satisfiedCopyId as string)}
              className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
            >
              {t("wishlist.seeTheCopy")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
