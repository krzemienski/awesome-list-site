// 50-combination guest theme persistence probe (2026-09-17 rerun).
// Same controls and contract as scripts/audit-567-browser.mjs themeMatrix():
// click the shipped /settings/theme options, require html[data-system/-accent]
// and localStorage ds-system/ds-accent to agree before AND after a reload, then
// open a long-content category page and read representative controls there.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
// Run from the repository root: node docs/parity/evidence/tokens/50-combo-2026-09-17/probe.mjs
// Output stays outside the repo during the browser run (Vite reloads on any
// repo write); copy the results in afterwards.
const OUT = process.env.THEME50_OUT || path.join(process.env.TMPDIR || "/tmp", "theme50", "out");
const ROOT = process.cwd();
// Same pinned Chromium revision the repository's Playwright tests use
// (tests/parity, e2e); `npm run test:e2e:browsers` installs it.
const CHROMIUM = process.env.THEME50_CHROMIUM || path.join(ROOT, ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome");
const SYSTEMS = ["editorial", "terminal", "geist", "brutalist", "swiss"];
const ACCENTS = ["crimson", "magenta", "orange", "amber", "emerald", "matrix", "cyan", "violet", "lime", "rose"];
const LONG_PAGE = process.env.THEME50_LONG_PAGE || "/category/encoding-codecs";
if (!/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(BASE)) throw new Error(`BASE_URL must be a loopback origin, got ${BASE}`);
if (!fs.existsSync(CHROMIUM)) throw new Error(`pinned Chromium missing: ${CHROMIUM}`);
fs.mkdirSync(OUT, { recursive: true });

const readState = () => {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  let storedSystem = null, storedAccent = null;
  try { storedSystem = localStorage.getItem("ds-system"); storedAccent = localStorage.getItem("ds-accent"); } catch {}
  return {
    attrs: { system: root.getAttribute("data-system"), accent: root.getAttribute("data-accent") },
    stored: { system: storedSystem, accent: storedAccent },
    tokens: { accent: cs.getPropertyValue("--accent").trim(), bg: cs.getPropertyValue("--bg").trim(), text: cs.getPropertyValue("--text").trim(), fontBody: cs.getPropertyValue("--font-body").trim() },
  };
};
const controlProbe = () => {
  const pick = (sel) => document.querySelector(sel);
  const primary = pick(".btn.primary, [data-ds='button'][data-variant='primary'], button.primary");
  const chip = pick(".chip.accent, [data-ds='chip'].accent");
  const link = pick("main a[href^='/resource/'], main a[href^='http']");
  const cs = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop).trim() : null);
  return {
    h1: document.querySelector("main h1")?.textContent?.trim().slice(0, 60) || null,
    docHeight: document.documentElement.scrollHeight,
    primaryBg: cs(primary, "background-color"),
    chipColor: cs(chip, "color"),
    linkFont: cs(link, "font-family"),
    bodyFont: cs(document.body, "font-family"),
    holdPresent: Boolean(document.getElementById("ssr-seo-hold")),
  };
};

const browser = await chromium.launch({ headless: true, chromiumSandbox: true, args: ["--disable-partial-raster"], executablePath: CHROMIUM });
const context = await browser.newContext({ locale: "en-US", timezoneId: "UTC", colorScheme: "dark", reducedMotion: "reduce", serviceWorkers: "block" });
context.setDefaultTimeout(30_000);
await context.addInitScript(() => { try { localStorage.setItem("analytics-consent", "denied"); } catch {} });
const page = await context.newPage();
const rows = [];
const started = new Date().toISOString();
const waitSettled = (system, accent) => page.waitForFunction(({ s, a }) => {
  const r = document.documentElement;
  let ss = null, sa = null;
  try { ss = localStorage.getItem("ds-system"); sa = localStorage.getItem("ds-accent"); } catch {}
  return r.getAttribute("data-system") === s && r.getAttribute("data-accent") === a && ss === s && sa === a;
}, { s: system, a: accent }, { timeout: 30_000 }).then(() => true).catch(() => false);

await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="system-picker"]').waitFor();
for (const system of SYSTEMS) {
  for (const accent of ACCENTS) {
    const row = { system, accent };
    try {
      if (!page.url().endsWith("/settings/theme")) {
        await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
        await page.locator('[data-testid="system-picker"]').waitFor();
      }
      await page.locator(`[data-testid="system-option-${system}"]`).click();
      await page.waitForFunction((s) => document.documentElement.getAttribute("data-system") === s, system);
      await page.locator(`[data-testid="accent-option-${accent}"]`).click();
      row.beforeReloadSettled = await waitSettled(system, accent);
      row.beforeReload = await page.evaluate(readState);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="system-picker"]').waitFor();
      row.afterReloadSettled = await waitSettled(system, accent);
      row.afterReload = await page.evaluate(readState);
      // Long-content page in the same storage: the theme must survive a
      // navigation to a route that never touches the picker.
      await page.goto(`${BASE}${LONG_PAGE}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => {
        const root = document.getElementById("root");
        if (!root || document.getElementById("ssr-seo-hold")) return false;
        return Object.keys(root).some((k) => k.startsWith("__reactContainer"));
      }, null, { timeout: 60_000 });
      await page.locator("main h1").first().waitFor();
      row.longPageSettled = await waitSettled(system, accent);
      row.longPage = { ...(await page.evaluate(readState)), ...(await page.evaluate(controlProbe)) };
      if (accent === ACCENTS[0]) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.screenshot({ path: path.join(OUT, `${system}-${accent}-long-1440.png`), fullPage: false });
        await page.setViewportSize({ width: 375, height: 812 });
        await page.screenshot({ path: path.join(OUT, `${system}-${accent}-long-375.png`), fullPage: false });
        await page.setViewportSize({ width: 1280, height: 720 });
      }
      const accentTokenMoves = row.longPage.tokens.accent && row.longPage.tokens.accent === row.afterReload.tokens.accent;
      // The long page must actually paint the selection: the resource-count
      // chip resolves to the selected accent token and the body font to the
      // selected system's --font-body (compared as normalised family lists).
      const hexToRgb = (hex) => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return null; const n = parseInt(m[1], 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
      const families = (value) => String(value || "").split(",").map((part) => part.trim().replace(/^["']|["']$/g, "").toLowerCase()).filter(Boolean).join(",");
      row.chipMatchesAccent = Boolean(row.longPage.chipColor) && row.longPage.chipColor === hexToRgb(row.longPage.tokens.accent);
      row.bodyFontMatchesSystem = Boolean(row.longPage.bodyFont) && families(row.longPage.bodyFont) === families(row.longPage.tokens.fontBody);
      row.ok = row.beforeReloadSettled && row.afterReloadSettled && row.longPageSettled && accentTokenMoves && row.chipMatchesAccent && row.bodyFontMatchesSystem && !row.longPage.holdPresent && Boolean(row.longPage.h1);
    } catch (error) {
      row.ok = false;
      row.error = String(error?.message || error).split("\n")[0];
    }
    rows.push(row);
    console.log(`${system} × ${accent}: ${row.ok ? "PASS" : "FAIL"}${row.error ? ` (${row.error})` : ""}`);
  }
}
await browser.close();
const accentValues = new Map();
for (const row of rows) if (row.afterReload) accentValues.set(row.accent, new Set([...(accentValues.get(row.accent) || []), row.afterReload.tokens.accent]));
const systemFonts = new Map();
for (const row of rows) if (row.longPage) systemFonts.set(row.system, new Set([...(systemFonts.get(row.system) || []), row.longPage.bodyFont]));
const summary = {
  startedAt: started, finishedAt: new Date().toISOString(), base: BASE, longPage: LONG_PAGE,
  total: rows.length, passed: rows.filter((r) => r.ok).length, failed: rows.filter((r) => !r.ok).map((r) => `${r.system}/${r.accent}`),
  distinctAccentTokens: Object.fromEntries([...accentValues].map(([k, v]) => [k, [...v]])),
  distinctSystemBodyFonts: Object.fromEntries([...systemFonts].map(([k, v]) => [k, [...v]])),
};
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.passed === 50 && summary.total === 50 ? 0 : 1);
