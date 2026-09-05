import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {
  PRODUCT_PROFILE_BOOT_DATA,
  THEME_BOOT_DATA,
  THEME_FALLBACK_REGISTRY,
} from "./client/src/lib/design-system";
import { FONT_BOOT_DATA, FONT_OPTIONS } from "./client/src/lib/font-options";

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

function themeBootRegistry(): Plugin {
  const marker = "__AWESOME_VIDEO_THEME_BOOT__";
  const registrySystemIds = THEME_FALLBACK_REGISTRY.systems.map(({ id }) => id);
  const registryAccentIds = THEME_FALLBACK_REGISTRY.accents.map(({ id }) => id);
  if (
    JSON.stringify(THEME_BOOT_DATA.systems) !== JSON.stringify(registrySystemIds) ||
    JSON.stringify(THEME_BOOT_DATA.accents) !== JSON.stringify(registryAccentIds) ||
    THEME_BOOT_DATA.defaultSystem !== THEME_FALLBACK_REGISTRY.defaultSystem ||
    THEME_BOOT_DATA.defaultAccent !== THEME_FALLBACK_REGISTRY.defaultAccent
  ) {
    throw new Error("THEME_BOOT_DATA is stale relative to THEME_FALLBACK_REGISTRY");
  }
  const bootData = JSON.stringify(THEME_BOOT_DATA);

  return {
    name: "theme-boot-registry",
    transformIndexHtml(html) {
      if (!html.includes(marker)) {
        throw new Error(`theme-boot-registry marker ${marker} is missing from client/index.html`);
      }
      return html.replaceAll(marker, bootData);
    },
  };
}

function productProfileBootRegistry(): Plugin {
  const marker = "__AWESOME_VIDEO_PRODUCT_PROFILE_BOOT__";
  const bootData = JSON.stringify(PRODUCT_PROFILE_BOOT_DATA);

  return {
    name: "product-profile-boot-registry",
    transformIndexHtml(html) {
      if (!html.includes(marker)) {
        throw new Error(`product-profile-boot-registry marker ${marker} is missing from client/index.html`);
      }
      return html.replaceAll(marker, bootData);
    },
  };
}

function fontBootRegistry(): Plugin {
  const marker = "__AWESOME_VIDEO_FONT_BOOT__";
  const registryFontData = {
    stacks: Object.fromEntries(FONT_OPTIONS.map(({ id, stack }) => [id, stack])),
    fallback: FONT_OPTIONS[0]?.id,
  };
  if (JSON.stringify(FONT_BOOT_DATA) !== JSON.stringify(registryFontData)) {
    throw new Error("FONT_BOOT_DATA is stale relative to FONT_OPTIONS");
  }
  const bootData = JSON.stringify(FONT_BOOT_DATA);

  return {
    name: "font-boot-registry",
    transformIndexHtml(html) {
      if (!html.includes(marker)) {
        throw new Error(`font-boot-registry marker ${marker} is missing from client/index.html`);
      }
      return html.replaceAll(marker, bootData);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    themeBootRegistry(),
    productProfileBootRegistry(),
    fontBootRegistry(),
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
    rollupOptions: {
      output: {
        // Rollup otherwise absorbs each manual chunk's transitive imports into
        // that chunk. For route-only features this can create entry imports
        // back to chart/PDF vendors, undoing the isolation policy.
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("framer-motion")) return "vendor-animation";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("blurhash")) return "vendor-blurhash";
          if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
          if (id.includes("/remark") || id.includes("unist-util-visit")) return "vendor-markdown";
        },
      },
    },
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
