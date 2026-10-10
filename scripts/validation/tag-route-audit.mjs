#!/usr/bin/env node
// Real-browser regression check for the bare /tag redirect.
//
// Guards:
//   1. client-side navigation to /tag lands on /categories
//   2. direct navigation to /tag lands on /categories
//   3. a valid /tag/:slug route renders its tag landing page
//   4. browser back/forward does not leave an empty SPA shell
//
// The landing tag is DISCOVERED, never picked from a fixed vocabulary: the
// public /api/resources facet list (the same approved-resource tag identity
// the sitemap uses) is filtered to tags with at least TAG_LANDING_MIN_RESOURCES
// (read from shared/tagNormalize.ts) and the highest-count one is audited.
// TAG_AUDIT_SLUG may pin a tag, but it must itself be eligible. A dataset with
// no eligible tag is reported explicitly as `eligible-tag-discovery` FAIL.
//
// Diagnostics are retained so a failure never needs a rerun: the discovery
// request (status + bounded body), every page's console errors/warnings,
// pageerrors, failed requests, /api responses >= 400 (bounded body), requests
// still in flight, final URL and rendered card count, plus a screenshot per
// failing check — all in tag-route-audit.json under TAG_ROUTE_AUDIT_EVIDENCE_DIR.
//
// Anonymous-only. Requires the app at AUDIT_BASE_URL (defaults to the dev
// server on :5000). Exits 1 on any failure.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";
import { acquireGateLease } from "./gate-lease.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));

const BASE = process.env.AUDIT_BASE_URL || "http://localhost:5000";
const OUT = process.env.TAG_ROUTE_AUDIT_EVIDENCE_DIR || "/tmp/validation/tag-route-audit";
const EXPECTED_BUILD_REVISION = process.env.EXPECTED_BUILD_REVISION?.trim() || null;
const REVISION_WAIT_TIMEOUT_MS = Number.parseInt(
  process.env.REVISION_WAIT_TIMEOUT_MS || "120000",
  10,
);
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  const cache = path.join(ROOT, ".cache/ms-playwright");
  const dir = fs.readdirSync(cache).filter((entry) => /^chromium-\d+$/.test(entry)).sort().pop();
  if (!dir) throw new Error("No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium");
  return path.join(cache, dir, "chrome-linux64/chrome");
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/awesome-list`, { method: "HEAD" });
      if (response.ok || response.status === 405) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`App not reachable at ${BASE} after 120s (${lastError})`);
}

const BODY_LIMIT = 2_000;
const DIAG_LIMIT = 50;

// The landing threshold lives in shared TypeScript; read the literal so this
// plain-node gate cannot drift from it (and fails loudly if the shape moves).
function readLandingThreshold() {
  const source = fs.readFileSync(path.join(ROOT, "shared/tagNormalize.ts"), "utf8");
  const match = /export const TAG_LANDING_MIN_RESOURCES\s*=\s*(\d+)\s*;/.exec(source);
  if (!match) throw new Error("shared/tagNormalize.ts no longer declares TAG_LANDING_MIN_RESOURCES = <n>; update tag-route-audit.mjs");
  return Number(match[1]);
}
const TAG_LANDING_MIN_RESOURCES = readLandingThreshold();

const report = {
  baseUrl: BASE,
  landingThreshold: TAG_LANDING_MIN_RESOURCES,
  discovery: null,
  expectedRevision: EXPECTED_BUILD_REVISION,
  observedRevision: null,
  observedRevisionStatus: null,
  revisionMatched: null,
  tag: null,
  results: [],
  pages: {},
};

function writeReport() {
  fs.writeFileSync(
    path.join(OUT, "tag-route-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

async function assertReleasedRevision() {
  if (!EXPECTED_BUILD_REVISION) return;

  const timeoutMs =
    Number.isFinite(REVISION_WAIT_TIMEOUT_MS) && REVISION_WAIT_TIMEOUT_MS >= 0
      ? REVISION_WAIT_TIMEOUT_MS
      : 120_000;
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  do {
    try {
      const response = await fetch(`${BASE}/api/version`, {
        headers: { "cache-control": "no-cache" },
      });
      report.observedRevisionStatus = response.status;
      const body = await response.json();
      report.observedRevision = typeof body?.revision === "string" ? body.revision.trim() : null;
      report.revisionMatched = response.ok && report.observedRevision === EXPECTED_BUILD_REVISION;
      lastError = null;
    } catch (error) {
      report.observedRevision = null;
      report.revisionMatched = false;
      lastError = error instanceof Error ? error.message : String(error);
    }
    writeReport();
    if (report.revisionMatched) return;
    if (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  } while (Date.now() < deadline);

  throw new Error(
    `Deployed revision mismatch after ${timeoutMs}ms: expected=${EXPECTED_BUILD_REVISION} observed=${report.observedRevision || "<missing>"} (HTTP ${report.observedRevisionStatus ?? "unavailable"}${lastError ? `; ${lastError}` : ""})`,
  );
}

// Pure selection over the facet list; exported behaviour is exercised by the
// canaries below so a refactor cannot silently fall back to "any tag > 0".
function selectEligibleTag(facetTags, threshold, pinned) {
  const eligible = facetTags
    .filter((tag) => tag.count >= threshold)
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  if (pinned) {
    const hit = facetTags.find((tag) => tag.value === pinned);
    if (!hit) return { tag: null, eligibleCount: eligible.length, reason: `TAG_AUDIT_SLUG=${pinned} is not a canonical approved-resource tag in the facet list` };
    if (hit.count < threshold) return { tag: null, eligibleCount: eligible.length, reason: `TAG_AUDIT_SLUG=${pinned} has ${hit.count} approved resource(s), below the landing threshold ${threshold}` };
    return { tag: hit, eligibleCount: eligible.length };
  }
  if (!eligible.length) {
    const best = [...facetTags].sort((a, b) => b.count - a.count)[0];
    return { tag: null, eligibleCount: 0, reason: `no eligible tag: 0 of ${facetTags.length} tag(s) reach ${threshold} approved resources${best ? ` (largest: ${best.value}=${best.count})` : ""}` };
  }
  return { tag: eligible[0], eligibleCount: eligible.length };
}

function runCanaries() {
  const facets = [{ value: "codec-lab", count: 7 }, { value: "rare", count: 4 }, { value: "alpha", count: 7 }];
  const checks = [
    [selectEligibleTag(facets, 5).tag?.value, "alpha", "highest count wins, ties by name"],
    [selectEligibleTag([{ value: "rare", count: 4 }], 5).tag, null, "below-threshold-only dataset yields no tag"],
    [selectEligibleTag(facets, 5, "rare").tag, null, "a pinned below-threshold tag is rejected"],
    [selectEligibleTag(facets, 5, "missing").tag, null, "a pinned non-canonical tag is rejected"],
    [selectEligibleTag(facets, 5, "codec-lab").tag?.value, "codec-lab", "a pinned eligible tag is used"],
  ];
  for (const [actual, expected, label] of checks) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`canary failed: ${label} → ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    }
  }
}

async function discoverEligibleTag() {
  const url = `${BASE}/api/resources?limit=1&facets=true`;
  const discovery = { url, status: null, bodyExcerpt: null, facetTagCount: null, eligibleCount: null, error: null };
  report.discovery = discovery;
  let response;
  let text;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
    discovery.status = response.status;
    text = await response.text();
  } catch (error) {
    discovery.error = error instanceof Error ? error.message : String(error);
    throw new Error(`tag discovery request failed: ${discovery.error}`);
  }
  if (!response.ok) {
    discovery.bodyExcerpt = text.slice(0, BODY_LIMIT);
    throw new Error(`tag discovery answered HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    discovery.bodyExcerpt = text.slice(0, BODY_LIMIT);
    throw new Error("tag discovery response was not JSON");
  }
  const tags = data?.facets?.tags;
  const shapeOk = Array.isArray(tags) && tags.every((tag) => typeof tag?.value === "string" && Number.isFinite(tag?.count));
  if (!shapeOk) {
    discovery.bodyExcerpt = text.slice(0, BODY_LIMIT);
    throw new Error("tag discovery response has no facets.tags[{value,count}] list");
  }
  discovery.facetTagCount = tags.length;
  const selection = selectEligibleTag(tags, TAG_LANDING_MIN_RESOURCES, process.env.TAG_AUDIT_SLUG?.trim() || null);
  discovery.eligibleCount = selection.eligibleCount;
  if (!selection.tag) {
    discovery.reason = selection.reason;
    return null;
  }
  return { slug: selection.tag.value, total: selection.tag.count };
}

// Attach bounded diagnostics to a page. Everything lands in report.pages[label].
function instrument(page, label) {
  const diag = { console: [], pageErrors: [], failedRequests: [], apiErrors: [], inFlight: new Map() };
  const push = (list, item) => { if (list.length < DIAG_LIMIT) list.push(item); };
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      push(diag.console, { type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on("pageerror", (error) => push(diag.pageErrors, String(error?.stack || error).slice(0, 1_000)));
  page.on("request", (request) => {
    if (request.url().includes("/api/")) diag.inFlight.set(request, { method: request.method(), url: request.url(), startedAt: Date.now() });
  });
  page.on("requestfinished", (request) => diag.inFlight.delete(request));
  page.on("requestfailed", (request) => {
    diag.inFlight.delete(request);
    push(diag.failedRequests, { method: request.method(), url: request.url(), failure: request.failure()?.errorText ?? "unknown" });
  });
  page.on("response", async (response) => {
    if (!response.url().includes("/api/") || response.status() < 400) return;
    let body = "";
    try { body = (await response.text()).slice(0, BODY_LIMIT); } catch { body = "<body unavailable>"; }
    push(diag.apiErrors, { status: response.status(), url: response.url(), body });
  });
  return diag;
}

async function snapshotPage(page, label, diag) {
  const state = await page
    .evaluate(() => ({
      finalUrl: window.location.href,
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() ?? null,
      cardCount: document.querySelectorAll(".discovery-grid > *").length,
      resultsTotal: document.querySelector('[data-testid="text-results-count"]')?.getAttribute("data-total") ?? null,
    }))
    .catch((error) => ({ finalUrl: page.url(), evaluateError: String(error) }));
  report.pages[label] = {
    ...state,
    console: diag.console,
    pageErrors: diag.pageErrors,
    failedRequests: diag.failedRequests,
    apiErrors: diag.apiErrors,
    inFlightApiRequests: [...diag.inFlight.values()].map((r) => ({ ...r, pendingMs: Date.now() - r.startedAt })),
  };
  writeReport();
  return report.pages[label];
}

const log = (name, pass, detail) => {
  report.results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} :: ${detail}`);
  writeReport();
};

async function check(name, assertion, page = null, diag = null) {
  try {
    const detail = await assertion();
    log(name, true, detail);
  } catch (error) {
    log(name, false, error instanceof Error ? error.message : String(error));
    if (page) {
      const shot = path.join(OUT, `failure-${name}.png`);
      await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
      if (diag) {
        const snap = await snapshotPage(page, `failure-${name}`, diag);
        report.results[report.results.length - 1].evidence = { screenshot: shot, page: `failure-${name}`, finalUrl: snap.finalUrl };
        writeReport();
      }
    }
  }
}

async function waitForPath(page, expectedPath) {
  await page.waitForFunction(
    (path) => window.location.pathname === path,
    expectedPath,
    { timeout: 30_000 },
  );
}

async function assertSpaShell(page, label) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      return Boolean(root?.children.length && root.textContent?.trim());
    },
    null,
    { timeout: 30_000 },
  );
  const state = await page.evaluate(() => ({
    path: window.location.pathname,
    rootChildren: document.getElementById("root")?.children.length ?? 0,
    textLength: document.getElementById("root")?.textContent?.trim().length ?? 0,
  }));
  if (!(state.rootChildren > 0 && state.textLength > 0)) {
    throw new Error(`${label} rendered an empty SPA shell: ${JSON.stringify(state)}`);
  }
}

async function assertCategories(page, label) {
  await waitForPath(page, "/categories");
  await page.getByRole("heading", { name: "All Categories", level: 1 }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await assertSpaShell(page, label);
}

runCanaries();
// The completion runner starts every gate at once and the DB-resilience gate
// takes a real table lock mid-run; that window 503s this audit's direct
// /categories load. Share the "db-heavy" lease so the two never overlap.
const releaseGateLease = await acquireGateLease("db-heavy", "tag-route-audit");
await waitForServer();
await assertReleasedRevision();
let tag = null;
try {
  tag = await discoverEligibleTag();
  if (tag) {
    log("eligible-tag-discovery", true, `/tag/${tag.slug} (${tag.total} approved resources; ${report.discovery.eligibleCount} of ${report.discovery.facetTagCount} tags reach ${TAG_LANDING_MIN_RESOURCES})`);
  } else {
    log("eligible-tag-discovery", false, report.discovery.reason);
  }
} catch (error) {
  log("eligible-tag-discovery", false, error instanceof Error ? error.message : String(error));
}
report.tag = tag;
writeReport();

const browser = await launchBrowserWithLease(
  chromium,
  {
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  },
  "tag-route-audit",
);

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageDiag = instrument(page, "main");
try {
  // Use the browser's history API and popstate signal to exercise the same
  // client-side navigation path used by wouter links without inventing a
  // production-only test element.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await assertSpaShell(page, "home-before-client-navigation");
  await page.evaluate(() => {
    window.history.pushState({}, "", "/tag");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await check("client-side-redirect", async () => {
    await assertCategories(page, "client-navigation-/tag");
    return `url=${page.url()}`;
  }, page, pageDiag);

  // The redirect uses replace semantics, so back returns to the page before
  // the attempted /tag navigation and forward returns to /categories.
  await check("history-navigation", async () => {
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForPath(page, "/");
    await assertSpaShell(page, "history-back");
    await page.goForward({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await assertCategories(page, "history-forward");
    return `back=/ forward=${new URL(page.url()).pathname}`;
  }, page, pageDiag);

  const directPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const directDiag = instrument(directPage, "direct");
  try {
    await check("direct-redirect", async () => {
      await directPage.goto(`${BASE}/tag`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await assertCategories(directPage, "direct-navigation-/tag");
      return `url=${directPage.url()}`;
    }, directPage, directDiag);
    await snapshotPage(directPage, "direct", directDiag);
  } finally {
    await directPage.close();
  }

  if (tag) await check("live-tag-rendering", async () => {
    await page.goto(`${BASE}/tag/${encodeURIComponent(tag.slug)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await waitForPath(page, `/tag/${encodeURIComponent(tag.slug)}`);
    await page.getByRole("heading", { level: 1 }).filter({ hasText: /.+/ }).waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.locator('[data-testid="text-results-count"]').waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await assertSpaShell(page, `tag-landing-/tag/${tag.slug}`);
    // The landing must agree with the discovery facet: same approved total,
    // and a first page of cards (24 per page) actually rendered.
    const state = await snapshotPage(page, "tag-landing", pageDiag);
    if (Number(state.resultsTotal) !== tag.total) {
      throw new Error(`landing shows total ${state.resultsTotal}, facet discovery counted ${tag.total}`);
    }
    const expectedCards = Math.min(24, tag.total);
    if (state.cardCount !== expectedCards) {
      throw new Error(`landing rendered ${state.cardCount} card(s), expected ${expectedCards}`);
    }
    return `url=${page.url()} total=${tag.total} cards=${state.cardCount}`;
  }, page, pageDiag);
} catch (error) {
  log("audit-runtime", false, error instanceof Error ? error.message : String(error));
  await page.screenshot({ path: path.join(OUT, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  await snapshotPage(page, "main", pageDiag).catch(() => {});
  writeReport();
  const failures = report.results.filter((result) => !result.pass);
  console.log(`\nTOTAL ${report.results.length}, FAIL ${failures.length} (evidence: ${OUT})`);
  await browser.close();
  releaseGateLease();
  if (failures.length) process.exitCode = 1;
}
