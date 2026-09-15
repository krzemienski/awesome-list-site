#!/usr/bin/env node
/**
 * Task 567 Stage 7/8 owned browser evidence.
 *
 * This is an audit-only runner. It intentionally does not reuse or rewrite
 * the parent Task 567 report: the existing smoke, theme-combination, and axe
 * evidence remains untouched. Runtime evidence is checkpointed under
 * .cache/audit-567-ink-accent while the app is running, then copied to the
 * owned evidence directory on successful completion.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5000 \
 *   CLERK_SECRET_KEY=... ADMIN_PASSWORD=... \
 *   node scripts/validation/audit-567-ink-accent.mjs
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";
import {
  createDisposableAdmin,
  declineAnalyticsConsentViaUi,
  identityAvailability,
} from "../../tests/parity/identity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
const STAGE_OUT = path.resolve(process.env.AUDIT_567_INK_OUT || path.join(ROOT, ".cache", "audit-567-ink-accent"));
const EVIDENCE_OUT = path.resolve(process.env.AUDIT_567_INK_EVIDENCE_OUT ||
  path.join(ROOT, "docs", "parity", "evidence", "audit-567-ink-accent"));
const STAGE_RESULTS = path.join(STAGE_OUT, "results.json");
const STAGE_WORKLOG = path.join(STAGE_OUT, "worklog.md");
const FINAL_RESULTS = path.join(EVIDENCE_OUT, "results.json");
const FINAL_WORKLOG = path.join(EVIDENCE_OUT, "worklog.md");
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim()
  || path.join(ROOT, ".cache", "ms-playwright", "chromium-1223", "chrome-linux64", "chrome");

const SYSTEMS = ["editorial", "terminal", "geist", "brutalist", "swiss"];
// A targeted confirmation supplements, never replaces, the complete sweep.
const CASE = process.env.AUDIT_567_INK_CASE?.split(":");
const EXPECTED_ROWS = CASE ? 1 : 40;
const SYSTEM_DEFAULT_ACCENTS = {
  editorial: "crimson",
  terminal: "matrix",
  geist: "cyan",
  brutalist: "amber",
  swiss: "orange",
};
const VIEWPORTS = {
  375: { width: 375, height: 812 },
  1440: { width: 1440, height: 900 },
};
const SURFACES = [
  { id: "home", route: "/", identity: "public" },
  { id: "category-encoding-codecs", route: "/category/encoding-codecs", identity: "public" },
  { id: "resource-185020", route: "/resource/185020", identity: "public" },
  { id: "admin-overview", route: "/admin", identity: "Nick-admin" },
];
const log = (message) => process.stdout.write(`[audit-567-ink-accent] ${message}\n`);

function assertLocalBase() {
  const url = new URL(BASE);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error("BASE_URL must be a loopback HTTP origin; production is not a local capture target");
  }
}

function launchOptions() {
  if (!fs.existsSync(CHROMIUM_EXECUTABLE)) {
    throw new Error(`Pinned Chromium executable is missing: ${CHROMIUM_EXECUTABLE}`);
  }
  return {
    headless: true,
    chromiumSandbox: true,
    args: ["--disable-partial-raster"],
    executablePath: CHROMIUM_EXECUTABLE,
  };
}

async function writeJson(filename, value) {
  await fsp.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp-${process.pid}`;
  await fsp.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(temporary, filename);
}

async function writeWorklog(filename, report) {
  const rows = report.rows || [];
  const errors = rows.filter((row) => row.status !== "PASS");
  const accentTotals = rows.reduce((sum, row) => sum + (row.stage7?.visibleViewportUsers?.length || 0), 0);
  const accentViolations = rows.reduce((sum, row) => sum + (row.stage7?.counts?.violations || 0), 0);
  const inkOffenders = rows.reduce((sum, row) => sum + (row.stage8?.offenders?.length || 0), 0);
  const lines = [
    "# Task 567 Stage 7/8 ink and accent evidence",
    "",
    `Captured: ${report.capturedAt}`,
    `Base: \`${report.base}\``,
    "Browser: pinned Playwright Chromium via the required browser lease",
    "",
    "## Scope",
    "",
    `- Selection: ${CASE ? CASE.join(":") + " (targeted confirmation only)" : "complete 40-cell sweep"}.`,
    "- This owned evidence measures only Stage 7 accent discipline and Stage 8 text ink tiers.",
    "- Existing Task 567 smoke, theme-combination, and axe evidence was not rerun, changed, or deleted.",
    "- The five systems use their actual shipped default accents and are measured at 375×812 and 1440×900.",
    "- Public surfaces are Home, category/encoding-codecs, and resource/185020. Admin overview uses one real disposable Nick admin.",
    "- Visibility means a non-hidden element whose bounding rectangle intersects the current viewport; off-screen page content is not counted.",
    "",
    "## Measurement totals",
    "",
    `- Rows: ${rows.length}/${EXPECTED_ROWS}`,
    `- Visible computed accent users recorded: ${accentTotals}`,
    `- Accent users classified as violations: ${accentViolations}`,
    `- Long visible p/li ink offenders (resolved text-3/text-4): ${inkOffenders}`,
    `- Rows with route/runtime errors: ${errors.length}`,
    "",
    "Each row in `results.json` retains the exact selector, normalized text, computed properties, classification, grouping, viewport geometry, and resolved CSS colors. Stage 8 compares computed element color against resolved probe colors, not raw custom-property strings, so alpha serialization is retained.",
    "",
    "## Identity safety",
    "",
    "- The Nick helper created one disposable admin in its original authenticated browser context.",
    "- Only that helper-owned identity teardown was called; no global QA identity sweep was run.",
    `- Teardown completed: ${report.identity?.teardown?.completed === true ? "yes" : "no"}.`,
    "",
    "## Findings",
    "",
    `- Accent discipline: ${accentViolations === 0 && rows.length === EXPECTED_ROWS ? "no classified violations in captured rows" : `${accentViolations} classified violation(s); review exact entries`}.`,
    `- Ink tiers: ${inkOffenders === 0 && rows.length === 40 ? "no long visible p/li matched resolved text-3/text-4" : `${inkOffenders} long visible p/li offender(s); review exact entries`}.`,
    "- No semantic rule was waived: uses outside the explicit allowed-use classifier remain violations, and multiple primary buttons are not silently treated as one accent moment.",
  ];
  if (errors.length) {
    lines.push("", "## Runtime errors", "");
    for (const row of errors) {
      lines.push(`- ${row.system} × ${row.width} × ${row.surface}: ${row.error?.message || "unknown error"}`);
    }
  }
  await fsp.mkdir(path.dirname(filename), { recursive: true });
  await fsp.writeFile(filename, `${lines.join("\n")}\n`, "utf8");
}

async function checkpoint(report, detail) {
  report.lastCheckpoint = { detail, at: new Date().toISOString() };
  await writeJson(STAGE_RESULTS, report);
  await writeWorklog(STAGE_WORKLOG, report);
  log(`checkpoint (${detail})`);
}

async function makeContext(browser) {
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  context.setDefaultTimeout(30_000);
  return context;
}

async function waitForApp(page, selector = "body") {
  await page.locator(selector).first().waitFor({ state: "attached", timeout: 45_000 }).catch(() => {});
  await page.locator('[data-testid="route-chunk-skeleton"]').waitFor({ state: "hidden", timeout: 45_000 });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(350);
}

async function assertTheme(page, system, accent) {
  const state = await page.waitForFunction(
    ({ expectedSystem, expectedAccent }) => {
      const root = document.documentElement;
      let storedSystem = null;
      let storedAccent = null;
      try {
        storedSystem = localStorage.getItem("ds-system");
        storedAccent = localStorage.getItem("ds-accent");
      } catch {}
      const attrs = {
        system: root.getAttribute("data-system"),
        accent: root.getAttribute("data-accent"),
      };
      return {
        attrs,
        stored: { system: storedSystem, accent: storedAccent },
        pass: attrs.system === expectedSystem &&
          attrs.accent === expectedAccent &&
          storedSystem === expectedSystem &&
          storedAccent === expectedAccent,
      };
    },
    { expectedSystem: system, expectedAccent: accent },
    { timeout: 30_000 },
  );
  const value = await state.jsonValue();
  if (!value.pass) throw new Error(`theme state did not settle for ${system}/${accent}`);
  return value;
}

async function selectTheme(page, system, accent) {
  await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForApp(page, '[data-testid="system-picker"]');
  await page.locator(`[data-testid="system-option-${system}"]`).click();
  await page.waitForFunction(
    (expectedSystem) => document.documentElement.getAttribute("data-system") === expectedSystem,
    system,
    { timeout: 30_000 },
  );
  await page.locator(`[data-testid="accent-option-${accent}"]`).click();
  await assertTheme(page, system, accent);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForApp(page, '[data-testid="system-picker"]');
  return assertTheme(page, system, accent);
}

function normalizeError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    stack: error?.stack || null,
  };
}

/**
 * The page-side audit intentionally returns a row for every computed use,
 * rather than only a number. This keeps selectors, text, properties and
 * grouping inspectable and prevents a whole-page count from hiding a bad use.
 */
async function measurePage(page, { system, accent, width, surface, route, identity }) {
  const result = await page.evaluate(({ system: expectedSystem, accent: expectedAccent, width: expectedWidth, surface: expectedSurface, route: expectedRoute, identity: expectedIdentity }) => {
    if (expectedIdentity === "Nick-admin") {
      const overview = document.querySelector(".admin-overview-canonical");
      if (!overview || overview.getBoundingClientRect().height === 0) {
        throw new Error("Admin overview is not rendered at measurement");
      }
    }
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const escape = (value) => {
      if (window.CSS?.escape) return window.CSS.escape(value);
      return String(value).replace(/([^\w-])/g, "\\$1");
    };
    const selectorFor = (element) => {
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let part = current.tagName.toLowerCase();
        if (current.id) {
          part += `#${escape(current.id)}`;
          parts.unshift(part);
          break;
        }
        const classes = [...current.classList].filter(Boolean).slice(0, 4);
        if (classes.length) part += classes.map((name) => `.${escape(name)}`).join("");
        const parent = current.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter((sibling) => sibling.tagName === current.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
        parts.unshift(part);
        current = parent;
        if (current?.tagName.toLowerCase() === "body") {
          parts.unshift("body");
          break;
        }
      }
      return parts.join(" > ");
    };
    const isVisibleInViewport = (element) => {
      if (!element) return false;
      const computed = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return computed.display !== "none" &&
        computed.visibility !== "hidden" &&
        Number.parseFloat(computed.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < viewport.height &&
        rect.left < viewport.width;
    };
    const rectFor = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
        top: Number(rect.top.toFixed(2)),
        right: Number(rect.right.toFixed(2)),
        bottom: Number(rect.bottom.toFixed(2)),
      };
    };
    const parseColor = (value) => {
      const raw = String(value || "").trim().toLowerCase();
      const hex = raw.match(/^#([0-9a-f]{3,8})$/i);
      if (hex) {
        const source = hex[1];
        const expanded = source.length === 3 || source.length === 4
          ? source.split("").map((char) => `${char}${char}`).join("")
          : source;
        if (expanded.length < 6) return null;
        return {
          r: Number.parseInt(expanded.slice(0, 2), 16),
          g: Number.parseInt(expanded.slice(2, 4), 16),
          b: Number.parseInt(expanded.slice(4, 6), 16),
          a: expanded.length >= 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
        };
      }
      const rgb = raw.match(/^rgba?\((.*)\)$/);
      if (!rgb) return null;
      const body = rgb[1].trim();
      const slash = body.match(/^(.+?)\s*\/\s*(.+)$/);
      const channelText = slash ? slash[1].trim() : body;
      const alphaText = slash ? slash[2].trim() : null;
      const pieces = channelText.includes(",")
        ? channelText.split(",").map((piece) => piece.trim())
        : channelText.split(/\s+/).filter(Boolean);
      const channel = (piece) => {
        if (piece.endsWith("%")) return Number.parseFloat(piece) * 2.55;
        return Number.parseFloat(piece);
      };
      const commaAlpha = !slash && channelText.includes(",") ? pieces[3] : undefined;
      const alphaPiece = alphaText ?? commaAlpha;
      const alpha = alphaPiece === undefined ? 1 : (alphaPiece.endsWith("%") ? Number.parseFloat(alphaPiece) / 100 : Number.parseFloat(alphaPiece));
      const values = [channel(pieces[0]), channel(pieces[1]), channel(pieces[2])];
      if (values.some((value) => !Number.isFinite(value)) || !Number.isFinite(alpha)) return null;
      return { r: values[0], g: values[1], b: values[2], a: alpha };
    };
    const rounded = (value) => Number(Number(value).toFixed(4));
    const colorRecord = (value) => {
      const rgba = parseColor(value);
      return { serialized: String(value || ""), rgba: rgba ? {
        r: rounded(rgba.r),
        g: rounded(rgba.g),
        b: rounded(rgba.b),
        a: rounded(rgba.a),
      } : null };
    };
    const sameColor = (left, right, { rgbOnly = false } = {}) => {
      const a = parseColor(left);
      const b = parseColor(right);
      if (!a || !b) return String(left || "").toLowerCase() === String(right || "").toLowerCase();
      const sameRgb = Math.abs(a.r - b.r) < 0.5 && Math.abs(a.g - b.g) < 0.5 && Math.abs(a.b - b.b) < 0.5;
      return sameRgb && (rgbOnly || Math.abs(a.a - b.a) < 0.005);
    };
    const resolveToken = (name, property = "color") => {
      const raw = rootStyle.getPropertyValue(name).trim();
      const probe = document.createElement("span");
      probe.textContent = ".";
      probe.style.cssText = "position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;pointer-events:none;";
      probe.style[property] = `var(${name})`;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe)[property];
      probe.remove();
      return { name, raw, resolved: colorRecord(resolved) };
    };
    const accent = resolveToken("--accent");
    const text3 = resolveToken("--text-3");
    const text4 = resolveToken("--text-4");
    const accentResolved = accent.resolved.serialized;
    const properties = [
      ["color", "color"],
      ["backgroundColor", "background-color"],
      ["borderColor", "border-color"],
      ["borderTopColor", "border-top-color"],
      ["borderRightColor", "border-right-color"],
      ["borderBottomColor", "border-bottom-color"],
      ["borderLeftColor", "border-left-color"],
      ["outlineColor", "outline-color"],
      ["fill", "fill"],
      ["stroke", "stroke"],
    ];
    const propertyMatchesAccent = (computed, property) => {
      if (property === "fill" || property === "stroke") {
        return sameColor(computed, accentResolved) && (parseColor(computed)?.a ?? 0) > 0;
      }
      return sameColor(computed, accentResolved) && (parseColor(computed)?.a ?? 0) > 0;
    };
    const paintsProperty = (style, property) => {
      if (property === "outline-color") {
        return style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
      }
      const edge = property.match(/^border-(top|right|bottom|left)-color$/)?.[1];
      if (edge) {
        return style.getPropertyValue(`border-${edge}-style`) !== "none" &&
          Number.parseFloat(style.getPropertyValue(`border-${edge}-width`)) > 0;
      }
      if (property === "border-color") {
        return ["top", "right", "bottom", "left"].some((side) =>
          paintsProperty(style, `border-${side}-color`),
        );
      }
      return true;
    };
    const classString = (element) => typeof element.className === "string"
      ? element.className
      : (element.getAttribute("class") || "");
    const hasClassToken = (element, token) => classString(element).split(/\s+/).includes(token);
    const hasClassContaining = (element, token) => classString(element).toLowerCase().split(/\s+/).some((name) => name.includes(token));
    const primaryCandidate = (element) =>
      element.matches("button[data-ds-variant='default'], a[data-ds-variant='default'], .btn.primary") ||
      (element.matches("button, [role='button']") && hasClassToken(element, "primary"));
    const classify = (element, pseudo, matchedProperties, primaryOrdinals) => {
      const selector = selectorFor(element) + (pseudo || "");
      const owner = element.closest("button[data-ds-variant='default'], a[data-ds-variant='default'], [class*='eyebrow'], [aria-current='page'], [data-active='true'], [role='tab'][aria-selected='true'], .live-dot, .caret, .header-brand, .header-avatar, .accordion-header.active");
      if (owner && owner !== element) {
        const classification = classify(owner, null, matchedProperties, primaryOrdinals);
        return { ...classification, selector, ownerSelector: selectorFor(owner), reason: `descendant of ${classification.reason}` };
      }
      if (element.matches(".header-brand, .header-logo")) {
        return { allowed: true, reason: "official branding retained by the approved reference contract", selector };
      }
      if (element.matches(".header-avatar")) {
        return { allowed: true, reason: "primary account control in the header surface", selector };
      }
      if (element.matches(".accordion-header.active")) {
        return { allowed: true, reason: "active navigation indicator", selector };
      }
      if (element.matches(".resource-detail-description > h2, .resource-detail-sections h2")) {
        return { allowed: true, reason: "description section eyebrow", selector };
      }
      if (element.matches(".admin-canonical-category-track > .admin-canonical-category-bar")) {
        return { allowed: true, reason: "category distribution chart data", selector };
      }
      if (primaryCandidate(element)) {
        const ordinal = primaryOrdinals.get(element) || 1;
        const total = primaryOrdinals.total;
        if (ordinal === 1) return { allowed: true, reason: "primary button (one primary accent moment on this surface)", selector };
        return { allowed: false, reason: `primary button exceeds one accent moment on this surface (${ordinal}/${total})`, selector };
      }
      if (hasClassContaining(element, "eyebrow")) {
        return { allowed: true, reason: "eyebrow", selector };
      }
      if (hasClassToken(element, "live-dot") || hasClassContaining(element, "live-indicator") || element.hasAttribute("data-live")) {
        return { allowed: true, reason: "live indicator", selector };
      }
      if (hasClassToken(element, "caret")) {
        return { allowed: true, reason: "caret", selector };
      }
      if (element.matches("[aria-current='page'], .nav-link.active, [data-active='true']")) {
        return { allowed: true, reason: "active navigation indicator", selector };
      }
      if (element.matches("[role='tab'][aria-selected='true'], .tab.active")) {
        return { allowed: true, reason: "active tab underline/indicator", selector };
      }
      if (element.matches(":focus, :focus-visible") && matchedProperties.some((property) => property.startsWith("outline"))) {
        return { allowed: true, reason: "focus ring", selector };
      }
      const chartElement = element.closest("[data-chart], [class*='chart'], .recharts-wrapper");
      if (chartElement && element.matches("path, circle, rect, line, polyline, polygon")) {
        return { allowed: true, reason: "key chart data point", selector };
      }
      if (element.matches("em") && element.closest("h1, h2, h3, .display-h, [class*='display']")) {
        return { allowed: true, reason: "sparing display-copy emphasis", selector };
      }
      return { allowed: false, reason: "unclassified accent use", selector };
    };
    const elements = [...document.querySelectorAll("*")];
    const primaryElements = elements.filter((element) => isVisibleInViewport(element) && primaryCandidate(element));
    const primaryOrdinals = new Map(primaryElements.map((element, index) => [element, index + 1]));
    primaryOrdinals.total = primaryElements.length;
    const users = [];
    for (const element of elements) {
      if (!isVisibleInViewport(element)) continue;
      const computed = getComputedStyle(element);
      const matched = properties
        .map(([property, cssProperty]) => ({ property, cssProperty, value: computed[property] }))
        .filter(({ value, cssProperty }) => paintsProperty(computed, cssProperty) && propertyMatchesAccent(value, cssProperty));
      if (matched.length) {
        const classification = classify(element, null, matched.map((item) => item.cssProperty), primaryOrdinals);
        users.push({
          selector: classification.selector,
          text: normalizeText(element.textContent),
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          className: classString(element),
          rect: rectFor(element),
          properties: matched.map((item) => ({
            property: item.cssProperty,
            computed: colorRecord(item.value),
          })),
          ...classification,
        });
      }
      for (const pseudo of ["::before", "::after"]) {
        const pseudoStyle = getComputedStyle(element, pseudo);
        const pseudoContent = pseudoStyle.content;
        const pseudoMatched = properties
          .map(([property, cssProperty]) => ({ property, cssProperty, value: pseudoStyle[property] }))
          .filter(({ value, cssProperty }) => propertyMatchesAccent(value, cssProperty));
        if (!pseudoMatched.length || (pseudoContent === "none" && pseudoStyle.backgroundImage === "none")) continue;
        const classification = classify(element, pseudo, pseudoMatched.map((item) => item.cssProperty), primaryOrdinals);
        users.push({
          selector: classification.selector,
          text: normalizeText(element.textContent),
          tag: element.tagName.toLowerCase(),
          pseudo,
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          className: classString(element),
          rect: rectFor(element),
          pseudoContent,
          properties: pseudoMatched.map((item) => ({
            property: item.cssProperty,
            computed: colorRecord(item.value),
          })),
          ...classification,
        });
      }
    }
    const group = (entries) => {
      const grouped = new Map();
      for (const entry of entries) {
        const key = `${entry.allowed ? "allowed" : "violation"} :: ${entry.reason}`;
        const prior = grouped.get(key) || {
          key,
          allowed: entry.allowed,
          reason: entry.reason,
          count: 0,
          selectors: [],
          texts: [],
        };
        prior.count += 1;
        prior.selectors.push(entry.selector);
        prior.texts.push(entry.text);
        grouped.set(key, prior);
      }
      return [...grouped.values()];
    };
    const longInkOffenders = [...document.querySelectorAll("p, li")]
      .filter((element) => isVisibleInViewport(element) && normalizeText(element.textContent).length > 60)
      .map((element) => {
        const computedColor = getComputedStyle(element).color;
        const matchedToken = sameColor(computedColor, text3.resolved.serialized)
          ? text3
          : sameColor(computedColor, text4.resolved.serialized)
            ? text4
            : null;
        if (!matchedToken) return null;
        return {
          selector: selectorFor(element),
          tag: element.tagName.toLowerCase(),
          text: normalizeText(element.textContent),
          textLength: normalizeText(element.textContent).length,
          rect: rectFor(element),
          color: colorRecord(computedColor),
          matchedToken: matchedToken.name,
          resolvedToken: matchedToken.resolved,
          fontSize: getComputedStyle(element).fontSize,
          lineHeight: getComputedStyle(element).lineHeight,
          role: element.getAttribute("role"),
        };
      })
      .filter(Boolean);
    const inkGroups = (entries) => {
      const grouped = new Map();
      for (const entry of entries) {
        const key = entry.matchedToken;
        const prior = grouped.get(key) || { matchedToken: key, count: 0, selectors: [], texts: [] };
        prior.count += 1;
        prior.selectors.push(entry.selector);
        prior.texts.push(entry.text);
        grouped.set(key, prior);
      }
      return [...grouped.values()];
    };
    let storedSystem = null;
    let storedAccent = null;
    try {
      storedSystem = localStorage.getItem("ds-system");
      storedAccent = localStorage.getItem("ds-accent");
    } catch {}
    return {
      status: "PASS",
      theme: {
        expected: { system: expectedSystem, accent: expectedAccent },
        attrs: {
          system: root.getAttribute("data-system"),
          accent: root.getAttribute("data-accent"),
        },
        stored: { system: storedSystem, accent: storedAccent },
      },
      viewport,
      context: {
        width: expectedWidth,
        surface: expectedSurface,
        route: expectedRoute,
        identity: expectedIdentity,
      },
      stage7: {
        accentToken: accent,
        visibleViewportUsers: users,
        allowedUses: users.filter((entry) => entry.allowed),
        violations: users.filter((entry) => !entry.allowed),
        counts: {
          total: users.length,
          allowed: users.filter((entry) => entry.allowed).length,
          violations: users.filter((entry) => !entry.allowed).length,
        },
        groups: group(users),
      },
      stage8: {
        tokens: {
          text3,
          text4,
        },
        offenders: longInkOffenders,
        offenderGroups: inkGroups(longInkOffenders),
        counts: {
          longVisibleParagraphOrListItems: [...document.querySelectorAll("p, li")]
            .filter((element) => isVisibleInViewport(element) && normalizeText(element.textContent).length > 60).length,
          offenders: longInkOffenders.length,
        },
      },
    };
  }, { system, accent, width, surface, route, identity });
  return result;
}

async function measureSurface(page, params) {
  await page.setViewportSize(VIEWPORTS[params.width]);
  await page.goto(`${BASE}${params.route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (params.identity === "Nick-admin") {
    await page.getByTestId("admin-authorized").waitFor({ state: "visible", timeout: 30_000 });
    await page.locator('[role="tabpanel"][data-state="active"]').first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    await page.getByTestId("admin-overview").waitFor({ state: "visible", timeout: 30_000 });
  } else {
    await waitForApp(page);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
  const theme = await assertTheme(page, params.system, params.accent);
  if (params.identity === "Nick-admin") {
    await page.locator(".admin-overview-canonical").waitFor({ state: "visible", timeout: 30_000 });
  }
  const measurement = await measurePage(page, params);
  measurement.theme = { ...measurement.theme, assertion: theme };
  return measurement;
}

function emptyReport() {
  return {
    task: "567",
    scope: "stage7-8-ink-accent",
    selection: CASE ? { system: CASE[0], width: Number(CASE[1]), surface: CASE[2] } : "full",
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    base: BASE,
    browser: {
      executable: CHROMIUM_EXECUTABLE,
      lease: "scripts/validation/playwright-launch-lease.mjs",
    },
    systems: SYSTEMS.map((system) => ({ system, accent: SYSTEM_DEFAULT_ACCENTS[system] })),
    widths: VIEWPORTS,
    surfaces: SURFACES,
    rows: [],
    identity: {
      helper: "tests/parity/identity.mjs",
      requested: true,
      created: false,
      displayName: null,
      teardown: { attempted: false, completed: false },
    },
    runError: null,
    lastCheckpoint: null,
  };
}

async function main() {
  assertLocalBase();
  if (CASE && (CASE.length !== 3 || !SYSTEMS.includes(CASE[0]) ||
    !VIEWPORTS[Number(CASE[1])] || !SURFACES.some((surface) => surface.id === CASE[2]))) {
    throw new Error("AUDIT_567_INK_CASE must be system:width:surface from the audit inventory");
  }
  const availability = identityAvailability();
  if (!availability.ok) {
    throw new Error(`Real disposable Nick identity is required: missing ${availability.missing.join(", ")}`);
  }
  if (fs.existsSync(FINAL_RESULTS) || fs.existsSync(FINAL_WORKLOG)) {
    throw new Error(`Owned evidence already exists at ${EVIDENCE_OUT}; refusing to overwrite a completed run`);
  }
  if (fs.existsSync(STAGE_RESULTS)) {
    throw new Error(`Staged evidence already exists at ${STAGE_OUT}; refusing to overwrite an earlier run`);
  }
  const report = emptyReport();
  await checkpoint(report, "start");

  let browser = null;
  let visitorContext = null;
  let visitorPage = null;
  let identity = null;
  try {
    browser = await launchBrowserWithLease(chromium, launchOptions(), "task567-ink-accent");
    identity = await createDisposableAdmin({
      browser,
      appBase: BASE,
      secretKey: process.env.CLERK_SECRET_KEY,
      auditKey: process.env.ADMIN_PASSWORD,
      log: (message) => log(message),
    });
    report.identity.created = true;
    report.identity.displayName = identity.displayName || "Nick";
    await declineAnalyticsConsentViaUi({ page: identity.page, appBase: BASE });
    visitorContext = await makeContext(browser);
    visitorPage = await visitorContext.newPage();
    await declineAnalyticsConsentViaUi({ page: visitorPage, appBase: BASE });

    for (const system of SYSTEMS) {
      if (CASE && CASE[0] !== system) continue;
      const accent = SYSTEM_DEFAULT_ACCENTS[system];
      log(`selecting actual theme ${system}/${accent} on public and admin contexts`);
      await selectTheme(visitorPage, system, accent);
      await selectTheme(identity.page, system, accent);
      for (const width of Object.keys(VIEWPORTS).map(Number)) {
        if (CASE && Number(CASE[1]) !== width) continue;
        for (const surface of SURFACES) {
          if (CASE && CASE[2] !== surface.id) continue;
          const page = surface.identity === "Nick-admin" ? identity.page : visitorPage;
          const params = {
            system,
            accent,
            width,
            surface: surface.id,
            route: surface.route,
            identity: surface.identity,
          };
          const key = `${system}|${accent}|${width}|${surface.id}|${surface.identity}|${surface.route}`;
          try {
            const measurement = await measureSurface(page, params);
            report.rows.push({
              key,
              status: "PASS",
              ...params,
              stage7: measurement.stage7,
              stage8: measurement.stage8,
              theme: measurement.theme,
              viewport: measurement.viewport,
              context: measurement.context,
            });
            log(`${system} × ${width} × ${surface.id}: ${measurement.stage7.counts.violations} accent violations, ${measurement.stage8.counts.offenders} ink offenders`);
          } catch (error) {
            report.rows.push({
              key,
              status: "ERROR",
              ...params,
              error: normalizeError(error),
            });
            log(`${system} × ${width} × ${surface.id}: ERROR ${error.message}`);
          }
          await checkpoint(report, `${system}-${width}-${surface.id}`);
        }
      }
    }
    report.status = report.rows.length === EXPECTED_ROWS &&
      report.rows.every((row) => row.status === "PASS") ? "PASS" : "INCOMPLETE";
    report.measurementStatus = report.status;
    if (report.status === "PASS" && report.rows.some((row) =>
      row.stage7.counts.violations > 0 || row.stage8.counts.offenders > 0,
    )) report.status = "FIX";
  } catch (error) {
    report.status = "FAILED";
    report.runError = normalizeError(error);
    await checkpoint(report, "failed");
    throw error;
  } finally {
    if (identity) {
      try {
        const teardown = await identity.teardown();
        report.identity.teardown = {
          attempted: true,
          completed: true,
          localDeleted: teardown.localDeleted,
          clerkDeleted: teardown.clerkDeleted,
          verification: {
            localQaUsersRemainingCount: teardown.verification?.localQaUsersRemaining?.length ?? null,
          },
          errors: teardown.errors,
        };
      } catch (error) {
        report.identity.teardown = {
          attempted: true,
          completed: false,
          localDeleted: error?.outcome?.localDeleted || false,
          clerkDeleted: error?.outcome?.clerkDeleted || false,
          verification: {
            localQaUsersRemainingCount: error?.outcome?.verification?.localQaUsersRemaining?.length ?? null,
          },
          errors: error?.outcome?.errors || [error.message],
        };
        report.runError ||= normalizeError(error);
      }
    }
    await visitorContext?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }

  report.generatedAt = new Date().toISOString();
  await writeJson(STAGE_RESULTS, report);
  await writeWorklog(STAGE_WORKLOG, report);
  await fsp.mkdir(EVIDENCE_OUT, { recursive: true });
  await fsp.copyFile(STAGE_RESULTS, FINAL_RESULTS);
  await fsp.copyFile(STAGE_WORKLOG, FINAL_WORKLOG);
  log(`final evidence: ${FINAL_RESULTS}`);
  log(`final worklog: ${FINAL_WORKLOG}`);
  if (report.status !== "PASS" || report.identity.teardown.completed !== true) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  process.stderr.write(`[audit-567-ink-accent] ${error.stack || error.message}\n`);
  process.exitCode = 1;
});