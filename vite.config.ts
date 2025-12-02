import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
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
    
    // Code splitting disabled due to circular dependencies (Bug #10 - Session 8)
    // Manual chunking of vendor-react + vendor-query caused circular imports:
    //   vendor-react imports from vendor-query
    //   vendor-query imports from vendor-react
    //   Result: React.forwardRef undefined, black screen
    // Vite's automatic chunking avoids this issue
    rollupOptions: {
      output: {
        // Automatic chunking by Vite (no manual chunks)
      }
    },
    
    chunkSizeWarningLimit: 600,
  },
});
