import { StoragePage } from "@/features/account/StoragePage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/account/storage")({
  component: StoragePage,
});
