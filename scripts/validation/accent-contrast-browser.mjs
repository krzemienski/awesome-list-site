#!/usr/bin/env node
/**
 * Live-browser accent contrast sweep (audit 578 I01/I02).
 *
 * Measures the FINAL painted text/background pair of every visible text
 * element on real routes, under real design-system/accent combinations, from
 * getComputedStyle — never from token tables. Backgrounds are composited up
 * the ancestor chain in sRGB (alpha-aware, including color-mix results that
 * Chromium serialises as `color(srgb …)`). Targeted accent controls are also
 * re-measured while hovered and keyboard-focused. axe-core's color-contrast
 * rule runs on the same settled page as an independent second calculator.
 *
 * Guest by default; theme comes from the same localStorage keys the app reads
 * at boot. --signed-in mints a disposable Clerk admin (tests/parity/identity),
 * writes its theme preference per cell and tears it down at the end, so
 * auth-gated controls (the enabled /submit primary) are measured too.
 * Disabled controls are recorded but exempt (WCAG 1.4.3 inactive components).
 * Results stream to JSONL so an interrupted run resumes.
 *
 *   BASE_URL=http://127.0.0.1:5000 node scripts/validation/accent-contrast-browser.mjs \
 *     --out .cache/audit-578/contrast [--routes /a,/b] [--accents natural,violet,magenta]
 *     [--widths 375,1440] [--systems editorial,...] [--shots]
 * Exit 1 when any measured pair is below its WCAG AA floor or axe reports a
 * color-contrast violation.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";
import { createDisposableAdmin } from "../../tests/parity/identity.mjs";

const NATURAL = { editorial: "crimson", terminal: "matrix", geist: "cyan", brutalist: "amber", swiss: "orange" };
const ALL_ACCENTS = ["crimson", "magenta", "orange", "amber", "emerald", "matrix", "cyan", "violet", "lime", "rose"];
const HEIGHTS = { 375: 812, 768: 1024, 1024: 768, 1440: 900 };
// Accent-ink consumers and filled/outlined primaries named by the audit.
const TARGETS = [
  '[data-testid="preview-btn-default"]', '[data-testid="preview-btn-destructive"]',
  ".chip.accent", ".btn.primary", ".btn.danger", ".btn.link",
  ".journey-card__progress-value", ".journey-detail-card__progress-value",
  ".eyebrow", ".skip-link",
];

const { values } = parseArgs({ options: {
  out: { type: "string", default: ".cache/audit-578/contrast" },
  routes: { type: "string", default: "/settings/theme,/journeys,/category/encoding-codecs,/submit" },
  systems: { type: "string", default: Object.keys(NATURAL).join(",") },
  accents: { type: "string", default: "natural,violet,magenta" },
  widths: { type: "string", default: "375,1440" },
  shots: { type: "boolean", default: false },
  "signed-in": { type: "boolean", default: false },
} });
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
if (!["127.0.0.1", "localhost"].includes(new URL(BASE).hostname)) throw new Error("DEV loopback only");
const routes = values.routes.split(",").filter(Boolean);
const systems = values.systems.split(",").filter(Boolean);
const widths = values.widths.split(",").map(Number);
const accentsFor = system => [...new Set(values.accents.split(",").flatMap(a => a === "natural" ? [NATURAL[system]] : a === "all" ? ALL_ACCENTS : [a]))];
fs.mkdirSync(values.out, { recursive: true });
const jsonl = path.join(values.out, "results.jsonl");
const done = new Set(fs.existsSync(jsonl) ? fs.readFileSync(jsonl, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l).key) : []);

/** Runs in the page: measure every visible text element (+ optional subset). */
function measure({ onlySelectors } = {}) {
  const parse = value => {
    if (!value || value === "transparent") return [0, 0, 0, 0];
    let m = value.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
    m = value.match(/^color\(srgb ([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1]; }
    // Any other serialisation (oklab, lab, …): let the engine convert it.
    const ctx = (window.__a578ctx ||= document.createElement("canvas").getContext("2d", { willReadFrequently: true }));
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#000"; ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
  const lum = c => c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const ratio = (fg, bg) => { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
  const accent = parse(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().replace(/^#(..)(..)(..)$/, (_, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`));
  const backdrop = el => {
    const layers = []; let notes = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const cs = getComputedStyle(node);
      const bg = parse(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== "none" && !/^url\(/.test(cs.backgroundImage)) notes.push(`gradient@${node.tagName.toLowerCase()}`);
      if (bg && bg[3] > 0) layers.push(bg);
      if (bg && bg[3] >= 1) break;
    }
    let base = [0, 0, 0, 1];
    for (const layer of layers.reverse()) base = over(layer, base);
    return { bg: base, notes };
  };
  const path = el => { const parts = []; for (let n = el; n && n.nodeType === 1 && parts.length < 4; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + (n.classList.length ? "." + [...n.classList].slice(0, 2).join(".") : "") + (n.dataset.testid ? `[${n.dataset.testid}]` : "")); return parts.join(" > "); };
  document.querySelectorAll("[data-a578]").forEach(n => n.removeAttribute("data-a578"));
  const candidates = onlySelectors ? onlySelectors.flatMap(s => [...document.querySelectorAll(s)]) : [...document.querySelectorAll("body *")];
  const rows = [];
  for (const el of candidates) {
    if (!onlySelectors && ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    if (el.closest("[aria-hidden='true'],script,style,noscript,svg")) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    // Off-canvas until focused (skip links): measured in the targeted focus pass.
    if (r.right <= 0 || r.bottom + scrollY <= 0 || r.left >= document.documentElement.scrollWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible") continue;
    let opacity = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
    if (opacity < 0.05) continue;
    const disabled = el.closest(":disabled,[aria-disabled='true']") !== null;
    const fg = parse(cs.color); if (!fg) continue;
    const { bg, notes } = backdrop(el);
    const painted = over([fg[0], fg[1], fg[2], fg[3] * opacity], bg);
    const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const value = ratio(painted, bg);
    const isAccentInk = accent && Math.max(...[0, 1, 2].map(i => Math.abs(fg[i] - accent[i]))) < 1.5;
    const idx = String(rows.length);
    el.setAttribute("data-a578", idx);
    rows.push({ idx, fg: [fg[0], fg[1], fg[2], fg[3] * opacity], path: path(el), text: (el.textContent || "").trim().slice(0, 40), color: cs.color, bg: `rgb(${bg.slice(0, 3).map(Math.round).join(",")})`, ratio: Math.round(value * 1e4) / 1e4, floor: large ? 3 : 4.5, size, weight, disabled, rawAccent: isAccentInk, notes });
  }
  return rows;
}

/** Hide the glyphs, screenshot the text box and take the worst painted pixel. */
async function pixelRatio(page, idx, fg) {
  const clip = await page.evaluate(idx => {
    const el = document.querySelector(`[data-a578="${idx}"]`);
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const text = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    let rect = el.getBoundingClientRect();
    if (text) { const range = document.createRange(); range.selectNodeContents(text); const r = range.getBoundingClientRect(); if (r.width > 0) rect = r; }
    el.style.setProperty("color", "transparent", "important");
    el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    // A text-shadow halo is part of the glyph rendering, not its backdrop
    // (axe treats it the same way); hide it with the glyphs.
    el.style.setProperty("text-shadow", "none", "important");
    const x = Math.max(0, Math.floor(rect.left)), y = Math.max(0, Math.floor(rect.top));
    const w = Math.min(innerWidth - x, Math.ceil(rect.width)), h = Math.min(innerHeight - y, Math.ceil(rect.height));
    return w >= 2 && h >= 2 ? { x, y, width: w, height: h } : null;
  }, idx);
  try {
    if (!clip) return null;
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const png = PNG.sync.read(await page.screenshot({ clip, animations: "disabled", caret: "hide" }));
    let worst = null;
    for (let i = 0; i < png.data.length; i += 4) {
      const bg = [png.data[i], png.data[i + 1], png.data[i + 2]];
      const ratio = contrastOver(fg, bg);
      if (!worst || ratio < worst.ratio) worst = { ratio, bg };
    }
    return worst && { ratio: Math.round(worst.ratio * 1e4) / 1e4, bg: `rgb(${worst.bg.join(",")})` };
  } finally {
    await page.evaluate(idx => { const el = document.querySelector(`[data-a578="${idx}"]`); el?.style.removeProperty("color"); el?.style.removeProperty("-webkit-text-fill-color"); el?.style.removeProperty("text-shadow"); }, idx);
  }
}
const lin = v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
const lum = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
function contrastOver(fg, bg) {
  const painted = [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const a = lum(painted), b = lum(bg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

async function settle(page, system, accent) {
  await page.waitForFunction(({ system, accent }) => document.documentElement.dataset.system === system && document.documentElement.dataset.accent === accent && document.querySelector("#root")?.childElementCount > 0, { system, accent }, { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const browser = await launchBrowserWithLease(chromium, { executablePath: path.resolve(".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true }, "audit-578-contrast");
let failures = 0;
let identity = null;
try {
  if (values["signed-in"]) {
    identity = await createDisposableAdmin({ browser, appBase: BASE, secretKey: process.env.CLERK_SECRET_KEY, auditKey: process.env.ADMIN_PASSWORD });
    // Journey progress labels render only for an enrolled user: enrol the
    // owned identity in one journey (progress rows cascade with the user).
    const enrolled = await identity.page.evaluate(async () => {
      const list = await (await fetch("/api/journeys")).json();
      const journey = (Array.isArray(list) ? list : list.journeys || [])[0];
      if (!journey) throw new Error("No published journey to enrol in");
      const response = await fetch(`/api/journeys/${journey.id}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error(`Journey start HTTP ${response.status}`);
      return journey.id;
    });
    console.log(`signed-in QA identity ${identity.localUserId} enrolled in journey ${enrolled}`);
  }
  for (const route of routes) for (const width of widths) for (const system of systems) for (const accent of accentsFor(system)) {
    const key = `${identity ? "admin:" : ""}${route}|${width}|${system}|${accent}`;
    if (done.has(key)) continue;
    if (identity) await identity.page.evaluate(async ({ system, accent }) => {
      const response = await fetch("/api/user/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ themeSystem: system, themeAccent: accent }) });
      if (!response.ok) throw new Error(`QA preference write HTTP ${response.status}`);
    }, { system, accent });
    const context = await browser.newContext({ viewport: { width, height: HEIGHTS[width] || 900 }, reducedMotion: "reduce", serviceWorkers: "block", ...(identity ? { storageState: await identity.storageState() } : {}) });
    await context.addInitScript(({ system, accent }) => { localStorage.setItem("ds-system", system); localStorage.setItem("ds-accent", accent); localStorage.setItem("analytics-consent", "denied"); }, { system, accent });
    const page = await context.newPage();
    const row = { key, route, width, system, accent };
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await settle(page, system, accent);
      row.finalUrl = new URL(page.url()).pathname;
      if (identity) {
        const user = await page.evaluate(async () => (await fetch("/api/auth/user")).json());
        if (!user.isAuthenticated || String(user.user?.id) !== String(identity.localUserId)) throw new Error("Owned QA identity did not reach the page");
        row.signedIn = true;
      }
      const all = await page.evaluate(measure, {});
      // Painted-pixel backdrop for every pair that is not comfortably high:
      // this captures atmosphere gradients, pseudo layers and glows that
      // computed-style compositing (and axe) cannot resolve.
      let sampled = 0;
      for (const r of all) {
        if (r.disabled || r.ratio >= 6 || sampled >= 150) continue;
        const px = await pixelRatio(page, r.idx, r.fg);
        if (px) { r.pixelRatio = px.ratio; r.pixelBg = px.bg; r.ratio = Math.min(r.ratio, px.ratio); sampled++; }
      }
      row.textElements = all.length;
      row.pixelSampled = sampled;
      row.rawAccentText = all.filter(r => r.rawAccent).length;
      row.below = all.filter(r => !r.disabled && r.ratio < r.floor).map(({ fg, ...rest }) => rest);
      row.minRatio = Math.min(...all.filter(r => !r.disabled).map(r => r.ratio));
      // Targeted controls at rest, :hover and :focus-visible (forced through
      // the DevTools protocol, so display-only previews are measured too).
      row.targets = [];
      const cdp = await context.newCDPSession(page);
      await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
      for (const selector of TARGETS) {
        const found = await page.evaluate(sel => {
          const shown = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 || e.matches(".skip-link"); });
          const isDisabled = e => e.closest(":disabled,[aria-disabled='true']") !== null;
          // Prefer an enabled control; a disabled one is measured but exempt.
          const el = shown.find(e => !isDisabled(e)) || shown[0];
          if (!el) return null;
          document.querySelectorAll("[data-a578t]").forEach(n => n.removeAttribute("data-a578t")); el.setAttribute("data-a578t", "1");
          return { interactive: el.matches("a[href],button,input,select,textarea,[tabindex]:not([tabindex='-1'])"), disabled: isDisabled(el) };
        }, selector);
        if (!found) continue;
        const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
        const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: '[data-a578t="1"]' });
        const entry = { selector, disabled: found.disabled };
        // Hover/focus only exist for interactive controls; forcing :focus on a
        // static eyebrow would paint a ring that can never occur.
        const states = found.interactive ? [["rest", []], ["hover", ["hover"]], ["focus", ["focus", "focus-visible"]]] : [["rest", []]];
        for (const [state, forced] of states) {
          await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: forced });
          await page.waitForTimeout(260);
          const [m] = await page.evaluate(fn => (new Function(`return (${fn})`)())({ onlySelectors: ['[data-a578t="1"]'] }), measure.toString());
          if (!m) continue;
          const px = await pixelRatio(page, m.idx, m.fg);
          entry[state] = { ratio: Math.min(m.ratio, px?.ratio ?? Infinity), computedRatio: m.ratio, pixelRatio: px?.ratio ?? null, floor: m.floor, color: m.color, bg: m.bg, pixelBg: px?.bg ?? null, text: m.text };
        }
        await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
        row.targets.push(entry);
      }
      await cdp.detach();
      row.targetBelow = row.targets.filter(t => !t.disabled).flatMap(t => ["rest", "hover", "focus"].filter(s => t[s] && t[s].ratio < t[s].floor).map(s => `${t.selector}:${s}=${t[s].ratio}`));
      const axe = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      row.axeViolations = axe.violations.flatMap(v => v.nodes.map(n => ({ target: n.target.join(" "), summary: n.failureSummary?.slice(0, 160) })));
      row.axeIncomplete = axe.incomplete.reduce((s, v) => s + v.nodes.length, 0);
      row.axePasses = axe.passes.reduce((s, v) => s + v.nodes.length, 0);
      if (values.shots) { row.shot = path.join(values.out, `${route.replace(/\W+/g, "_")}-${width}-${system}-${accent}.jpg`); await page.screenshot({ path: row.shot, type: "jpeg", quality: 70 }); }
      row.ok = !row.below.length && !row.targetBelow.length && !row.axeViolations.length;
    } catch (error) {
      row.ok = false; row.error = String(error.message || error).slice(0, 300);
    }
    if (!row.ok) failures++;
    fs.appendFileSync(jsonl, JSON.stringify(row) + "\n");
    console.log(`${row.ok ? "PASS" : "FAIL"} ${key} min=${row.minRatio?.toFixed?.(3)} below=${row.below?.length ?? "-"} tgt=${row.targetBelow?.length ?? "-"} axe=${row.axeViolations?.length ?? "-"}${row.error ? " ERR " + row.error : ""}`);
    await context.close();
  }
} finally {
  if (identity) {
    const teardown = await identity.teardown().catch(error => ({ error: error.message }));
    fs.writeFileSync(path.join(values.out, `teardown-${Date.now()}.json`), JSON.stringify(teardown, null, 2));
  }
  await browser.close();
}
console.log(failures ? `FAIL ${failures} cells` : "PASS all cells");
process.exit(failures ? 1 : 0);
