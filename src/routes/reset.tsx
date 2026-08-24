import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reset")({
  // The link in the e-mail carries the one-time token.
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});
