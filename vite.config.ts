import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const workspaceRoot = path.resolve(import.meta.dirname);

/**
 * Vite's manifest describes the chunk graph but not which source modules were
 * rolled into an entry. Emit a small deterministic companion file so the
 * bundle gate can prove that admin/AI/export/chart modules are absent from the
 * anonymous entry without shipping source maps.
 */
function bundleModuleManifest(): Plugin {
  return {
    name: "bundle-module-manifest",
    generateBundle(_options, bundle) {
      const chunks: Record<
        string,
        { isEntry: boolean; isDynamicEntry: boolean; modules: string[] }
      > = {};
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== "chunk") continue;
        chunks[fileName] = {
          isEntry: output.isEntry,
          isDynamicEntry: output.isDynamicEntry,
          modules: Object.keys(output.modules)
            .map((moduleId) => {
              const relative = path.relative(workspaceRoot, moduleId);
              return relative.startsWith("..")
                ? moduleId.replaceAll("\\", "/")
                : relative.replaceAll("\\", "/");
            })
            .sort(),
        };
      }
      this.emitFile({
        type: "asset",
        fileName: "bundle-modules.json",
        source: `${JSON.stringify({ schemaVersion: 1, chunks }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    bundleModuleManifest(),
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
    // Logical source keys make bundle budgets stable across hashed filenames.
    manifest: true,
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
