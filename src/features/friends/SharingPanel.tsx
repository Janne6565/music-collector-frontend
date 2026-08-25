import type { SharingSettingsDtoCollectionVisibility } from "@/api/generated/musicCollectorAPI.schemas";
import { Toggle } from "@/components/ui";
import { useSharingLogic } from "@/features/friends/useSharingLogic";
import { cn } from "@/lib/utils";
import { Check, Copy, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Each choice with its own literal keys. Spelled out because the translation keys are
 * typed — one built by lowercasing the enum is a key the compiler cannot check exists.
 */
const CHOICES = [
  { value: "ONLY_ME", title: "sharing.choice.only_me.title", body: "sharing.choice.only_me.body" },
  { value: "FRIENDS", title: "sharing.choice.friends.title", body: "sharing.choice.friends.body" },
  { value: "PUBLIC", title: "sharing.choice.public.title", body: "sharing.choice.public.body" },
] as const;

/**
 * Screen 15f — three lists, three separate answers.
 *
 * The collection and the wishlist are asked separately because a public wishlist over a
 * friends-only shelf is the normal case, not an exotic one: what you are hunting for is a
 * much smaller thing to share than what you own.
 */
export function SharingPanel() {
  const { t } = useTranslation();
  const logic = useSharingLogic();
  const settings = logic.settings;
  if (!settings?.handle) {
    // Nothing to configure until there is a handle to configure it for.
    return null;
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-[19px] leading-none text-ink">{t("sharing.title")}</h2>
        <p className="mt-1.5 text-[12.5px] text-ink-muted">@{settings.handle}</p>
      </div>

      <Row
        title={t("sharing.findable.title")}
        body={t("sharing.findable.body")}
        control={
          <Toggle
            checked={settings.findable ?? true}
            onChange={(findable) => logic.set({ findable })}
            label={t("sharing.findable.title")}
          />
        }
      />

      <VisibilityGroup
        legend={t("sharing.collection.legend")}
        value={settings.collectionVisibility ?? "FRIENDS"}
        friendCountLabel={t("sharing.collection.friends")}
        onChange={logic.setCollection}
      />

      <VisibilityGroup
        legend={t("sharing.wishlist.legend")}
        value={settings.wishlistVisibility ?? "FRIENDS"}
        friendCountLabel={t("sharing.collection.friends")}
        onChange={logic.setWishlist}
        note={t("sharing.wishlist.note")}
      />

      {settings.wishlistVisibility === "PUBLIC" && <PublicLink handle={settings.handle} />}

      <Row
        title={t("sharing.prices.title")}
        body={settings.pricesPublic ? t("sharing.prices.on") : t("sharing.prices.off")}
        control={
          <Toggle
            checked={settings.pricesPublic ?? false}
            onChange={(pricesPublic) => logic.set({ pricesPublic })}
            label={t("sharing.prices.title")}
          />
        }
      />

      <p className="flex items-start gap-2 rounded-lg bg-paper px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-muted">
        <EyeOff size={14} strokeWidth={1.75} aria-hidden className="mt-0.5 flex-none" />
        {t("sharing.perCopyNote")}
      </p>
    </section>
  );
}

function Row({
  title,
  body,
  control,
}: { readonly title: string; readonly body: string; readonly control: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink">{title}</div>
        <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{body}</div>
      </div>
      <div className="flex-none pt-0.5">{control}</div>
    </div>
  );
}

interface VisibilityGroupProps {
  readonly legend: string;
  readonly value: SharingSettingsDtoCollectionVisibility;
  readonly friendCountLabel: string;
  readonly onChange: (value: SharingSettingsDtoCollectionVisibility) => void;
  readonly note?: string;
}

/**
 * Radios rather than a dropdown: all three answers and what each of them means have to be
 * readable at once. A privacy setting somebody has to open a menu to compare is one they
 * will get wrong.
 */
function VisibilityGroup({ legend, value, onChange, note }: VisibilityGroupProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
        {legend}
      </legend>
      <div className="overflow-hidden rounded-xl border border-line">
        {CHOICES.map((choice) => (
          <label
            key={choice.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 border-b border-line px-3.5 py-3 last:border-b-0 transition-colors duration-(--mc-quick)",
              value === choice.value ? "bg-surface" : "hover:bg-surface/60",
            )}
          >
            <input
              type="radio"
              name={legend}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full border",
                value === choice.value ? "border-ink bg-ink text-paper" : "border-line",
              )}
            >
              {value === choice.value && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">{t(choice.title)}</span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-muted">
                {t(choice.body)}
              </span>
            </span>
          </label>
        ))}
      </div>
      {note && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">{note}</p>}
    </fieldset>
  );
}

/**
 * The copyable link.
 *
 * Built from the page's own origin rather than from anything the server sends: the app is
 * served from more than one host, and a link that names the wrong one is worse than no
 * link at all.
 */
function PublicLink({ handle }: { readonly handle: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/@${handle}/wishlist`;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
      <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-muted">
        {url.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="flex flex-none items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-ink transition-colors duration-(--mc-quick) hover:bg-surface"
      >
        {copied ? (
          <Check size={13} strokeWidth={2.2} aria-hidden />
        ) : (
          <Copy size={13} strokeWidth={1.9} aria-hidden />
        )}
        {copied ? t("sharing.copied") : t("sharing.copy")}
      </button>
    </div>
  );
}
