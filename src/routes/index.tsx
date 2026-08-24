import { Button } from "@/components/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-5 px-6">
      <h1 className="font-serif text-5xl leading-none">{t("app.name")}</h1>
      <p className="text-ink-muted">{t("app.tagline")}</p>
      <div>
        <Button variant="secondary">{t("nav.library")}</Button>
      </div>
    </main>
  );
}
