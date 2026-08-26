import { PublicProfilePage } from "@/features/friends/PublicProfilePage";
import { replacesHistory, validateCopySearch } from "@/features/friends/profileSearch";
import { requirePublicHandle } from "@/features/friends/publicHandle";
import { createFileRoute } from "@tanstack/react-router";

/** `/@somebody` — the shelf, which is what the link is usually handed out for. */
export const Route = createFileRoute("/$handle/")({
  beforeLoad: ({ params }) => requirePublicHandle(params.handle),
  validateSearch: validateCopySearch,
  component: PublicCollection,
});

function PublicCollection() {
  const { handle } = Route.useParams();
  const { copy } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <PublicProfilePage
      handle={handle}
      tab="collection"
      openId={copy}
      onOpen={(id) => void navigate({ search: { copy: id }, replace: replacesHistory(copy) })}
    />
  );
}
