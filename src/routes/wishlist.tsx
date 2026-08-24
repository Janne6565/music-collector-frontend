import { WishlistPage } from "@/features/wishlist/WishlistPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});
