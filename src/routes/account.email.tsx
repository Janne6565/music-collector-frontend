import { ChangeEmailPage } from "@/features/account/ChangeEmailPage";
import { createFileRoute } from "@tanstack/react-router";

/**
 * `/account/email` — screen 21g.
 *
 * A sibling of `/account`, which is why that one is `account.index.tsx`: a flat
 * `account.tsx` beside `account.email.tsx` would silently become its layout, and without an
 * `<Outlet />` the child URL would render nothing at all.
 */
export const Route = createFileRoute("/account/email")({
  component: ChangeEmailPage,
});
