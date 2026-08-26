import { PublicProfilePage } from "@/features/friends/PublicProfilePage";
import { replacesHistory, validateWishSearch } from "@/features/friends/profileSearch";
import { requirePublicHandle } from "@/features/friends/publicHandle";
import { createFileRoute } from "@tanstack/react-router";

/** `/@somebody/wishlist` — the link the Sharing screen hands out. */
export const Route = createFileRoute("/$handle/wishlist")({
  beforeLoad: ({ params }) => requirePublicHandle(params.handle),
  validateSearch: validateWishSearch,
  component: PublicWishlist,
});

function PublicWishlist() {
  const { handle } = Route.useParams();
  const { wish } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <PublicProfilePage
      handle={handle}
      tab="wishlist"
      openId={wish}
      onOpen={(id) => void navigate({ search: { wish: id }, replace: replacesHistory(wish) })}
    />
  );
}
