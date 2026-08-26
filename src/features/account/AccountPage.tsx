import { AppShell } from "@/components/layout/AppShell";
import { Card, LinkRow, Row, SectionTitle } from "@/components/rows";
import { Button, buttonClassName } from "@/components/ui";
import { formatMoney } from "@/domain/currency";
import { useAccountLogic } from "@/features/account/useAccountLogic";
import { useCollectionSpend } from "@/features/account/useCollectionSpend";
import { SharingPanel } from "@/features/friends/SharingPanel";
import { Link, Navigate } from "@tanstack/react-router";
import {
  FileArchive,
  FileDown,
  FileText,
  Info,
  LogOut,
  MailWarning,
  Settings as SettingsIcon,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/** Screen 7a — reached by clicking your name in the sidebar footer. */
export function AccountPage() {
  const { t, i18n } = useTranslation();
  const logic = useAccountLogic();
  const spend = useCollectionSpend();

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
              value={
                spend.length === 0
                  ? "—"
                  : spend
                      .map((entry) => formatMoney(entry.totalCents, entry.currency, i18n.language))
                      .join(" + ")
              }
              label={
                spend.length === 1
                  ? t("account.stat.spentIn", { currency: spend[0].currency })
                  : t("account.stat.spent")
              }
            />
            <Stat
              value={
                spend.length === 0
                  ? "—"
                  : spend
                      .map((entry) =>
                        formatMoney(
                          Math.round(entry.totalCents / entry.copies),
                          entry.currency,
                          i18n.language,
                        ),
                      )
                      .join(" · ")
              }
              label={
                spend.length === 1
                  ? t("account.stat.averageIn", { currency: spend[0].currency })
                  : t("account.stat.average")
              }
            />
          </div>
          {/* Never converted, so nothing here depends on an exchange rate — which is the
              whole reason the total splits instead of adding up (20d). */}
          {spend.length > 1 && (
            <p className="mt-2.5 flex items-start gap-2 px-0.5 text-[11.5px] leading-relaxed text-ink-subtle">
              <Info size={13} strokeWidth={1.75} aria-hidden className="mt-0.5 flex-none" />
              <span>
                {spend
                  .map((entry) =>
                    t("account.stat.mixedPart", {
                      count: entry.copies,
                      currency: entry.currency,
                    }),
                  )
                  .join(", ")}
                . {t("account.stat.mixedNote")}
              </span>
            </p>
          )}

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
            {/* Only while there is something to do about it. A permanent "confirmed" row
                would be a badge for the ordinary state, which is not news. */}
            {!logic.emailConfirmed && (
              <Row
                icon={<MailWarning size={16} strokeWidth={1.75} aria-hidden />}
                title={t("account.confirmEmail.title")}
                body={t("account.confirmEmail.body")}
                trailing={
                  <Button
                    variant="secondary"
                    onClick={logic.resendConfirmation}
                    loading={logic.resendingConfirmation}
                    disabled={logic.confirmationSent}
                    className="h-[34px] flex-none rounded-lg px-3.5 text-[12.5px]"
                  >
                    {logic.confirmationSent
                      ? t("account.confirmEmail.sent")
                      : t("account.confirmEmail.send")}
                  </Button>
                }
              />
            )}
            <Row title={t("auth.password")} body={t("account.passwordBody")} />
          </Card>

          <SectionTitle>{t("account.section.storage")}</SectionTitle>
          <Card>
            {/* 20f: the two device toggles moved to Settings, because they describe this
                browser rather than the account. One pointer row replaces them, so the sync
                switch stays findable from the page people already know it by — and it is
                the only thing left on Account that mentions a device at all. */}
            <LinkRow
              to="/settings"
              icon={<SettingsIcon size={16} strokeWidth={1.75} aria-hidden />}
              title={t("account.deviceSettings.title")}
              body={t("account.deviceSettings.body")}
            />
            {/* Two files, not one. The collection and the wishlist are different shapes —
                a copy has a price, a condition and a pressing; a wish has an album and a
                format — and a single sheet with half its columns blank on every other row
                is a sheet no spreadsheet can pivot. */}
            <Row
              icon={<FileDown size={16} strokeWidth={1.75} aria-hidden />}
              title={t("account.export.library.title")}
              body={t("account.export.library.body")}
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
            <Row
              icon={<FileDown size={16} strokeWidth={1.75} aria-hidden />}
              title={t("account.export.wishlist.title")}
              body={t("account.export.wishlist.body")}
              trailing={
                <Button
                  variant="secondary"
                  onClick={logic.exportWishlistCsv}
                  loading={logic.exportingWishlist}
                  className="h-[30px] rounded-md px-3 text-xs"
                >
                  {t("account.export.action")}
                </Button>
              }
            />
            {/* The archive is a third row rather than a second button on the first: it is
                not another way to export the collection, it is a different promise — the
                whole shelf, photographs and identities included, in a file that reads back
                in as the same records rather than as copies of them. */}
            <Row
              icon={<FileArchive size={16} strokeWidth={1.75} aria-hidden />}
              title={t("account.export.archive.title")}
              body={
                logic.archiveResult === undefined
                  ? t("account.export.archive.body")
                  : t("account.export.archive.done", {
                      copies: logic.archiveResult.copies,
                      photos: logic.archiveResult.photos,
                    })
              }
              trailing={
                <Button
                  variant="secondary"
                  onClick={logic.exportArchive}
                  loading={logic.exportingArchive}
                  className="h-[30px] rounded-md px-3 text-xs"
                >
                  {t("account.export.action")}
                </Button>
              }
            />
          </Card>

          {/* Sharing sits with the account rather than with Friends: it is a decision about
              this account, and somebody looking for "who can see my collection" looks here
              first. It draws its own card, because until a handle exists there is only a
              sentence to show and a wrapper here would frame an empty box. */}
          <SharingPanel />

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

/** A {@link Row} that goes somewhere, so the whole row is the target rather than a word in it. */

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
