import { ProfilePage } from "@/features/friends/ProfilePage";
import { replacesHistory, validateWishSearch } from "@/features/friends/profileSearch";
import { createFileRoute } from "@tanstack/react-router";

/** `/friends/somebody/wishlist` — the same page, the other tab, its own address. */
export const Route = createFileRoute("/friends/$handle/wishlist")({
  validateSearch: validateWishSearch,
  component: FriendWishlist,
});

function FriendWishlist() {
  const { handle } = Route.useParams();
  const { wish } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProfilePage
      handle={handle}
      tab="wishlist"
      openId={wish}
      onOpen={(id) => void navigate({ search: { wish: id }, replace: replacesHistory(wish) })}
    />
  );
}
