import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/financialplanner/" : "/",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
