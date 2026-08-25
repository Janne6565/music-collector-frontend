import { PublicProfilePage } from "@/features/friends/PublicProfilePage";
import { createFileRoute, notFound } from "@tanstack/react-router";

/** `/@somebody/wishlist` — the link the Sharing screen hands out. */
export const Route = createFileRoute("/$handle/wishlist")({
  beforeLoad: ({ params }) => {
    if (!params.handle.startsWith("@")) {
      throw notFound();
    }
  },
  component: PublicProfilePage,
});
