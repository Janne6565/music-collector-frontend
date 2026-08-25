import type { SharedCopyDto, SharedWishDto } from "@/api/generated/musicCollectorAPI.schemas";
import { ReleaseArt } from "@/components/ReleaseArt";
import { AppShell } from "@/components/layout/AppShell";
import { Button, PulsingDots, Skeleton } from "@/components/ui";
import { formatMoney } from "@/features/detail/DetailPage";
import { Avatar } from "@/features/friends/Avatar";
import { useProfileLogic } from "@/features/friends/useProfileLogic";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { FORMAT_LABELS } from "@janne6565/music-collector-shared";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft, Lock, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 15h — a friend's collection, the same grid as your own library with the owner
 * named, and 15d's locked shelf when it is not open to you.
 */
export function ProfilePage() {
  const { handle } = useParams({ from: "/friends/$handle" });
  const stats = useCollectionStats();
  const logic = useProfileLogic(handle);

  return (
    <AppShell stats={stats}>
      <ProfileBody logic={logic} backTo="/friends" />
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
  backTo,
}: { readonly logic: Logic; readonly backTo?: string }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"collection" | "wishlist">("collection");
  const person = logic.person;

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
  const showing = tab === "collection" ? person.canSeeCollection : person.canSeeWishlist;

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
          <TabButton active={tab === "collection"} onClick={() => setTab("collection")}>
            {t("profile.tab.collection", { count: person.copyCount ?? 0 })}
          </TabButton>
          <TabButton active={tab === "wishlist"} onClick={() => setTab("wishlist")}>
            {t("profile.tab.wishlist", { count: person.wishlistCount ?? 0 })}
          </TabButton>
        </div>
        <span className="flex-none font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-subtle">
          {person.pricesVisible ? t("profile.readOnly") : t("profile.readOnlyNoPrices", { name })}
        </span>
      </div>

      {!showing ? (
        <LockedShelf logic={logic} tab={tab} />
      ) : logic.loadingLists ? (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
          {[0, 1, 2, 3, 4, 5].map((tile) => (
            <Skeleton key={tile} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : tab === "collection" ? (
        <CollectionGrid copies={logic.copies} truncated={logic.copiesTruncated} />
      ) : (
        <WishRows wishes={logic.wishes} />
      )}
    </div>
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
function LockedShelf({
  logic,
  tab,
}: { readonly logic: Logic; readonly tab: "collection" | "wishlist" }) {
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
  truncated,
}: { readonly copies: readonly SharedCopyDto[]; readonly truncated: boolean }) {
  const { t } = useTranslation();
  if (copies.length === 0) {
    return <p className="mt-8 text-center text-[13px] text-ink-muted">{t("profile.emptyShelf")}</p>;
  }
  return (
    <>
      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {copies.map((copy) => (
          <article key={copy.id}>
            <ReleaseArt
              release={{ coverArtUrl: copy.coverArtUrl ?? null, format: copy.format }}
              format={copy.format}
              className="w-full"
              loading="lazy"
            />
            <h3 className="mt-2 truncate text-[13px] font-medium text-ink">{copy.title}</h3>
            <p className="truncate text-[11.5px] text-ink-muted">
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
            </p>
          </article>
        ))}
      </div>
      {truncated && (
        <p className="mt-6 text-center text-[11.5px] text-ink-subtle">{t("profile.truncated")}</p>
      )}
    </>
  );
}

function WishRows({ wishes }: { readonly wishes: readonly SharedWishDto[] }) {
  const { t } = useTranslation();
  if (wishes.length === 0) {
    return (
      <p className="mt-8 text-center text-[13px] text-ink-muted">{t("profile.emptyWishlist")}</p>
    );
  }
  return (
    <ul className="mt-4 flex list-none flex-col gap-1 p-0">
      {wishes.map((wish) => (
        <li
          key={wish.id}
          className="flex items-baseline justify-between gap-4 rounded-lg px-3 py-2.5 odd:bg-surface"
        >
          <span className="min-w-0">
            <span className="text-[13px] font-medium text-ink">{wish.title}</span>
            <span className="ml-2 text-[12px] text-ink-muted">{wish.artistName}</span>
          </span>
          <span className="flex-none font-mono text-[11px] uppercase tracking-[0.08em] text-ink-subtle">
            {wish.desiredFormat ?? ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
