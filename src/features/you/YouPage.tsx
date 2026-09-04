import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { AppRow } from "@/features/app/AppRow";
import { useYouLogic } from "@/features/you/useYouLogic";
import { cn } from "@/lib/utils";
import type { CollectionStats } from "@janne6565/rekordo-shared";
import { FORMAT_LABELS } from "@janne6565/rekordo-shared";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * The phone's fourth tab — screen 24a.
 *
 * Everything the sidebar carried below its three links: who this is, how big the shelf is,
 * how it splits by format, and the menu that used to open out of the footer. On a desktop
 * this route is reachable but unremarkable — the sidebar beside it already says all of it,
 * which is why the page has no width of its own and simply sits in the content column.
 *
 * The format counts are the one thing that moved rather than being copied. In the sidebar
 * they were navigation *and* statistics at once; here they are only statistics, and the
 * way to see nothing but CDs is the filter chips on the library (24a).
 */
export function YouPage() {
  const { t } = useTranslation();
  const logic = useYouLogic();

  return (
    <AppShell stats={logic.stats}>
      <div className="min-h-0 flex-1 overflow-auto px-4 pt-5 pb-8 sm:px-7 sm:pt-6">
        <div className="max-w-[560px]">
          <h1 className="font-serif text-2xl leading-tight">{t("you.title")}</h1>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            <Identity {...logic} />
          </p>

          {logic.stats !== undefined && <FormatStats stats={logic.stats} />}

          {/* 25a: where the banner's offer goes to live. Above the account block, because
              it is the one row on this page that is not about this account. */}
          <AppRow />

          {logic.status === "anonymous" ? (
            <GuestBlock copyCount={logic.stats?.copyCount} />
          ) : (
            <AccountBlock signOut={logic.signOut} signingOut={logic.signingOut} />
          )}

          {logic.lastSyncedAt !== null && (
            <div className="mt-3.5 flex items-center gap-[7px] text-[11.5px] text-ink-subtle">
              <Check size={13} strokeWidth={2.4} className="flex-none" aria-hidden />
              {t("settings.sync.lastSynced", {
                when: new Date(logic.lastSyncedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/** "@jonasw · 240 Exemplare" — or as much of it as is true. */
function Identity({
  handle,
  name,
  email,
  stats,
}: {
  readonly handle: string | null;
  readonly name: string | null;
  readonly email: string | null;
  readonly stats: CollectionStats | undefined;
}) {
  const { t } = useTranslation();
  const who = handle !== null ? `@${handle}` : (name ?? email);
  const many = stats === undefined ? null : t("you.copies", { count: stats.copyCount });
  return <>{[who, many].filter((part) => part !== null && part !== "").join(" · ")}</>;
}

/** The sidebar's format list, as four cards. Statistics here, and only statistics. */
function FormatStats({ stats }: { readonly stats: CollectionStats }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {(["VINYL", "CD", "CASSETTE", "DIGITAL"] as const).map((format) => (
        <div key={format} className="rounded-[10px] border border-line bg-surface px-3.25 py-3">
          <div className="font-mono text-[26px] leading-none font-medium">
            {stats.byFormat[format]}
          </div>
          <div className="mt-1.25 text-[10.5px] font-medium tracking-[0.04em] text-ink-subtle uppercase">
            {FORMAT_LABELS[format]}
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountBlock({
  signOut,
  signingOut,
}: {
  readonly signOut: () => void;
  readonly signingOut: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("you.section.account")}</SectionLabel>
      <Card>
        <MenuLink to="/account">{t("account.title")}</MenuLink>
        {/* 25a draws the allowance as a row of its own here, because it is the one number
            on this tab somebody comes looking for rather than stumbles into. */}
        <MenuLink to="/account/storage">{t("account.storage.pageTitle")}</MenuLink>
        <MenuLink to="/settings">{t("nav.settings")}</MenuLink>
        <MenuLink to="/settings/notifications">{t("notifications.title")}</MenuLink>
        {/* Where the export lives — the archive, both CSVs and the deletion request. The
            deck calls this row "Import & Export"; there is no import yet, so it carries
            the name of the screen it actually opens. */}
        <MenuLink to="/legal/data">{t("legal.yourData")}</MenuLink>
        <MenuLink to="/legal/$doc" params={{ doc: "datenschutz" }}>
          {t("legal.section")}
        </MenuLink>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className={cn(rowClassName, "w-full text-left text-accent disabled:opacity-50")}
        >
          {t("auth.signOut")}
        </button>
      </Card>
    </>
  );
}

/**
 * The guest's version of the block.
 *
 * The sidebar said this in its footer and it is no less important here: without an account
 * the collection is on this device and nowhere else. Settings and the legal documents stay
 * reachable — neither needs an account, and hiding them would make the tab an advert.
 */
function GuestBlock({ copyCount }: { readonly copyCount: number | undefined }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("you.section.account")}</SectionLabel>
      <div className="mt-1.75 rounded-[10px] border border-line bg-surface p-3.5">
        <div className="text-[13px] font-semibold">{t("account.guest.title")}</div>
        <p className="mt-1.5 text-[12px] leading-normal text-ink-muted">
          {copyCount === undefined
            ? t("account.guest.bodyUnknown")
            : t("account.guest.body", { count: copyCount })}
        </p>
        <Link to="/signin" className="mt-3 block">
          <Button className="h-11 w-full rounded-[10px] text-[13.5px]">
            {t("account.guest.action")}
          </Button>
        </Link>
      </div>
      <Card>
        <MenuLink to="/settings">{t("nav.settings")}</MenuLink>
        <MenuLink to="/legal/data">{t("legal.yourData")}</MenuLink>
        <MenuLink to="/legal/$doc" params={{ doc: "datenschutz" }}>
          {t("legal.section")}
        </MenuLink>
      </Card>
    </>
  );
}

function SectionLabel({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mt-4.5 font-mono text-[10px] tracking-[0.1em] text-ink-subtle uppercase">
      {children}
    </div>
  );
}

function Card({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mt-1.75 overflow-hidden rounded-[10px] border border-line bg-surface">
      {children}
    </div>
  );
}

/** 50px, which is above the 44px floor and below the 52px a row with a subtitle needs. */
const rowClassName =
  "flex h-[50px] items-center justify-between gap-3 px-3.5 text-sm font-medium " +
  "border-b border-line last:border-b-0 transition-colors duration-(--mc-quick) hover:bg-canvas";

function MenuLink({
  to,
  params,
  children,
}: {
  readonly to: string;
  readonly params?: Record<string, string>;
  readonly children: ReactNode;
}) {
  return (
    <Link to={to} params={params} className={rowClassName}>
      <span className="min-w-0 truncate">{children}</span>
      <ChevronRight size={17} className="flex-none text-ink-subtle" aria-hidden />
    </Link>
  );
}
