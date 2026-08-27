import { YouPage } from "@/features/you/YouPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/you")({
  component: YouPage,
});
