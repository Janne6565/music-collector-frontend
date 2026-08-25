import { LEGAL_SLUGS, LegalDocumentPage } from "@/features/legal/LegalDocumentPage";
import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * `/legal/impressum`, `/legal/datenschutz`, `/legal/nutzungsbedingungen`.
 *
 * German slugs whichever language the document is read in: the URL is what gets linked to
 * from outside the app and printed next to an address, and a link that changes with a
 * device preference is a link that breaks.
 */
export const Route = createFileRoute("/legal/$doc")({
  beforeLoad: ({ params }) => {
    if (!(params.doc in LEGAL_SLUGS)) {
      throw notFound();
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { doc } = Route.useParams();
  return <LegalDocumentPage documentId={LEGAL_SLUGS[doc]} />;
}
