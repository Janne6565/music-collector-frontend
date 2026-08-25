import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { DeleteAccountDialog } from "@/features/legal/DeleteAccountDialog";
import { useYourDataLogic } from "@/features/legal/useYourDataLogic";
import { useStore } from "@/local/StoreProvider";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FileJson, Table } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 17g on the web — the rights, each next to the article that grants it.
 *
 * The articles are printed on purpose. Somebody who came here because a privacy policy told
 * them they had a right to something should be able to see that this is the button for it,
 * and "Export everything" alone does not say which of Art. 15 and Art. 20 it answers.
 */
export function YourDataPage() {
  const { t } = useTranslation();
  const { store } = useStore();
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => store.stats() });
  const logic = useYourDataLogic();
  const [confirming, setConfirming] = useState(false);

  return (
    <AppShell stats={stats.data}>
      <div className="min-h-0 flex-1 overflow-auto px-14 py-11">
        <div className="max-w-[620px]">
          <h1 className="font-serif text-[38px] leading-[1.1]">{t("legal.yourData")}</h1>
          <p className="mt-3 text-[13px] leading-[1.65] text-ink-muted text-pretty">
            {logic.signedIn ? t("legal.data.lede") : t("legal.data.ledeLocal")}
          </p>

          <Card title={t("legal.data.export.title")} article="ART. 15 · 20">
            <p className="mt-1 text-[11.5px] leading-[1.55] text-ink-muted">
              {logic.signedIn ? t("legal.data.export.body") : t("legal.data.export.bodyLocal")}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={logic.exportJson}
                loading={logic.exportingJson}
                className="h-[38px] flex-1 rounded-[9px] text-[12.5px]"
              >
                {!logic.exportingJson && <FileJson size={14} strokeWidth={1.9} aria-hidden />}
                JSON
              </Button>
              <Button
                variant="secondary"
                onClick={logic.exportCsv}
                loading={logic.exportingCsv}
                className="h-[38px] flex-1 rounded-[9px] text-[12.5px]"
              >
                {!logic.exportingCsv && <Table size={14} strokeWidth={1.9} aria-hidden />}
                CSV
              </Button>
            </div>
            <p className="mt-2.5 text-[11px] text-ink-subtle">
              {logic.exportJsonFailed ? t("legal.data.export.failed") : t("legal.data.export.hint")}
            </p>
          </Card>

          {logic.signedIn && (
            <>
              <Card title={t("legal.data.correct.title")} article="ART. 16">
                <p className="mt-1 text-[11.5px] leading-[1.55] text-ink-muted">
                  {t("legal.data.correct.body")}
                </p>
                <Link
                  to="/account"
                  className="mt-3 flex h-[38px] items-center justify-center rounded-[9px] border border-ink/15 bg-surface text-[12.5px] font-semibold transition-colors duration-(--mc-quick) hover:bg-canvas"
                >
                  {t("legal.data.correct.action")}
                </Link>
              </Card>

              <Card title={t("legal.data.withdraw.title")} article="ART. 7 (3)">
                <p className="mt-1 text-[11.5px] leading-[1.55] text-ink-muted">
                  {t("legal.data.withdraw.body")}
                </p>
                <Button
                  variant="secondary"
                  onClick={logic.makePrivate}
                  loading={logic.makingPrivate}
                  disabled={logic.alreadyPrivate}
                  className="mt-3 h-[38px] w-full rounded-[9px] text-[12.5px]"
                >
                  {t("legal.data.withdraw.action")}
                </Button>
                {logic.alreadyPrivate && (
                  // Said rather than left to the greyed-out button: "already off" and
                  // "not available" look identical, and only one of them is reassuring.
                  <p className="mt-2 text-[11px] text-ink-subtle">
                    {t("legal.data.withdraw.alreadyPrivate")}
                  </p>
                )}
              </Card>

              {/* Set apart rather than listed with the rest: it is the one action here that
                  cannot be undone, and the tinted panel is the deck's way of saying so. */}
              <div className="mt-5.5 rounded-xl bg-accent/[0.07] p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[13.5px] font-semibold text-accent-strong">
                    {t("legal.data.delete.title")}
                  </h2>
                  <span className="font-mono text-[9.5px] text-accent-strong/60">ART. 17</span>
                </div>
                <p className="mt-1 text-[11.5px] leading-[1.55] text-ink/60">
                  {t("legal.data.delete.body")}
                </p>
                {logic.deleteFailed && (
                  <p className="mt-1.5 text-[11.5px] text-accent">
                    {t("legal.data.delete.failed")}
                  </p>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setConfirming(true)}
                  className="mt-3 h-[38px] w-full rounded-[9px] border-[1.5px] border-accent-strong bg-surface text-[12.5px] text-accent-strong"
                >
                  {t("legal.data.delete.action")}
                </Button>
              </div>

              <p className="mt-3.5 text-[11.5px] leading-[1.6] text-ink-muted">
                {t("legal.data.otherRequests")}
              </p>
            </>
          )}
        </div>
      </div>

      {confirming && (
        <DeleteAccountDialog
          copyCount={stats.data?.copyCount}
          handle={logic.sharing?.handle ?? null}
          onExport={logic.exportJson}
          onConfirm={logic.deleteAccount}
          onCancel={() => setConfirming(false)}
          deleting={logic.deleting}
        />
      )}
    </AppShell>
  );
}

function Card({
  title,
  article,
  children,
}: {
  readonly title: string;
  readonly article: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="mt-4.5 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
        <span className="font-mono text-[9.5px] text-ink-subtle">{article}</span>
      </div>
      {children}
    </section>
  );
}
