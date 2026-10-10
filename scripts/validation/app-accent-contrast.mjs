import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCanonicalRegistry, readThemeBootData } from "../generate-design-system-artifact.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export function rgba(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).concat(1);
  const parts = value.match(/[\d.]+/g)?.map(Number);
  if (parts?.length === 4) return parts;
  throw new Error(`Unsupported contrast color: ${value}`);
}
export const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const luminance = c => c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
export function contrast(fg, bg) {
  const a = luminance(over(fg, bg)), b = luminance(bg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

// Same sRGB alpha-compositing approach as the discovery and text-3 gate.
// Read the actual bridge declaration, rather than a second palette.
export function accentContrastTable(rootDir = ROOT) {
  const bridge = fs.readFileSync(path.join(rootDir, "client/src/styles/app-bridge.css"), "utf8");
  if (!/--accent-ink:\s*var\(--accent\);/.test(bridge)) throw new Error("Missing app-owned --accent-ink default");
  const shares = new Map();
  for (const m of bridge.matchAll(/:root\[data-system="(\w+)"\]\[data-accent="(\w+)"\]\s*\{\s*--accent-ink:\s*color-mix\(in srgb, var\(--accent\) (\d+)%, #ffffff\);\s*\}/g))
    shares.set(`${m[1]}:${m[2]}`, Number(m[3]) / 100);
  if (!shares.size) throw new Error("Missing per-pair accent-ink corrections");
  const registry = readCanonicalRegistry(rootDir);
  const corrections = readThemeBootData(fs.readFileSync(path.join(rootDir, "client/src/lib/design-system.ts"), "utf8")).text3Corrections;
  const rows = [];
  for (const [system, entry] of Object.entries(registry.systems)) for (const accent of registry.accents) {
    const tokens = entry.vars;
    const share = shares.get(`${system}:${accent.id}`) ?? 1;
    const ink = rgba(accent.primary).map((v, i) => i < 3 ? v * share + 255 * (1 - share) : 1);
    const backings = { "--bg": rgba(tokens["--bg"]), "--bg-2": rgba(tokens["--bg-2"]) };
    for (const bg of ["--bg", "--bg-2"]) for (const key of ["--surface", "--surface-2", "--surface-3"])
      backings[`${key} over ${bg}`] = over(rgba(tokens[key]), backings[bg]);
    for (const [backing, neutral] of Object.entries(backings)) for (const tint of [0, .08, .14]) {
      const bg = over([...rgba(accent.primary).slice(0, 3), tint], neutral);
      rows.push({ system, accent: accent.id, backing, tint, ink: "--accent-ink", inkShare: share, ratio: contrast(ink, bg), upstreamRatio: contrast(rgba(accent.primary), bg) });
      if (!tint) rows.push({ system, accent: accent.id, backing, tint, ink: "--text-3", ratio: contrast(rgba(corrections[system]), bg), upstreamRatio: contrast(rgba(tokens["--text-3"]), bg) });
    }
    if (system !== "terminal") rows.push({ system, accent: accent.id, backing: "filled primary", tint: 1, ink: "--on-accent", ratio: contrast(rgba(tokens["--bg"]), rgba(accent.primary)), upstreamRatio: contrast(rgba(system === "brutalist" ? "#000000" : "#0a0a0a"), rgba(accent.primary)) });
  }
  const failed = rows.filter(row => row.ratio < 4.5);
  if (failed.length) throw new Error(`App contrast failures: ${JSON.stringify(failed)}`);
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = accentContrastTable();
  if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
  else console.log(`App accent contrast: PASS (${rows.length} rows, all 50 pairs; minimum ${Math.min(...rows.map(row => row.ratio)).toFixed(4)}:1)`);
}
