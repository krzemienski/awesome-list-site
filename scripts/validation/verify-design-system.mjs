#!/usr/bin/env node
/**
 * verify-design-system.mjs — browser driver for the "Verify Design-System
 * Compliance" skill (.agents/skills/verify-design-system/SKILL.md).
 *
 * It opens the running app in a real Chromium, and for every key screen ×
 * viewport width it executes the skill's eleven stages in order, evaluating
 * the stage expressions in-page exactly as the skill prints them, cycling the
 * five systems live (Stage 11) with a screenshot per system, and probing the
 * pre-paint boot (Stage 3) with the app bundle blocked. Everything it measured
 * lands in one run directory: results.json, REPORT.md and the PNGs.
 *
 * The runner never decides the verdict. The agent running the skill reads the
 * report, reviews every screenshot, and writes the verdict block.
 *
 *   node scripts/validation/verify-design-system.mjs \
 *     --base-url http://localhost:5000 \
 *     --out reports/design-system-audit/2026-09-18T12-00-00 \
 *     [--widths 1440,375] [--screens home,about,...] [--systems editorial,...]
 *     [--chromium /opt/pw-browsers/chromium] [--proxy http://host:port]
 *     [--resource-id 123] [--category-slug intro-learning] [--repo .]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ args */
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
}

const BASE_URL = String(arg("base-url", process.env.BASE_URL || "http://localhost:5000")).replace(/\/$/, "");
const REPO = path.resolve(String(arg("repo", path.resolve(__dirname, "..", ".."))));
const OUT = path.resolve(String(arg("out", path.join(REPO, "reports", "design-system-audit", new Date().toISOString().replace(/[:.]/g, "-")))));
const WIDTHS = String(arg("widths", "1440,375")).split(",").map((w) => Number(w.trim())).filter(Boolean);
const SYSTEMS_ALL = ["editorial", "terminal", "geist", "brutalist", "swiss"];
const SYSTEMS = String(arg("systems", SYSTEMS_ALL.join(","))).split(",").map((s) => s.trim()).filter(Boolean);
const CHROMIUM = arg("chromium", process.env.DS_AUDIT_CHROMIUM || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined));
const PROXY = arg("proxy", process.env.DS_AUDIT_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy || undefined);
const DS_CSS = path.resolve(REPO, String(arg("ds-css", "client/src/styles/design-system.css")));
const SCAN_ROOT = path.resolve(REPO, String(arg("scan-root", "client/src")));
const SWITCH_WAIT_MS = 800; // the skill's Stage 11 loop waits 800ms between systems
const FONT_WAIT_MS = Number(arg("font-wait-ms", 15000));

/* ------------------------------------------------------------ screens */
const SCREEN_DEFS = {
  "home": { path: "/", ready: "main" },
  "about": { path: "/about", ready: "main h1" },
  "journeys": { path: "/journeys", ready: "main h1" },
  "category": { path: (o) => `/category/${o.categorySlug}`, ready: "main h1" },
  "resource": { path: (o) => `/resource/${o.resourceId}`, ready: "main h1" },
  "login": { path: "/login", ready: "main" },
  "theme-settings": { path: "/settings/theme", ready: "[data-testid='system-picker']" },
  "not-found": { path: "/this-route-does-not-exist", ready: "main h1" },
};
const SCREENS = String(arg("screens", Object.keys(SCREEN_DEFS).join(","))).split(",").map((s) => s.trim()).filter(Boolean);

/* ------------------------------------------------------------- helpers */
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function writeJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n"); }
function rel(p) { return path.relative(process.cwd(), p) || "."; }
async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}
function rg(args) {
  const r = spawnSync("rg", args, { cwd: REPO, encoding: "utf8" });
  if (r.error) throw new Error(`rg failed: ${r.error.message}`);
  return r.stdout.split("\n").filter(Boolean);
}
/** Best-effort steps (optional waits, screenshots, key presses) swallow their rejection. */
const noop = () => undefined;

/* ------------------------------------------------ Stage 5: repo scans */
// The skill's own commands, executed verbatim against SCAN_ROOT, then each hit
// is classified against the skill's "acceptable hardcoded values" list.
const STATUS_HEX = new Set(["#34d08c", "#ffb84d", "#ff5c7a"]);
function classifyHit(line, prev) {
  const lower = line.toLowerCase();
  if (/ds-ok/i.test(line) || (prev && /ds-ok/i.test(prev))) return "ds-ok-escape";
  const hexes = lower.match(/#[0-9a-f]{3,8}\b/g) || [];
  if (hexes.length && hexes.every((h) => STATUS_HEX.has(h))) return "status-color";
  if (hexes.length && hexes.every((h) => h === "#0a0a0a" || h === "#000" || h === "#000000") && /color\s*:/.test(lower) && /accent|primary|btn|button|pill|logo|skip-link|on-accent/.test(lower)) return "ink-on-accent";
  if (/<svg|<path|fill=|stroke=/.test(lower)) return "svg-fixed-paint";
  return "candidate";
}
function stage5Scan() {
  const globs = ["-g", "!**/design-system.css", "-g", "!**/design-systems.js", "-g", "!**/design-system.js"];
  const cmds = {
    hexCss: ["--type", "css", "-n", "#[0-9a-fA-F]{3,8}\\b", SCAN_ROOT, ...globs],
    pxBorderCss: ["--type", "css", "-n", "border(-radius)?:\\s*\\d+px", SCAN_ROOT, ...globs],
    fontFamilyCss: ["--type", "css", "-n", "font-family:\\s*['\"]", SCAN_ROOT, ...globs],
    inlineHexMarkup: ["-n", "style=\\{?\\{[^}]*#[0-9a-fA-F]{3,6}", SCAN_ROOT, "-g", "*.{tsx,jsx,vue,html}"],
    colorHexMarkup: ["-n", "color:\\s*['\"]#[0-9a-fA-F]{3,6}", SCAN_ROOT, "-g", "*.{tsx,jsx,vue,html}"],
  };
  const out = {};
  for (const [key, args] of Object.entries(cmds)) {
    let lines = [];
    try { lines = rg(args); } catch (e) { out[key] = { error: String(e) }; continue; }
    const hits = lines.map((l) => {
      const m = /^(.*?):(\d+):(.*)$/.exec(l);
      if (!m) return null;
      const file = path.resolve(REPO, m[1]);
      const lineNo = Number(m[2]);
      let prev = "";
      try { const src = fs.readFileSync(file, "utf8").split("\n"); prev = src.slice(Math.max(0, lineNo - 4), lineNo - 1).join("\n"); } catch { /* best effort */ }
      return { file: path.relative(REPO, file), line: lineNo, text: m[3].trim().slice(0, 200), class: classifyHit(m[3], prev) };
    }).filter(Boolean);
    out[key] = { command: `rg ${args.map((a) => (a.includes(" ") || a.includes("\\") ? JSON.stringify(a) : a)).join(" ")}`, total: hits.length, candidates: hits.filter((h) => h.class === "candidate"), acceptable: hits.filter((h) => h.class !== "candidate") };
  }
  return out;
}

/* --------------------------------------------- Stage 10: skin block */
function stage10Scan() {
  const cmd = ["-c", "\\[data-system=\"(editorial|terminal|geist|brutalist|swiss)\"\\]", DS_CSS];
  let count = 0;
  try { count = Number(rg(cmd)[0] || 0); } catch (e) { return { error: String(e) }; }
  return { file: path.relative(REPO, DS_CSS), command: `rg '\\[data-system="(editorial|terminal|geist|brutalist|swiss)"\\]' ${path.relative(REPO, DS_CSS)} | wc -l`, count, pass: count >= 15 };
}

/* --------------------------------------------- in-page evaluations */
// Every function below is serialized into the page. Keep them self-contained.
const PAGE = {
  stage1() {
    const globals = {
      applyDesignSystem: typeof window.applyDesignSystem === "function",
      designSystems: window.DESIGN_SYSTEMS ? Object.keys(window.DESIGN_SYSTEMS).length : 0,
      accents: Array.isArray(window.ACCENTS) ? window.ACCENTS.length : 0,
      systemDefaultAccent: !!window.SYSTEM_DEFAULT_ACCENT && Object.keys(window.SYSTEM_DEFAULT_ACCENT).length,
    };
    const sheets = [];
    for (const s of Array.from(document.styleSheets)) {
      let has = false; let n = 0;
      try {
        for (const r of Array.from(s.cssRules)) {
          n++;
          if (r.selectorText === ":root" && r.style && r.style.getPropertyValue("--bg")) { has = true; break; }
        }
      } catch { /* cross-origin */ }
      if (has) sheets.push({ href: s.href || (s.ownerNode && s.ownerNode.getAttribute && s.ownerNode.getAttribute("data-vite-dev-id")) || "<inline style>", rules: n });
    }
    return { globals, tokenStylesheets: sheets, pass: globals.applyDesignSystem && globals.designSystems === 5 && globals.accents === 10 && sheets.length > 0 };
  },
  stage2() {
    const html = document.documentElement;
    const system = html.getAttribute("data-system");
    const accent = html.getAttribute("data-accent");
    const bg = getComputedStyle(html).getPropertyValue("--bg").trim();
    const systems = ["editorial", "terminal", "geist", "brutalist", "swiss"];
    const accents = ["crimson", "magenta", "orange", "amber", "emerald", "matrix", "cyan", "violet", "lime", "rose"];
    return { system, accent, bg, pass: systems.includes(system) && accents.includes(accent) && (bg === "#000000" || bg === "#000") };
  },
  stage3Static() {
    // Is the boot call a synchronous inline <script> in <head>? (source inspection, in-DOM)
    const scripts = Array.from(document.head.querySelectorAll("script")).map((s) => ({
      inline: !s.src, type: s.getAttribute("type") || "", defer: s.defer, async: s.async,
      mentionsBoot: /ds-system|applyDesignSystem|data-system/.test(s.textContent || ""),
    }));
    const boot = scripts.filter((s) => s.mentionsBoot);
    const sync = boot.some((s) => s.inline && s.type !== "module" && !s.defer && !s.async);
    return { bootScripts: boot, synchronousInlineHeadBoot: sync };
  },
  stage4() {
    const page = document.querySelector(".page");
    const grain = document.querySelector(".grain");
    const gs = grain ? getComputedStyle(grain) : null;
    const ps = page ? getComputedStyle(page, "::after") : null;
    return {
      page: !!page, grain: !!grain,
      grainBackgroundImage: gs ? (gs.backgroundImage !== "none") : false,
      grainOpacity: gs ? gs.opacity : null,
      atmosphereOnPage: page ? (getComputedStyle(page).backgroundImage !== "none" || (ps && ps.backgroundImage !== "none")) : false,
      pass: !!page && !!grain,
    };
  },
  stage6() {
    const describe = (el) => ({
      tag: el.tagName.toLowerCase(), classes: Array.from(el.classList).join(" "), role: el.getAttribute("role") || "",
      testid: el.getAttribute("data-testid") || "", label: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
      visible: el.getClientRects().length > 0,
    });
    /* Buttons — the skill's expression, verbatim */
    const buttons = document.querySelectorAll("button");
    const stray = [...buttons].filter((b) =>
      !b.closest(".tabs") && /* tabs use .tab */
      !b.closest(".mobile-drawer") &&
      ![...b.classList].some((c) => c.startsWith("btn") || c.startsWith("tab") || c.startsWith("icon-btn")),
    );
    /* Extended classification: buttons the design's own markup renders with
       other design-system component classes (see styles.css) are compliant. */
    const DS_BUTTON_CLASSES = ["btn", "tab", "icon-btn", "accordion-header", "header-search-trigger", "user-pill", "mobile-menu-btn", "ds-system-pill", "nav-link", "footer-link", "sub-item", "card", "chip", "select"];
    const strayExtended = stray.filter((b) => !Array.from(b.classList).some((c) => DS_BUTTON_CLASSES.includes(c) || c.startsWith("btn") || c.startsWith("tab") || c.startsWith("icon-btn")));
    /* Inputs */
    const textTypes = new Set(["", "text", "search", "email", "url", "password", "number", "tel", "date", "datetime-local", "time", "month", "week"]);
    const inputs = [...document.querySelectorAll("input")].filter((i) => textTypes.has((i.getAttribute("type") || "").toLowerCase()));
    /* The command palette field is class-less in the design's own CmdPalette (layout.jsx) and is skinned by the palette rule, so it is not a stray input. */
    const strayInputs = inputs.filter((i) => !i.classList.contains("input") && !i.classList.contains("search-input") && !i.hasAttribute("cmdk-input"));
    const selects = [...document.querySelectorAll("select, [role='combobox']")];
    const straySelects = selects.filter((s) => !s.classList.contains("select") && !s.classList.contains("input") && !s.hasAttribute("cmdk-input"));
    const textareas = [...document.querySelectorAll("textarea")];
    const strayTextareas = textareas.filter((t) => !t.classList.contains("textarea"));
    /* Keyboard hints */
    const kbds = [...document.querySelectorAll("kbd")];
    const strayKbd = kbds.filter((k) => !k.classList.contains("kbd") && !k.closest(".search-palette"));
    /* Cards: clickable containers with a hover transform/border change that are not .card */
    const clickableCards = [...document.querySelectorAll("a, button, [role='link'], [role='button']")].filter((el) => {
      if (el.closest(".card")) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 160 || r.height < 72) return false;
      const cs = getComputedStyle(el);
      return cs.borderStyle !== "none" && cs.borderWidth !== "0px" && (el.querySelector("h2, h3, h4, [class*='title']") !== null);
    });
    /* Eyebrow candidates: mono, uppercase, tracked, small labels that are not .eyebrow */
    const monoFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
    const eyebrowCandidates = [...document.querySelectorAll("div, span, p, code, small, h2, h3, h4, h5, h6")].filter((el) => {
      if (el.children.length > 2) return false;
      const text = (el.textContent || "").trim();
      if (!text || text.length > 40 || text.length < 2) return false;
      if (el.closest(".eyebrow, .chip, .kbd, .tab, th, .search-palette, [data-ds='chip'], .badge, button, a, [role='status'], [aria-live], .sr-only")) return false;
      if (el.classList.contains("eyebrow") || el.classList.contains("chip") || el.classList.contains("kbd") || el.classList.contains("sr-only")) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const fam = cs.fontFamily.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
      const size = parseFloat(cs.fontSize);
      const ls = parseFloat(cs.letterSpacing) || 0;
      return fam === monoFamily && cs.textTransform === "uppercase" && size <= 12 && ls >= 1;
    });
    return {
      buttonsTotal: buttons.length,
      strayExact: stray.length,
      strayExactList: stray.slice(0, 60).map(describe),
      strayExtended: strayExtended.length,
      strayExtendedList: strayExtended.slice(0, 60).map(describe),
      inputs: { total: inputs.length, stray: strayInputs.length, list: strayInputs.map(describe) },
      selects: { total: selects.length, stray: straySelects.length, list: straySelects.map(describe) },
      textareas: { total: textareas.length, stray: strayTextareas.length, list: strayTextareas.map(describe) },
      kbd: { total: kbds.length, stray: strayKbd.length, list: strayKbd.map(describe) },
      cardCandidates: clickableCards.slice(0, 40).map(describe),
      eyebrowCandidates: eyebrowCandidates.slice(0, 40).map(describe),
    };
  },
  stage7() {
    /* The skill's expression, verbatim */
    const all = [...document.querySelectorAll("*")];
    const accentUsersExact = all.filter((el) => {
      const s = getComputedStyle(el);
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().toLowerCase();
      return [s.color, s.backgroundColor, s.borderColor].some((c) => c.toLowerCase().includes(accent.replace("#", "").slice(0, 6)));
    });
    /* Computed colors come back as rgb(); the exact expression compares hex text
       and therefore cannot match. Normalise the token through the CSSOM and
       compare the rendered rgb() triple instead. */
    const probe = document.createElement("span"); probe.style.display = "none";
    document.body.appendChild(probe);
    probe.style.color = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const accentRgb = getComputedStyle(probe).color; probe.remove();
    const users = all.filter((el) => {
      if (el.closest(".grain, script, style, head")) return false;
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0" || el.getClientRects().length === 0) return false;
      const r = el.getBoundingClientRect();
      if (r.bottom + window.scrollY <= 0 || r.right <= 0 || r.width === 0 || r.height === 0) return false; // off-document (e.g. parked skip link)
      const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
      // An accent *moment* is where the accent is introduced: inherited text colour is the same moment as its ancestor.
      const introducesColor = s.color === accentRgb && (!parent || parent.color !== accentRgb);
      const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
      const textMoment = introducesColor && (ownText || el.tagName.toLowerCase() === "svg" || el.children.length === 0);
      const fill = [s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor].some((c) => c === accentRgb);
      return textMoment || fill;
    });
    const vh = window.innerHeight;
    const describe = (el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), classes: Array.from(el.classList).join(" ").slice(0, 80), text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40), top: Math.round(r.top + window.scrollY) }; };
    const described = users.map(describe);
    const docHeight = document.documentElement.scrollHeight;
    // The same component repeated down a list (every card's mark, every
    // card's CTA) is one accent *pattern*; the rule counts distinct moments.
    const pattern = (d) => `${d.tag}|${d.classes.replace(/\b(min-h|min-w|w|h|px|py|mt|mb|ml|mr)-\S+/g, "").trim()}`;
    let maxPerViewport = 0, maxRawPerViewport = 0;
    for (let y = 0; y < docHeight; y += Math.max(1, Math.floor(vh / 2))) {
      const inWindow = described.filter((d) => d.top >= y && d.top < y + vh);
      const distinct = new Set(inWindow.map(pattern)).size;
      if (distinct > maxPerViewport) maxPerViewport = distinct;
      if (inWindow.length > maxRawPerViewport) maxRawPerViewport = inWindow.length;
    }
    const patterns = [...new Set(described.map(pattern))];
    return { accentRgb, exactExpressionCount: accentUsersExact.length, count: users.length, distinctPatterns: patterns.length, maxPerViewport, maxRawPerViewport, viewportsWorth: Math.ceil(docHeight / vh), pass: maxPerViewport <= 8, list: described.slice(0, 80), patterns: patterns.slice(0, 60) };
  },
  stage8() {
    /* The skill's expression, verbatim */
    const paragraphs = document.querySelectorAll("p, li");
    const text3 = getComputedStyle(document.documentElement).getPropertyValue("--text-3").trim();
    const offendersExact = [...paragraphs].filter((p) => getComputedStyle(p).color === text3 && p.textContent.length > 60);
    /* Normalised comparison (computed rgba() vs authored token text) */
    const probe = document.createElement("span"); probe.style.display = "none"; document.body.appendChild(probe);
    probe.style.color = text3; const text3Rgb = getComputedStyle(probe).color;
    probe.style.color = getComputedStyle(document.documentElement).getPropertyValue("--text-4").trim(); const text4Rgb = getComputedStyle(probe).color;
    probe.remove();
    const offenders = [...paragraphs].filter((p) => {
      const c = getComputedStyle(p).color;
      return (c === text3Rgb || c === text4Rgb) && p.textContent.trim().length > 60 && p.getClientRects().length > 0;
    });
    return { text3, text3Rgb, exactExpressionCount: offendersExact.length, count: offenders.length, pass: offenders.length === 0, list: offenders.slice(0, 30).map((p) => ({ tag: p.tagName.toLowerCase(), classes: Array.from(p.classList).join(" ").slice(0, 80), text: p.textContent.trim().slice(0, 80) })) };
  },
  async stage9(waitMs) {
    const html = document.documentElement;
    const sys = html.getAttribute("data-system");
    const stackFor = (t) => getComputedStyle(html).getPropertyValue(t).trim();
    const fam = (stack) => stack.split(",")[0].replace(/['"]/g, "").trim();
    const display = fam(stackFor("--font-display")), body = fam(stackFor("--font-body")), mono = fam(stackFor("--font-mono"));
    // Touch every family so the browser actually requests the faces.
    const probe = document.createElement("div"); probe.style.cssText = "position:absolute;left:-9999px;top:0;font-size:16px";
    probe.innerHTML = `<span style="font-family:'${display}'">Ag</span><span style="font-family:'${body}'">Ag</span><span style="font-family:'${mono}'">Ag</span><span style="font-family:'${display}';font-style:italic">Ag</span>`;
    document.body.appendChild(probe);
    const deadline = Date.now() + waitMs;
    const loadedFor = (f) => [...document.fonts].some((ff) => ff.family.replace(/['"]/g, "") === f && ff.status === "loaded");
    while (Date.now() < deadline && !(loadedFor(display) && loadedFor(body) && loadedFor(mono))) {
      await new Promise((r) => setTimeout(r, 250));
    }
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]); } catch { /* best effort */ }
    probe.remove();
    const faces = (f) => [...document.fonts].filter((ff) => ff.family.replace(/['"]/g, "") === f).map((ff) => `${ff.weight}/${ff.style}:${ff.status}`);
    /* The skill's expression, verbatim, for the display family */
    const stack = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
    const family = stack.split(",")[0].replace(/['"]/g, "").trim();
    const check = document.fonts.check(`16px "${family}"`);
    const links = [...document.querySelectorAll("link[rel='stylesheet']")].map((l) => l.href).filter((h) => /fonts\.googleapis/.test(h));
    const linkHas = (f) => links.some((h) => decodeURIComponent(h).replace(/\+/g, " ").includes(`family=${f}`));
    return {
      system: sys, display, body, mono, check,
      loaded: { display: loadedFor(display), body: loadedFor(body), mono: loadedFor(mono) },
      faces: { display: faces(display), body: faces(body), mono: faces(mono) },
      linkDeclares: { display: linkHas(display), body: linkHas(body), mono: linkHas(mono) },
      pass: check && loadedFor(display) && loadedFor(body) && loadedFor(mono),
    };
  },
  stage10() {
    let count = 0;
    for (const s of Array.from(document.styleSheets)) {
      try { for (const r of Array.from(s.cssRules)) { if (r.selectorText && r.selectorText.includes("[data-system=")) count++; } } catch { /* best effort */ }
    }
    return { skinSelectorsInBrowser: count, pass: count >= 15 };
  },
  signature() {
    const html = document.documentElement; const cs = getComputedStyle(html);
    const pick = (sel, props) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const p of props) o[p] = s[p]; return o; };
    const chip = document.querySelector(".chip, [data-ds='chip']");
    const chipBefore = chip ? getComputedStyle(chip, "::before").content : null;
    return {
      system: html.getAttribute("data-system"), accent: html.getAttribute("data-accent"),
      tokens: { radius: cs.getPropertyValue("--radius").trim(), radiusSm: cs.getPropertyValue("--radius-sm").trim(), borderW: cs.getPropertyValue("--border-w").trim(), fontDisplay: cs.getPropertyValue("--font-display").trim(), fontBody: cs.getPropertyValue("--font-body").trim(), shadow: cs.getPropertyValue("--shadow").trim(), grain: cs.getPropertyValue("--grain-opacity").trim(), atmosphere: cs.getPropertyValue("--bg-atmosphere").trim().slice(0, 60) },
      body: pick("body", ["fontFamily", "backgroundColor", "color"]),
      card: pick(".card", ["borderRadius", "borderWidth", "borderColor", "boxShadow", "backgroundColor"]),
      btnPrimary: pick(".btn.primary, [data-ds-variant='default']", ["borderRadius", "backgroundColor", "color", "borderWidth", "textTransform", "fontFamily"]),
      btn: pick(".btn:not(.primary)", ["borderRadius", "borderWidth", "textTransform"]),
      chip: chip ? { borderRadius: getComputedStyle(chip).borderRadius, before: chipBefore, textTransform: getComputedStyle(chip).textTransform, fontFamily: getComputedStyle(chip).fontFamily } : null,
      input: pick(".input, input.search-input", ["borderRadius", "borderWidth", "backgroundColor"]),
      h1: pick("main h1", ["fontFamily", "fontWeight", "letterSpacing", "fontSize"]),
    };
  },
  stage11Symptoms(system) {
    const html = document.documentElement;
    const q = (sel) => document.querySelector(sel);
    const cs = (el, pseudo) => (el ? getComputedStyle(el, pseudo) : null);
    const card = q(".card"), chip = q(".chip, [data-ds='chip']"), btn = q(".btn, [data-ds-variant]"), input = q(".input, input.search-input");
    const expect = {
      terminal: { radius: "0px", borderW: "1px", bracket: true, display: "IBM Plex Mono" },
      brutalist: { radius: "0px", borderW: "2px", bracket: false, display: "Instrument Serif" },
      editorial: { radius: "12px", borderW: "1px", bracket: false, display: "Fraunces" },
      geist: { radius: "10px", borderW: "1px", bracket: false, display: "Geist" },
      swiss: { radius: "4px", borderW: "1px", bracket: false, display: "Manrope" },
    }[system];
    const fam = getComputedStyle(html).getPropertyValue("--font-display").split(",")[0].replace(/['"]/g, "").trim();
    const observed = {
      cardRadius: cs(card)?.borderRadius ?? null,
      cardBorderW: cs(card)?.borderTopWidth ?? null,
      chipBracket: chip ? (cs(chip, "::before")?.content || "").includes("[") : null,
      btnRadius: cs(btn)?.borderRadius ?? null,
      inputRadius: cs(input)?.borderRadius ?? null,
      displayFamily: fam,
      bodyFamily: getComputedStyle(document.body).fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
    };
    const problems = [];
    if (card && observed.cardRadius !== expect.radius) problems.push(`.card border-radius is ${observed.cardRadius}, expected ${expect.radius} in ${system}`);
    if (card && observed.cardBorderW !== expect.borderW) problems.push(`.card border-width is ${observed.cardBorderW}, expected ${expect.borderW} in ${system}`);
    if (chip && expect.bracket && !observed.chipBracket) problems.push(`chip has no [bracket] ::before in terminal`);
    if (btn && observed.btnRadius !== (system === "editorial" ? "8px" : system === "geist" ? "6px" : system === "swiss" ? "2px" : "0px")) problems.push(`button border-radius is ${observed.btnRadius} in ${system}`);
    if (input && observed.inputRadius !== (system === "editorial" ? "8px" : system === "geist" ? "6px" : system === "swiss" ? "2px" : "0px")) problems.push(`input border-radius is ${observed.inputRadius} in ${system}`);
    if (observed.displayFamily !== expect.display) problems.push(`--font-display resolves to ${observed.displayFamily}, expected ${expect.display}`);
    return { expect, observed, problems, present: { card: !!card, chip: !!chip, btn: !!btn, input: !!input } };
  },
};

/* ------------------------------------------------------ browser setup */
async function launch() {
  const args = ["--ignore-certificate-errors", "--disable-http2"];
  const opts = { args, headless: true };
  if (CHROMIUM) opts.executablePath = String(CHROMIUM);
  if (PROXY) opts.proxy = { server: String(PROXY), bypass: process.env.DS_AUDIT_PROXY_BYPASS || "localhost,127.0.0.1,[::1]" };
  return chromium.launch(opts);
}
async function newContext(browser, width, storage) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 812 : 900 }, ignoreHTTPSErrors: true, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const seed = JSON.stringify(storage || {});
  await ctx.addInitScript((seedJson) => {
    try {
      const seed = JSON.parse(seedJson);
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
      // Analytics consent is a bottom bar; keep the audit surface stable.
      if (!localStorage.getItem("analytics-consent")) localStorage.setItem("analytics-consent", "denied");
      if (!document.cookie.includes("analytics-consent=")) document.cookie = "analytics-consent=denied; Path=/; Max-Age=31536000; SameSite=Lax";
      // The init script runs before <html> exists: read documentElement lazily.
      const snap = () => { const html = document.documentElement; return html ? { system: html.getAttribute("data-system"), accent: html.getAttribute("data-accent"), bg: getComputedStyle(html).getPropertyValue("--bg").trim(), htmlBg: getComputedStyle(html).backgroundColor, bodyBg: document.body ? getComputedStyle(document.body).backgroundColor : null } : null; };
      window.__dsBoot = { atInit: snap() };
      document.addEventListener("DOMContentLoaded", () => { window.__dsBoot.atDomContentLoaded = snap(); });
      window.__dsBoot.firstFrame = null;
      requestAnimationFrame(() => { window.__dsBoot.firstFrame = snap(); });
    } catch (e) { window.__dsBootError = String(e); }
  }, seed);
  return ctx;
}
async function settle(page, ready) {
  await page.waitForLoadState("load").catch(noop);
  if (ready) await page.waitForSelector(ready, { timeout: 30000 }).catch(noop);
  await page.waitForFunction(() => typeof window.applyDesignSystem === "function", { timeout: 30000 }).catch(noop);
  await page.waitForTimeout(1200);
}

/* ------------------------------------------------------------ main */
async function main() {
  ensureDir(OUT);
  const shots = path.join(OUT, "screenshots"); ensureDir(shots);
  const started = new Date().toISOString();
  const nav = await fetchJson(`${BASE_URL}/api/awesome-list/nav`).catch(() => null);
  const categorySlug = String(arg("category-slug", nav?.categories?.find((c) => c.slug === "intro-learning")?.slug || nav?.categories?.[0]?.slug || "intro-learning"));
  let resourceId = arg("resource-id", null);
  if (!resourceId) {
    const r = await fetchJson(`${BASE_URL}/api/resources?limit=1`).catch(() => null);
    resourceId = r?.resources?.[0]?.id ?? 1;
  }
  const opts = { categorySlug, resourceId };
  const version = await fetch(`${BASE_URL}/api/version`).then((r) => r.json()).catch(() => null);

  const results = { started, baseUrl: BASE_URL, version, chromium: CHROMIUM || "playwright-default", proxy: PROXY ? "yes" : "no", widths: WIDTHS, systems: SYSTEMS, screens: {}, repo: {} };
  results.repo.stage5 = stage5Scan();
  results.repo.stage10 = stage10Scan();

  const browser = await launch();
  results.browserVersion = browser.version();
  try {
    for (const screenId of SCREENS) {
      const def = SCREEN_DEFS[screenId];
      if (!def) { console.warn(`unknown screen ${screenId}`); continue; }
      const urlPath = typeof def.path === "function" ? def.path(opts) : def.path;
      const url = `${BASE_URL}${urlPath}`;
      results.screens[screenId] = { path: urlPath, widths: {} };
      for (const width of WIDTHS) {
        console.log(`▶ ${screenId} @${width}`);
        const rec = { stage3: {}, systems: {}, console: [] };
        results.screens[screenId].widths[width] = rec;

        /* Stage 3 — pre-paint boot probe per stored system (bundle blocked + real load) */
        for (const sys of SYSTEMS) {
          const accent = { editorial: "crimson", terminal: "matrix", geist: "cyan", brutalist: "amber", swiss: "orange" }[sys];
          const ctx = await newContext(browser, width, { "ds-system": sys, "ds-accent": accent });
          const page = await ctx.newPage();
          // Block the app bundle: what paints now is exactly the pre-JS document.
          await page.route(/(\/src\/main\.tsx|\/assets\/index-[^/]+\.js)(\?.*)?$/, (route) => route.abort());
          const t0 = Date.now();
          await page.goto(url, { waitUntil: "load", timeout: 60000 }).catch(noop);
          await page.waitForTimeout(400);
          const blocked = await page.evaluate(() => ({ ...window.__dsBoot, now: { system: document.documentElement.getAttribute("data-system"), accent: document.documentElement.getAttribute("data-accent"), bg: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(), htmlBg: getComputedStyle(document.documentElement).backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor, tokenStylesheetPresent: Array.from(document.styleSheets).some((s) => { try { return Array.from(s.cssRules).some((r) => r.selectorText === ":root" && r.style.getPropertyValue("--bg")); } catch { return false; } }) } })).catch((e) => ({ error: String(e) }));
          const shotBlocked = path.join(shots, `${screenId}__${width}__${sys}__stage3-prebundle.png`);
          await page.screenshot({ path: shotBlocked, fullPage: false }).catch(noop);
          await page.unroute(/(\/src\/main\.tsx|\/assets\/index-[^/]+\.js)(\?.*)?$/);
          // Real load with the same stored preference: attribute state at DOMContentLoaded and first frame.
          await page.goto(url, { waitUntil: "load", timeout: 60000 }).catch(noop);
          await page.waitForTimeout(300);
          const real = await page.evaluate(() => window.__dsBoot).catch((e) => ({ error: String(e) }));
          const staticBoot = await page.evaluate(PAGE.stage3Static).catch((e) => ({ error: String(e) }));
          rec.stage3[sys] = {
            stored: { system: sys, accent }, bundleBlocked: blocked, realLoad: real, bootScript: staticBoot,
            pass: blocked?.now?.system === sys && blocked?.now?.accent === accent && real?.atDomContentLoaded?.system === sys && staticBoot?.synchronousInlineHeadBoot === true,
            screenshot: rel(shotBlocked), ms: Date.now() - t0,
          };
          await ctx.close();
        }

        /* Main pass — Stages 1,2,4,9,10 on load, then Stage 11 loop with 6,7,8,9 per system */
        const ctx = await newContext(browser, width, { "ds-system": "editorial", "ds-accent": "crimson" });
        const page = await ctx.newPage();
        page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") rec.console.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
        page.on("pageerror", (e) => rec.console.push(`pageerror: ${String(e).slice(0, 200)}`));
        await page.goto(url, { waitUntil: "load", timeout: 60000 }).catch((e) => rec.console.push(`goto: ${e.message}`));
        await settle(page, def.ready);
        rec.finalUrl = page.url();
        rec.title = await page.title().catch(() => "");
        rec.stage1 = await page.evaluate(PAGE.stage1).catch((e) => ({ error: String(e) }));
        rec.stage2 = await page.evaluate(PAGE.stage2).catch((e) => ({ error: String(e) }));
        rec.stage4 = await page.evaluate(PAGE.stage4).catch((e) => ({ error: String(e) }));
        rec.stage10 = await page.evaluate(PAGE.stage10).catch((e) => ({ error: String(e) }));

        const signatures = {};
        /* Stage 11 — the skill's loop: applyDesignSystem(id, SYSTEM_DEFAULT_ACCENT[id]); wait 800ms; screenshot */
        for (const id of SYSTEMS) {
          const applied = await page.evaluate(async ([id, wait]) => {
            const before = document.documentElement.getAttribute("data-system");
            applyDesignSystem(id, window.SYSTEM_DEFAULT_ACCENT[id]);
            await new Promise((r) => setTimeout(r, wait));
            return { before, after: document.documentElement.getAttribute("data-system"), accent: document.documentElement.getAttribute("data-accent") };
          }, [id, SWITCH_WAIT_MS]).catch((e) => ({ error: String(e) }));
          const s = { applied };
          s.stage2 = await page.evaluate(PAGE.stage2).catch((e) => ({ error: String(e) }));
          s.stage9 = await page.evaluate(PAGE.stage9, FONT_WAIT_MS).catch((e) => ({ error: String(e) }));
          s.stage6 = await page.evaluate(PAGE.stage6).catch((e) => ({ error: String(e) }));
          s.stage7 = await page.evaluate(PAGE.stage7).catch((e) => ({ error: String(e) }));
          s.stage8 = await page.evaluate(PAGE.stage8).catch((e) => ({ error: String(e) }));
          s.symptoms = await page.evaluate(PAGE.stage11Symptoms, id).catch((e) => ({ error: String(e) }));
          s.signature = await page.evaluate(PAGE.signature).catch((e) => ({ error: String(e) }));
          signatures[id] = JSON.stringify({ t: s.signature?.tokens, c: s.signature?.card, b: s.signature?.btnPrimary, ch: s.signature?.chip, h: s.signature?.h1 });
          await page.evaluate(() => window.scrollTo(0, 0));
          const shot = path.join(shots, `${screenId}__${width}__${id}.png`);
          await page.screenshot({ path: shot, fullPage: true }).catch((e) => { s.screenshotError = e.message; });
          s.screenshot = rel(shot);
          rec.systems[id] = s;
          console.log(`   ${id}: stray=${s.stage6?.strayExtended} accentMax=${s.stage7?.maxPerViewport} text3=${s.stage8?.count} fonts=${s.stage9?.pass} symptoms=${s.symptoms?.problems?.length}`);
        }
        const distinct = new Set(Object.values(signatures)).size;
        rec.stage11 = { distinctSignatures: distinct, systemsCycled: Object.keys(rec.systems).length, looksTheSameEverywhere: distinct <= 1, symptoms: Object.fromEntries(Object.entries(rec.systems).map(([k, v]) => [k, v.symptoms?.problems || []])) };

        /* Extras — the mobile drawer (width < 768) and the ⌘K palette (desktop), one shot per system */
        rec.extras = {};
        try {
          if (width < 768) {
            for (const id of SYSTEMS) {
              await page.evaluate((id) => applyDesignSystem(id, window.SYSTEM_DEFAULT_ACCENT[id]), id);
              const trigger = page.locator("button.mobile-menu-btn, [data-testid='mobile-drawer-trigger']").first();
              if (await trigger.count()) {
                await trigger.click({ timeout: 5000 }).catch(noop);
                await page.waitForTimeout(500);
                const shot = path.join(shots, `${screenId}__${width}__${id}__drawer.png`);
                await page.screenshot({ path: shot, fullPage: false }).catch(noop);
                rec.extras[`drawer-${id}`] = { screenshot: rel(shot), stage6: await page.evaluate(PAGE.stage6).catch(() => null) };
                await page.keyboard.press("Escape").catch(noop);
                await page.waitForTimeout(400);
              }
            }
          } else if (screenId === "home") {
            for (const id of SYSTEMS) {
              await page.evaluate((id) => applyDesignSystem(id, window.SYSTEM_DEFAULT_ACCENT[id]), id);
              await page.keyboard.press("Control+K").catch(noop);
              await page.waitForTimeout(700);
              const shot = path.join(shots, `${screenId}__${width}__${id}__palette.png`);
              await page.screenshot({ path: shot, fullPage: false }).catch(noop);
              rec.extras[`palette-${id}`] = { screenshot: rel(shot), stage6: await page.evaluate(PAGE.stage6).catch(() => null) };
              await page.keyboard.press("Escape").catch(noop);
              await page.waitForTimeout(400);
            }
          }
        } catch (e) { rec.extras.error = String(e); }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  results.finished = new Date().toISOString();
  writeJson(path.join(OUT, "results.json"), results);
  fs.writeFileSync(path.join(OUT, "REPORT.md"), renderReport(results));
  console.log(`\nwrote ${rel(path.join(OUT, "results.json"))} and ${rel(path.join(OUT, "REPORT.md"))}`);
}

/* ------------------------------------------------------------ report */
function renderReport(r) {
  const L = [];
  L.push(`# Design-system audit run — machine findings`, ``, `Base URL: ${r.baseUrl}  `, `Build revision: ${r.version?.revision ?? "unknown"}  `, `Browser: Chromium ${r.browserVersion} (${r.chromium}${r.proxy === "yes" ? ", via proxy" : ""})  `, `Started: ${r.started} · Finished: ${r.finished}  `, `Widths: ${r.widths.join(", ")} · Systems: ${r.systems.join(", ")}`, ``);
  L.push(`> This file lists what the driver measured. It is evidence for the skill's verdict block, not the verdict. Review every screenshot listed below before deciding.`, ``);
  L.push(`## Stage 5 — hardcoded value scan (repository)`, ``);
  for (const [k, v] of Object.entries(r.repo.stage5)) {
    if (v.error) { L.push(`- ${k}: ERROR ${v.error}`); continue; }
    L.push(`- \`${v.command}\` → ${v.total} hits, **${v.candidates.length} candidates**, ${v.acceptable.length} acceptable (${Object.entries(v.acceptable.reduce((a, h) => { a[h.class] = (a[h.class] || 0) + 1; return a; }, {})).map(([c, n]) => `${c}: ${n}`).join(", ") || "none"})`);
    for (const h of v.candidates) L.push(`    - ${h.file}:${h.line} — \`${h.text.slice(0, 120)}\``);
  }
  L.push(``, `## Stage 10 — per-system skin block (repository)`, ``, `- ${r.repo.stage10.command} → **${r.repo.stage10.count}** (expected ≥ 15) → ${r.repo.stage10.pass ? "PASS" : "FAIL"}`, ``);
  for (const [screen, s] of Object.entries(r.screens)) {
    L.push(`## Screen: ${screen} (${s.path})`, ``);
    for (const [width, w] of Object.entries(s.widths)) {
      L.push(`### ${width}px — final URL ${w.finalUrl} · "${w.title}"`, ``);
      L.push(`- Stage 1: globals ${JSON.stringify(w.stage1?.globals)} · token stylesheet(s): ${w.stage1?.tokenStylesheets?.map((t) => t.href).join(", ") || "none"} → ${w.stage1?.pass ? "PASS" : "FAIL"}`);
      L.push(`- Stage 2 (on load): ${JSON.stringify({ system: w.stage2?.system, accent: w.stage2?.accent, bg: w.stage2?.bg })} → ${w.stage2?.pass ? "PASS" : "FAIL"}`);
      L.push(`- Stage 3 (synchronous boot, per stored system):`);
      for (const [sys, b] of Object.entries(w.stage3)) L.push(`    - stored ${sys}/${b.stored.accent}: bundle-blocked paint ${JSON.stringify(b.bundleBlocked?.now)} · at DOMContentLoaded ${JSON.stringify(b.realLoad?.atDomContentLoaded)} · first frame ${JSON.stringify(b.realLoad?.firstFrame)} · sync inline head boot: ${b.bootScript?.synchronousInlineHeadBoot} → ${b.pass ? "PASS" : "FAIL"} · ${b.screenshot}`);
      L.push(`- Stage 4: page=${w.stage4?.page} grain=${w.stage4?.grain} grainImage=${w.stage4?.grainBackgroundImage} grainOpacity=${w.stage4?.grainOpacity} atmosphere=${w.stage4?.atmosphereOnPage} → ${w.stage4?.pass ? "PASS" : "FAIL"}`);
      L.push(`- Stage 10 (in browser): ${w.stage10?.skinSelectorsInBrowser} [data-system=…] selectors → ${w.stage10?.pass ? "PASS" : "FAIL"}`);
      L.push(`- Stage 11: ${w.stage11?.systemsCycled} systems cycled, ${w.stage11?.distinctSignatures} distinct component signatures${w.stage11?.looksTheSameEverywhere ? " — **LOOKS THE SAME IN EVERY SYSTEM**" : ""}`);
      for (const [sys, v] of Object.entries(w.systems)) {
        L.push(``, `#### ${sys} × ${v.applied?.accent} — ${v.screenshot}`);
        L.push(`- Stage 2: ${JSON.stringify({ system: v.stage2?.system, accent: v.stage2?.accent, bg: v.stage2?.bg })} → ${v.stage2?.pass ? "PASS" : "FAIL"}`);
        const s6 = v.stage6 || {};
        L.push(`- Stage 6: buttons ${s6.buttonsTotal}, stray (exact expression) ${s6.strayExact}, stray (extended DS-class list) **${s6.strayExtended}**; inputs stray ${s6.inputs?.stray}/${s6.inputs?.total}; selects stray ${s6.selects?.stray}/${s6.selects?.total}; textareas stray ${s6.textareas?.stray}/${s6.textareas?.total}; kbd stray ${s6.kbd?.stray}/${s6.kbd?.total}; card candidates ${s6.cardCandidates?.length}; eyebrow candidates ${s6.eyebrowCandidates?.length}`);
        for (const b of (s6.strayExtendedList || []).slice(0, 25)) L.push(`    - stray button: <${b.tag} class="${b.classes}" role="${b.role}" data-testid="${b.testid}"> "${b.label}"${b.visible ? "" : " (not rendered)"}`);
        for (const b of (s6.inputs?.list || []).slice(0, 10)) L.push(`    - stray input: <${b.tag} class="${b.classes}" data-testid="${b.testid}"> "${b.label}"`);
        for (const b of (s6.selects?.list || []).slice(0, 10)) L.push(`    - stray select: <${b.tag} class="${b.classes}" role="${b.role}" data-testid="${b.testid}"> "${b.label}"`);
        for (const b of (s6.textareas?.list || []).slice(0, 10)) L.push(`    - stray textarea: <${b.tag} class="${b.classes}">`);
        for (const b of (s6.kbd?.list || []).slice(0, 10)) L.push(`    - stray kbd: <${b.tag} class="${b.classes}"> "${b.label}"`);
        for (const b of (s6.cardCandidates || []).slice(0, 10)) L.push(`    - card candidate (clickable bordered container without .card): <${b.tag} class="${b.classes.slice(0, 60)}" data-testid="${b.testid}"> "${b.label}"`);
        for (const b of (s6.eyebrowCandidates || []).slice(0, 10)) L.push(`    - eyebrow candidate (mono/uppercase/tracked label without .eyebrow): <${b.tag} class="${b.classes.slice(0, 60)}"> "${b.label}"`);
        L.push(`- Stage 7: accent ${v.stage7?.accentRgb}; exact expression count ${v.stage7?.exactExpressionCount}; rendered accent moments ${v.stage7?.count} (${v.stage7?.distinctPatterns} distinct patterns) over ${v.stage7?.viewportsWorth} viewport(s); max distinct per viewport **${v.stage7?.maxPerViewport}** (≤ 8; raw max ${v.stage7?.maxRawPerViewport}) → ${v.stage7?.pass ? "PASS" : "FAIL"}`);
        for (const pt of (v.stage7?.patterns || []).slice(0, 40)) L.push(`    - pattern: ${pt}`);
        L.push(`- Stage 8: text-3 ${v.stage8?.text3} (${v.stage8?.text3Rgb}); exact expression ${v.stage8?.exactExpressionCount}; normalised offenders **${v.stage8?.count}** → ${v.stage8?.pass ? "PASS" : "FAIL"}`);
        for (const u of (v.stage8?.list || []).slice(0, 10)) L.push(`    - <${u.tag} class="${u.classes}"> "${u.text}"`);
        L.push(`- Stage 9: display "${v.stage9?.display}" check=${v.stage9?.check}; loaded display/body/mono = ${v.stage9?.loaded?.display}/${v.stage9?.loaded?.body}/${v.stage9?.loaded?.mono}; link declares = ${v.stage9?.linkDeclares?.display}/${v.stage9?.linkDeclares?.body}/${v.stage9?.linkDeclares?.mono} → ${v.stage9?.pass ? "PASS" : "FAIL"}`);
        L.push(`- Stage 11 symptoms: ${v.symptoms?.problems?.length ? v.symptoms.problems.map((p) => `**${p}**`).join("; ") : "none"} (observed ${JSON.stringify(v.symptoms?.observed)})`);
      }
      if (w.extras && Object.keys(w.extras).length) { L.push(``, `Extras:`); for (const [k, e] of Object.entries(w.extras)) L.push(`- ${k}: ${e.screenshot || e} ${e.stage6 ? `(stray buttons extended: ${e.stage6.strayExtended})` : ""}`); }
      if (w.console?.length) { L.push(``, `Console (${w.console.length}):`); for (const c of w.console.slice(0, 15)) L.push(`- ${c}`); }
      L.push(``);
    }
  }
  return L.join("\n") + "\n";
}

main().catch((e) => { console.error(e); process.exit(1); });
