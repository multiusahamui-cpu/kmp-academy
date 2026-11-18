import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    isolate: true,
    // Nilai khusus tes: server menolak start tanpa SESSION_SECRET, dan db/index.ts tanpa DATABASE_URL.
    env: {
      SESSION_SECRET: "test-only-secret-bukan-untuk-produksi",
    },
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@shared": new URL("./shared", import.meta.url).pathname,
    },
  },
});
