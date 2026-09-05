import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const tokenDocument = JSON.parse(
  fs.readFileSync(path.resolve(root, "tokens.json"), "utf8"),
) as {
  defaults: { system: string; accent: string };
  themes: Record<string, unknown>;
  accents: Record<string, unknown>;
};

const bootData = JSON.stringify({
  defaultSystem: tokenDocument.defaults.system,
  defaultAccent: tokenDocument.defaults.accent,
  systems: Object.keys(tokenDocument.themes),
  accents: Object.keys(tokenDocument.accents),
}).replaceAll("<", "\\u003c");

const port = Number(process.env.PORT || 20928);
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  root,
  plugins: [
    {
      name: "awesome-video-design-system-boot",
      transformIndexHtml(html) {
        return html.replace("__AWESOME_VIDEO_DS_BOOT__", bootData);
      },
    },
    react(),
  ],
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { allow: [path.resolve(root, "../..")] },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  build: {
    outDir: path.resolve(root, "dist"),
    emptyOutDir: true,
  },
});