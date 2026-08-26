import type { SharedCopyDto, SharedWishDto } from "@/api/generated/musicCollectorAPI.schemas";
import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button, PulsingDots, Skeleton } from "@/components/ui";
import { formatMoney } from "@/features/detail/DetailPage";
import { Avatar } from "@/features/friends/Avatar";
import type { DetailFact, SharedDetailItem } from "@/features/friends/SharedDetailModal";
import { SharedDetailModal } from "@/features/friends/SharedDetailModal";
import { useProfileLogic } from "@/features/friends/useProfileLogic";
import { useSharedCoverPhotos } from "@/features/friends/useSharedCoverPhotos";
import { useSharedDetailLogic } from "@/features/friends/useSharedDetailLogic";
import { useSharedWishCovers } from "@/features/friends/useSharedWishCovers";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { cn } from "@/lib/utils";
import type { Condition, Format } from "@janne6565/music-collector-shared";
import { CONDITION_SHORT, FORMAT_LABELS } from "@janne6565/music-collector-shared";
import { Link, useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { ChevronLeft, ChevronRight, Lock, UserCheck, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Which half of a profile is on screen. Each half has its own address. */
export type ProfileTab = "collection" | "wishlist";

/**
 * Screen 15h — a friend's collection, the same grid as your own library with the owner
 * named, and 15d's locked shelf when it is not open to you.
 */
export function ProfilePage({
  handle,
  tab,
  openId,
  onOpen,
}: {
  readonly handle: string;
  readonly tab: ProfileTab;
  readonly openId?: string;
  readonly onOpen: (id: string | undefined) => void;
}) {
  const stats = useCollectionStats();
  const logic = useProfileLogic(handle);
  const navigate = useNavigate();

  return (
    <AppShell stats={stats}>
      <ProfileBody
        logic={logic}
        tab={tab}
        onTab={(next) =>
          void navigate(
            next === "wishlist"
              ? { to: "/friends/$handle/wishlist", params: { handle } }
              : { to: "/friends/$handle", params: { handle } },
          )
        }
        backTo="/friends"
        openId={openId}
        onOpen={onOpen}
      />
    </AppShell>
  );
}

type Logic = ReturnType<typeof useProfileLogic>;

/**
 * Shared by the signed-in profile and the public page, because they are the same screen
 * with a different chrome around them — the verdicts on what may be shown come from the
 * server either way.
 */
export function ProfileBody({
  logic,
  tab,
  onTab,
  backTo,
  openId,
  onOpen,
}: {
  readonly logic: Logic;
  readonly tab: ProfileTab;
  /**
   * Switching tabs is a navigation, not a piece of local state: the wishlist is the half
   * of the page people are sent a link to, and a tab that only lived in memory could not
   * be linked to, reloaded, or opened in a second window.
   */
  readonly onTab: (tab: ProfileTab) => void;
  readonly backTo?: string;
  /** The record the detail sheet is showing, straight out of the route's search (23a). */
  readonly openId?: string;
  readonly onOpen: (id: string | undefined) => void;
}) {
  const { t, i18n } = useTranslation();
  const person = logic.person;
  const collection = tab === "collection";
  /*
   * Only the half on screen is resolved. Both lists are fetched as soon as the profile
   * says they may be read, but the pictures behind them are a request each — and the
   * wishlist's covers are looked up one album at a time — so the tab that nobody is
   * looking at is handed nothing to resolve.
   */
  const copies = collection ? logic.copies : NO_COPIES;
  const wishes = collection ? NO_WISHES : logic.wishes;
  const photos = useSharedCoverPhotos(copies);
  const covers = useSharedWishCovers(wishes);
  const detail = useSharedDetailLogic(
    collection ? copies.map((copy) => copy.id) : wishes.map((wish) => wish.id),
    openId,
    onOpen,
  );

  if (logic.loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <PulsingDots />
      </div>
    );
  }

  if (logic.notFound || !person) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <h1 className="font-serif text-[22px]">{t("profile.notFound.title")}</h1>
        <p className="text-[13px] text-ink-muted">
          {t("profile.notFound.body", { handle: logic.handle })}
        </p>
      </div>
    );
  }

  const name = person.displayName ?? person.handle ?? "";
  const showing = collection ? person.canSeeCollection : person.canSeeWishlist;
  /** The owner's switch on 15f, which the sheet obeys exactly as the tiles do. */
  const prices = person.pricesVisible !== false;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-10 pt-6">
      {backTo && (
        <Link
          to={backTo}
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-ink-muted no-underline hover:text-ink"
        >
          <ChevronLeft size={15} strokeWidth={1.75} aria-hidden />
          {t("friends.title")}
        </Link>
      )}

      <header className="flex items-start gap-4">
        <Avatar name={name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[26px] leading-tight text-ink">{name}</h1>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {[
              `@${person.handle}`,
              t("friends.copies", { count: person.copyCount ?? 0 }),
              person.collectingSince
                ? t("profile.collectingSince", {
                    year: new Date(person.collectingSince).getFullYear(),
                  })
                : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <RelationshipAction logic={logic} />
      </header>

      <div className="mt-5 flex items-center justify-between gap-4 border-b border-line pb-2">
        <div className="flex gap-1">
          <TabButton active={tab === "collection"} onClick={() => onTab("collection")}>
            {t("profile.tab.collection", { count: person.copyCount ?? 0 })}
          </TabButton>
          <TabButton active={tab === "wishlist"} onClick={() => onTab("wishlist")}>
            {t("profile.tab.wishlist", { count: person.wishlistCount ?? 0 })}
          </TabButton>
        </div>
        {/* Nothing is said about being read-only: a page with no controls on it already
            says so, and a label repeating it spends the line on the obvious. What is not
            obvious is a column that is missing on purpose. */}
        {person.pricesVisible === false && (
          <span className="flex-none font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-subtle">
            {t("profile.pricesHidden", { name })}
          </span>
        )}
      </div>

      {!showing ? (
        <LockedShelf logic={logic} tab={tab} />
      ) : logic.loadingLists ? (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
          {[0, 1, 2, 3, 4, 5].map((tile) => (
            <Skeleton key={tile} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : collection ? (
        <CollectionGrid
          copies={copies}
          photos={photos}
          truncated={logic.copiesTruncated}
          onOpen={onOpen}
        />
      ) : (
        <WishRows wishes={wishes} covers={covers} onOpen={onOpen} />
      )}

      {showing && detail.open && (
        <SharedDetailModal
          detail={detail}
          item={
            collection
              ? copyDetail(copies[detail.index], photos, t, i18n.language, name, prices)
              : wishDetail(wishes[detail.index], covers, t)
          }
        />
      )}
    </div>
  );
}

/**
 * Stable empties for the half of the page that is not on screen.
 *
 * A fresh `[]` each render would restart the effects behind the pictures on every keypress
 * elsewhere in the tree.
 */
const NO_COPIES: readonly SharedCopyDto[] = [];
const NO_WISHES: readonly SharedWishDto[] = [];

/**
 * A copy as 23a draws it.
 *
 * Every field is optional on the wire and each absent one simply is not in the list, which
 * is what lets the same sheet hold the full catalogue case and a hand-entered cassette with
 * a photo and nothing else. Prices obey the owner's switch (15f) rather than being blanked
 * out: a dash where a price would be still says how much attention the field deserves.
 */
function copyDetail(
  copy: SharedCopyDto | undefined,
  photos: ReadonlyMap<string, string>,
  t: TFunction,
  language: string,
  owner: string,
  prices: boolean,
): SharedDetailItem {
  const facts: DetailFact[] = [];
  const push = (key: string, label: string, value: string | undefined, chip?: boolean) => {
    if (value !== undefined && value !== "") facts.push({ key, label, value, chip });
  };

  push("year", t("profile.detail.year"), copy?.year?.toString());
  push(
    "format",
    t("profile.detail.format"),
    copy?.format === undefined ? undefined : FORMAT_LABELS[copy.format],
  );
  push("media", t("profile.detail.media"), conditionCode(copy?.condition), true);
  push("sleeve", t("profile.detail.sleeve"), conditionCode(copy?.sleeveCondition), true);
  push(
    "paid",
    t("profile.detail.paid"),
    prices && copy?.pricePaidCents !== undefined && copy.currency !== undefined
      ? formatMoney(copy.pricePaidCents, copy.currency)
      : undefined,
  );
  const added = copy?.createdAt === undefined ? undefined : monthAndYear(copy.createdAt, language);
  push("added", t("profile.detail.added"), added);

  // 23e: two columns hold four cells at 390px, so the conditions share a line and the date
  // moves under the rule into the footer.
  const conditions = [conditionCode(copy?.condition), conditionCode(copy?.sleeveCondition)]
    .filter((code) => code !== undefined)
    .join(" · ");
  const phoneFacts = facts.filter((fact) => !["media", "sleeve", "added"].includes(fact.key));
  if (conditions !== "")
    phoneFacts.splice(2, 0, {
      key: "conditions",
      label: t("profile.detail.mediaSleeve"),
      value: conditions,
      chip: true,
    });

  return {
    title: copy?.title ?? "",
    artistName: copy?.artistName ?? "",
    art: (
      <ReleaseArt
        release={{ coverArtUrl: copy?.coverArtUrl ?? null, format: copy?.format }}
        format={copy?.format}
        previewSrc={copy?.id === undefined ? null : (photos.get(copy.id) ?? null)}
        variant="bleed"
        loading="eager"
      />
    ),
    facts,
    phoneFacts,
    phoneFootnote: added === undefined ? undefined : t("profile.detail.addedOn", { when: added }),
    note: prices ? t("profile.detail.ownerCopy", { name: owner }) : t("profile.detail.hidden"),
  };
}

/** The same sheet with less in it (23c): a wish knows four things and one of them is a hope. */
function wishDetail(
  wish: SharedWishDto | undefined,
  covers: ReadonlyMap<string, string | null>,
  t: TFunction,
): SharedDetailItem {
  const facts: DetailFact[] = [];
  if (wish?.year !== undefined)
    facts.push({ key: "year", label: t("profile.detail.year"), value: wish.year.toString() });
  if (wish?.desiredFormat !== undefined)
    facts.push({
      key: "lookingFor",
      label: t("profile.detail.lookingFor"),
      value: FORMAT_LABELS[wishFormat(wish)],
    });

  return {
    eyebrow: t("profile.detail.wishlist"),
    title: wish?.title ?? "",
    artistName: wish?.artistName ?? "",
    art: (
      <ReleaseArt
        release={{
          coverArtUrl: wish?.albumId === undefined ? null : (covers.get(wish.albumId) ?? null),
        }}
        format={wish === undefined ? "OTHER" : wishFormat(wish)}
        variant="bleed"
        loading="eager"
      />
    ),
    facts,
    phoneFacts: facts,
    note: t("profile.detail.notOwned"),
  };
}

/**
 * The short code for a condition that crossed the wire as a plain string.
 *
 * Checked rather than cast, for the same reason `wishFormat` is: a grade these clients do
 * not know must leave the field out instead of printing `undefined` in a chip.
 */
function conditionCode(condition: string | undefined): string | undefined {
  return condition !== undefined && condition in CONDITION_SHORT
    ? CONDITION_SHORT[condition as Condition]
    : undefined;
}

/** "March 2024" — the resolution an added-on date is worth on somebody else's shelf. */
function monthAndYear(epochMillis: number, language: string): string {
  return new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(
    new Date(epochMillis),
  );
}

function TabButton({
  active,
  onClick,
  children,
}: { readonly active: boolean; readonly onClick: () => void; readonly children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink"
          : "rounded-md px-3 py-1.5 text-[12.5px] font-medium text-ink-muted hover:text-ink"
      }
    >
      {children}
    </button>
  );
}

/** 15d on the web: the shelf is described, not shown, and the number is the invitation. */
function LockedShelf({ logic, tab }: { readonly logic: Logic; readonly tab: ProfileTab }) {
  const { t } = useTranslation();
  const person = logic.person;
  const name = person?.displayName ?? person?.handle ?? "";
  const count = tab === "collection" ? (person?.copyCount ?? 0) : (person?.wishlistCount ?? 0);

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink-muted">
        <Lock size={17} strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-[14px] font-medium text-ink">{t("profile.locked.title")}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
        {t("profile.locked.body", { name, count })}
      </p>
    </div>
  );
}

function RelationshipAction({ logic }: { readonly logic: Logic }) {
  const { t } = useTranslation();
  const person = logic.person;

  if (!logic.signedIn) {
    return (
      <Link to="/signin" className="flex-none">
        <Button className="h-9 rounded-lg px-3.5 text-[12.5px]">
          <UserPlus size={15} strokeWidth={1.75} aria-hidden />
          {t("profile.signInToAsk")}
        </Button>
      </Link>
    );
  }

  switch (person?.relationship) {
    case "SELF":
      return null;
    case "FRIENDS":
      return (
        <span className="flex flex-none items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-[12px] font-medium text-ink-muted">
          <UserCheck size={14} strokeWidth={1.75} aria-hidden />
          {t("friends.state.friends")}
        </span>
      );
    case "REQUEST_SENT":
      return (
        <span className="flex-none rounded-lg px-3 py-2 text-[12px] text-ink-subtle">
          {t("friends.state.requested")}
        </span>
      );
    default:
      return (
        <Button
          onClick={() => logic.ask.mutate()}
          disabled={logic.ask.isPending}
          className="h-9 flex-none rounded-lg px-3.5 text-[12.5px]"
        >
          <UserPlus size={15} strokeWidth={1.75} aria-hidden />
          {t("profile.ask")}
        </Button>
      );
  }
}

function CollectionGrid({
  copies,
  photos,
  truncated,
  onOpen,
}: {
  readonly copies: readonly SharedCopyDto[];
  readonly photos: ReadonlyMap<string, string>;
  readonly truncated: boolean;
  readonly onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (copies.length === 0) {
    return <p className="mt-8 text-center text-[13px] text-ink-muted">{t("profile.emptyShelf")}</p>;
  }
  return (
    <>
      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {copies.map((copy) => (
          /*
           * A button rather than an article with a heading in it: every tile now opens
           * something, and the whole tile is the target — a title that could be clicked
           * while the sleeve above it could not would be the worst of both.
           */
          <button
            key={copy.id}
            type="button"
            disabled={copy.id === undefined}
            onClick={() => copy.id !== undefined && onOpen(copy.id)}
            className={cn(
              "group -m-2 block w-full cursor-pointer rounded-xl p-2 text-left",
              "transition-colors duration-(--mc-quick) hover:bg-surface focus-visible:outline-none",
            )}
          >
            {/* The square is the tile, not decoration: ReleaseArt fills its parent and
                FormatThumb places every part of the sleeve in percentages, so a box with
                no height collapses the artwork to a strip and the title lands on the row
                below. Same wrapper the library grid and the skeleton above both use. */}
            <div
              className={cn(
                "relative aspect-square rounded-lg transition-transform duration-(--mc-quick)",
                "group-hover:-translate-y-0.5",
                "group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper",
              )}
            >
              <ReleaseArt
                release={{ coverArtUrl: copy.coverArtUrl ?? null, format: copy.format }}
                format={copy.format}
                previewSrc={copy.id === undefined ? null : (photos.get(copy.id) ?? null)}
                loading="lazy"
              />
            </div>
            <span className="mt-2 block truncate text-[13px] font-medium text-ink">
              {copy.title}
            </span>
            <span className="block truncate text-[11.5px] text-ink-muted">
              {[
                copy.artistName,
                copy.format ? FORMAT_LABELS[copy.format] : undefined,
                copy.year?.toString(),
                copy.pricePaidCents !== undefined && copy.currency
                  ? formatMoney(copy.pricePaidCents, copy.currency)
                  : undefined,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </button>
        ))}
      </div>
      {truncated && (
        <p className="mt-6 text-center text-[11.5px] text-ink-subtle">{t("profile.truncated")}</p>
      )}
    </>
  );
}

function WishRows({
  wishes,
  covers,
  onOpen,
}: {
  readonly wishes: readonly SharedWishDto[];
  readonly covers: ReadonlyMap<string, string | null>;
  readonly onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (wishes.length === 0) {
    return (
      <p className="mt-8 text-center text-[13px] text-ink-muted">{t("profile.emptyWishlist")}</p>
    );
  }
  return (
    <ul className="mt-4 flex list-none flex-col gap-1 p-0">
      {wishes.map((wish) => (
        <li key={wish.id} className="odd:bg-surface rounded-lg">
          <button
            type="button"
            disabled={wish.id === undefined}
            onClick={() => wish.id !== undefined && onOpen(wish.id)}
            className={cn(
              "group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left",
              "transition-colors duration-(--mc-quick) hover:bg-ink/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-inset",
            )}
          >
            {/* The wanted format is the silhouette, not the artwork: an entry for the vinyl
                of a record they already have on CD should look like the thing being hunted.
                Same 44px thumb as the owner's own list, so the two read as one screen. */}
            <div className="h-11 w-11 flex-none">
              <ReleaseArt
                release={{
                  coverArtUrl:
                    wish.albumId === undefined ? null : (covers.get(wish.albumId) ?? null),
                }}
                format={wishFormat(wish)}
                loading="lazy"
              />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{wish.title}</span>
              <span className="block truncate text-[12px] text-ink-muted">{wish.artistName}</span>
            </span>
            <span className="flex-none font-mono text-[11px] uppercase tracking-[0.08em] text-ink-subtle">
              {wish.desiredFormat ?? ""}
            </span>
            {/* Only on the row being pointed at: eleven of these down the page would be a
                column of chevrons, and the list would stop being a list. */}
            <ChevronRight
              size={15}
              strokeWidth={1.75}
              aria-hidden
              className="flex-none text-ink-subtle opacity-0 transition-opacity duration-(--mc-quick) group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The silhouette to draw under a wish, when it named a format.
 *
 * Checked rather than cast: `desiredFormat` crosses the wire as a plain string, and a
 * value the clients do not know must land on the generic sleeve instead of indexing the
 * thumbnail table with nothing.
 */
function wishFormat(wish: SharedWishDto): Format {
  const desired = wish.desiredFormat;
  return desired !== undefined && desired in FORMAT_LABELS ? (desired as Format) : "OTHER";
}
