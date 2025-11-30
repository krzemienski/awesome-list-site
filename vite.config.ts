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
    
    // Code splitting for better performance (Bug #7 fix - Session 7)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }

          // React Query + Supabase
          if (id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/@supabase/supabase-js')) {
            return 'vendor-query';
          }

          // Radix UI components
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui';
          }

          // Admin components (lazy-loaded)
          if (id.includes('/src/pages/AdminDashboard') ||
              id.includes('/src/components/admin/')) {
            return 'admin';
          }

          // Utility libraries
          if (id.includes('node_modules/date-fns') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/lucide-react')) {
            return 'vendor-utils';
          }
        }
      }
    },
    
    chunkSizeWarningLimit: 600,
  },
});
