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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split large dependencies
          if (id.includes("node_modules")) {
            // React core
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            // Tanstack Query
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            // UI library (shadcn/radix)
            if (id.includes("@radix-ui") || id.includes("class-variance-authority")) {
              return "vendor-ui";
            }
            // Charts
            if (id.includes("recharts") || id.includes("d3-")) {
              return "vendor-charts";
            }
            // Other vendors
            return "vendor-other";
          }

          // Admin components - lazy load admin panel
          if (id.includes("/components/admin/")) {
            return "admin-components";
          }

          // UI components - group shadcn components
          if (id.includes("/components/ui/")) {
            return "ui-components";
          }

          // Analytics components
          if (id.includes("analytics")) {
            return "analytics";
          }
        },
      },
    },
  },
});
