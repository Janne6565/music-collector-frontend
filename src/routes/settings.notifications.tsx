import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { createFileRoute } from "@tanstack/react-router";

/**
 * `/settings/notifications` — screen 22a.
 *
 * A sibling of `/settings`, which is why that one is `settings.index.tsx`: a flat
 * `settings.tsx` beside this file would silently become its layout, and without an
 * `<Outlet />` the child URL would render nothing.
 */
export const Route = createFileRoute("/settings/notifications")({
  component: NotificationsPage,
});
