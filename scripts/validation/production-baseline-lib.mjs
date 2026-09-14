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
//   · Read-only, anonymous. No sign-in or admin key; every non-safe request is
//     blocked.
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
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
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
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Read-only guard, layer 2 of 2 (layer 1 is the browser-wide Fetch guard in
// launchBrowser). Installed as a context init script, so Chromium runs it
// before any page script in EVERY document of every page of the context —
// main frame, iframes, and popups, which Playwright holds paused until the
// context's scripts and routes are in place. WebSocket handshakes never pass
// through request interception, so sockets are refused at the only place they
// can be created: a window realm. Realms this script cannot reach are
// prevented from existing instead — Worker/SharedWorker constructors and
// service-worker registration are sealed (blob/data URLs never touch the
// network, so aborting worker script loads would not be enough) — and
// window.open is sealed as well (popups are additionally blocked by the
// browser's popup blocker, see launchBrowser, and contained by the context if
// one ever appears). Every property is non-configurable: a page cannot delete
// or reassign it to recover the native constructor. Attempts are recorded on
// window.__baselineRefused for the capture record.
const READ_ONLY_WINDOW_SOURCE = `(() => {
  const refused = { webSockets: [], workers: [], popups: [], serviceWorkers: [] };
  Object.defineProperty(window, "__baselineRefused", { value: refused });
  const seal = (target, name, value) =>
    Object.defineProperty(target, name, { value, writable: false, configurable: false, enumerable: false });
  const deny = (kind) => new DOMException(kind + " refused: production-baseline capture is read-only", "SecurityError");
  class BlockedWebSocket {
    constructor(url) {
      refused.webSockets.push(String(url));
      throw deny("WebSocket");
    }
  }
  Object.assign(BlockedWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  seal(window, "WebSocket", BlockedWebSocket);
  seal(window, "Worker", class BlockedWorker {
    constructor(url) {
      refused.workers.push("Worker " + String(url));
      throw deny("Worker");
    }
  });
  seal(window, "SharedWorker", class BlockedSharedWorker {
    constructor(url) {
      refused.workers.push("SharedWorker " + String(url));
      throw deny("SharedWorker");
    }
  });
  seal(window, "open", function open(url) {
    refused.popups.push(String(url ?? ""));
    return null;
  });
  if (navigator.serviceWorker) {
    seal(navigator.serviceWorker, "register", (url) => {
      refused.serviceWorkers.push(String(url));
      return Promise.reject(deny("ServiceWorker"));
    });
  }
})();`;
const EMPTY_REFUSALS = () => ({ webSockets: [], workers: [], popups: [], serviceWorkers: [] });
// Read back what the window guard refused (structured clone across the
// driver boundary; a page without the guard reports nothing refused).
function readRefusals() {
  const refused = window.__baselineRefused;
  return refused ? JSON.parse(JSON.stringify(refused)) : { webSockets: [], workers: [], popups: [], serviceWorkers: [] };
}
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

// Every artefact lands through a temp file + rename so a run killed mid-write
// (shell budget, OOM) never leaves a half-written PNG or JSON that the next
// resumable run would mistake for a finished one.
function writeFileAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

export function writeJson(file, value) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

const SENSITIVE_EVIDENCE_KEY = /(?:authorization|cookie|credential|jwt|token|secret|password|api[_-]?key|session)/i;

// Lighthouse and the capture ledger are evidence that may be retained. Keep
// useful non-sensitive query metadata (SDK/API versions and method markers),
// but never persist credentials that a browser SDK decorates onto its URLs.
export function redactEvidenceUrl(value) {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value);
    if (url.username) url.username = "[REDACTED]";
    if (url.password) url.password = "[REDACTED]";
    if (url.search) {
      const redacted = new URLSearchParams();
      for (const [key, queryValue] of url.searchParams) {
        redacted.append(key, SENSITIVE_EVIDENCE_KEY.test(key) ? "[REDACTED]" : queryValue);
      }
      url.search = redacted.toString();
    }
    // Fragments are never needed by an evidence URL and may contain auth state.
    url.hash = "";
    return url.toString();
  } catch {
    // Some diagnostics embed a URL in prose rather than storing it as a URL
    // value. Redact sensitive query values there too without losing unrelated
    // diagnostic text or non-sensitive query metadata.
    return value
      .replace(/(https?:\/\/)[^\/\s@]*@/gi, "$1[REDACTED]@")
      .replace(/([?&]([^=&\s]+)=)([^&#\s"'`]+)/g, (match, prefix, rawKey) => {
        let key = rawKey;
        try {
          key = decodeURIComponent(rawKey);
        } catch {
          // A malformed key is still safe to leave as non-sensitive metadata.
        }
        return SENSITIVE_EVIDENCE_KEY.test(key) ? `${prefix}[REDACTED]` : match;
      });
  }
}

export function redactEvidenceRequest(request) {
  return { ...request, ...(typeof request?.url === "string" ? { url: redactEvidenceUrl(request.url) } : {}) };
}

export function redactRefusals(refusals) {
  return {
    ...refusals,
    blockedRequests: refusals.blockedRequests.map(redactEvidenceRequest),
    allowedAuthInitializations: refusals.allowedAuthInitializations.map(redactEvidenceRequest),
    blockedWebSockets: refusals.blockedWebSockets.map(redactEvidenceUrl),
    blockedWorkers: refusals.blockedWorkers.map(redactEvidenceUrl),
    blockedPopups: refusals.blockedPopups.map(redactEvidenceUrl),
    blockedServiceWorkers: refusals.blockedServiceWorkers.map(redactEvidenceUrl),
  };
}

function redactLighthouseEvidence(value, key = "") {
  if (SENSITIVE_EVIDENCE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactEvidenceUrl(value);
  if (Array.isArray(value)) return value.map((item) => redactLighthouseEvidence(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([entryKey, item]) => [entryKey, redactLighthouseEvidence(item, entryKey)]));
  }
  return value;
}

// `--base` / `--against` are recorded verbatim in manifests and reports, so a
// URL carrying credentials would persist them in the repository.
export function parseOriginUrl(value, flag) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${flag} must be an absolute http(s) URL, got ${JSON.stringify(value)}`);
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error(`${flag} must use http or https, got ${url.protocol}`);
  if (url.username || url.password) throw new Error(`${flag} must not carry credentials (userinfo is written to manifests and reports)`);
  // Routes are absolute paths resolved against the origin, so a base with its
  // own path/query/hash would silently capture something else.
  if (url.pathname !== "/" || url.search || url.hash) throw new Error(`${flag} must be a bare origin without path, query or fragment, got ${JSON.stringify(value)}`);
  return url.origin;
}

function sha256File(file) {
  try {
    return sha256(fs.readFileSync(file));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Navigation budget
// ---------------------------------------------------------------------------
//
// One budget object is shared by every page load of an invocation — screenshot
// captures, their throttle/timeout retries, and Lighthouse audits alike — and
// is charged BEFORE the load is attempted, so `used` can never understate what
// the origin actually served, even when the attempt throws.
class NavigationBudgetExhausted extends Error {
  constructor(label) {
    super(`navigation budget exhausted before ${label}`);
    this.name = "NavigationBudgetExhausted";
  }
}

export function createNavigationBudget(max = Infinity) {
  return {
    max: Number.isFinite(max) ? max : Infinity,
    used: 0,
    get remaining() {
      return this.max - this.used;
    },
    take(label) {
      if (this.used >= this.max) throw new NavigationBudgetExhausted(label);
      this.used += 1;
    },
  };
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

// Every browser this module launches is read-only by construction: launch
// fails if the guard cannot be installed.
export async function launchBrowser(label, {
  remoteDebuggingPort,
} = {}) {
  const args = ["--disable-dev-shm-usage"];
  if (remoteDebuggingPort) args.push(`--remote-debugging-port=${remoteDebuggingPort}`);
  const browser = await launchBrowserWithLease(
    chromium,
    {
      headless: true,
      executablePath: chromiumExecutable(),
      chromiumSandbox: true,
      args,
      // Playwright disables Chromium's popup blocker by default; a capture
      // never clicks, so leaving it on means no page script can open a window
      // (window.open, <a target=_blank>, form targets) without a user
      // activation it can never obtain.
      ignoreDefaultArgs: ["--disable-popup-blocking"],
    },
    label,
  );
  try {
    await installReadOnlyGuard(browser);
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
  return browser;
}

// Read-only guard, layer 1 of 2: a Fetch interceptor on the BROWSER target.
// Chromium pauses every HTTP request from every target of the browser here —
// pages, popups, iframes, dedicated/shared/service workers, and a page that
// Lighthouse drives over the remote-debugging port — regardless of which
// context or driver issued it. Anything but GET/HEAD/OPTIONS is failed with
// BlockedByClient. Page-level routing (context.route / puppeteer
// interception) stays in place only for per-viewport attribution; this layer
// is what makes the property hold for targets those hooks never see.
const readOnlyGuards = new WeakMap();
async function installReadOnlyGuard(browser) {
  const session = await browser.newBrowserCDPSession();
  const guard = {
    blocked: [],
    allowedAuthInitializations: [],
    continued: 0,
  };
  session.on("Fetch.requestPaused", (event) => {
    const { requestId, request, resourceType } = event;
    if (SAFE_METHODS.has(request.method)) {
      guard.continued += 1;
      // A request routed by Playwright as well may already be gone by the
      // time this reply lands; the request cannot proceed without both
      // clients, so a late error here can only mean it was already decided.
      session.send("Fetch.continueRequest", { requestId }).catch(() => {});
      return;
    }
    guard.blocked.push({ method: request.method, url: request.url, resourceType: resourceType ?? null });
    session.send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
  });
  await session.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  readOnlyGuards.set(browser, guard);
  return guard;
}

// Tally of what the browser-wide guard refused for a browser from
// launchBrowser (null for any other browser).
export function readOnlyGuardOf(browser) {
  const guard = readOnlyGuards.get(browser);
  return guard
    ? {
        blocked: [...guard.blocked],
        allowedAuthInitializations: [...guard.allowedAuthInitializations],
        continued: guard.continued,
      }
    : null;
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
// Every page the capture drives — screenshot/DOM/axe loads and the page
// Lighthouse audits — lives in a context opened here. Read-only by
// construction, not by hope: the page may only GET/HEAD (and send CORS
// preflights). Anything else — a beacon, form post, user/session endpoint, or
// sign-in write — is aborted and recorded so the capture can never mutate the
// origin.
// WebSocket frames bypass request routing, so sockets are never connected to
// the server (a routed socket sees a silent mock); the window guard refuses
// the constructor before that can even fire. Context-level routes and init
// scripts cover every page of the context, popups included: Playwright holds
// a new target paused until they are installed, and the browser's popup
// blocker (see launchBrowser) keeps page scripts from opening one at all;
// a page that exists anyway when the load is read back is recorded as a
// contained popup and closed with the context. Refusals are collected per
// context so a capture record can attribute them to one page load.
export async function openReadOnlyContext(browser, contextOptions) {
  const context = await browser.newContext({ serviceWorkers: "block", ...contextOptions });
  const refused = { requests: [], allowedAuthInitializations: [], webSockets: [] };
  await context.route("**/*", (route) => {
    const request = route.request();
    if (SAFE_METHODS.has(request.method())) return route.continue();
    refused.requests.push({ method: request.method(), url: request.url() });
    return route.abort("blockedbyclient");
  });
  await context.routeWebSocket("**", (ws) => {
    refused.webSockets.push(ws.url());
  });
  await context.addInitScript(READ_ONLY_WINDOW_SOURCE);
  const page = await context.newPage();
  // What this page load refused, from every layer that can attribute it to
  // the page: context routes, the routed sockets, and the window guard of
  // every frame still attached (a frame gone by now can only have been
  // refused, never served — the origin-side evidence is the routes above).
  // Any other page of the context at this point is a popup the page managed
  // to open; it ran under the same guard and is reported as contained.
  // (Tooling pages, e.g. the blank page axe uses to finish a run, are closed
  // by their owner before this is read.)
  const refusals = async () => {
    const windowRefused = EMPTY_REFUSALS();
    for (const frame of page.frames()) {
      const frameRefused = await frame.evaluate(readRefusals).catch(() => EMPTY_REFUSALS());
      for (const key of Object.keys(windowRefused)) windowRefused[key].push(...frameRefused[key]);
    }
    const contained = context.pages().filter((other) => other !== page).map((other) => `contained ${other.url()}`);
    return {
      blockedRequests: [...refused.requests],
      allowedAuthInitializations: [...refused.allowedAuthInitializations],
      blockedWebSockets: [...new Set([...refused.webSockets, ...windowRefused.webSockets])],
      blockedWorkers: windowRefused.workers,
      blockedPopups: [...windowRefused.popups, ...contained],
      blockedServiceWorkers: windowRefused.serviceWorkers,
    };
  };
  return { context, page, refusals };
}

async function capturePage({ browser, url, viewport, wantAxe, wantPng, telemetry, log = console, budget = createNavigationBudget() }) {
  let lastReason = "no response";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    budget.take(`${url}@${viewport.width} attempt ${attempt}`);
    const { context, page, refusals } = await openReadOnlyContext(browser, {
      viewport,
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "UTC",
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
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
      const redactedRefusals = redactRefusals(await refusals());
      const capture = {
        capturedAt: new Date().toISOString(),
        requestedUrl: redactEvidenceUrl(url),
        finalUrl: redactEvidenceUrl(page.url()),
        documentStatus: status,
        xRobotsTag: response.headers()["x-robots-tag"] ?? null,
        httpRedirects: httpRedirects.map(redactEvidenceUrl),
        clientNavigations: [...new Set(clientNavigations)].map(redactEvidenceUrl),
        ...redactedRefusals,
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
//
// Lighthouse's page-mode API wants a puppeteer Page, and puppeteer attaches
// over the remote-debugging port outside the Playwright contexts whose routes
// and init scripts make a page read-only. So the page Lighthouse audits is
// created in a read-only Playwright context first, and the puppeteer handle
// to that same target (found by a one-off marker URL) is what Lighthouse
// drives — puppeteer-core is the copy Lighthouse itself resolves, the only
// version its navigation runner is built against. The audited page, its
// frames and any popup are then Playwright pages of that context, with the
// same guarantees as every screenshot load, and the refusals are read back
// through the Playwright side.

async function importLighthousePuppeteer() {
  const requireFromLighthouse = createRequire(createRequire(import.meta.url).resolve("lighthouse/package.json"));
  return (await import(pathToFileURL(requireFromLighthouse.resolve("puppeteer-core")).href)).default;
}

async function connectLighthouseBrowser(port) {
  const puppeteer = await importLighthousePuppeteer();
  return puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null });
}

async function openLighthousePage(browser, puppeteerBrowser) {
  // No Playwright viewport emulation: Lighthouse applies its own mobile
  // device metrics on the page and must not compete with a second override.
  const readOnly = await openReadOnlyContext(browser, { viewport: null });
  const marker = `about:blank#production-baseline-lighthouse-${randomUUID()}`;
  try {
    await readOnly.page.goto(marker);
    const target = await puppeteerBrowser.waitForTarget((candidate) => candidate.url() === marker, { timeout: 15_000 });
    const puppeteerPage = await target.page();
    if (!puppeteerPage) throw new Error("puppeteer could not attach to the Lighthouse page");
    return { ...readOnly, puppeteerPage };
  } catch (error) {
    await readOnly.context.close().catch(() => {});
    throw error;
  }
}

function sanitizedTraceUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = new URL(value);
    // Script/data/blob bodies can contain arbitrary program or user data. The
    // summary needs only network script/document attribution.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return redactEvidenceUrl(parsed.href);
  } catch {
    return null;
  }
}

function sanitizedTraceFunction(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  // Chrome reports source-level identifiers here. Keep only conventional
  // identifier punctuation so dynamically generated labels cannot retain data.
  return value.replace(/[^A-Za-z0-9_$.[\]<>:# -]/g, "_").replace(/\s+/g, " ").trim().slice(0, 160) || null;
}

function taskFunctionName(task) {
  const candidates = [];
  const visit = (node) => {
    const data = { ...(node.event.args?.beginData ?? {}), ...(node.event.args?.data ?? {}) };
    const stackTrace = data.stackTrace?.callFrames ?? data.stackTrace;
    const frames = Array.isArray(stackTrace) ? stackTrace : [];
    const functionName = frames.find((frame) => typeof frame?.functionName === "string")?.functionName;
    if (functionName) candidates.push({ duration: node.duration, functionName });
    for (const child of node.children) visit(child);
  };
  visit(task);
  candidates.sort((a, b) => b.duration - a.duration);
  return sanitizedTraceFunction(candidates[0]?.functionName);
}

// Lighthouse already records its default-pass trace for every navigation. This
// optional diagnostic derives only the longest top-level tasks from that
// existing artifact; it starts no second tracer/profiler and persists no raw
// trace event, stack, request, or query-string data.
async function summarizeLighthouseTrace(artifacts) {
  const trace = artifacts?.Trace ?? artifacts?.traces?.defaultPass;
  if (!Array.isArray(trace?.traceEvents)) {
    throw new Error("Lighthouse trace summary requested, but its default-pass trace artifact is unavailable");
  }
  const [{ TraceProcessor }, { MainThreadTasks }] = await Promise.all([
    import("lighthouse/core/lib/tracehouse/trace-processor.js"),
    import("lighthouse/core/lib/tracehouse/main-thread-tasks.js"),
  ]);
  const processed = TraceProcessor.processTrace(trace);
  const tasks = MainThreadTasks.getMainThreadTasks(
    processed.mainThreadEvents,
    processed.frames,
    processed.timestamps.traceEnd,
    processed.timestamps.timeOrigin,
  );
  const topLevelTasks = tasks
    .filter((task) => !task.parent && !task.unbounded)
    .map((task) => ({
      event: task.event.name,
      durationMs: Number(task.duration.toFixed(3)),
      selfTimeMs: Number(task.selfTime.toFixed(3)),
      url: sanitizedTraceUrl(task.attributableURLs[0]),
      function: taskFunctionName(task),
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
  return {
    schemaVersion: 1,
    source: "Lighthouse default-pass trace",
    rawTracePersisted: false,
    totalTopLevelTaskCount: topLevelTasks.length,
    topLevelTasks: topLevelTasks.slice(0, 50),
  };
}

async function runLighthouse({
  url,
  browser,
  puppeteerBrowser,
  log = console,
  telemetry,
  budget = createNavigationBudget(),
  traceSummary = false,
}) {
  const { default: lighthouse } = await import("lighthouse");
  let lastReason = "no result";
  for (let attempt = 1; attempt <= 4; attempt++) {
    budget.take(`lighthouse ${url} attempt ${attempt}`);
    const { context, puppeteerPage, refusals } = await openLighthousePage(browser, puppeteerBrowser);
    let result;
    let refused;
    try {
      result = await lighthouse(url, { output: "json", logLevel: "error", onlyCategories: LIGHTHOUSE_CATEGORIES }, undefined, puppeteerPage);
      refused = await refusals();
    } finally {
      await context.close().catch(() => {});
    }
    const lhr = result?.lhr ? redactLighthouseEvidence(result.lhr) : null;
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
    const trace = traceSummary ? await summarizeLighthouseTrace(result.artifacts) : null;
    if (refused.blockedRequests.length) log.warn(`  lighthouse ${url}: refused ${refused.blockedRequests.length} non-safe request(s)`);
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
      requestCount: lhr.audits?.["network-requests"]?.details?.items?.length ?? null,
      traceSummary: trace,
      ...redactRefusals(refused),
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

// Captures one visitor route into <outDir>/routes/<slug>/. Resumable, with a
// route × viewport as the unit of work. A unit is complete only when its
// three artefacts provably came from one page load:
//
//   dom.json  byViewport[w].unitId + screenshot.sha256   (written LAST)
//   axe.json  byViewport[w].unitId                       (same id, axe widths)
//   <slug>@<w>.png                                        (sha256 as recorded)
//
// The DOM record is the completion marker: before a viewport is (re)captured
// its previous DOM/axe records are removed and persisted and its PNG deleted;
// afterwards the PNG lands first, then the axe record, then the DOM record
// naming both. A crash at any point leaves a unit that fails the binding
// check and is recaptured whole — a PNG from one load can never sit beside a
// DOM/axe record from another. Documents (robots, sitemap) bind the same way:
// body file first, DOM record with the body's sha256 last.
//
// Every page load, including throttle/timeout retries, is charged to `budget`
// before it starts; an exhausted budget ends the route with complete=false and
// no partial unit left behind. Returns the loads this call performed.
export async function captureRoute({ browser, base, route, outDir, viewports = VIEWPORTS, axeWidths = AXE_WIDTHS, force = false, telemetry, log = console, budget = createNavigationBudget() }) {
  const slug = routeSlug(route.path);
  const dir = routeDir(outDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const url = new URL(route.path, base).href;
  const statusPath = path.join(dir, "status.json");
  const domPath = path.join(dir, "dom.json");
  const axePath = path.join(dir, "axe.json");
  const usedBefore = budget.used;

  if (force || !fs.existsSync(statusPath)) {
    log.log(`  status probe ${route.path}`);
    writeJson(statusPath, { route: route.path, slug, kind: route.kind, note: route.note ?? null, ...(await probeStatus(url, { telemetry, log })) });
  }

  if (route.kind === "document") {
    if (!force && documentUnitComplete(dir, readJson(domPath))) return { slug, navigations: 0, complete: true };
    fs.rmSync(domPath, { force: true });
    const { response } = await fetchWithRetry(url, {}, { telemetry, log, label: route.path });
    const body = await response.text();
    const extension = documentExtension(route.path);
    writeFileAtomic(path.join(dir, `body.${extension}`), body);
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
    return { slug, navigations: 0, complete: true };
  }

  const dom = readJson(domPath) ?? { route: route.path, slug, kind: route.kind, note: route.note ?? null, byViewport: {} };
  const axe = readJson(axePath) ?? { route: route.path, slug, axeWidths, byViewport: {} };
  const persist = () => {
    finalizeDom(dom, viewports);
    if (axeWidths.length) writeJson(axePath, axe);
    writeJson(domPath, dom);
  };
  let complete = true;
  for (const viewport of viewports) {
    const key = String(viewport.width);
    const pngPath = path.join(dir, `${slug}@${viewport.width}.png`);
    const wantAxe = axeWidths.includes(viewport.width);
    if (!force && viewportUnitComplete({ pngPath, dom, axe, key, wantAxe })) continue;
    if (budget.remaining <= 0) {
      complete = false;
      break;
    }
    // Invalidate the old generation before loading the new one.
    if (dom.byViewport[key] || axe.byViewport[key]) {
      delete dom.byViewport[key];
      delete axe.byViewport[key];
      persist();
    }
    fs.rmSync(pngPath, { force: true });
    log.log(`  capture ${route.path} @${viewport.width}${wantAxe ? " +axe" : ""}`);
    let result;
    try {
      result = await capturePage({ browser, url, viewport, wantAxe, wantPng: true, telemetry, log, budget });
    } catch (error) {
      if (error instanceof NavigationBudgetExhausted) {
        complete = false;
        break;
      }
      throw error;
    }
    const unitId = randomUUID();
    writeFileAtomic(pngPath, result.png);
    if (wantAxe) axe.byViewport[key] = { unitId, ...result.axe };
    else delete axe.byViewport[key];
    dom.byViewport[key] = { unitId, ...result.capture, screenshot: { ...result.capture.screenshot, sha256: sha256(result.png), bytes: result.png.length } };
    persist();
  }
  return { slug, navigations: budget.used - usedBefore, complete };
}

function viewportUnitComplete({ pngPath, dom, axe, key, wantAxe }) {
  const record = dom.byViewport?.[key];
  if (!record?.unitId || !record.screenshot?.sha256) return false;
  if (sha256File(pngPath) !== record.screenshot.sha256) return false;
  return !wantAxe || axe.byViewport?.[key]?.unitId === record.unitId;
}

function documentUnitComplete(dir, dom) {
  if (!dom?.bodyFile || !dom.sha256) return false;
  return sha256File(path.join(dir, dom.bodyFile)) === dom.sha256;
}

// True when every unit captureRoute would produce for this route is complete
// under the binding rule above, so callers never declare a route complete
// from file existence alone.
export function routeIsComplete({ outDir, route, viewports = VIEWPORTS, axeWidths = AXE_WIDTHS }) {
  const slug = routeSlug(route.path);
  const dir = routeDir(outDir, slug);
  if (!fs.existsSync(path.join(dir, "status.json"))) return false;
  const dom = readJson(path.join(dir, "dom.json"));
  if (!dom) return false;
  if (route.kind === "document") return documentUnitComplete(dir, dom);
  const axe = readJson(path.join(dir, "axe.json")) ?? { byViewport: {} };
  return viewports.every((viewport) =>
    viewportUnitComplete({ pngPath: path.join(dir, `${slug}@${viewport.width}.png`), dom, axe, key: String(viewport.width), wantAxe: axeWidths.includes(viewport.width) }),
  );
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
    // Byte-faithful: the file IS the response body, so its sha256 equals the
    // one recorded in shapes.json and a `cmp` against a fresh fetch is honest.
    writeFileAtomic(bodyPath, body);
    shapes.endpoints[endpoint] = { ...summary, bodyFile: `${slug}.json` };
    writeJson(shapesPath, shapes);
  }
  return shapes;
}

// Each Lighthouse audit is a page load against the origin (every attempt of
// it), so it spends the same navigation budget as a screenshot; `complete` is
// false when the budget ran out before every route had a report. The report
// file is written before its scores entry, which is the completion marker.
export async function captureLighthouseSet({
  base,
  outDir,
  browser,
  port,
  routes = LIGHTHOUSE_ROUTES,
  force = false,
  traceSummary = false,
  telemetry,
  log = console,
  budget = createNavigationBudget(),
}) {
  const lhDir = path.join(outDir, "lighthouse");
  fs.mkdirSync(lhDir, { recursive: true });
  const scoresPath = path.join(lhDir, "scores.json");
  const scores = readJson(scoresPath) ?? { base, preset: "mobile", categories: LIGHTHOUSE_CATEGORIES, routes: {} };
  const usedBefore = budget.used;
  let complete = true;
  let puppeteerBrowser = null;
  try {
    for (const route of routes) {
      const slug = routeSlug(route);
      const reportPath = path.join(lhDir, `${slug}.json`);
      const traceSummaryPath = path.join(lhDir, `${slug}.trace-summary.json`);
      if (!force && scores.routes[route] && fs.existsSync(reportPath) && (!traceSummary || fs.existsSync(traceSummaryPath))) continue;
      if (budget.remaining <= 0) {
        complete = false;
        break;
      }
      if (scores.routes[route]) {
        delete scores.routes[route];
        writeJson(scoresPath, scores);
      }
      // A forced/non-resumable capture without trace diagnostics must not leave
      // an older trace summary looking as though it describes the new report.
      if (!traceSummary) fs.rmSync(traceSummaryPath, { force: true });
      const url = new URL(route, base).href;
      log.log(`  lighthouse ${route}`);
      puppeteerBrowser ??= await connectLighthouseBrowser(port);
      let outcome;
      try {
        outcome = await runLighthouse({ url, browser, puppeteerBrowser, log, telemetry, budget, traceSummary });
      } catch (error) {
        if (error instanceof NavigationBudgetExhausted) {
          complete = false;
          break;
        }
        throw error;
      }
      const { lhr, traceSummary: trace, ...summary } = outcome;
      // Compact JSON: a Lighthouse report is read by tools, and pretty-printing
      // doubles what the repository has to carry per route.
      writeFileAtomic(reportPath, `${JSON.stringify(lhr)}\n`);
      if (trace) writeJson(traceSummaryPath, trace);
      scores.routes[route] = {
        ...summary,
        reportFile: `${slug}.json`,
        traceSummaryFile: trace ? `${slug}.trace-summary.json` : null,
      };
      writeJson(scoresPath, scores);
    }
  } finally {
    await puppeteerBrowser?.disconnect().catch(() => {});
  }
  return { scores, navigations: budget.used - usedBefore, complete };
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
