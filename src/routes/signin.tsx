import { SignInPage } from "@/features/auth/SignInPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});
