import { LibraryPage } from "@/features/library/LibraryPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LibraryPage,
});
