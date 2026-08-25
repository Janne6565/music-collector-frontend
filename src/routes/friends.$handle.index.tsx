import { ProfilePage } from "@/features/friends/ProfilePage";
import { createFileRoute } from "@tanstack/react-router";

/**
 * `/friends/somebody` — their shelf.
 *
 * A sibling of the wishlist route rather than its parent: a flat `friends.$handle.tsx`
 * would make this page the layout of the tab beside it, and a layout that renders no
 * `<Outlet />` swallows its child whole.
 */
export const Route = createFileRoute("/friends/$handle/")({
  component: FriendCollection,
});

function FriendCollection() {
  const { handle } = Route.useParams();
  return <ProfilePage handle={handle} tab="collection" />;
}
