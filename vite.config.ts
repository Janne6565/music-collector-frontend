import { URL, fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    // Same-origin in production (Traefik path-routes /api to the backend), so proxy
    // /api in dev too and keep the client's base URL relative everywhere.
    proxy: { "/api": "http://localhost:8080" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Git worktrees are checked out inside .claude/, and a nested checkout of this same
    // repo puts a second, older copy of every test in the glob — which then fails against
    // whatever the parent has since renamed. Only this tree's tests are this tree's.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**"],
  },
});
