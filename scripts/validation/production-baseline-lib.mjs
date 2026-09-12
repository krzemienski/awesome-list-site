// Shared capture + comparison primitives for the production regression baseline.
//
// Two entry points import this module and nothing else does:
//   · production-baseline-capture.mjs — records what https://awesome.video (or
//     any --base) serves today into tests/parity/production-baseline/<date>/.
//   · production-baseline-compare.mjs — re-captures a candidate origin with the
//     SAME code paths and diffs it against a stored baseline.
// Keeping the capture code in one place is the whole point: a compare that
// captured the candidate differently from the baseline would report tooling
// drift as product drift.
//
// Ground rules (see tests/parity/production-baseline/<date>/README.md):
//   · Read-only, anonymous. No sign-in, no admin key, no POST.
//   · The pinned Playwright Chromium under .cache/ms-playwright is used with its
//     sandbox ON (chromiumSandbox: true), never downloaded, never --no-sandbox.
//   · Edge throttling (bare 429/503) is retried with backoff and NEVER recorded
//     as a route status; a route that stays throttled is left uncaptured so the
//     next resumable run picks it up.
//   · Every capture happens in a fresh context (DPR 1, en-US, UTC, dark colour
//     scheme, reduced motion) so the consent banner is present on every load
//     and is dismissed through the product's own control; its presence is
//     recorded rather than hidden.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import { AxeBuilder } from "@axe-core/playwright";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_BASE = "https://awesome.video";
export const BASELINE_ROOT = path.join(ROOT, "tests/parity/production-baseline");

export const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];
export const AXE_WIDTHS = [375, 1440];

// The 26 anonymous visitor routes named by the baseline brief. `document`
// routes are machine files (XML/text): they get a status probe plus the raw
// body and a shape summary, never a screenshot or an axe run.
export const VISITOR_ROUTES = [
  { path: "/", kind: "html" },
  { path: "/categories", kind: "html" },
  { path: "/category/encoding-codecs", kind: "html" },
  { path: "/category/community-events?page=2", kind: "html" },
  { path: "/subcategory/community-groups", kind: "html" },
  { path: "/sub-subcategory/ffmpeg", kind: "html" },
  { path: "/resource/185020", kind: "html" },
  { path: "/resource/186190", kind: "html" },
  { path: "/about", kind: "html" },
  { path: "/submit", kind: "html", note: "guest → client-side redirect to sign-in; both chains are recorded" },
  { path: "/search?q=ffmpeg", kind: "html" },
  { path: "/search?q=zzqxv-nothing", kind: "html", note: "empty search state" },
  { path: "/advanced", kind: "html" },
  { path: "/journeys", kind: "html" },
  { path: "/journey/7", kind: "html" },
  { path: "/tag/open-source", kind: "html" },
  { path: "/settings/theme", kind: "html" },
  { path: "/recommendations", kind: "html" },
  { path: "/design-system", kind: "html" },
  { path: "/terms", kind: "html" },
  { path: "/privacy", kind: "html" },
  { path: "/code-of-conduct", kind: "html" },
  { path: "/sign-in", kind: "html" },
  { path: "/this-route-does-not-exist", kind: "html", note: "expected 404" },
  { path: "/sitemap.xml", kind: "document" },
  { path: "/robots.txt", kind: "document" },
];

// The listing endpoint takes level+slug (the `?category=` spelling in the brief
// is a validation_failed 400 on both production and dev), so the working
// spelling is recorded instead. Both health probes are cheap, so both stay.
export const API_ENDPOINTS = [
  "/api/resources?limit=24",
  "/api/resources/185020",
  "/api/categories",
  "/api/subcategories",
  "/api/sub-subcategories",
  "/api/tags",
  "/api/awesome-list/listing?level=category&slug=encoding-codecs",
  "/api/journeys",
  "/api/journeys/7",
  "/api/recommendations",
  "/api/health",
  "/api/health/ready",
];

export const LIGHTHOUSE_ROUTES = ["/", "/category/encoding-codecs", "/resource/185020"];
const LIGHTHOUSE_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

const RETRYABLE_STATUSES = new Set([429, 503]);
const MAX_ATTEMPTS = 6;
const MAX_REDIRECT_HOPS = 10;
const CHROMIUM_MAX_CAPTURE_HEIGHT = 16384;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function routeSlug(route) {
  if (route === "/") return "home";
  return route
    .replace(/^\/+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function apiSlug(endpoint) {
  return routeSlug(endpoint.replace(/^\/api\//, "/"));
}

export function todayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function createTelemetry() {
  return { throttled: [], failures: [], startedAt: new Date().toISOString() };
}

function recordThrottle(telemetry, entry) {
  telemetry?.throttled.push({ at: new Date().toISOString(), ...entry });
}

function backoffMs(attempt, retryAfterHeader) {
  const base = Math.min(30_000, 1000 * 2 ** attempt);
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(60_000, Math.max(base, retryAfter * 1000));
  }
  return base;
}

// ---------------------------------------------------------------------------
// HTTP probes (Node fetch, no cookies, browser-like UA)
// ---------------------------------------------------------------------------

async function fetchWithRetry(url, init = {}, { telemetry, log = console, label = url } = {}) {
  let lastReason = "no response";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        ...init,
        headers: { "user-agent": USER_AGENT, ...(init.headers ?? {}) },
      });
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
      log.warn(`  retry ${attempt}/${MAX_ATTEMPTS} for ${label}: ${lastReason}`);
      await sleep(backoffMs(attempt));
      continue;
    }
    if (!RETRYABLE_STATUSES.has(response.status)) return { response, attempts: attempt };
    lastReason = `HTTP ${response.status}`;
    const retryAfter = response.headers.get("retry-after");
    await response.arrayBuffer().catch(() => {});
    recordThrottle(telemetry, { url, status: response.status, attempt, retryAfter, via: "fetch" });
    log.warn(`  throttled (${lastReason}) on ${label}; attempt ${attempt}/${MAX_ATTEMPTS}`);
    await sleep(backoffMs(attempt, retryAfter));
  }
  throw new Error(`${label}: still failing after ${MAX_ATTEMPTS} attempts (${lastReason})`);
}

function pickHeaders(headers, names) {
  const picked = {};
  for (const name of names) picked[name] = headers.get(name);
  return picked;
}

const STATUS_HEADERS = ["x-robots-tag", "content-type", "cache-control", "location"];

async function probeStatus(url, { telemetry, log } = {}) {
  const hops = [];
  let current = url;
  let attempts = 0;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const result = await fetchWithRetry(current, { redirect: "manual" }, { telemetry, log, label: current });
    attempts += result.attempts;
    const { response } = result;
    const headers = pickHeaders(response.headers, STATUS_HEADERS);
    await response.arrayBuffer().catch(() => {});
    hops.push({ url: current, status: response.status, ...headers });
    if (response.status >= 300 && response.status < 400 && headers.location) {
      current = new URL(headers.location, current).href;
      continue;
    }
    break;
  }
  const last = hops.at(-1);
  return {
    requestedUrl: url,
    finalUrl: last.url,
    status: last.status,
    xRobotsTag: last["x-robots-tag"],
    contentType: last["content-type"],
    cacheControl: last["cache-control"],
    redirectChain: hops.slice(0, -1).map((hop) => ({ url: hop.url, status: hop.status, location: hop.location })),
    attempts,
    probedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

function chromiumExecutable() {
  const cache = path.join(ROOT, ".cache/ms-playwright");
  const dirs = fs.existsSync(cache) ? fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort() : [];
  const dir = dirs.at(-1);
  if (!dir) {
    throw new Error(`No chromium-* directory under ${cache}; this capture never downloads a browser.`);
  }
  const executable = path.join(cache, dir, "chrome-linux64/chrome");
  if (!fs.existsSync(executable)) throw new Error(`Chromium executable missing at ${executable}`);
  return executable;
}

export async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

export async function launchBrowser(label, { remoteDebuggingPort } = {}) {
  const args = ["--disable-dev-shm-usage"];
  if (remoteDebuggingPort) args.push(`--remote-debugging-port=${remoteDebuggingPort}`);
  return launchBrowserWithLease(
    chromium,
    { headless: true, executablePath: chromiumExecutable(), chromiumSandbox: true, args },
    label,
  );
}

async function settleFrames(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)));
      }),
  );
}

async function dismissConsent(page) {
  const byTestId = page.locator('[data-testid="consent-decline"]').first();
  if (await byTestId.isVisible().catch(() => false)) {
    await byTestId.click();
    await page
      .locator('[data-testid="consent-banner"]')
      .first()
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => {});
    return { present: true, dismissedVia: '[data-testid="consent-decline"]' };
  }
  const byRole = page.getByRole("button", { name: /decline|reject non-essential/i }).first();
  if (await byRole.isVisible().catch(() => false)) {
    await byRole.click();
    await byRole.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    return { present: true, dismissedVia: "button[name=/decline|reject non-essential/i]" };
  }
  return { present: false, dismissedVia: null };
}

// Full-page screenshots do not scroll, so `loading="lazy"` thumbnails below the
// fold would be captured as blanks. Walk the page once, then return to the top.
async function warmLazyContent(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    const max = Math.min(document.documentElement.scrollHeight, 40_000);
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await settleFrames(page);
}

function extractDom() {
  const visible = (el) => {
    if (typeof el.checkVisibility === "function" && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const text = (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
  const jsonLdTypes = [];
  let jsonLdBlocks = 0;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    jsonLdBlocks += 1;
    try {
      const walk = (node) => {
        if (Array.isArray(node)) node.forEach(walk);
        else if (node && typeof node === "object") {
          if (node["@type"]) jsonLdTypes.push(...[].concat(node["@type"]));
          if (node["@graph"]) walk(node["@graph"]);
          for (const value of Object.values(node)) {
            if (value && typeof value === "object") walk(value);
          }
        }
      };
      walk(JSON.parse(script.textContent ?? ""));
    } catch {
      jsonLdTypes.push("<invalid-json>");
    }
  }
  const navElements = document.querySelectorAll("nav a, nav button, [role='navigation'] a, [role='navigation'] button");
  const navLabels = [...new Set([...navElements].filter(visible).map((el) => text(el) || el.getAttribute("aria-label") || "").filter(Boolean))];
  const testIds = [...new Set([...document.querySelectorAll("[data-testid]")].filter(visible).map((el) => el.getAttribute("data-testid")))].sort();
  return {
    title: document.title,
    lang: document.documentElement.lang || null,
    h1: [...document.querySelectorAll("h1")].map(text),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    robotsMeta: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
    jsonLdBlocks,
    jsonLdTypes: [...new Set(jsonLdTypes)].sort(),
    linkCount: document.querySelectorAll("a[href]").length,
    navLabels,
    visibleTestIds: testIds,
    documentHeight: document.documentElement.scrollHeight,
  };
}

async function runAxe(page) {
  const results = await new AxeBuilder({ page }).analyze();
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const nodesByImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const violations = results.violations.map((violation) => {
    const impact = violation.impact ?? "minor";
    byImpact[impact] = (byImpact[impact] ?? 0) + 1;
    nodesByImpact[impact] = (nodesByImpact[impact] ?? 0) + violation.nodes.length;
    return {
      id: violation.id,
      impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.length,
      targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
    };
  });
  return {
    axeVersion: results.testEngine?.version ?? null,
    analyzedUrl: results.url,
    byImpact,
    nodesByImpact,
    violations,
    incompleteRules: results.incomplete.length,
    passedRules: results.passes.length,
  };
}

async function compressPng(buffer) {
  return sharp(buffer).png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
}

async function fullPageScreenshot(page, viewport) {
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const common = { type: "png", animations: "disabled", caret: "hide", timeout: 60_000 };
  if (documentHeight <= CHROMIUM_MAX_CAPTURE_HEIGHT) {
    return { png: await page.screenshot({ ...common, fullPage: true }), truncated: false, documentHeight };
  }
  const png = await page.screenshot({
    ...common,
    fullPage: true,
    clip: { x: 0, y: 0, width: viewport.width, height: CHROMIUM_MAX_CAPTURE_HEIGHT },
  });
  return { png, truncated: true, documentHeight };
}

// One route × one viewport in a fresh context. Returns the DOM summary, the
// PNG (already max-compressed), the axe result when requested, and the
// browser-side navigation record (final URL + client-side redirect hops).
async function capturePage({ browser, url, viewport, wantAxe, wantPng, telemetry, log = console }) {
  let lastReason = "no response";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "UTC",
      colorScheme: "dark",
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const clientNavigations = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) clientNavigations.push(frame.url());
    });
    try {
      const response = await page.goto(url, { waitUntil: "load", timeout: 90_000 });
      if (!response) throw new Error("navigation produced no response");
      const status = response.status();
      if (RETRYABLE_STATUSES.has(status)) {
        lastReason = `HTTP ${status}`;
        const retryAfter = response.headers()["retry-after"];
        recordThrottle(telemetry, { url, status, attempt, retryAfter: retryAfter ?? null, via: "browser", viewport: viewport.width });
        log.warn(`  throttled (${lastReason}) loading ${url}@${viewport.width}; attempt ${attempt}/${MAX_ATTEMPTS}`);
        await context.close();
        await sleep(backoffMs(attempt, retryAfter));
        continue;
      }
      const httpRedirects = [];
      for (let request = response.request().redirectedFrom(); request; request = request.redirectedFrom()) {
        httpRedirects.unshift(request.url());
      }
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      await settleFrames(page);
      const consentBanner = await dismissConsent(page);
      await warmLazyContent(page);
      await page.waitForTimeout(250);
      await settleFrames(page);

      const dom = await page.evaluate(extractDom);
      const capture = {
        capturedAt: new Date().toISOString(),
        requestedUrl: url,
        finalUrl: page.url(),
        documentStatus: status,
        xRobotsTag: response.headers()["x-robots-tag"] ?? null,
        httpRedirects,
        clientNavigations: [...new Set(clientNavigations)],
        consentBanner,
        attempts: attempt,
        viewport: { ...viewport },
        ...dom,
      };
      let png = null;
      if (wantPng) {
        const shot = await fullPageScreenshot(page, viewport);
        png = await compressPng(shot.png);
        const meta = await sharp(png).metadata();
        capture.screenshot = {
          width: meta.width,
          height: meta.height,
          bytes: png.byteLength,
          truncated: shot.truncated,
          documentHeight: shot.documentHeight,
        };
      }
      const axe = wantAxe ? await runAxe(page) : null;
      await context.close();
      return { capture, png, axe };
    } catch (error) {
      await context.close().catch(() => {});
      lastReason = error instanceof Error ? error.message : String(error);
      if (/net::ERR_|Timeout|timeout|no response|Target closed/.test(lastReason) && attempt < MAX_ATTEMPTS) {
        log.warn(`  retry ${attempt}/${MAX_ATTEMPTS} for ${url}@${viewport.width}: ${lastReason.split("\n")[0]}`);
        await sleep(backoffMs(attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${url}@${viewport.width}: still failing after ${MAX_ATTEMPTS} attempts (${lastReason})`);
}

// ---------------------------------------------------------------------------
// Machine documents (sitemap.xml, robots.txt)
// ---------------------------------------------------------------------------

function describeDocument(routePath, contentType, body) {
  const summary = {
    contentType,
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
    lineCount: body.split(/\r?\n/).length,
  };
  if (/sitemap/.test(routePath) || /xml/.test(contentType ?? "")) {
    const locs = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1]);
    const lastmods = [...body.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/g)].map((match) => match[1]).sort();
    Object.assign(summary, {
      urlCount: locs.length,
      firstLoc: locs[0] ?? null,
      lastLoc: locs.at(-1) ?? null,
      hosts: [...new Set(locs.map((loc) => { try { return new URL(loc).host; } catch { return "<invalid>"; } }))].sort(),
      lastmodRange: lastmods.length ? [lastmods[0], lastmods.at(-1)] : null,
    });
  } else {
    const lines = body.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
    Object.assign(summary, {
      directives: lines,
      sitemaps: lines.filter((line) => /^sitemap:/i.test(line)).map((line) => line.replace(/^sitemap:\s*/i, "")),
    });
  }
  return summary;
}

function documentExtension(routePath) {
  const match = /\.([a-z0-9]+)$/i.exec(routePath);
  return match ? match[1].toLowerCase() : "txt";
}

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

const DICTIONARY_KEY_LIMIT = 40;
const ARRAY_SAMPLE_LIMIT = 200;
const COLLECTION_KEYS = ["resources", "items", "results", "journeys", "steps", "tags", "children", "data"];

function describeShape(value) {
  const paths = new Set();
  const walk = (node, prefix, depth) => {
    if (depth > 8) return;
    if (Array.isArray(node)) {
      paths.add(`${prefix}[]`);
      node.slice(0, ARRAY_SAMPLE_LIMIT).forEach((item) => walk(item, `${prefix}[]`, depth + 1));
    } else if (node && typeof node === "object") {
      const entries = Object.entries(node);
      if (entries.length > DICTIONARY_KEY_LIMIT) {
        // Maps keyed by data (tag names, ids) would explode into one path per
        // key and mask real shape changes; collapse them to a wildcard.
        const wildcard = prefix ? `${prefix}.{*}` : "{*}";
        paths.add(wildcard);
        entries.slice(0, 5).forEach(([, child]) => walk(child, wildcard, depth + 1));
        return;
      }
      for (const [key, child] of entries) {
        const next = prefix ? `${prefix}.${key}` : key;
        paths.add(next);
        walk(child, next, depth + 1);
      }
    }
  };
  walk(value, "", 0);

  // The "collection" is the array a page of this endpoint is about: a bare
  // array body, else the first conventional list key present, else the longest
  // top-level array. Every top-level array length is kept in arrayCounts.
  let collection = null;
  let collectionKey = null;
  const arrayCounts = {};
  if (Array.isArray(value)) {
    collection = value;
    collectionKey = "$";
    arrayCounts.$ = value.length;
  } else if (value && typeof value === "object") {
    const arrays = Object.entries(value).filter(([, child]) => Array.isArray(child));
    for (const [key, child] of arrays) arrayCounts[key] = child.length;
    const preferred = COLLECTION_KEYS.find((key) => Array.isArray(value[key]));
    if (preferred) {
      collectionKey = preferred;
      collection = value[preferred];
    } else if (arrays.length) {
      [collectionKey, collection] = [...arrays].sort((a, b) => b[1].length - a[1].length)[0];
    }
  }
  const idOf = (item) => {
    if (item && typeof item === "object") return item.id ?? item.resource?.id ?? item.slug ?? item.tag ?? item.name ?? null;
    return item ?? null;
  };
  const ids = (collection ?? []).map(idOf).filter((id) => id !== null && id !== undefined);
  const totals = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "number" && key !== "id") totals[key] = child;
    }
    if (value.pagination && typeof value.pagination === "object") {
      for (const [key, child] of Object.entries(value.pagination)) {
        if (typeof child === "number") totals[`pagination.${key}`] = child;
      }
    }
  }
  return {
    keyPaths: [...paths].sort(),
    keyPathCount: paths.size,
    collectionKey,
    itemCount: collection ? collection.length : null,
    arrayCounts,
    firstId: ids[0] ?? null,
    lastId: ids.at(-1) ?? null,
    totals,
  };
}

const API_HEADERS = ["cache-control", "etag", "content-type", "x-robots-tag", "vary", "content-encoding", "age"];

async function captureApi(base, endpoint, { telemetry, log } = {}) {
  const url = new URL(endpoint, base).href;
  const { response, attempts } = await fetchWithRetry(url, { headers: { accept: "application/json" } }, { telemetry, log, label: endpoint });
  const body = await response.text();
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }
  return {
    endpoint,
    slug: apiSlug(endpoint),
    url,
    status: response.status,
    headers: pickHeaders(response.headers, API_HEADERS),
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
    attempts,
    parseError,
    capturedAt: new Date().toISOString(),
    ...(parsed === null && parseError
      ? { keyPaths: [], keyPathCount: 0, collectionKey: null, itemCount: null, arrayCounts: {}, firstId: null, lastId: null, totals: {} }
      : describeShape(parsed)),
    body,
  };
}

// ---------------------------------------------------------------------------
// Lighthouse (mobile preset) through the Playwright-launched Chromium
// ---------------------------------------------------------------------------

async function runLighthouse({ url, port, log = console, telemetry }) {
  const { default: lighthouse } = await import("lighthouse");
  let lastReason = "no result";
  for (let attempt = 1; attempt <= 4; attempt++) {
    const result = await lighthouse(url, {
      port,
      output: "json",
      logLevel: "error",
      onlyCategories: LIGHTHOUSE_CATEGORIES,
    });
    const lhr = result?.lhr;
    if (!lhr) throw new Error(`Lighthouse returned no result for ${url}`);
    const statusCode = lhr.audits?.["network-requests"]?.details?.items?.find((item) => item.resourceType === "Document")?.statusCode;
    const throttled = RETRYABLE_STATUSES.has(Number(statusCode)) || /429|503/.test(lhr.runtimeError?.message ?? "");
    if (lhr.runtimeError || throttled) {
      lastReason = lhr.runtimeError ? `${lhr.runtimeError.code}: ${lhr.runtimeError.message}` : `document HTTP ${statusCode}`;
      recordThrottle(telemetry, { url, status: statusCode ?? null, attempt, via: "lighthouse", reason: lastReason });
      log.warn(`  lighthouse retry ${attempt}/4 for ${url}: ${lastReason}`);
      await sleep(backoffMs(attempt));
      continue;
    }
    // The full-page screenshot and filmstrip are base64 PNGs (megabytes per
    // run) that add nothing a stored PNG capture does not already hold; the
    // treemap, internal timings and i18n lookup tables are tooling internals.
    delete lhr.fullPageScreenshot;
    delete lhr.timing;
    if (lhr.i18n) delete lhr.i18n.icuMessagePaths;
    for (const id of ["screenshot-thumbnails", "final-screenshot", "script-treemap-data"]) {
      const audit = lhr.audits?.[id];
      if (audit?.details) audit.details = { type: audit.details.type, stripped: "bulk payload removed from the stored baseline" };
    }
    lhr.strippedForBaseline = ["fullPageScreenshot", "timing", "i18n.icuMessagePaths", "audits.screenshot-thumbnails.details", "audits.final-screenshot.details", "audits.script-treemap-data.details"];
    const metricItems = lhr.audits?.metrics?.details?.items?.[0] ?? {};
    return {
      lhr,
      scores: Object.fromEntries(Object.entries(lhr.categories).map(([id, category]) => [id, category.score])),
      metrics: {
        firstContentfulPaintMs: metricItems.firstContentfulPaint ?? null,
        largestContentfulPaintMs: metricItems.largestContentfulPaint ?? null,
        totalBlockingTimeMs: metricItems.totalBlockingTime ?? null,
        cumulativeLayoutShift: metricItems.cumulativeLayoutShift ?? null,
        speedIndexMs: metricItems.speedIndex ?? null,
        interactiveMs: metricItems.interactive ?? null,
      },
      lighthouseVersion: lhr.lighthouseVersion,
      fetchTime: lhr.fetchTime,
      finalDisplayedUrl: lhr.finalDisplayedUrl,
      formFactor: lhr.configSettings?.formFactor ?? null,
    };
  }
  throw new Error(`Lighthouse for ${url}: still failing after 4 attempts (${lastReason})`);
}

// ---------------------------------------------------------------------------
// Capture orchestration shared by capture + compare
// ---------------------------------------------------------------------------

export function routeDir(outDir, slug) {
  return path.join(outDir, "routes", slug);
}

// Captures one visitor route into <outDir>/routes/<slug>/. Resumable: anything
// already on disk is kept unless `force`, so an interrupted run continues where
// it stopped. Returns the number of browser navigations performed.
export async function captureRoute({ browser, base, route, outDir, viewports = VIEWPORTS, axeWidths = AXE_WIDTHS, force = false, telemetry, log = console, navigationBudget = Infinity }) {
  const slug = routeSlug(route.path);
  const dir = routeDir(outDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const url = new URL(route.path, base).href;
  const statusPath = path.join(dir, "status.json");
  const domPath = path.join(dir, "dom.json");
  const axePath = path.join(dir, "axe.json");
  let navigations = 0;

  if (force || !fs.existsSync(statusPath)) {
    log.log(`  status probe ${route.path}`);
    writeJson(statusPath, { route: route.path, slug, kind: route.kind, note: route.note ?? null, ...(await probeStatus(url, { telemetry, log })) });
  }

  if (route.kind === "document") {
    if (!force && fs.existsSync(domPath)) return { slug, navigations, complete: true };
    const { response } = await fetchWithRetry(url, {}, { telemetry, log, label: route.path });
    const body = await response.text();
    const extension = documentExtension(route.path);
    fs.writeFileSync(path.join(dir, `body.${extension}`), body);
    writeJson(domPath, {
      route: route.path,
      slug,
      kind: route.kind,
      capturedAt: new Date().toISOString(),
      finalUrl: response.url || url,
      status: response.status,
      bodyFile: `body.${extension}`,
      ...describeDocument(route.path, response.headers.get("content-type"), body),
    });
    return { slug, navigations, complete: true };
  }

  const dom = readJson(domPath) ?? { route: route.path, slug, kind: route.kind, note: route.note ?? null, byViewport: {} };
  const axe = readJson(axePath) ?? { route: route.path, slug, axeWidths, byViewport: {} };
  let complete = true;
  for (const viewport of viewports) {
    const key = String(viewport.width);
    const pngPath = path.join(dir, `${slug}@${viewport.width}.png`);
    const needPng = force || !fs.existsSync(pngPath);
    const needDom = force || !dom.byViewport[key];
    const needAxe = axeWidths.includes(viewport.width) && (force || !axe.byViewport[key]);
    if (!needPng && !needDom && !needAxe) continue;
    if (navigations >= navigationBudget) {
      complete = false;
      break;
    }
    log.log(`  capture ${route.path} @${viewport.width}${needAxe ? " +axe" : ""}`);
    const result = await capturePage({ browser, url, viewport, wantAxe: needAxe, wantPng: needPng, telemetry, log });
    navigations += 1;
    if (needPng) fs.writeFileSync(pngPath, result.png);
    dom.byViewport[key] = result.capture;
    if (needAxe) axe.byViewport[key] = result.axe;
    finalizeDom(dom, viewports);
    writeJson(domPath, dom);
    if (axeWidths.length) writeJson(axePath, axe);
  }
  return { slug, navigations, complete };
}

// Head-level facts are viewport independent; promote the widest capture to the
// top level so consumers do not have to pick a viewport, and flag any width
// that disagrees (a responsive title/h1 split would be a finding, not noise).
function finalizeDom(dom, viewports) {
  const widths = viewports.map((viewport) => String(viewport.width)).filter((key) => dom.byViewport[key]);
  if (!widths.length) return;
  const primaryKey = widths.at(-1);
  const primary = dom.byViewport[primaryKey];
  dom.primaryViewport = Number(primaryKey);
  for (const field of ["title", "lang", "h1", "canonical", "robotsMeta", "description", "jsonLdTypes", "linkCount", "navLabels", "visibleTestIds", "finalUrl", "documentStatus", "xRobotsTag", "clientNavigations"]) {
    dom[field] = primary[field];
  }
  const disagreements = [];
  for (const key of widths) {
    if (key === primaryKey) continue;
    for (const field of ["title", "h1", "canonical", "robotsMeta", "jsonLdTypes", "finalUrl", "documentStatus"]) {
      if (JSON.stringify(dom.byViewport[key][field]) !== JSON.stringify(primary[field])) {
        disagreements.push({ viewport: Number(key), field });
      }
    }
  }
  dom.viewportDisagreements = disagreements;
}

export async function captureApiSet({ base, outDir, endpoints = API_ENDPOINTS, force = false, telemetry, log = console }) {
  const apiDir = path.join(outDir, "api");
  fs.mkdirSync(apiDir, { recursive: true });
  const shapesPath = path.join(apiDir, "shapes.json");
  const shapes = readJson(shapesPath) ?? { base, endpoints: {} };
  shapes.base = base;
  for (const endpoint of endpoints) {
    const slug = apiSlug(endpoint);
    const bodyPath = path.join(apiDir, `${slug}.json`);
    if (!force && shapes.endpoints[endpoint] && fs.existsSync(bodyPath)) continue;
    log.log(`  api ${endpoint}`);
    const { body, ...summary } = await captureApi(base, endpoint, { telemetry, log });
    fs.writeFileSync(bodyPath, body.endsWith("\n") ? body : `${body}\n`);
    shapes.endpoints[endpoint] = { ...summary, bodyFile: `${slug}.json` };
    writeJson(shapesPath, shapes);
  }
  return shapes;
}

export async function captureLighthouseSet({ base, outDir, port, routes = LIGHTHOUSE_ROUTES, force = false, telemetry, log = console }) {
  const lhDir = path.join(outDir, "lighthouse");
  fs.mkdirSync(lhDir, { recursive: true });
  const scoresPath = path.join(lhDir, "scores.json");
  const scores = readJson(scoresPath) ?? { base, preset: "mobile", categories: LIGHTHOUSE_CATEGORIES, routes: {} };
  for (const route of routes) {
    const slug = routeSlug(route);
    const reportPath = path.join(lhDir, `${slug}.json`);
    if (!force && scores.routes[route] && fs.existsSync(reportPath)) continue;
    const url = new URL(route, base).href;
    log.log(`  lighthouse ${route}`);
    const { lhr, ...summary } = await runLighthouse({ url, port, log, telemetry });
    // Compact JSON: a Lighthouse report is read by tools, and pretty-printing
    // doubles what the repository has to carry per route.
    fs.writeFileSync(reportPath, `${JSON.stringify(lhr)}\n`);
    scores.routes[route] = { ...summary, reportFile: `${slug}.json` };
    writeJson(scoresPath, scores);
  }
  return scores;
}

export function inventory({ base, routes = VISITOR_ROUTES, endpoints = API_ENDPOINTS, lighthouseRoutes = LIGHTHOUSE_ROUTES }) {
  return {
    base,
    viewports: VIEWPORTS,
    axeWidths: AXE_WIDTHS,
    routes: routes.map((route) => ({ ...route, slug: routeSlug(route.path) })),
    api: endpoints.map((endpoint) => ({ path: endpoint, slug: apiSlug(endpoint) })),
    lighthouse: lighthouseRoutes.map((route) => ({ path: route, slug: routeSlug(route) })),
  };
}

export function gitCommit() {
  try {
    return execFileSync("git", ["--no-optional-locks", "rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export function toolVersions() {
  const read = (name) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", name, "package.json"), "utf8")).version;
    } catch {
      return null;
    }
  };
  return {
    node: process.version,
    playwright: read("playwright"),
    axeCore: read("axe-core"),
    axePlaywright: read("@axe-core/playwright"),
    lighthouse: read("lighthouse"),
    sharp: read("sharp"),
    pixelmatch: read("pixelmatch"),
    chromium: path.basename(path.dirname(path.dirname(chromiumExecutable()))),
  };
}
