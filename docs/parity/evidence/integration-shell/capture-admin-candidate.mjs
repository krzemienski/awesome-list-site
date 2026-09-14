#!/usr/bin/env node
/**
 * Task 565 targeted, read-only candidate capture.
 *
 * This intentionally compares the local frozen candidate with the retained,
 * authorized production `/admin` baseline at 375 and 1440, and checks the
 * canonical overview and Research-hash contracts plus the server-supported
 * Research direct deep link. It does not
 * recapture production, submit a form, dismiss consent, export, create a
 * fixture, or run a pixel sweep. It does exercise the non-mutating Settings
 * navigation and New entry dialog-opening contracts.
 *
 * Run only after the parent has frozen source and started the candidate:
 *
 *   CLERK_SECRET_KEY=... ADMIN_PASSWORD=... \
 *   node docs/parity/evidence/integration-shell/capture-admin-candidate.mjs \
 *     --base http://127.0.0.1:5101 \
 *     --identity-base http://127.0.0.1:5000 \
 *     --out /tmp/validation/task565-admin-candidate
 *
 * A disposable real Clerk user named Nick is created, signed in, promoted via
 * the existing parity identity helper, and torn down in finally. The capture
 * contexts receive only that in-memory authenticated storage state; the audit
 * key is never injected into browser requests or used as a Clerk substitute.
 * The output has no audit key, cookies, response bodies, or screenshots.
 * Exit 0 means the targeted non-pixel contracts passed; exit 1 records a
 * contract/read-only failure; exit 2 is invalid invocation/tooling.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { launchBrowserWithLease } from "../../../../scripts/validation/playwright-launch-lease.mjs";
import {
  launchBrowser,
  readOnlyGuardOf,
  redactEvidenceUrl,
} from "../../../../scripts/validation/production-baseline-lib.mjs";
import {
  createDisposableAdmin,
  declineAnalyticsConsentViaUi,
  identityAvailability,
} from "../../../../tests/parity/identity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const RETAINED_BASELINE = path.join(
  ROOT,
  "docs/parity/evidence/integration-shell/retained-controls/production-admin/summary.json",
);
// The static shell has no Vite HMR runtime, so strict Worker/WebSocket sealing
// tests the application rather than a development-server transport. The real
// Nick setup stays on the API-owning app origin: cookies are host-scoped across
// these loopback ports, but promotion/teardown must not be proxied through the
// static shell.
const DEFAULT_BASE = "http://127.0.0.1:5101";
const DEFAULT_IDENTITY_BASE = "http://127.0.0.1:5000";
const DEFAULT_OUT = "/tmp/validation/task565-admin-candidate";
const REQUIRED_CAPTURE_ORIGIN = "http://127.0.0.1:5101";
const REQUIRED_IDENTITY_ORIGIN = "http://127.0.0.1:5000";
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
];
const CANONICAL_ADMIN_CONTRACTS = [
  {
    route: "/admin",
    tabId: "overview",
    panelTestId: "content-overview",
    requireResearchReview: false,
    verifyActions: true,
  },
  {
    route: "/admin#research",
    tabId: "research",
    panelTestId: "content-research",
    requireResearchReview: true,
    verifyActions: false,
  },
  {
    // This is an HTTP-200 deep-link contract, not the canonical tab URL. The
    // canonical user-facing tab form remains /admin#research.
    route: "/admin/research",
    tabId: "research",
    panelTestId: "content-research",
    requireResearchReview: true,
    verifyActions: false,
  },
];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SERIOUS_CRITICAL = new Set(["serious", "critical"]);
const WINDOW_REFUSAL_KEYS = ["webSockets", "workers", "popups", "serviceWorkers"];
const OPAQUE_PATH_ID = /^(?:sess(?:ion)?|client|user|usr|org|device|visitor|instance|token|jwt|sid|uid)[_-][A-Za-z0-9_-]+$/i;
const UUID_PATH_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const NUMERIC_PATH_ID = /^\d{4,}$/;

function chromiumLaunchOptions() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  return {
    headless: true,
    chromiumSandbox: true,
    ...(executablePath ? { executablePath } : {}),
  };
}

// Read-only diagnostics can include browser-generated WebSocket, worker, and
// popup URLs. Route every persisted string through the shared evidence
// redactor, rather than assuming the guard's refusal metadata is harmless.
// This preserves useful non-sensitive paths while redacting query credentials
// and removing fragments from absolute URLs.
function sanitizeForEvidence(value) {
  if (typeof value === "string") return redactEvidenceUrl(value);
  if (Array.isArray(value)) return value.map(sanitizeForEvidence);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitizeForEvidence(nested)]),
    );
  }
  return value;
}

function normalizeEvidencePathname(pathname) {
  return pathname.split("/").map((segment) => {
    if (!segment) return segment;
    if (UUID_PATH_ID.test(segment)) return "<uuid>";
    if (NUMERIC_PATH_ID.test(segment)) return "<id>";
    if (OPAQUE_PATH_ID.test(segment)) {
      const separator = segment.includes("_") ? "_" : "-";
      return `${segment.slice(0, segment.indexOf(separator))}${separator}<id>`;
    }
    return segment;
  }).join("/") || "/";
}

// Diagnostics retain vendor/app routing information but never a query value,
// URL credential, or common session/client/user identifier. This is separate
// from the general baseline evidence redactor, which may keep non-sensitive
// query metadata for work outside this strict admin diagnostic.
function sanitizedOriginPath(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "blob:") {
      const inner = new URL(url.pathname);
      return {
        origin: `blob:${inner.origin}`,
        path: normalizeEvidencePathname(inner.pathname),
      };
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return { origin: "<opaque>", path: "<opaque>" };
    }
    return { origin: url.origin, path: normalizeEvidencePathname(url.pathname) };
  } catch {
    return { origin: "<opaque>", path: "<opaque>" };
  }
}

function diagnosticTargetLabel(target) {
  return target.origin === "<opaque>" ? "<opaque>" : `${target.origin}${target.path}`;
}

function sanitizedInitiatorStack(rawStack) {
  if (typeof rawStack !== "string") return { frames: [], scriptPaths: [] };
  const targetPattern = /(?:blob:|https?:)[^\s)]+/g;
  const scriptPaths = new Set();
  const frames = rawStack
    .split("\n")
    .slice(0, 8)
    .map((frame) => frame.replace(targetPattern, (rawTarget) => {
      const target = sanitizedOriginPath(rawTarget.replace(/:\d+:\d+$/, ""));
      const label = diagnosticTargetLabel(target);
      scriptPaths.add(label);
      return label;
    }))
    .filter(Boolean);
  return { frames, scriptPaths: [...scriptPaths].sort() };
}

function sanitizeWindowRefusalLedger(refusals) {
  if (!validWindowRefusalLedger(refusals)) return refusals;
  return {
    ...refusals,
    workers: refusals.workers.map((entry) => {
      const source = typeof entry === "object" && entry ? entry.source : entry;
      const kind = typeof entry === "object" && entry ? entry.kind : "Worker";
      const initiator = sanitizedInitiatorStack(
        typeof entry === "object" && entry ? entry.initiatorStack : "",
      );
      return {
        kind,
        source: sanitizedOriginPath(source),
        initiatorStack: initiator.frames,
        initiatorScriptPaths: initiator.scriptPaths,
      };
    }),
    webSockets: refusals.webSockets.map((entry) => sanitizedOriginPath(
      typeof entry === "object" && entry ? entry.source : entry,
    )),
    popups: refusals.popups.map((entry) => sanitizedOriginPath(entry)),
    serviceWorkers: refusals.serviceWorkers.map((entry) => sanitizedOriginPath(entry)),
  };
}

function diagnosticRequest(request) {
  return {
    method: request.method,
    ...(request.resourceType === undefined ? {} : { resourceType: request.resourceType }),
    target: sanitizedOriginPath(request.url),
  };
}

function diagnosticAllowedInitialization(request) {
  return {
    kind: request.kind,
    method: request.method,
    target: sanitizedOriginPath(request.url),
  };
}

function declinedConsentIsStoredForCaptureOrigin(storageState, captureOrigin) {
  return Array.isArray(storageState?.origins) && storageState.origins.some((originState) =>
    originState?.origin === captureOrigin &&
    Array.isArray(originState.localStorage) &&
    originState.localStorage.some((entry) =>
      entry?.name === "analytics-consent" && entry?.value === "denied",
    ),
  );
}

function parseArgs(argv) {
  const args = {
    base: DEFAULT_BASE,
    identityBase: DEFAULT_IDENTITY_BASE,
    out: DEFAULT_OUT,
    diagnosticAdmin375: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => {
      const next = argv[++i];
      if (!next) throw new Error(`${flag} requires a value`);
      return next;
    };
    if (flag === "--base") args.base = value();
    else if (flag === "--identity-base") args.identityBase = value();
    else if (flag === "--out") args.out = value();
    else if (flag === "--diagnostic-admin-375") args.diagnosticAdmin375 = true;
    else if (flag === "--help" || flag === "-h") {
      console.log("Usage: CLERK_SECRET_KEY=... ADMIN_PASSWORD=... node docs/parity/evidence/integration-shell/capture-admin-candidate.mjs [--base http://127.0.0.1:5101] [--identity-base http://127.0.0.1:5000] [--out /tmp/validation/task565-admin-candidate] [--diagnostic-admin-375]");
      process.exit(0);
    } else throw new Error(`Unknown argument ${flag}`);
  }

  const loopbackOrigin = (raw, flag) => {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
      throw new Error(`${flag} must be a bare http(s) origin`);
    }
    // This is deliberately a candidate-only tool. The retained production
    // capture is the baseline; allowing an arbitrary host here would make it
    // easy to capture production or send identity setup to the wrong host.
    if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
      throw new Error(`${flag} must be a loopback origin; production is never a target of this script`);
    }
    return url;
  };
  const captureUrl = loopbackOrigin(args.base, "--base");
  const identityUrl = loopbackOrigin(args.identityBase, "--identity-base");
  if (captureUrl.origin !== REQUIRED_CAPTURE_ORIGIN || identityUrl.origin !== REQUIRED_IDENTITY_ORIGIN) {
    throw new Error(`This strict harness requires --base ${REQUIRED_CAPTURE_ORIGIN} and --identity-base ${REQUIRED_IDENTITY_ORIGIN}`);
  }
  const identity = identityAvailability();
  if (!identity.ok) {
    throw new Error(`Real disposable Clerk identity is required: missing ${identity.missing.join(", ")}; values are never written`);
  }
  return {
    ...args,
    base: captureUrl.origin,
    identityBase: identityUrl.origin,
    out: path.resolve(args.out),
  };
}

const visibleTestIds = () => Array.from(document.querySelectorAll("[data-testid]"))
  .filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  })
  .map((element) => element.getAttribute("data-testid"))
  .filter(Boolean)
  .sort();

// Layer 3: browser Fetch interception cannot govern worker constructors or
// WebSocket frames. Seal those creation paths in every new document before app
// code executes. Their refusal remains a contract failure; this is not a
// diagnostic-only socket recorder.
const windowGuard = `(() => {
  const refused = { webSockets: [], workers: [], popups: [], serviceWorkers: [] };
  Object.defineProperty(window, "__task565ReadOnlyRefused", { value: refused });
  const seal = (target, name, value) => Object.defineProperty(target, name, {
    value, writable: false, configurable: false,
  });
  const deny = (kind) => new DOMException(kind + " refused: task565 capture is read-only", "SecurityError");
  const workerRefusal = (kind, source) => ({
    kind,
    source: String(source),
    initiatorStack: String(new Error().stack || ""),
  });
  class BlockedWebSocket {
    constructor(url) { refused.webSockets.push(String(url)); throw deny("WebSocket"); }
  }
  Object.assign(BlockedWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  seal(window, "WebSocket", BlockedWebSocket);
  seal(window, "Worker", class {
    constructor(url) { refused.workers.push(workerRefusal("Worker", url)); throw deny("Worker"); }
  });
  seal(window, "SharedWorker", class {
    constructor(url) { refused.workers.push(workerRefusal("SharedWorker", url)); throw deny("SharedWorker"); }
  });
  seal(window, "open", (url) => { refused.popups.push(String(url || "")); return null; });
  if (navigator.serviceWorker) {
    seal(navigator.serviceWorker, "register", (url) => {
      refused.serviceWorkers.push(String(url));
      return Promise.reject(deny("ServiceWorker"));
    });
  }
})();`;

const setDiff = (before = [], after = []) => {
  const b = new Set(before);
  const a = new Set(after);
  return {
    added: [...a].filter((id) => !b.has(id)).sort(),
    removed: [...b].filter((id) => !a.has(id)).sort(),
  };
};

async function waitForAdminAndApiQuiet(page, inFlight, contract) {
  await page.getByTestId("admin-authorized").waitFor({ state: "visible", timeout: 30_000 });
  // Shell authorization resolves before the route's lazy chunk. Sampling the
  // tab after a later action used to turn a valid Overview selection into a
  // false failure, and sampling before this boundary recorded RouteFallback.
  await page.getByTestId(`tab-${contract.tabId}`).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByTestId(contract.panelTestId).waitFor({ state: "visible", timeout: 30_000 });
  if (contract.requireResearchReview) {
    await page.getByTestId("research-review-panel").waitFor({ state: "visible", timeout: 30_000 });
  }
  await page.getByTestId("route-chunk-skeleton").waitFor({ state: "hidden", timeout: 30_000 });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (inFlight.count === 0) {
      await page.waitForTimeout(800);
      if (inFlight.count === 0) return;
    } else {
      await page.waitForTimeout(100);
    }
  }
  throw new Error(`same-origin API never became quiet (${inFlight.count} request(s) in flight)`);
}

function conciseAxe(results) {
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    nodes: violation.nodes.length,
  }));
  const seriousCritical = violations.filter((violation) => SERIOUS_CRITICAL.has(violation.impact));
  return {
    violationCount: violations.length,
    violations,
    seriousCritical: {
      rules: seriousCritical.length,
      nodes: seriousCritical.reduce((count, violation) => count + violation.nodes, 0),
      ids: seriousCritical.map((violation) => `${violation.id}×${violation.nodes}`).sort(),
    },
  };
}

function guardCursor(browser) {
  const guard = readOnlyGuardOf(browser);
  if (!guard) throw new Error("browser-wide read-only guard is unavailable");
  return {
    blocked: guard.blocked.length,
    allowedAuthInitializations: guard.allowedAuthInitializations.length,
  };
}

function guardDelta(browser, cursor) {
  const guard = readOnlyGuardOf(browser);
  if (!guard) throw new Error("browser-wide read-only guard disappeared");
  return {
    blockedNonSafeRequests: guard.blocked.slice(cursor.blocked).map(diagnosticRequest),
    allowedAuthInitializations: guard.allowedAuthInitializations
      .slice(cursor.allowedAuthInitializations)
      .map(diagnosticAllowedInitialization),
  };
}

function validWindowRefusalLedger(refusals) {
  return Boolean(refusals) &&
    typeof refusals === "object" &&
    WINDOW_REFUSAL_KEYS.every((key) => Array.isArray(refusals[key]));
}

async function authenticatedAdminState(page) {
  // This is a real browser-session request. Its body remains in memory; only
  // booleans/status are retained, never a Clerk token or user identifier.
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/user", {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    const body = await response.json().catch(() => null);
    return {
      status: response.status,
      authenticated: body?.isAuthenticated === true,
      role: body?.user?.role ?? body?.role ?? null,
    };
  });
}

async function captureRoute({ browser, base, storageState, contract, viewport }) {
  const { route: routePath } = contract;
  const origin = new URL(base).origin;
  const context = await browser.newContext({
    storageState,
    viewport,
    colorScheme: "dark",
    locale: "en-US",
    timezoneId: "UTC",
    deviceScaleFactor: 1,
    serviceWorkers: "block",
  });
  const counts = {
    observedSafeApiRequests: 0,
    safeApiResponses: [],
    safeApiFailures: [],
    blockedNonSafeRequests: [],
    artificialReadAborts: 0,
  };
  const inFlight = { count: 0 };
  const cursor = guardCursor(browser);
  try {
    // Layer 2: context interception attributes every refused non-safe request
    // to this route/viewport. Layer 1 remains the shared browser-wide guard,
    // so a popup, worker target, or interception race still cannot write.
    await context.addInitScript({ content: windowGuard });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const method = request.method().toUpperCase();
      if (SAFE_METHODS.has(method)) {
        await route.continue();
        return;
      }
      let requestUrl = "";
      try {
        requestUrl = request.url();
      } catch {
        // Opaque requests are still fail-closed and normalized as opaque.
      }
      counts.blockedNonSafeRequests.push(diagnosticRequest({
        method,
        resourceType: request.resourceType(),
        url: requestUrl,
      }));
      counts.artificialReadAborts += 1;
      await route.abort("blockedbyclient");
    });

    const page = await context.newPage();
    page.on("request", (request) => {
      try {
        const url = new URL(request.url());
        if (url.origin === origin && url.pathname.startsWith("/api/") && SAFE_METHODS.has(request.method().toUpperCase())) {
          counts.observedSafeApiRequests += 1;
          inFlight.count += 1;
        }
      } catch {}
    });
    page.on("requestfailed", (request) => {
      try {
        const url = new URL(request.url());
        if (url.origin === origin && url.pathname.startsWith("/api/")) {
          inFlight.count = Math.max(0, inFlight.count - 1);
          if (SAFE_METHODS.has(request.method().toUpperCase())) {
            counts.safeApiFailures.push({
              ...sanitizedOriginPath(request.url()),
              failure: request.failure()?.errorText ?? "requestfailed",
            });
          }
        }
      } catch {}
    });
    page.on("response", (response) => {
      try {
        const url = new URL(response.url());
        if (url.origin === origin && url.pathname.startsWith("/api/")) {
          inFlight.count = Math.max(0, inFlight.count - 1);
          const item = { ...sanitizedOriginPath(response.url()), status: response.status() };
          counts.safeApiResponses.push(item);
          if (response.status() >= 400) counts.safeApiFailures.push(item);
        }
      } catch {}
    });

    const documentResponse = await page.goto(`${base}${routePath}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForAdminAndApiQuiet(page, inFlight, contract);
    const auth = await authenticatedAdminState(page);
    const adminAuthorizedAfterApiQuiet = auth.status === 200 && auth.authenticated && auth.role === "admin";
    if (!adminAuthorizedAfterApiQuiet) {
      throw new Error(`real Clerk session is not an authenticated admin after API quiet (HTTP ${auth.status}, role ${auth.role ?? "none"})`);
    }
    const [testIds, footer, axe] = await Promise.all([
      page.evaluate(visibleTestIds),
      page.evaluate(() => ({
        siteFooterVisible: Array.from(document.querySelectorAll(".site-footer")).some((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        }),
        visibleFooterTestIds: Array.from(document.querySelectorAll('[data-testid^="footer-"]'))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
          })
          .map((element) => element.getAttribute("data-testid"))
          .filter(Boolean)
          .sort(),
      })),
      new AxeBuilder({ page }).analyze().then(conciseAxe),
    ]);
    const expectedTab = contract.tabId;
    const researchReviewVisible = contract.requireResearchReview
      ? await page.getByTestId("research-review-panel").isVisible().catch(() => false)
      : null;
    const tab = page.getByTestId(`tab-${expectedTab}`);
    // Snapshot all route assertions before any action. New entry intentionally
    // changes /admin from Overview to Resources, so evaluating tab state after
    // it runs is not an assertion about the loaded overview route.
    const expectedTabVisible = await tab.isVisible().catch(() => false);
    const expectedTabSelected = (await tab.getAttribute("aria-selected").catch(() => null)) === "true";
    const activePanelVisible = await page.getByTestId(contract.panelTestId).isVisible().catch(() => false);
    const current = new URL(page.url());
    const actions = contract.verifyActions
      ? await verifyAdminActions({ page, base, inFlight, overviewContract: contract })
      : null;
    const readOnlyDelta = guardDelta(browser, cursor);
    const refusals = await page.evaluate(() => window.__task565ReadOnlyRefused ?? null);
    const blockedNonSafeRequests = [
      ...counts.blockedNonSafeRequests,
      ...readOnlyDelta.blockedNonSafeRequests,
    ];
    return {
      route: routePath,
      viewport: viewport.width,
      status: documentResponse?.status() ?? null,
      finalPath: `${current.pathname}${current.hash}`,
      adminAuthorizedAfterApiQuiet,
      expectedTab,
      expectedTabVisible,
      expectedTabSelected,
      activePanelVisible,
      researchReviewVisible,
      visibleTestIds: testIds,
      footer,
      axe,
      actions,
      readOnly: {
        ...counts,
        ...readOnlyDelta,
        blockedNonSafeRequests,
        blockedNonSafeRequestCount: blockedNonSafeRequests.length,
        refusedWindowOperations: sanitizeWindowRefusalLedger(refusals),
      },
    };
  } finally {
    await context.close();
  }
}

async function verifyAdminActions({ page, base, inFlight, overviewContract }) {
  const settings = { linkVisible: false, navigated: false, themeHeadingVisible: false };
  // At desktop width AppSidebar also contains a closed "More navigation" Theme
  // link. Scope the query to the dashboard masthead so a hidden sidebar link
  // cannot be mistaken for this action.
  const settingsLink = page.locator('.admin-dashboard__actions a[href="/settings/theme"]');
  settings.linkVisible = await settingsLink.isVisible().catch(() => false);
  if (settings.linkVisible) {
    await Promise.all([
      page.waitForURL(`${base}/settings/theme`, { timeout: 15_000 }),
      settingsLink.click(),
    ]);
    settings.navigated = new URL(page.url()).pathname === "/settings/theme";
    const themeHeading = page.getByRole("heading", { name: "Theme Settings", exact: true });
    await themeHeading.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    settings.themeHeadingVisible = await themeHeading.isVisible().catch(() => false);
  }

  // Return through a direct, safe GET rather than browser history so this
  // remains a deterministic, fresh check of the masthead action.
  await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await waitForAdminAndApiQuiet(page, inFlight, overviewContract);
  const newEntry = { triggerVisible: false, dialogOpen: false, finalPath: null };
  const trigger = page.getByRole("button", { name: "New entry", exact: true });
  newEntry.triggerVisible = await trigger.isVisible().catch(() => false);
  if (newEntry.triggerVisible) {
    await trigger.click();
    await page.getByTestId("button-create-resource").waitFor({ state: "visible", timeout: 15_000 });
    newEntry.dialogOpen = await page.getByTestId("button-create-resource").isVisible().catch(() => false);
    const current = new URL(page.url());
    newEntry.finalPath = `${current.pathname}${current.search}${current.hash}`;
  }
  return { settings, newEntry };
}

function evaluateContract(capture) {
  const failures = [];
  if (capture.status !== 200) failures.push(`document status ${capture.status ?? "missing"}, expected 200`);
  if (capture.finalPath !== capture.route) failures.push(`final path ${capture.finalPath}, expected ${capture.route}`);
  if (!capture.adminAuthorizedAfterApiQuiet) failures.push("admin authorization did not remain visible after API quiet");
  if (capture.footer.siteFooterVisible || capture.footer.visibleFooterTestIds.length) {
    failures.push(`admin footer remains visible (${capture.footer.visibleFooterTestIds.join(", ") || ".site-footer"})`);
  }
  if (!capture.expectedTabVisible || !capture.expectedTabSelected) {
    failures.push(`expected tab ${capture.expectedTab} is not visible and selected`);
  }
  if (!capture.activePanelVisible) failures.push("no active admin tab panel is visible");
  if (!capture.visibleTestIds.includes("tab-research")) failures.push("canonical tab-research is not visible");
  if (capture.expectedTab === "research" && !capture.researchReviewVisible) {
    failures.push("Research route did not reveal research-review-panel (initialTab=review contract)");
  }
  if (capture.route === "/admin") {
    if (!capture.actions?.settings.linkVisible) failures.push("Settings action is not visible");
    if (!capture.actions?.settings.navigated || !capture.actions?.settings.themeHeadingVisible) {
      failures.push("Settings action did not navigate to the Theme Settings page");
    }
    if (!capture.actions?.newEntry.triggerVisible || !capture.actions?.newEntry.dialogOpen) {
      failures.push("New entry action did not open the existing create-resource dialog");
    }
  }
  if (capture.axe.seriousCritical.rules || capture.axe.seriousCritical.nodes) {
    failures.push(`axe serious/critical ${capture.axe.seriousCritical.ids.join(", ")}`);
  }
  if (capture.readOnly.blockedNonSafeRequestCount) failures.push(`read-only guard refused ${capture.readOnly.blockedNonSafeRequestCount} non-safe request(s)`);
  if (capture.readOnly.safeApiFailures.length) failures.push(`safe API failure(s): ${capture.readOnly.safeApiFailures.map((item) => `${item.origin}${item.path} ${item.status ?? item.failure}`).join(", ")}`);
  const refused = capture.readOnly.refusedWindowOperations;
  if (!validWindowRefusalLedger(refused)) {
    failures.push("read-only window guard ledger is missing or incomplete");
  } else {
    const refusalCount = WINDOW_REFUSAL_KEYS.reduce((count, key) => count + refused[key].length, 0);
    if (refusalCount) failures.push(`read-only window guard refused ${refusalCount} operation(s)`);
  }
  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseline = JSON.parse(fs.readFileSync(RETAINED_BASELINE, "utf8"));
  fs.mkdirSync(args.out, { recursive: true });
  const selectedViewports = args.diagnosticAdmin375 ? [VIEWPORTS[0]] : VIEWPORTS;
  const selectedContracts = args.diagnosticAdmin375
    ? [CANONICAL_ADMIN_CONTRACTS[0]]
    : CANONICAL_ADMIN_CONTRACTS;

  // Identity setup is the sole authorized write phase. It uses the shared
  // parity helper's disposable Nick profile and its guaranteed teardown; no
  // capture page gets an audit-key header. Once storage state exists, a
  // separate browser-wide guarded browser performs every candidate capture.
  let identityBrowser = await launchBrowserWithLease(
    chromium,
    chromiumLaunchOptions(),
    "task565-admin-identity-setup",
  );
  const captures = [];
  let teardown = { attempted: false, completed: false };
  let consentDeclined = false;
  try {
    const identity = await createDisposableAdmin({
      browser: identityBrowser,
      appBase: args.identityBase,
      secretKey: process.env.CLERK_SECRET_KEY,
      auditKey: process.env.ADMIN_PASSWORD,
      log: () => {},
    });
    try {
      // Use the shipped Privacy consent UI on the static capture origin. This
      // is an explicit decline by the already-authorized Nick session, not a
      // mocked storage value or an analytics disablement. It also makes the
      // origin-specific choice part of the in-memory storage state used below.
      consentDeclined = await declineAnalyticsConsentViaUi({
        page: identity.page,
        appBase: args.base,
      });
      const storageState = await identity.storageState();
      if (!declinedConsentIsStoredForCaptureOrigin(storageState, args.base)) {
        throw new Error("Verified declined consent was not present in in-memory storage state for the 5101 capture origin");
      }
      // Do not leave the unguarded Clerk setup context alive while any strict
      // capture runs. Teardown below still owns Node-side local/Clerk deletion;
      // its context-close is intentionally idempotent after this close.
      await identity.page.context().close();
      await identityBrowser.close();
      identityBrowser = null;
      // No Clerk initialization exception is extended to this harness. Nick's
      // real session is fully initialized before this strict capture browser
      // opens. If any later auth/bootstrap write is required, the three-layer
      // guard must fail and the result is a blocker rather than an allowance.
      const browser = await launchBrowser("task565-admin-candidate");
      try {
        for (const viewport of selectedViewports) {
          for (const contract of selectedContracts) {
            try {
              captures.push(await captureRoute({
                browser,
                base: args.base,
                storageState,
                contract,
                viewport,
              }));
            } catch (error) {
              captures.push({
                route: contract.route,
                viewport: viewport.width,
                captureError: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      } finally {
        await browser.close();
      }
    } finally {
      const outcome = await identity.teardown();
      teardown = {
        attempted: true,
        completed: outcome.errors.length === 0,
        localDeleted: Boolean(outcome.localDeleted),
        clerkDeleted: Boolean(outcome.clerkDeleted),
        localQaUsersRemaining: outcome.verification?.localQaUsersRemaining?.length ?? null,
      };
    }
  } finally {
    await identityBrowser?.close().catch(() => {});
  }

  const checks = captures.map((capture) => ({
    route: capture.route,
    viewport: capture.viewport,
    failures: capture.captureError ? [`capture failed: ${capture.captureError}`] : evaluateContract(capture),
  }));
  const productionComparison = {};
  for (const viewport of selectedViewports) {
    const key = String(viewport.width);
    const retained = baseline.captures?.[key];
    const candidate = captures.find((capture) => capture.route === "/admin" && capture.viewport === viewport.width);
    productionComparison[key] = !retained || !candidate?.visibleTestIds
      ? { missing: !retained ? "retained baseline" : "candidate" }
      : {
          baselineStatus: retained.status,
          candidateStatus: candidate.status,
          visibleTestIds: setDiff(retained.visibleTestIds, candidate.visibleTestIds),
          baselineFooterTestIds: retained.visibleTestIds.filter((id) => id.startsWith("footer-")),
          candidateFooterTestIds: candidate.footer.visibleFooterTestIds,
          expectedFooterRemovalObserved: candidate.footer.visibleFooterTestIds.length === 0,
        };
  }

  const report = {
    schemaVersion: 1,
    purpose: args.diagnosticAdmin375
      ? "Task 565 partial read-only diagnostic: /admin at 375 only"
      : "Task 565 targeted non-pixel admin candidate contract and comparison",
    capturedAt: new Date().toISOString(),
    candidateBase: args.base,
    identitySetupBase: args.identityBase,
    retainedProductionBaseline: path.relative(ROOT, RETAINED_BASELINE),
    captureMode: args.diagnosticAdmin375 ? "partial-admin-375-diagnostic" : "full-admin-matrix",
    routeScope: selectedContracts.map((contract) => contract.route),
    viewports: selectedViewports.map((viewport) => viewport.width),
    limitations: [
      "The production baseline is reused, not recaptured.",
      "This is a status/test-id/axe/read-only contract; it is not a pixel sweep.",
      "Data-derived test-id differences are reported but never silently classified as selector deletions.",
      "A real disposable Clerk Nick session is initialized before the read-only capture; no audit key is injected into capture requests.",
      "The authenticated Nick state is prepared before capture; this harness grants no Clerk/bootstrap write exception. All non-safe requests fail closed.",
      "Diagnostic mode is deliberately partial (/admin at 375 only) and does not replace the full capture matrix.",
      "No identity identifier, audit key, cookie, raw response body, or screenshot is persisted.",
    ],
    identity: {
      kind: "shared-disposable-clerk-nick",
      authenticatedStorageStatePreparedBeforeReadOnlyCapture: true,
      consentDeclined,
      teardown,
    },
    captures,
    productionComparison,
    checks,
    pass: checks.every((check) => check.failures.length === 0),
  };
  fs.writeFileSync(
    path.join(args.out, "summary.json"),
    `${JSON.stringify(sanitizeForEvidence(report), null, 2)}\n`,
  );
  for (const check of checks) {
    console.log(`${check.failures.length ? "FAIL" : "PASS"} ${check.route} @${check.viewport}${check.failures.length ? ` — ${check.failures.join("; ")}` : ""}`);
  }
  console.log(`Report: ${path.join(args.out, "summary.json")}`);
  return report.pass ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  },
);