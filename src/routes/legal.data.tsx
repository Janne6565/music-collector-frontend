import { YourDataPage } from "@/features/legal/YourDataPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/data")({
  component: YourDataPage,
});
