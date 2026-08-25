import { FormatThumb } from "@/components/FormatThumb";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { formatRelativeTime } from "@/domain/relativeTime";
import { AddDialog } from "@/features/add/AddDialog";
import { CopyDetailsDialog } from "@/features/copy/CopyDetailsDialog";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { WishDialog } from "@/features/wishlist/WishDialog";
import { useWishlistLogic } from "@/features/wishlist/useWishlistLogic";
import { cn } from "@/lib/utils";
import type { WishSort, WishlistItem } from "@janne6565/music-collector-shared";
import { CHOOSABLE_WISH_SORTS, FORMAT_LABELS } from "@janne6565/music-collector-shared";
import {
  Check,
  ChevronDown,
  Disc3,
  GripVertical,
  Heart,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 16g — the wishlist as rows rather than a grid.
 *
 * The deck's reasoning, kept because it is the whole layout decision: the note is worth
 * more than a bigger sleeve. Someone reads this list to remember *why* a record is on it,
 * and a wall of thumbnails cannot carry "original Spoon press, green label, no barcode".
 */
export function WishlistPage() {
  const { t, i18n } = useTranslation();
  const logic = useWishlistLogic();
  const stats = useCollectionStats();

  /** The sheet: `true` for a new entry, an item to edit it, null when closed. */
  const [sheet, setSheet] = useState<true | WishlistItem | null>(null);
  /**
   * The entry being hunted down (screen 16d).
   *
   * The add flow opens with the wish's search already run — a wish names an album, not a
   * pressing, so which copy you found is still yours to pick. The entry stays put while
   * you do: it only leaves once a copy exists, which `useSatisfyWishes` sees and undoes.
   */
  const [hunting, setHunting] = useState<WishlistItem | null>(null);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <AppShell stats={stats}>
      <header className="flex flex-none items-start justify-between gap-4 px-7 pt-6 pb-4">
        <div>
          <h1 className="font-serif text-[26px] leading-none">{t("nav.wishlist")}</h1>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            {t("wishlist.count", { count: logic.count })}
          </p>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <SortMenu logic={logic} />
          <Button onClick={() => setSheet(true)} className="h-9 rounded-lg px-4 text-[13px]">
            <Plus size={15} strokeWidth={2} aria-hidden />
            {t("wishlist.addToWishlist")}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-7 pb-8">
        {logic.loading ? null : logic.count === 0 ? (
          <EmptyWishlist onAdd={() => setSheet(true)} />
        ) : (
          <>
            <div
              className="grid items-center gap-x-3 border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle"
              style={{ gridTemplateColumns: GRID }}
            >
              <span />
              <span />
              <span>{t("wishlist.column.release")}</span>
              <span>{t("wishlist.column.format")}</span>
              <span>{t("wishlist.column.note")}</span>
              <span>{t("wishlist.column.added")}</span>
              <span />
            </div>

            {logic.items.map((item, index) => (
              <Row
                key={item.id}
                item={item}
                index={index}
                dragging={dragging}
                onDragStart={() => setDragging(index)}
                onDragEnd={() => setDragging(null)}
                onDrop={() => {
                  if (dragging !== null) logic.reorder(dragging, index);
                  setDragging(null);
                }}
                onFound={() => setHunting(item)}
                onEdit={() => setSheet(item)}
                onRemove={() => logic.remove(item)}
                removing={logic.removing === item.id}
                language={i18n.language}
              />
            ))}

            <p className="pt-4 text-[11.5px] text-ink-muted">{t("wishlist.dragHint")}</p>
          </>
        )}
      </div>

      {sheet !== null && (
        <WishDialog onClose={() => setSheet(null)} entry={sheet === true ? null : sheet} />
      )}

      {hunting !== null && (
        <AddDialog
          onClose={() => setHunting(null)}
          onAdded={setDetailsFor}
          seedTerm={`${hunting.artistName} ${hunting.title}`.trim()}
          hunting={hunting}
        />
      )}

      {detailsFor !== null && (
        <CopyDetailsDialog
          copyId={detailsFor}
          onClose={() => {
            setDetailsFor(null);
            setHunting(null);
          }}
        />
      )}
    </AppShell>
  );
}

/** handle · art · release · format · note · added · actions, as 16g draws it. */
const GRID = "18px 44px minmax(0,1.5fr) 84px minmax(0,2fr) 96px 150px";

function SortMenu({ logic }: { readonly logic: ReturnType<typeof useWishlistLogic> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-[12.5px] font-semibold"
      >
        {t(`wishlist.sort.${logic.sort}`)}
        <ChevronDown size={13} strokeWidth={2} className="text-ink-subtle" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[0_8px_24px_rgba(25,23,19,.14)]">
          {/* "Your order" is only on the menu once a drag has built one — sorting by an
              order nobody has made yet would sort by nothing. */}
          {[...CHOOSABLE_WISH_SORTS, ...(logic.manual ? (["MANUAL"] as const) : [])].map(
            (option: WishSort) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  logic.setSort(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3.5 py-2 text-left text-[12.5px] hover:bg-canvas",
                  logic.sort === option && "font-semibold",
                )}
              >
                {t(`wishlist.sort.${option}`)}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  readonly item: WishlistItem;
  readonly index: number;
  readonly dragging: number | null;
  readonly onDragStart: () => void;
  readonly onDragEnd: () => void;
  readonly onDrop: () => void;
  readonly onFound: () => void;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
  readonly removing: boolean;
  readonly language: string;
}

function Row({
  item,
  index,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onFound,
  onEdit,
  onRemove,
  removing,
  language,
}: RowProps) {
  const { t } = useTranslation();
  const lifted = dragging === index;

  return (
    // Draggable on the row, but only *started* by the handle: a row that lifts wherever
    // you happen to press makes selecting the note impossible.
    <div
      draggable={dragging !== null}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "group grid items-center gap-x-3 border-b border-line py-2.5 transition-opacity",
        lifted && "opacity-40",
      )}
      style={{ gridTemplateColumns: GRID }}
    >
      <button
        type="button"
        // Mouse-down rather than a click: the drag has to be armed before the browser's
        // own dragstart fires, and dragstart never waits for a click to complete.
        onMouseDown={onDragStart}
        aria-label={t("wishlist.reorder")}
        className="cursor-grab text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <GripVertical size={15} strokeWidth={1.75} aria-hidden />
      </button>

      <div className="h-11 w-11">
        <FormatThumb format={item.desiredFormat ?? "OTHER"} />
      </div>

      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-semibold leading-tight">{item.title}</div>
        <div className="truncate text-[11.5px] leading-snug text-ink-muted">
          {item.artistName}
          {item.year !== null && ` · ${item.year}`}
        </div>
      </div>

      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
        {item.desiredFormat === null ? t("wishlist.anyFormat") : FORMAT_LABELS[item.desiredFormat]}
      </span>

      <span className="truncate text-[12px] text-ink-muted">{item.note ?? "—"}</span>

      <span className="font-mono text-[10px] text-ink-subtle">
        {formatRelativeTime(item.createdAt, language)}
      </span>

      {/* Quiet until the row is under the pointer: twenty-four rows each shouting two
          buttons is a list you have to read past rather than read. */}
      <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button onClick={onFound} className="h-8 rounded-lg px-3 text-[12px]">
          <Check size={14} strokeWidth={2} aria-hidden />
          {t("wishlist.foundIt")}
        </Button>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t("wishlist.editNote")}
          className="p-1.5 text-ink-subtle hover:text-ink"
        >
          <Pencil size={14} strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={t("wishlist.remove")}
          className="p-1.5 text-ink-subtle hover:text-ink disabled:opacity-40"
        >
          <Trash2 size={14} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Screen 16f — the list before anything is on it.
 *
 * It says where entries come from rather than offering one button, because the wishlist is
 * not somewhere you go to add things: it is where records you found somewhere else end up.
 */
function EmptyWishlist({ onAdd }: { readonly onAdd: () => void }) {
  const { t } = useTranslation();

  const ways = [
    { key: "search", icon: Search, action: onAdd },
    { key: "artist", icon: Disc3, action: onAdd },
    { key: "friend", icon: Users, action: null },
    { key: "manual", icon: Pencil, action: onAdd },
  ] as const;

  return (
    <div className="mx-auto max-w-md pt-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-canvas">
        <Heart size={22} strokeWidth={1.5} className="text-ink-subtle" aria-hidden />
      </div>
      <h2 className="pt-5 font-serif text-xl">{t("wishlist.emptyTitle")}</h2>
      <p className="pt-2 text-[12.5px] leading-relaxed text-ink-muted">{t("wishlist.emptyLede")}</p>

      <div className="pt-6 text-left">
        {ways.map(({ key, icon: Icon, action }) => (
          <button
            key={key}
            type="button"
            onClick={action ?? undefined}
            disabled={action === null}
            className="flex w-full items-center gap-3 border-b border-line py-3 text-left disabled:opacity-45"
          >
            <Icon size={16} strokeWidth={1.75} className="flex-none text-ink-subtle" aria-hidden />
            <span className="flex-1 text-[12.5px]">{t(`wishlist.way.${key}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
