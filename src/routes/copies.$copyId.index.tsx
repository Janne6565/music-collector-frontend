import { DetailPage } from "@/features/detail/DetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/copies/$copyId/")({
  component: CopyDetailRoute,
});

function CopyDetailRoute() {
  const { copyId } = Route.useParams();
  return <DetailPage copyId={copyId} />;
}
