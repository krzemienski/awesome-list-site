// Committed evidence: measures the four remediated icon-control families live and
// writes their rendered bounding boxes to .local/audit/tap-target-measurements.json.
// Run: node scripts/measure-tap-targets.mjs  (app must be on :5000)
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const BASE = "http://localhost:5000";
const out = { date: new Date().toISOString(), viewport: { width: 400, height: 800 }, families: [] };

const b = await chromium.launch();
const p = await b.newPage({ viewport: out.viewport });

// T1 — compact-view card icons (Open in new tab / Suggest an edit)
await p.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "networkidle" });
await p.waitForTimeout(800);
const cardIcons = await p.$$eval('[data-testid^="button-external-"]', els =>
  els.slice(0, 2).map(el => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), minW: getComputedStyle(el).minWidth };
  }));
out.families.push({ id: "T1", control: "compact card Open/Edit icons", route: "/category/encoding-codecs", samples: cardIcons });

// T3 — view-mode toggles (grid/list/compact)
const viewToggles = await p.$$eval('[data-testid^="view-mode-"]', els =>
  els.map(el => {
    const r = el.getBoundingClientRect();
    return { id: el.getAttribute("data-testid"), w: Math.round(r.width), h: Math.round(r.height) };
  }));
out.families.push({ id: "T3", control: "view-mode toggles", route: "/category/encoding-codecs", samples: viewToggles });

// T2 — sidebar category expand chevron
await p.goto(`${BASE}/advanced`, { waitUntil: "networkidle" });
await p.waitForTimeout(800);
const chevron = await p.evaluate(() => {
  const el = document.querySelector('[aria-label^="Expand"], [aria-label^="Collapse"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), minW: getComputedStyle(el).minWidth };
});
out.families.push({ id: "T2", control: "sidebar expand/collapse chevron", route: "/advanced", samples: chevron ? [chevron] : [] });

const PASS = out.families.every(f =>
  f.samples.length > 0 && f.samples.every(s => s.w >= 44 && s.h >= 44));
out.verdict = PASS ? "PASS — all measured controls >= 44x44" : "FAIL — at least one control < 44x44";

mkdirSync(".local/audit", { recursive: true });
writeFileSync(".local/audit/tap-target-measurements.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
console.log("\n" + out.verdict);
await b.close();
process.exit(PASS ? 0 : 1);
