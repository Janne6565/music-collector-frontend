import { AppShell } from "@/components/layout/AppShell";
import { useLegalLanguage } from "@/features/legal/useLegalLanguage";
import { useStore } from "@/local/StoreProvider";
import {
  BINDING_LANGUAGE,
  LEGAL_DOCUMENTS,
  type LegalDocument,
  type LegalDocumentId,
  type LegalLanguage,
  legalDocument,
  sectionChip,
  sectionLabel,
} from "@janne6565/music-collector-shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Which URL segment stands for which document. German, because the documents are. */
export const LEGAL_SLUGS: Record<string, LegalDocumentId> = {
  impressum: "impressum",
  datenschutz: "privacy",
  nutzungsbedingungen: "terms",
};

const SLUG_OF: Record<LegalDocumentId, string> = {
  impressum: "impressum",
  privacy: "datenschutz",
  terms: "nutzungsbedingungen",
};

/**
 * Screen 17i — a document in a measured column, with the language switch and the other
 * documents in a rail beside it.
 *
 * It renders inside the ordinary app shell rather than in a bare page: these are reachable
 * from the sidebar footer, and dropping somebody out of the app to read the Impressum makes
 * going back an act of navigation instead of a click.
 */
export function LegalDocumentPage({ documentId }: { readonly documentId: LegalDocumentId }) {
  const { store } = useStore();
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => store.stats() });
  const { language, choose } = useLegalLanguage();
  const document = legalDocument(documentId);

  return (
    <AppShell stats={stats.data}>
      <div className="min-h-0 flex-1 overflow-auto px-14 py-11">
        <div className="flex max-w-[960px] gap-14">
          <article className="min-w-0 flex-1 md:max-w-[620px]">
            <DocumentBody document={document} language={language} />
          </article>
          <aside className="hidden w-[196px] flex-none pt-[70px] lg:block">
            <LanguageSwitch language={language} onChoose={choose} />
            <DocumentList current={documentId} language={language} />
            <NoTrackingCard />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function DocumentBody({
  document,
  language,
}: {
  readonly document: LegalDocument;
  readonly language: LegalLanguage;
}) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {document.lede !== null && (
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-subtle">
          {document.lede[language]}
        </div>
      )}
      <h1 className="mt-3 font-serif text-[38px] leading-[1.1]">{document.title[language]}</h1>

      {/* A translation says so at the top, not in a footnote. Somebody quoting the English
          in a dispute should have been told, on the page they read it, that it is not the
          text that binds. */}
      {language !== BINDING_LANGUAGE && (
        <p className="mt-5 rounded-xl bg-ink/5 px-3.5 py-3 text-[11.5px] leading-[1.55] text-ink-muted">
          {t("legal.translationNotice")}
        </p>
      )}

      {document.summary !== null && (
        <p className="mt-5 rounded-xl bg-accent/[0.07] px-3.5 py-3 text-[12.5px] leading-[1.6] text-ink/70">
          {document.summary[language]}
        </p>
      )}

      {/* The jump list only earns its space on a document long enough to get lost in. */}
      {document.numbered && (
        <nav className="mt-5 flex flex-wrap gap-1.5">
          {document.sections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-ink/15 px-2.5 py-[5px] font-mono text-[10.5px] text-ink-muted transition-colors duration-(--mc-quick) hover:border-ink/30 hover:text-ink"
            >
              {sectionChip(document, index, language)}
            </a>
          ))}
        </nav>
      )}

      {document.sections.map((section, index) => (
        <section key={section.id} id={section.id} className="scroll-mt-6">
          <h2 className="mt-8 font-serif text-[21px] leading-[1.25]">
            {sectionLabel(document, index, language)}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph[language]}
              // Pre-line rather than a split into <br>: an address is one paragraph with
              // lines in it, and turning it into six paragraphs would space it like prose.
              className="mt-2 whitespace-pre-line text-[14px] leading-[1.75] text-ink/75 text-pretty"
            >
              {paragraph[language]}
            </p>
          ))}
        </section>
      ))}

      {document.closing !== null && (
        <p className="mt-6 rounded-xl border border-line bg-surface px-3.5 py-3 text-[12px] leading-[1.6] text-ink/65">
          {document.closing[language]}
        </p>
      )}

      <footer className="mt-9 border-t border-line pt-4.5 text-[12px] text-ink-subtle">
        {t("legal.effective", {
          date: new Date(document.effective).toLocaleDateString(i18n.language, {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          version: document.version,
        })}
      </footer>
    </>
  );
}

function LanguageSwitch({
  language,
  onChoose,
}: {
  readonly language: LegalLanguage;
  readonly onChoose: (next: LegalLanguage) => void;
}) {
  const { t } = useTranslation();
  return (
    /* A fieldset rather than a div with role="group": the two buttons are one choice, and
       the legend is what a screen reader announces before reading "DE, EN". */
    <fieldset className="flex w-fit gap-1 rounded-[9px] bg-ink/[0.06] p-[3px]">
      <legend className="sr-only">{t("legal.documentLanguage")}</legend>
      {(["de", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChoose(option)}
          aria-pressed={language === option}
          className={`rounded-md px-2.5 py-[5px] font-mono text-[11px] font-semibold transition-colors duration-(--mc-quick) ${
            language === option ? "bg-surface text-ink" : "text-ink-subtle hover:text-ink"
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </fieldset>
  );
}

function DocumentList({
  current,
  language,
}: {
  readonly current: LegalDocumentId;
  readonly language: LegalLanguage;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="mt-6.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
        {t("legal.documents")}
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5">
        {LEGAL_DOCUMENTS.map((document) => (
          <Link
            key={document.id}
            to="/legal/$doc"
            params={{ doc: SLUG_OF[document.id] }}
            className={`text-[12.5px] transition-colors duration-(--mc-quick) hover:text-ink ${
              document.id === current ? "font-semibold text-ink" : "font-medium text-ink/55"
            }`}
          >
            {document.title[language]}
          </Link>
        ))}
        <Link
          to="/legal/data"
          className="text-[12.5px] font-medium text-ink/55 transition-colors duration-(--mc-quick) hover:text-ink"
        >
          {t("legal.yourData")}
        </Link>
      </div>
    </>
  );
}

/**
 * The one claim on these pages that is about the product rather than the law, and the
 * reason none of them has a cookie banner above it.
 */
function NoTrackingCard() {
  const { t } = useTranslation();
  return (
    <div className="mt-6.5 flex gap-2 rounded-xl border border-line bg-surface px-3.5 py-3.5">
      <ShieldCheck
        size={14}
        strokeWidth={1.75}
        aria-hidden
        className="mt-px flex-none text-ink-subtle"
      />
      <span className="text-[11.5px] leading-[1.6] text-ink-muted">{t("legal.noTracking")}</span>
    </div>
  );
}
