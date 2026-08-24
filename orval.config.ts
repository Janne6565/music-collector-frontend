import { defineConfig } from "orval";

export default defineConfig({
  api: {
    // Requires the backend running locally (`mvn spring-boot:run`).
    input: "http://localhost:8080/v3/api-docs",
    output: {
      mode: "tags-split",
      target: "src/api/generated",
      client: "axios-functions",
      override: {
        mutator: { path: "./src/api/axios-instance.ts", name: "customInstance" },
      },
    },
  },
});
