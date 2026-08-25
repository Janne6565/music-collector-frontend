import { UndoProvider } from "@/features/detail/UndoDelete";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    // Above the router on purpose: a delete happens on the detail page and immediately
    // returns to the library, so the six seconds in which it can be taken back have to
    // outlive the route that started them.
    <UndoProvider>
      <Outlet />
    </UndoProvider>
  ),
});
