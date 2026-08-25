import { PublicProfilePage } from "@/features/friends/PublicProfilePage";
import { requirePublicHandle } from "@/features/friends/publicHandle";
import { createFileRoute } from "@tanstack/react-router";

/** `/@somebody` — the shelf, which is what the link is usually handed out for. */
export const Route = createFileRoute("/$handle/")({
  beforeLoad: ({ params }) => requirePublicHandle(params.handle),
  component: PublicCollection,
});

function PublicCollection() {
  const { handle } = Route.useParams();
  return <PublicProfilePage handle={handle} tab="collection" />;
}
