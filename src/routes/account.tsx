import { AccountPage } from "@/features/account/AccountPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});
