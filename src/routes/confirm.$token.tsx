import { ConfirmEmailPage } from "@/features/auth/ConfirmEmailPage";
import { createFileRoute } from "@tanstack/react-router";

/**
 * `/confirm/<token>` — the other end of a confirmation link.
 *
 * A path segment rather than a query parameter because that is what the "arrived cut short"
 * state on 21d is about: some mail clients wrap a long line and drop what comes after, and a
 * token that is short is a truncation this page can name rather than a link it has to call
 * invalid.
 *
 * Deliberately reachable signed out: the link is followed in whichever browser opened the
 * mail — a work laptop, a preview pane — and the token is the whole proof.
 */
export const Route = createFileRoute("/confirm/$token")({
  component: ConfirmEmailPage,
});
