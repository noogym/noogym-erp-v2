import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@noogym/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      "@noogym/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@noogym/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@noogym/data-access": path.resolve(__dirname, "../../packages/data-access/src/index.ts")
    }
  },
  root: ".",
  base: "./",
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: false
  }
});
