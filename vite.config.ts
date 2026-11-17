import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Pola mengikuti garuda-superapp: root di client/, hasil build frontend di dist/public
// (disajikan nginx), backend di-bundle esbuild ke dist/server.mjs.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Backend Academy (server/index.ts) — port khusus Academy, bukan port digitalcoop.id
      "/api": { target: "http://127.0.0.1:5100", changeOrigin: true },
      "/cdn": { target: "http://127.0.0.1:5100", changeOrigin: true },
    },
  },
});
