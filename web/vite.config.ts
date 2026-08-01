import { defineConfig } from "vite";

// Relative base so the build works on GitHub Pages under any repo path
// (username.github.io/repo/ or project pages subpath).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
