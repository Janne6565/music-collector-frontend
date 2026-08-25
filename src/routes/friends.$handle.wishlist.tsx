import { ProfilePage } from "@/features/friends/ProfilePage";
import { createFileRoute } from "@tanstack/react-router";

/** `/friends/somebody/wishlist` — the same page, the other tab, its own address. */
export const Route = createFileRoute("/friends/$handle/wishlist")({
  component: FriendWishlist,
});

function FriendWishlist() {
  const { handle } = Route.useParams();
  return <ProfilePage handle={handle} tab="wishlist" />;
}
