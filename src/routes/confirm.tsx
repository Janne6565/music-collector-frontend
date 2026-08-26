import { ConfirmEmailPage } from "@/features/auth/ConfirmEmailPage";
import { createFileRoute } from "@tanstack/react-router";

/**
 * `/confirm?token=…` — followed out of the confirmation mail, in whichever browser opened
 * it. Deliberately reachable signed out: the token is the whole proof, and demanding a
 * session first would break the common case of reading mail on a device the app is not on.
 */
export const Route = createFileRoute("/confirm")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ConfirmEmailPage,
});
