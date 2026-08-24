import { FormatThumb } from "@/components/FormatThumb";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import type { WishlistItem } from "@/domain/types";
import { FORMAT_LABELS } from "@/domain/types";
import { useLibraryLogic } from "@/features/library/useLibraryLogic";
import { useWishlistLogic } from "@/features/wishlist/useWishlistLogic";
import { Check, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function WishlistPage() {
  const { t } = useTranslation();
  const logic = useWishlistLogic();
  const { stats } = useLibraryLogic();

  return (
    <AppShell stats={stats}>
      <div className="flex flex-none items-baseline justify-between px-7 pt-6 pb-3">
        <h1 className="font-serif text-[26px] leading-none">{t("nav.wishlist")}</h1>
        <span className="font-mono text-xs text-ink-subtle">
          {t("wishlist.count", { count: logic.items.length })}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-7 pb-7">
        {logic.loading ? null : logic.items.length === 0 ? (
          <p className="pt-8 text-sm text-ink-muted">{t("wishlist.empty")}</p>
        ) : (
          <div className="flex max-w-2xl flex-col gap-2.5">
            {logic.items.map((item) => (
              <Row key={item.id} item={item} logic={logic} />
            ))}
          </div>
        )}
        {logic.collectFailed && (
          <p className="pt-4 text-sm text-accent">{t("wishlist.collectFailed")}</p>
        )}
      </div>
    </AppShell>
  );
}

function Row({
  item,
  logic,
}: {
  readonly item: WishlistItem;
  readonly logic: ReturnType<typeof useWishlistLogic>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <div className="h-14 w-14 flex-none">
        <FormatThumb format={item.desiredFormat ?? "OTHER"} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{item.title}</div>
        <div className="truncate text-xs text-ink-muted">
          {item.artistName}
          {item.year !== null && ` · ${item.year}`}
          {item.desiredFormat !== null && ` · ${FORMAT_LABELS[item.desiredFormat]}`}
        </div>
        {item.note !== null && <div className="truncate text-xs text-ink-subtle">{item.note}</div>}
      </div>
      <Button
        onClick={() => logic.collect(item)}
        loading={logic.collecting === item.id}
        className="h-9 flex-none rounded-full px-4 text-xs"
      >
        <Check size={15} strokeWidth={1.75} aria-hidden />
        {t("wishlist.gotIt")}
      </Button>
      <Button
        variant="secondary"
        onClick={() => logic.remove(item)}
        loading={logic.removing === item.id}
        aria-label={t("wishlist.remove")}
        className="h-9 w-9 flex-none rounded-full border-0 px-0 text-ink-muted"
      >
        {logic.removing !== item.id && <Trash2 size={15} strokeWidth={1.75} aria-hidden />}
      </Button>
    </div>
  );
}
