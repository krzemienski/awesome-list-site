#!/usr/bin/env node
/**
 * Task 567 state evidence.
 *
 * This runner is intentionally separate from scripts/audit-567-browser.mjs.
 * It exercises the real public state transitions which the broad parity
 * inventory cannot reach as a stable URL (toast, loading, empty branches, and
 * the owner-created collection). The default run keeps every inventoried state
 * ID as a row, including states that have no legitimate public transition;
 * --states intentionally limits rows to the selected targeted rerun.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5000 \
 *   CLERK_SECRET_KEY=... ADMIN_PASSWORD=... \
 *   node scripts/validation/audit-567-states.mjs
 *
 * Targeted reruns accept either state IDs or the scenario aliases below. A
 * targeted run only creates the disposable owner identity when one of the
 * collection states is selected:
 *
 *   node scripts/validation/audit-567-states.mjs \
 *     --states consent,toast,loading,error
 *
 * The default output is .cache/audit-567-states. Browser execution is
 * deliberately not part of repository checks; invoke this file only when the
 * application is running and a state-evidence run is wanted.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";
import {
  createDisposableAdmin,
  declineAnalyticsConsentViaUi,
  identityAvailability,
} from "../../tests/parity/identity.mjs";
import { loadInventory } from "../../tests/parity/inventory.mjs";
import {
  buildCatalogAdapter,
  resolveCatalogTokens,
} from "../../tests/parity/reference-adapter.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
const OUT = path.resolve(process.env.AUDIT_567_STATES_OUT || path.join(ROOT, ".cache", "audit-567-states"));
const REPORT_PATH = path.join(OUT, "audit-567-states.json");
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim()
  || path.join(ROOT, ".cache", "ms-playwright", "chromium-1223", "chrome-linux64", "chrome");
const SERIOUS_CRITICAL = new Set(["serious", "critical"]);
const DEFAULT_WIDTHS = [375, 1440];
const VIEWPORTS = {
  375: { width: 375, height: 812 },
  1440: { width: 1440, height: 900 },
};

/*
 * Keep these IDs explicit. They are the state rows this runner owns, not a
 * replacement for the parity inventory and not a permission to fold one
 * component's branch into another component's error boundary. The default run
 * emits every row; --states intentionally limits rows to the selected rerun.
 */
const STATE_IDS = [
  "app.collection",
  "app.error.empty",
  "app.error.loading",
  "app.error.route",
  "app.not-found",
  "app.system.consent",
  "app.system.design-system",
  "app.system.empty-search",
  "app.system.error",
  "app.system.loading",
  "app.system.not-found",
  "app.system.toast",
];

const STATE_GROUPS = {
  consent: ["app.system.consent"],
  toast: ["app.system.toast"],
  loading: ["app.system.loading", "app.error.loading"],
  error: ["app.system.error", "app.error.route"],
  "error-page": ["app.system.error"],
  "route-error": ["app.error.route"],
  collection: ["app.collection", "app.error.empty"],
  "empty-collection": ["app.collection", "app.error.empty"],
  "not-found": ["app.not-found", "app.system.not-found"],
  "design-system": ["app.system.design-system"],
  "empty-search": ["app.system.empty-search"],
};

const STATE_DEFINITIONS = {
  "app.collection": {
    component: "PublicCollection",
    branch: "published empty collection",
    route: "/collection/{shareId}",
  },
  "app.error.empty": {
    component: "PublicCollection",
    branch: "empty collection state",
    route: "/collection/{shareId}",
  },
  "app.error.loading": {
    component: "RouteFallback",
    branch: "lazy route loading fallback",
    route: "/advanced",
  },
  "app.error.route": {
    component: "RouteErrorBoundary",
    branch: "render/chunk error boundary",
    route: "/advanced",
  },
  "app.not-found": {
    component: "NotFound",
    branch: "natural unknown-route 404",
    route: "/audit-567-not-found",
  },
  "app.system.consent": {
    component: "ConsentBanner",
    branch: "first-visit consent prompt",
    route: "/",
  },
  "app.system.design-system": {
    component: "DesignSystemShowcase",
    branch: "showcase route",
    route: "/design-system",
  },
  "app.system.empty-search": {
    component: "Search",
    branch: "real zero-result search",
    route: "/search?q=zzqxv-nothing",
  },
  "app.system.error": {
    component: "ErrorPage",
    branch: "data-fetch error page after real request abort",
    route: "/advanced",
  },
  "app.system.loading": {
    component: "Search",
    branch: "real throttled search request",
    route: "/search?q=ffmpeg",
  },
  "app.system.not-found": {
    component: "NotFound",
    branch: "natural unknown-route 404",
    route: "/audit-567-not-found",
  },
  "app.system.toast": {
    component: "Toast",
    branch: "real guest bookmark confirmation",
    route: "/resource/{resourceId}",
  },
};

const log = (message) => process.stdout.write(`[audit-567-states] ${message}\n`);
const safeError = (error) => ({
  name: error instanceof Error ? error.name : "Error",
  message: error instanceof Error ? error.message.split("\n")[0].slice(0, 300) : String(error),
});

function parseWidths() {
  const inline = process.argv.find((arg) => arg.startsWith("--width="));
  const index = process.argv.indexOf("--width");
  const value = inline ? inline.slice("--width=".length) : index >= 0 ? process.argv[index + 1] : null;
  const widths = value ? value.split(",").map((item) => Number(item.trim())) : DEFAULT_WIDTHS;
  if (!widths.length || widths.some((width) => !VIEWPORTS[width])) {
    throw new Error("usage: node scripts/validation/audit-567-states.mjs [--width 375,1440]");
  }
  return [...new Set(widths)];
}

function parseStates() {
  const inline = process.argv.find((arg) => arg.startsWith("--states="));
  const index = process.argv.indexOf("--states");
  const specified = Boolean(inline || index >= 0);
  const value = inline ? inline.slice("--states=".length) : index >= 0 ? process.argv[index + 1] : null;
  if (!specified) return [...STATE_IDS];
  if (!value || value.trim() === "all") {
    if (value?.trim() === "all") return [...STATE_IDS];
    throw new Error("usage: node scripts/validation/audit-567-states.mjs [--states state[,state...]]");
  }

  const selected = [];
  const unknown = [];
  for (const token of value.split(",").map((item) => item.trim()).filter(Boolean)) {
    const group = STATE_GROUPS[token];
    if (group) {
      selected.push(...group);
    } else if (STATE_IDS.includes(token)) {
      selected.push(token);
    } else {
      unknown.push(token);
    }
  }
  if (unknown.length || !selected.length) {
    const aliases = Object.keys(STATE_GROUPS).join(", ");
    throw new Error(
      `usage: node scripts/validation/audit-567-states.mjs [--states state[,state...]]; ` +
      `unknown state(s): ${unknown.join(", ") || "(empty)"}; aliases: ${aliases}`,
    );
  }
  return [...new Set(selected)];
}

async function writeJson(filename, value) {
  await fsp.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp-${process.pid}`;
  await fsp.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(temporary, filename);
}

function makeContext(browser, width) {
  const context = browser.newContext({
    locale: "en-US",
    timezoneId: "UTC",
    serviceWorkers: "block",
    viewport: VIEWPORTS[width],
  });
  return context;
}

async function waitForVisible(locator, timeout = 30_000) {
  await locator.waitFor({ state: "visible", timeout });
}

async function waitForHidden(locator, timeout = 30_000) {
  await locator.waitFor({ state: "hidden", timeout });
}

async function waitForSettledVisuals(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.getAnimations({ subtree: true }).every((animation) =>
    animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity,
  ), null, { timeout: 45_000 });
  // The consent banner and Radix toasts both have a short entrance transition
  // whose first frame can be reported as settled before the compositor has
  // painted it. Keep this delay deterministic instead of capturing a
  // foreground frame from the transition.
  await page.waitForTimeout(250);
}

async function waitForHomeEntrance(page) {
  // The consent banner can be visible before Home has hydrated. Axe then
  // evaluates the partially transparent home-fade-in frame and reports dark
  // foregrounds that are not the settled page colors. Wait for real Home
  // content first, then only for finite animations whose targets are inside
  // Home (the shell's infinite glow is deliberately irrelevant).
  await waitForVisible(page.getByTestId("home-stat-strip"), 45_000);
  await page.waitForFunction(() => {
    const home = document.querySelector(".home-page");
    if (!home) return false;
    return !document.getAnimations({ subtree: true }).some((animation) => {
      const target = animation.effect?.target;
      if (!(target instanceof Element) || !target.closest(".home-page")) return false;
      return animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity;
    });
  }, null, { timeout: 45_000 });
  await page.waitForTimeout(100);
}

async function warmShell(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForVisible(page.locator("main").first());
  await waitForSettledVisuals(page);
}

async function assertPathname(page, expected, label = "route") {
  const actual = new URL(page.url()).pathname;
  if (actual !== expected) {
    throw new Error(`${label} pathname was ${actual}, expected ${expected}`);
  }
}

async function assertExactText(locator, expected, label) {
  await waitForVisible(locator, 45_000);
  // Match component-owned copy, not CSS text-transform's visual casing.
  const actual = (await locator.textContent() || "").trim();
  if (actual !== expected) {
    throw new Error(`${label} text was ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

async function assertAttribute(locator, name, expected, label) {
  await waitForVisible(locator, 45_000);
  const actual = await locator.getAttribute(name);
  if (actual !== expected) {
    throw new Error(`${label} ${name} was ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

async function clickAdvancedFromShell(page) {
  const link = page.locator('a[href="/advanced"]:visible').first();
  if (!await link.isVisible().catch(() => false)) {
    const mobileTrigger = page.getByTestId("mobile-drawer-trigger");
    if (await mobileTrigger.isVisible().catch(() => false)) {
      await mobileTrigger.click();
    }
    const labeledMoreNavigation = page.locator('summary[aria-label="More navigation"]:visible').first();
    const moreNavigation = await labeledMoreNavigation.isVisible().catch(() => false)
      ? labeledMoreNavigation
      : page.locator("summary:visible").filter({ hasText: /More navigation/i }).first();
    await waitForVisible(moreNavigation);
    await moreNavigation.click();
  }
  await waitForVisible(link);
  await link.click();
}

async function emulateNetwork(page, conditions) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", conditions);
  let restored = false;
  return {
    async restore() {
      if (restored) return;
      restored = true;
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      }).catch(() => {});
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: false }).catch(() => {});
    },
  };
}

async function fetchPublicCollection(shareId) {
  const response = await fetch(`${BASE}/api/public/collections/${encodeURIComponent(shareId)}`, {
    headers: { accept: "application/json" },
    redirect: "error",
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

function addBlockers(rows, stateId, widths, reason, extra = {}) {
  for (const width of widths) {
    rows.push({
      task: "567",
      state: stateId,
      width,
      status: "BLOCKED",
      component: STATE_DEFINITIONS[stateId].component,
      route: STATE_DEFINITIONS[stateId].route,
      reason,
      ...extra,
    });
  }
}

async function captureAxe(rows, { page, stateId, width, route, ready, component, evidence = {} }) {
  const base = {
    task: "567",
    state: stateId,
    width,
    route,
    component,
    readySelector: ready,
    ...evidence,
  };
  try {
    await waitForVisible(page.locator(ready), 45_000);
    await waitForSettledVisuals(page);
    const result = await new AxeBuilder({ page }).analyze();
    const seriousCritical = result.violations.filter((violation) =>
      SERIOUS_CRITICAL.has(violation.impact),
    );
    rows.push({
      ...base,
      status: seriousCritical.length ? "FAIL" : "PASS",
      violations: result.violations,
      incomplete: result.incomplete,
      passes: result.passes.length,
      seriousCritical: seriousCritical.length,
    });
  } catch (error) {
    rows.push({
      ...base,
      status: "INCOMPLETE",
      error: safeError(error),
    });
  }
}

async function declineConsent(page) {
  await declineAnalyticsConsentViaUi({ page, appBase: BASE });
}

async function runConsent(rows, browser, widths) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await assertPathname(page, "/", "ConsentBanner");
      await waitForHomeEntrance(page);
      await assertAttribute(
        page.getByTestId("consent-banner"),
        "aria-label",
        "Analytics consent",
        "ConsentBanner",
      );
      await captureAxe(rows, {
        page,
        stateId: "app.system.consent",
        width,
        route: "/",
        ready: '[data-testid="consent-banner"]',
        component: "ConsentBanner",
        evidence: {
          transition: "fresh browser context; banner observed before decline",
          componentIdentity: "ConsentBanner [data-testid=consent-banner]",
          homeEntranceSettled: true,
        },
      });
      await page.getByTestId("consent-decline").click().catch(() => {});
      await waitForHidden(page.getByTestId("consent-banner")).catch(() => {});
    } finally {
      await context.close().catch(() => {});
    }
  }
}

async function runDesignSystem(rows, browser, widths) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    try {
      await declineConsent(page);
      await page.goto(`${BASE}/design-system`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await assertPathname(page, "/design-system", "DesignSystemShowcase");
      await assertExactText(
        page.getByTestId("text-ds-title"),
        "Design System",
        "DesignSystemShowcase title",
      );
      await captureAxe(rows, {
        page,
        stateId: "app.system.design-system",
        width,
        route: "/design-system",
        ready: "main h1, h1",
        component: "DesignSystemShowcase",
        evidence: { componentIdentity: "DesignSystemShowcase title: Design System" },
      });
      const source = fs.readFileSync(
        path.join(ROOT, "client", "src", "components", "ui", "chip-button.tsx"),
        "utf8",
      );
      if (!/data-ds="chip"/.test(source)) {
        throw new Error("ChipButton source no longer owns data-ds=\"chip\"");
      }
      const row = rows.findLast((candidate) =>
        candidate.state === "app.system.design-system" && candidate.width === width,
      );
      if (row) row.chipButtonHook = { sourceOwned: true };
    } catch (error) {
      addBlockers(rows, "app.system.design-system", [width], safeError(error).message);
    } finally {
      await context.close().catch(() => {});
    }
  }
}

async function runEmptySearch(rows, browser, widths) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    try {
      await declineConsent(page);
      await page.goto(`${BASE}/search?q=zzqxv-nothing`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await captureAxe(rows, {
        page,
        stateId: "app.system.empty-search",
        width,
        route: "/search?q=zzqxv-nothing",
        ready: '[data-testid="text-no-results"]',
        component: "Search",
        evidence: { query: "zzqxv-nothing", transition: "real public zero-result query" },
      });
    } catch (error) {
      addBlockers(rows, "app.system.empty-search", [width], safeError(error).message);
    } finally {
      await context.close().catch(() => {});
    }
  }
}

async function runSearchLoading(rows, browser, widths) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    let network = null;
    try {
      await declineConsent(page);
      await page.goto(`${BASE}/search?q=zzqxv-nothing`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await waitForVisible(page.getByTestId("text-no-results"));
      network = await emulateNetwork(page, {
        offline: false,
        latency: 450,
        downloadThroughput: 18 * 1024,
        uploadThroughput: 18 * 1024,
      });
      await page.getByTestId("input-search-page").fill("ffmpeg");
      const loading = page.getByTestId("search-results-loading");
      await waitForVisible(loading, 30_000);
      await captureAxe(rows, {
        page,
        stateId: "app.system.loading",
        width,
        route: "/search?q=ffmpeg",
        ready: '[data-testid="search-results-loading"]',
        component: "Search",
        evidence: {
          warmRoute: "/search?q=zzqxv-nothing",
          query: "ffmpeg",
          transition: "CDP Network.emulateNetworkConditions on real request",
        },
      });
      await page
        .locator('[data-testid="search-results-grid"], [data-testid="text-no-results"]')
        .first()
        .waitFor({ state: "visible", timeout: 90_000 })
        .catch(() => {});
    } catch (error) {
      addBlockers(rows, "app.system.loading", [width], safeError(error).message);
    } finally {
      await network?.restore();
      await context.close().catch(() => {});
    }
  }
}

async function runRouteLoading(rows, browser, widths) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    let network = null;
    try {
      // Warm only the eager shell. The Advanced page remains a cold lazy
      // import, so the throttle exercises the shipped Suspense fallback
      // rather than a synthetic loading flag.
      await declineConsent(page);
      await warmShell(page);
      network = await emulateNetwork(page, {
        offline: false,
        latency: 650,
        downloadThroughput: 12 * 1024,
        uploadThroughput: 12 * 1024,
      });
      await clickAdvancedFromShell(page);
      const fallback = page.getByTestId("route-chunk-skeleton");
      await waitForVisible(fallback, 30_000);
      await assertPathname(page, "/advanced", "RouteFallback");
      await captureAxe(rows, {
        page,
        stateId: "app.error.loading",
        width,
        route: "/advanced",
        ready: '[data-testid="route-chunk-skeleton"]',
        component: "RouteFallback",
        evidence: {
          transition: "real first-load network throttle",
          componentIdentity: "Advanced route fallback [data-testid=route-chunk-skeleton]",
        },
      });
    } catch (error) {
      addBlockers(rows, "app.error.loading", [width], safeError(error).message);
    } finally {
      await network?.restore();
      await context.close().catch(() => {});
    }
  }
}

async function runErrorPage(rows, browser, widths) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    const abortAwesomeList = async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.pathname === "/api/awesome-list") {
        await route.abort("failed");
      } else {
        await route.continue();
      }
    };
    try {
      await declineConsent(page);
      await warmShell(page);
      // This is a browser-level request abort, not a fabricated HTTP response.
      // The application performs its normal retry/error transition and the
      // ErrorPage lazy module still loads over the available connection.
      await page.route("**/api/awesome-list**", abortAwesomeList);
      await clickAdvancedFromShell(page);
      const errorTitle = page.locator(".system-state-title");
      await waitForVisible(errorTitle, 60_000);
      await assertPathname(page, "/advanced", "ErrorPage");
      await assertExactText(page.locator(".system-state-code"), "Error", "ErrorPage status code");
      await assertExactText(errorTitle, "Something went wrong", "ErrorPage title");
      await captureAxe(rows, {
        page,
        stateId: "app.system.error",
        width,
        route: "/advanced",
        ready: ".system-state-title",
        component: "ErrorPage",
        evidence: {
          transition: "normal Advanced UI navigation; real browser request abort for /api/awesome-list",
          failureMode: "network-abort",
          componentIdentity: "ErrorPage: Error / Something went wrong",
        },
      });
    } catch (error) {
      addBlockers(rows, "app.system.error", [width], safeError(error).message);
    } finally {
      await page.unroute("**/api/awesome-list**", abortAwesomeList).catch(() => {});
      await context.close().catch(() => {});
    }
  }
}

async function runRouteError(rows, browser, widths) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    let network = null;
    try {
      await declineConsent(page);
      await warmShell(page);
      // Advanced has not been visited in this context, so the click below
      // requests its real lazy chunk. Going offline makes that browser
      // request fail and lets the shipped RouteErrorBoundary render.
      network = await emulateNetwork(page, {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
      await clickAdvancedFromShell(page);
      const boundary = page.getByTestId("route-error-boundary");
      await waitForVisible(boundary, 60_000);
      await assertPathname(page, "/advanced", "RouteErrorBoundary");
      await assertExactText(
        boundary.getByRole("heading", { level: 1 }),
        "Couldn't load this page — you appear to be offline",
        "RouteErrorBoundary offline heading",
      );
      await captureAxe(rows, {
        page,
        stateId: "app.error.route",
        width,
        route: "/advanced",
        ready: '[data-testid="route-error-boundary"]',
        component: "RouteErrorBoundary",
        evidence: {
          transition: "normal Advanced UI navigation; real browser offline lazy-chunk failure",
          failureMode: "offline",
          componentIdentity: "RouteErrorBoundary offline heading",
        },
      });
    } catch (error) {
      addBlockers(rows, "app.error.route", [width], safeError(error).message);
    } finally {
      // Restore the browser network before closing the page/context so a
      // failed capture cannot leak offline mode into a following scenario.
      await network?.restore();
      await context.close().catch(() => {});
    }
  }
}

async function runGuestToast(rows, browser, widths, resourceId) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    try {
      await declineConsent(page);
      const route = `/resource/${encodeURIComponent(resourceId)}`;
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await waitForVisible(page.getByTestId("button-bookmark"));
      await page.getByTestId("button-bookmark").click();
      // Guests use the real one-click on-device save path. The notes dialog is
      // intentionally authed-only; waiting for its save button made this
      // evidence path time out while the genuine guest toast was already open.
      const toast = page.locator('li[data-state="open"]').filter({ hasText: "Saved on this device" });
      await waitForVisible(toast);
      await assertExactText(
        toast.locator(".system-toast__title"),
        "Saved on this device",
        "guest bookmark toast",
      );
      await toast.hover();
      await captureAxe(rows, {
        page,
        stateId: "app.system.toast",
        width,
        route,
        ready: 'li[data-state="open"]:has-text("Saved on this device")',
        component: "Toast",
        evidence: {
          resourceId: String(resourceId),
          transition: "real guest bookmark flow; saved on this device in disposable browser context",
          componentIdentity: "Toast title: Saved on this device",
        },
      });
    } catch (error) {
      addBlockers(rows, "app.system.toast", [width], safeError(error).message);
    } finally {
      await context.close().catch(() => {});
    }
  }
}

async function runNotFound(rows, browser, widths, selectedStates) {
  for (const width of widths) {
    const context = await makeContext(browser, width);
    const page = await context.newPage();
    try {
      await declineConsent(page);
      const route = `/audit-567-not-found-${Date.now().toString(36)}`;
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await waitForVisible(page.locator(".system-state-title"));
      await assertExactText(page.locator(".system-state-code"), "Error · 404", "NotFound status code");
      await assertExactText(page.locator(".system-state-title"), "Page Not Found", "NotFound title");
      const evidence = {
        route,
        transition: "natural unknown route",
        componentIdentity: "NotFound: Error · 404 / Page Not Found",
      };
      if (selectedStates.has("app.not-found")) {
        await captureAxe(rows, {
          page,
          stateId: "app.not-found",
          width,
          route,
          ready: ".system-state-title",
          component: "NotFound",
          evidence,
        });
      }
      if (selectedStates.has("app.system.not-found")) {
        await captureAxe(rows, {
          page,
          stateId: "app.system.not-found",
          width,
          route,
          ready: ".system-state-title",
          component: "NotFound",
          evidence: { ...evidence, sourceBackedAliasOf: "app.not-found" },
        });
      }
    } catch (error) {
      if (selectedStates.has("app.not-found")) {
        addBlockers(rows, "app.not-found", [width], safeError(error).message);
      }
      if (selectedStates.has("app.system.not-found")) {
        addBlockers(rows, "app.system.not-found", [width], safeError(error).message);
      }
    } finally {
      await context.close().catch(() => {});
    }
  }
}

async function createOwnedCollection(ownerPage, onCreated = () => {}) {
  const name = `Audit 567 empty ${Date.now().toString(36)}`;
  await ownerPage.goto(`${BASE}/bookmarks`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForVisible(ownerPage.getByRole("button", { name: "New collection", exact: true }));
  await ownerPage.getByRole("button", { name: "New collection", exact: true }).click();
  await ownerPage.locator("#collection-name").fill(name);
  await ownerPage.getByRole("button", { name: "Create collection", exact: true }).click();
  await waitForVisible(ownerPage.getByRole("heading", { name, exact: true }));

  const collectionResponse = await ownerPage.evaluate(async () => {
    const response = await fetch("/api/collections?includeArchived=true", {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => null) };
  });
  if (!collectionResponse.ok) {
    throw new Error(`owned collection list returned ${collectionResponse.status}`);
  }
  const collections = Array.isArray(collectionResponse.body) ? collectionResponse.body : [];
  const collection = collections.find((candidate) => candidate?.name === name);
  if (!collection?.id) throw new Error("UI-created owned collection was absent from the owner API list");
  onCreated({ id: Number(collection.id), name });

  await waitForVisible(ownerPage.getByRole("button", { name: "Publish link", exact: true }));
  await ownerPage.getByRole("button", { name: "Publish link", exact: true }).click();
  await waitForVisible(ownerPage.getByText("Read-only sharing enabled", { exact: true }));

  const refreshed = await ownerPage.evaluate(async () => {
    const response = await fetch("/api/collections?includeArchived=true", {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => null) };
  });
  const published = (Array.isArray(refreshed.body) ? refreshed.body : []).find(
    (candidate) => Number(candidate?.id) === Number(collection.id),
  );
  if (!published?.shareId) throw new Error("published owned collection did not expose a shareId");
  return {
    id: Number(collection.id),
    name,
    shareId: String(published.shareId),
    route: `/collection/${encodeURIComponent(String(published.shareId))}`,
  };
}

async function runOwnedCollection(rows, browser, widths, owner, selectedStates) {
  let collection = null;
  let createdIdentity = null;
  let deleted = false;
  try {
    collection = await createOwnedCollection(owner.page, (created) => {
      createdIdentity = created;
    });
    const publicResult = await fetchPublicCollection(collection.shareId);
    if (!publicResult.response.ok || publicResult.body?.name !== collection.name) {
      throw new Error(
        `public collection API did not expose the owned collection (${publicResult.response.status})`,
      );
    }
    if (!Array.isArray(publicResult.body?.resources)) {
      throw new Error("public collection API did not return a resources array");
    }

    for (const width of widths) {
      const context = await makeContext(browser, width);
      const page = await context.newPage();
      try {
        await declineConsent(page);
        await page.goto(`${BASE}${collection.route}`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await waitForVisible(page.getByRole("heading", { name: collection.name, exact: true }));
        const evidence = {
          collectionId: collection.id,
          shareId: collection.shareId,
          publicApiStatus: publicResult.response.status,
          transition: "owner-created in UI, read from public API, rendered by public UI",
          resourceCount: publicResult.body.resources.length,
        };
        if (selectedStates.has("app.collection")) {
          await captureAxe(rows, {
            page,
            stateId: "app.collection",
            width,
            route: collection.route,
            ready: "main h1, h1",
            component: "PublicCollection",
            evidence,
          });
        }
        if (selectedStates.has("app.error.empty")) {
          await captureAxe(rows, {
            page,
            stateId: "app.error.empty",
            width,
            route: collection.route,
            ready: '[class*="discovery-state"]',
            component: "PublicCollection",
            evidence: {
              ...evidence,
              branch: "No public resources yet",
              sourceBackedComponent: "PublicCollection",
            },
          });
        }
      } catch (error) {
        if (selectedStates.has("app.collection")) {
          addBlockers(rows, "app.collection", [width], safeError(error).message);
        }
        if (selectedStates.has("app.error.empty")) {
          addBlockers(rows, "app.error.empty", [width], safeError(error).message);
        }
      } finally {
        await context.close().catch(() => {});
      }
    }
  } finally {
    const ownedCollection = collection || createdIdentity;
    if (ownedCollection) {
      try {
        await owner.page.goto(
          `${BASE}/bookmarks?collection=${encodeURIComponent(String(ownedCollection.id))}`,
          { waitUntil: "domcontentloaded", timeout: 60_000 },
        );
        await waitForVisible(owner.page.getByRole("heading", { name: ownedCollection.name, exact: true }));
        await owner.page.getByRole("button", { name: "Delete", exact: true }).last().click();
        await waitForVisible(owner.page.getByRole("button", { name: "Delete collection", exact: true }));
        await owner.page.getByRole("button", { name: "Delete collection", exact: true }).click();
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
          const result = await owner.fetchJson("/api/collections?includeArchived=true");
          const items = Array.isArray(result.body) ? result.body : [];
          if (result.ok && !items.some((item) => Number(item?.id) === ownedCollection.id)) {
            deleted = true;
            break;
          }
          await owner.page.waitForTimeout(500);
        }
        if (!deleted) throw new Error(`exact collection ${ownedCollection.id} remained after UI delete`);
        if (collection?.shareId) {
          const afterDelete = await fetchPublicCollection(collection.shareId);
          if (afterDelete.response.ok) {
            throw new Error(`public share ${collection.shareId} remained after exact owner teardown`);
          }
        }
      } catch (error) {
        const reason = `exact-owned collection teardown failed for ${ownedCollection.id}: ${safeError(error).message}`;
        if (selectedStates.has("app.collection")) {
          addBlockers(rows, "app.collection", widths, reason, { teardown: "incomplete" });
        }
        if (selectedStates.has("app.error.empty")) {
          addBlockers(rows, "app.error.empty", widths, reason, { teardown: "incomplete" });
        }
      }
    }
  }
  return { collection, deleted };
}

function ensureRows(rows, widths, selectedStates) {
  const expected = new Set(
    selectedStates.flatMap((state) => widths.map((width) => `${state}|${width}`)),
  );
  const actual = new Set(rows.map((row) => `${row.state}|${row.width}`));
  for (const key of expected) {
    if (!actual.has(key)) {
      const [state, width] = key.split("|");
      addBlockers(rows, state, [Number(width)], "Runner did not reach this state definition");
    }
  }
}

function renderWorklog(report) {
  const blockers = report.rows.filter((row) => row.status === "BLOCKED");
  const failures = report.rows.filter((row) => row.status === "FAIL" || row.status === "INCOMPLETE");
  const lines = [
    "# Task 567 state evidence",
    "",
    `- Run status: **${report.status}**`,
    `- Generated: ${report.generatedAt}`,
    `- Base URL: \`${report.baseUrl}\``,
    `- Widths: ${report.widths.join(", ")}`,
    `- Selected states: ${report.stateIds.join(", ")}`,
    `- Rows: ${report.rows.length}; PASS ${report.summary.pass}; BLOCKED ${report.summary.blocked}; FAIL ${report.summary.fail}; INCOMPLETE ${report.summary.incomplete}.`,
    "",
    "## Evidence policy",
    "",
    "The runner uses public application transitions only: a real guest bookmark, a real zero-result search, browser-level request abort/offline failures for the two error surfaces, CDP network throttling for loading, and an owner-created collection read through its public API and UI. It does not rewrite served bytes, fabricate responses, or manufacture conditional component state.",
    "",
    "## Blockers",
    "",
  ];
  if (!blockers.length) lines.push("- None.");
  else {
    for (const row of blockers) {
      lines.push(`- \`${row.state}\` @ ${row.width}px: ${row.reason}`);
    }
  }
  if (failures.length) {
    lines.push("", "## Axe/infrastructure failures", "");
    for (const row of failures) {
      lines.push(`- \`${row.state}\` @ ${row.width}px: ${row.error?.message || `${row.seriousCritical || 0} serious/critical violations`}`);
    }
  }
  lines.push(
    "",
    "The natural 404 rows are kept separate from ErrorPage and RouteErrorBoundary. `app.system.not-found` is recorded as a source-backed alias only because both rows render the NotFound component.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

async function writePerScreenAxe(rows) {
  const occurrences = new Map();
  for (const row of rows) {
    const statePath = row.state.replace(/[^a-z0-9._-]+/gi, "_");
    const key = `${statePath}-${row.width}`;
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    const suffix = occurrence ? `-${occurrence + 1}` : "";
    await writeJson(path.join(OUT, "axe", `${key}${suffix}.json`), row);
  }
}

async function main() {
  const widths = parseWidths();
  const selectedStateIds = parseStates();
  const selectedStates = new Set(selectedStateIds);
  const inventory = await loadInventory({ verifyGenerated: true });
  const inventoryIds = new Set(inventory.screens.map((screen) => screen.id));
  const missingInventoryIds = selectedStateIds.filter((id) => !inventoryIds.has(id));
  if (missingInventoryIds.length) {
    throw new Error(`state IDs missing from the generated inventory: ${missingInventoryIds.join(", ")}`);
  }

  const source = fs.readFileSync(
    path.join(ROOT, "client", "src", "components", "ui", "chip-button.tsx"),
    "utf8",
  );
  if (!/data-ds="chip"/.test(source)) {
    throw new Error("ChipButton source no longer owns data-ds=\"chip\"");
  }

  const report = {
    task: "567",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    widths,
    stateIds: selectedStateIds,
    stateDefinitions: STATE_DEFINITIONS,
    hookOwnership: {
      chipButton: {
        source: "client/src/components/ui/chip-button.tsx",
        hook: 'data-ds="chip"',
        owner: "ChipButton",
      },
    },
    rows: [],
    summary: { pass: 0, blocked: 0, fail: 0, incomplete: 0 },
    status: "RUNNING",
    blockers: [],
    teardown: null,
  };

  let browser;
  let owner = null;
  let collectionResult = null;
  const topLevelErrors = [];
  try {
    let resourceId = null;
    if (selectedStates.has("app.system.toast")) {
      const catalog = await buildCatalogAdapter(BASE, { frozenAt: new Date() });
      const tokens = resolveCatalogTokens(catalog.adapter);
      resourceId = tokens.values.resourceId;
      if (resourceId === undefined || resourceId === null) {
        throw new Error("approved public catalog has no resource ID for the guest bookmark path");
      }
    }

    browser = await launchBrowserWithLease(
      chromium,
      { headless: true, executablePath: CHROMIUM_EXECUTABLE },
      "audit-567-states",
    );

    if (selectedStates.has("app.system.consent")) {
      await runConsent(report.rows, browser, widths);
    }
    if (selectedStates.has("app.system.design-system")) {
      await runDesignSystem(report.rows, browser, widths);
    }
    if (selectedStates.has("app.system.empty-search")) {
      await runEmptySearch(report.rows, browser, widths);
    }
    if (selectedStates.has("app.system.loading")) {
      await runSearchLoading(report.rows, browser, widths);
    }
    if (selectedStates.has("app.error.loading")) {
      await runRouteLoading(report.rows, browser, widths);
    }
    if (selectedStates.has("app.system.error")) {
      await runErrorPage(report.rows, browser, widths);
    }
    if (selectedStates.has("app.error.route")) {
      await runRouteError(report.rows, browser, widths);
    }
    if (selectedStates.has("app.system.toast")) {
      await runGuestToast(report.rows, browser, widths, resourceId);
    }
    if (selectedStates.has("app.not-found") || selectedStates.has("app.system.not-found")) {
      await runNotFound(report.rows, browser, widths, selectedStates);
    }

    const availability = identityAvailability();
    const needsOwner = selectedStates.has("app.collection") || selectedStates.has("app.error.empty");
    if (!needsOwner) {
      // Targeted state runs (consent/toast/loading/error) intentionally do
      // not provision an identity or touch owner-created data.
    } else if (!availability.ok) {
      const reason = `disposable owner identity unavailable: ${availability.missing.join(", ")}`;
      if (selectedStates.has("app.collection")) {
        addBlockers(report.rows, "app.collection", widths, reason);
      }
      if (selectedStates.has("app.error.empty")) {
        addBlockers(report.rows, "app.error.empty", widths, reason);
      }
      report.blockers.push(reason);
    } else {
      owner = await createDisposableAdmin({
        browser,
        appBase: BASE,
        secretKey: process.env.CLERK_SECRET_KEY,
        auditKey: process.env.ADMIN_PASSWORD,
        log,
      });
      await declineConsent(owner.page);
      collectionResult = await runOwnedCollection(report.rows, browser, widths, owner, selectedStates);
    }
  } catch (error) {
    topLevelErrors.push(safeError(error));
    for (const stateId of selectedStateIds) {
      const present = new Set(
        report.rows
          .filter((row) => row.state === stateId)
          .map((row) => row.width),
      );
      const missingWidths = widths.filter((width) => !present.has(width));
      if (missingWidths.length) {
        addBlockers(report.rows, stateId, missingWidths, `runner setup failed: ${safeError(error).message}`);
      }
    }
  } finally {
    if (owner) {
      report.teardown = {
        collection: collectionResult
          ? {
              id: collectionResult.collection?.id ?? null,
              deleted: collectionResult.deleted,
              exactOwned: true,
            }
          : { id: null, deleted: false, exactOwned: true },
      };
      try {
        const identityOutcome = await owner.teardown();
        report.teardown.identity = {
          localDeleted: identityOutcome.localDeleted,
          clerkDeleted: identityOutcome.clerkDeleted,
          remaining: identityOutcome.verification?.localQaUsersRemaining?.length ?? null,
          errors: identityOutcome.errors?.length ?? 0,
        };
      } catch (error) {
        topLevelErrors.push(safeError(error));
        report.teardown.identity = { errors: 1, message: safeError(error).message };
      }
    }
    if (browser) await browser.close().catch((error) => topLevelErrors.push(safeError(error)));
  }

  ensureRows(report.rows, widths, selectedStateIds);
  for (const row of report.rows) {
    if (row.status === "PASS") report.summary.pass += 1;
    else if (row.status === "BLOCKED") report.summary.blocked += 1;
    else if (row.status === "FAIL") report.summary.fail += 1;
    else if (row.status === "INCOMPLETE") report.summary.incomplete += 1;
  }
  report.errors = topLevelErrors;
  report.status = topLevelErrors.length || report.summary.fail || report.summary.incomplete
    ? "INCOMPLETE"
    : report.summary.blocked
      ? "PASS_WITH_BLOCKERS"
      : "PASS";
  report.blockers.push(
    ...report.rows
      .filter((row) => row.status === "BLOCKED")
      .map((row) => `${row.state} @ ${row.width}px: ${row.reason}`),
  );
  await writeJson(REPORT_PATH, report);
  await writePerScreenAxe(report.rows);
  await writeJson(path.join(OUT, "axe", "audit-567-summary.json"), {
    task: "567",
    status: report.status,
    ...report.summary,
  });
  await fsp.writeFile(path.join(OUT, "worklog.md"), renderWorklog(report), "utf8");
  log(`${report.status}: ${report.summary.pass} PASS, ${report.summary.blocked} BLOCKED, ${report.summary.fail} FAIL, ${report.summary.incomplete} INCOMPLETE`);
  if (report.status === "INCOMPLETE") process.exitCode = 1;
}

main().catch(async (error) => {
  const failure = {
    task: "567",
    status: "INCOMPLETE",
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    error: safeError(error),
  };
  await writeJson(REPORT_PATH, failure).catch(() => {});
  process.stderr.write(`[audit-567-states] ${failure.error.message}\n`);
  process.exitCode = 1;
});