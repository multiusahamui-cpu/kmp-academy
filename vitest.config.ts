import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    isolate: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@shared": new URL("./shared", import.meta.url).pathname,
    },
  },
});
