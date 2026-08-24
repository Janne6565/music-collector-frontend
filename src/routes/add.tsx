import { AddPage } from "@/features/add/AddPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/add")({
  component: AddPage,
});
