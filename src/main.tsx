import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "@/i18n/config";
import "@/styles.css";
import { assertMotionTokensMatchStyles } from "@/lib/motion";
import { StoreProvider } from "@/local/StoreProvider";
import { routeTree } from "@/routeTree.gen";
import { store } from "@/store";
import { SessionBootstrap } from "@/sync/SessionBootstrap";

// The motion values exist in two places — this app's stylesheet and the shared package —
// because a stylesheet cannot import TypeScript. In development, disagreeing about them is
// an error rather than something to notice months later in a screen recording.
if (import.meta.env.DEV) assertMotionTokensMatchStyles();

const router = createRouter({ routeTree });
const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("#root is missing from index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <StoreProvider>
          <SessionBootstrap>
            <RouterProvider router={router} />
          </SessionBootstrap>
        </StoreProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
