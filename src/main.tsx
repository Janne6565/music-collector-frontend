import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "@/i18n/config";
import "@/styles.css";
import { StoreProvider } from "@/local/StoreProvider";
import { routeTree } from "@/routeTree.gen";
import { store } from "@/store";
import { SessionBootstrap } from "@/sync/SessionBootstrap";

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
