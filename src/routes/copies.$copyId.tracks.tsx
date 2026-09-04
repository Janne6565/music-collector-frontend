import { TracklistPage } from "@/features/tracklist/TracklistPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/copies/$copyId/tracks")({
  component: CopyTracklistRoute,
});

function CopyTracklistRoute() {
  const { copyId } = Route.useParams();
  return <TracklistPage copyId={copyId} />;
}
