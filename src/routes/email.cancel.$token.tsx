import { CancelEmailChangePage } from "@/features/auth/CancelEmailChangePage";
import { createFileRoute } from "@tanstack/react-router";

/** `/email/cancel/<token>` — the undo in the notice sent to an address being moved away from. */
export const Route = createFileRoute("/email/cancel/$token")({
  component: CancelEmailChangePage,
});
