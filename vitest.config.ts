import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["packages/react-url-search-state/tests/setup.ts"],
    globals: true,
  },
});
