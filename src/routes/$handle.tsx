import { PublicProfilePage } from "@/features/friends/PublicProfilePage";
import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * The public link, `/@somebody`.
 *
 * A bare dynamic segment at the root would swallow every unknown path, so the `@` is
 * required here rather than merely conventional: without it a typo of `/wishlist` would
 * render a profile page for a collector called "wishlis". Static routes still win, and the
 * server keeps the app's own path segments off the handle register besides.
 */
export const Route = createFileRoute("/$handle")({
  beforeLoad: ({ params }) => {
    if (!params.handle.startsWith("@")) {
      throw notFound();
    }
  },
  component: PublicProfilePage,
});
