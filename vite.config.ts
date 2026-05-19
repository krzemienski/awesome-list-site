import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default(),
          ),
        ]
      : []),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    watch: {
      // Replit writes to ~/workspace/.local, ~/workspace/.cache, etc. every
      // ~1s (workflow logs, agent state, toolchain cache). Vite's default
      // watcher picks those up and fires `[vite] page reload` in an infinite
      // loop, preventing the React app from ever finishing hydration.
      // Use absolute paths because the Vite root is `client/`, so relative
      // **/.local/** globs do not match these workspace-root directories.
      ignored: [
        path.resolve(import.meta.dirname, ".local") + "/**",
        path.resolve(import.meta.dirname, ".cache") + "/**",
        path.resolve(import.meta.dirname, ".config") + "/**",
        path.resolve(import.meta.dirname, ".git") + "/**",
        path.resolve(import.meta.dirname, "node_modules") + "/**",
        path.resolve(import.meta.dirname, "dist") + "/**",
        path.resolve(import.meta.dirname, "_planning") + "/**",
        path.resolve(import.meta.dirname, "attached_assets") + "/**",
        path.resolve(import.meta.dirname, ".agents") + "/**",
        path.resolve(import.meta.dirname, "logs") + "/**",
        "**/*.log",
      ],
    },
  },
});
