import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const tokenDocument = JSON.parse(
  fs.readFileSync(path.resolve(root, "tokens.json"), "utf8"),
) as {
  defaults: { system: string; accent: string };
  themes: Record<string, { tokens: Record<string, string> }>;
  accents: Record<string, { primary: string; secondary: string }>;
};

const bootData = JSON.stringify({
  defaultSystem: tokenDocument.defaults.system,
  defaultAccent: tokenDocument.defaults.accent,
  systems: Object.keys(tokenDocument.themes),
  accents: Object.keys(tokenDocument.accents),
}).replaceAll("<", "\\u003c");

// The canonical sheet only declares Editorial defaults. The live app's
// applyDesignSystem writes the registry tokens; data-system alone changes
// component skins, not the display family/weight. Project that same registry
// into selectors so both parser-blocking boot and React theme switches paint
// the correct tokens without invoking the live app's persisting applier.
const themeStyles = [
  ...Object.entries(tokenDocument.themes).map(([system, theme]) =>
    `html[data-system="${system}"]{${Object.entries(theme.tokens)
      .map(([name, value]) => `${name}:${value};`).join("")}}`,
  ),
  ...Object.entries(tokenDocument.accents).map(([accent, value]) =>
    `html[data-accent="${accent}"]{--accent:${value.primary};--accent-2:${value.secondary};}`,
  ),
].join("\n").replaceAll("<", "\\3c ");

const port = Number(process.env.PORT || 20928);
const base = process.env.BASE_PATH || "/";
const allowedHosts = [
  "localhost",
  "127.0.0.1",
  "[::1]",
  ".replit.dev",
  ".repl.co",
];

export default defineConfig({
  base,
  root,
  plugins: [
    {
      name: "awesome-video-design-system-boot",
      transformIndexHtml(html) {
        return html.replace("__AWESOME_VIDEO_DS_BOOT__", bootData)
          .replace("</head>", `<style data-artifact-theme-tokens>${themeStyles}</style></head>`);
      },
    },
    react(),
  ],
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts,
    fs: {
      strict: true,
      allow: [path.resolve(root, "../..")],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts,
  },
  build: {
    outDir: path.resolve(root, "dist"),
    emptyOutDir: true,
  },
});