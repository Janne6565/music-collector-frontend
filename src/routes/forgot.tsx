import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/forgot")({
  component: ForgotPasswordPage,
});
