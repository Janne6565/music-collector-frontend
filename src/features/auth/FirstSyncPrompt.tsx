import { Button } from "@/components/ui";
import { useFirstSyncLogic } from "@/features/auth/useFirstSyncLogic";
import { useTranslation } from "react-i18next";

export function FirstSyncPrompt() {
  const { t } = useTranslation();
  const logic = useFirstSyncLogic();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="font-serif text-3xl">{t("firstSync.title")}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t("firstSync.body", { local: logic.localCount, account: logic.accountCount })}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <Choice
          title={t("firstSync.merge.title")}
          body={t("firstSync.merge.body")}
          onClick={() => logic.choose("MERGE")}
          loading={logic.working === "MERGE"}
          disabled={logic.loading}
          primary
        />
        <Choice
          title={t("firstSync.keepLocal.title")}
          body={t("firstSync.keepLocal.body", { count: logic.accountCount })}
          onClick={() => logic.choose("KEEP_LOCAL")}
          loading={logic.working === "KEEP_LOCAL"}
          disabled={logic.loading}
        />
        <Choice
          title={t("firstSync.keepAccount.title")}
          body={t("firstSync.keepAccount.body", { count: logic.localCount })}
          onClick={() => logic.choose("KEEP_ACCOUNT")}
          loading={logic.working === "KEEP_ACCOUNT"}
          disabled={logic.loading}
        />
      </div>

      {logic.failed && <p className="text-sm text-accent">{t("firstSync.failed")}</p>}
    </main>
  );
}

interface ChoiceProps {
  readonly title: string;
  readonly body: string;
  readonly onClick: () => void;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly primary?: boolean;
}

function Choice({ title, body, onClick, loading, disabled, primary = false }: ChoiceProps) {
  return (
    <Button
      variant={primary ? "primary" : "secondary"}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      className="h-auto flex-col items-start gap-1 rounded-xl px-4 py-3.5 text-left"
    >
      <span className="text-sm font-semibold">{title}</span>
      <span
        className={
          primary ? "text-xs font-normal opacity-80" : "text-xs font-normal text-ink-muted"
        }
      >
        {body}
      </span>
    </Button>
  );
}
