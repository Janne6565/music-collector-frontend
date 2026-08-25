import { AppShell } from "@/components/layout/AppShell";
import { Button, Toggle, buttonClassName } from "@/components/ui";
import { formatRelativeTime } from "@/domain/relativeTime";
import { useAccountLogic } from "@/features/account/useAccountLogic";
import { SharingPanel } from "@/features/friends/SharingPanel";
import { Link, Navigate } from "@tanstack/react-router";
import {
  ChevronRight,
  FileDown,
  FileText,
  HardDrive,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

/** Screen 7a — reached by clicking your name in the sidebar footer. */
export function AccountPage() {
  const { t, i18n } = useTranslation();
  const logic = useAccountLogic();

  // Nothing on this page means anything without an account, and a signed-out person who
  // lands here wanted the sign-in screen.
  if (logic.status === "anonymous") return <Navigate to="/signin" />;

  return (
    <AppShell stats={logic.stats}>
      <header className="flex flex-none items-center justify-between border-b border-line px-8 py-4">
        <span className="text-[12.5px] font-medium text-ink-muted">{t("account.title")}</span>
        <Button
          variant="secondary"
          onClick={logic.signOut}
          loading={logic.signingOut}
          className="h-[34px] rounded-lg px-3.5 text-[12.5px]"
        >
          {!logic.signingOut && <LogOut size={14} strokeWidth={1.75} aria-hidden />}
          {t("auth.signOut")}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-8 pt-8 pb-10">
        <div className="max-w-[720px]">
          <div className="flex items-center gap-[18px]">
            <div className="h-[76px] w-[76px] flex-none rounded-full bg-canvas shadow-[inset_0_0_0_1px_rgba(25,23,19,.08)]" />
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-[32px] leading-[1.05]">{logic.name}</h1>
              <p className="mt-1.5 text-[13.5px] text-ink-muted">
                {logic.email}
                {logic.memberSince !== null &&
                  ` · ${t("account.since", { year: new Date(logic.memberSince).getFullYear() })}`}
              </p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-4 gap-3">
            <Stat value={logic.stats?.copyCount ?? "—"} label={t("account.stat.copies")} />
            <Stat
              value={logic.stats?.releaseGroupCount ?? "—"}
              label={t("account.stat.releases")}
            />
            <Stat
              value={money(logic.stats?.totalSpentCents, i18n.language)}
              label={t("account.stat.spent")}
            />
            <Stat
              value={money(logic.stats?.averageSpentCents, i18n.language)}
              label={t("account.stat.average")}
            />
          </div>

          <SectionTitle>{t("account.section.profile")}</SectionTitle>
          <Card>
            <NameRow
              value={logic.nameDraft}
              onChange={logic.editName}
              onSave={logic.saveName}
              changed={logic.nameChanged}
              saving={logic.savingName}
              failed={logic.renameFailed}
            />
          </Card>

          <SectionTitle>{t("account.section.signIn")}</SectionTitle>
          <Card>
            <Row title={t("auth.email")} body={logic.email ?? ""} />
            <Row title={t("auth.password")} body={t("account.passwordBody")} />
          </Card>

          <SectionTitle>{t("account.section.storage")}</SectionTitle>
          <Card>
            <Row
              icon={<RefreshCw size={16} strokeWidth={1.75} aria-hidden />}
              title={t("account.sync.title")}
              body={
                logic.lastSyncedAt === null
                  ? t("account.sync.never")
                  : t("account.sync.last", {
                      when: formatRelativeTime(logic.lastSyncedAt, i18n.language),
                    })
              }
              trailing={
                <Toggle
                  checked={logic.syncEnabled}
                  onChange={logic.setSyncEnabled}
                  label={t("account.sync.title")}
                />
              }
            />
            <Row
              icon={<HardDrive size={16} strokeWidth={1.75} aria-hidden />}
              title={t("account.local.title")}
              body={t("account.local.body")}
              trailing={
                // Fixed on, and honest about it. Every screen in the app reads from the
                // local store, so a switch that turned it off would break reading rather
                // than change where data lives.
                <Toggle
                  checked
                  label={t("account.local.title")}
                  disabledReason={t("account.local.always")}
                />
              }
            />
            <Row
              icon={<FileDown size={16} strokeWidth={1.75} aria-hidden />}
              title={t("account.export.title")}
              body={t("account.export.body")}
              trailing={
                <Button
                  variant="secondary"
                  onClick={logic.exportCsv}
                  loading={logic.exporting}
                  className="h-[30px] rounded-md px-3 text-xs"
                >
                  {t("account.export.action")}
                </Button>
              }
            />
          </Card>

          {/* Sharing sits with the account rather than with Friends: it is a decision about
              this account, and somebody looking for "who can see my collection" looks here
              first. It draws nothing until a handle exists to configure it for. */}
          <div className="mt-7 rounded-xl border border-line bg-surface p-5">
            <SharingPanel />
          </div>

          <SectionTitle>{t("account.section.legal")}</SectionTitle>
          <Card>
            <LinkRow
              to="/legal/data"
              icon={<ShieldCheck size={16} strokeWidth={1.75} aria-hidden />}
              title={t("legal.yourData")}
              body={t("account.legal.dataBody")}
            />
            <LinkRow
              to="/legal/$doc"
              params={{ doc: "datenschutz" }}
              icon={<FileText size={16} strokeWidth={1.75} aria-hidden />}
              title={t("legal.privacy")}
              body={t("account.legal.documentsBody")}
            />
          </Card>

          {/* Deletion lives on Your data with the rest of the DSGVO actions and behind the
              typed confirmation. Two ways to delete an account is one too many, and the one
              that asked less would be the one somebody hit by accident. */}
          <div className="mt-7 flex items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <div>
              <div className="text-[13px] font-semibold text-accent-strong">
                {t("account.delete.title")}
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">{t("account.delete.body")}</p>
            </div>
            <Link
              to="/legal/data"
              className={buttonClassName(
                "secondary",
                "h-[30px] flex-none rounded-md border-accent/40 bg-transparent px-3 text-xs text-accent-strong",
              )}
            >
              {t("account.delete.action")}
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

interface NameRowProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly onSave: () => void;
  readonly changed: boolean;
  readonly saving: boolean;
  readonly failed: boolean;
}

/**
 * The one thing on this screen that is written back to the server.
 *
 * A row rather than a dialog: the name is a single short field, and the account screen is
 * already the place it is read from. It is a real form, so Enter saves — the button beside
 * it stays disabled until the name would actually change, which is also what says whether
 * the last edit has been saved.
 */
function NameRow({ value, onChange, onSave, changed, saving, failed }: NameRowProps) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <form
      className="flex items-center justify-between gap-4 px-4 py-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (changed) onSave();
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex-none text-ink-subtle">
          <UserRound size={16} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <label htmlFor={id} className="text-[13px] font-semibold">
            {t("account.name.title")}
          </label>
          <div className={`text-[11.5px] ${failed ? "text-accent" : "text-ink-muted"}`}>
            {failed ? t("account.name.failed") : t("account.name.body")}
          </div>
        </div>
      </div>
      <div className="flex flex-none items-center gap-2">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={120}
          autoComplete="name"
          placeholder={t("account.name.placeholder")}
          className="h-[30px] w-[180px] rounded-md border border-line bg-paper px-2.5 text-[12.5px] outline-none placeholder:text-ink-subtle focus:border-ink"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={!changed}
          loading={saving}
          className="h-[30px] rounded-md px-3 text-xs"
        >
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

function SectionTitle({ children }: { readonly children: ReactNode }) {
  return (
    <h2 className="mt-8 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
      {children}
    </h2>
  );
}

function Card({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface">
      {children}
    </div>
  );
}

interface RowProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly body: string;
  readonly trailing?: ReactNode;
}

function Row({ icon, title, body, trailing }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon !== undefined && <span className="flex-none text-ink-subtle">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="truncate text-[11.5px] text-ink-muted">{body}</div>
        </div>
      </div>
      {trailing}
    </div>
  );
}

interface LinkRowProps {
  readonly to: string;
  readonly params?: Record<string, string>;
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: string;
}

/** A {@link Row} that goes somewhere, so the whole row is the target rather than a word in it. */
function LinkRow({ to, params, icon, title, body }: LinkRowProps) {
  return (
    <Link
      to={to}
      params={params}
      className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 no-underline transition-colors duration-(--mc-quick) last:border-b-0 hover:bg-canvas"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex-none text-ink-subtle">{icon}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="truncate text-[11.5px] text-ink-muted">{body}</div>
        </div>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="flex-none text-ink-subtle"
      />
    </Link>
  );
}

function Stat({
  value,
  label,
}: {
  readonly value: number | string;
  readonly label: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3.5">
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}

/** Whole euros: the deck shows "€3,120", and the cents are noise at this size. */
function money(cents: number | undefined, language: string): string {
  if (cents === undefined) return "—";
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
