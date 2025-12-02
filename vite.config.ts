import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Bundle analyzer - generates stats.html in dist/public
    visualizer({
      filename: "dist/public/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
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

    // Safe manual chunking strategy - Session 10 optimization
    // Uses function-based approach to avoid circular dependency issues (Bug #10 Session 8)
    // Key insight: never split modules that have bidirectional imports
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Large vendor libraries - split by package path
          if (id.includes('node_modules')) {
            // Recharts is large (~300KB) and only used in admin pages
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
            // Icons - lucide-react is ~200KB
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Supabase client bundle
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Form validation
            if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'vendor-forms';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            // TanStack - keep together to avoid circular deps
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // React core - keep react and react-dom together, include scheduler
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
              return 'vendor-react';
            }
          }
          // Let Vite handle other chunks automatically
          return undefined;
        },
      },
    },

    chunkSizeWarningLimit: 300,
  },
});
