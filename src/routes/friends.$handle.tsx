import { ProfilePage } from "@/features/friends/ProfilePage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/friends/$handle")({
  component: ProfilePage,
});
