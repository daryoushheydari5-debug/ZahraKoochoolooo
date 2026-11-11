/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

// Source page lives in app/. The repo-root index.html is the built single-file app,
// so GitHub Pages works whether it deploys from the branch or from Actions.
export default defineConfig(({ mode }) => ({
  root: resolve(__dirname, "app"),
  base: "./",
  plugins: [react(), ...(mode === "single" ? [viteSingleFile()] : [])],
  build: { outDir: resolve(__dirname, mode === "single" ? "dist-single" : "dist"), emptyOutDir: true },
  test: { dir: resolve(__dirname, "src"), environment: "jsdom", globals: true, setupFiles: [resolve(__dirname, "src/test-setup.ts")] },
}));
