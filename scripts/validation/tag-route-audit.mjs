#!/usr/bin/env node
// Real-browser regression check for the bare /tag redirect.
//
// Guards:
//   1. client-side navigation to /tag lands on /categories
//   2. direct navigation to /tag lands on /categories
//   3. a valid /tag/:slug route renders its tag landing page
//   4. browser back/forward does not leave an empty SPA shell
//
// Anonymous-only. Requires the app at AUDIT_BASE_URL (defaults to the dev
// server on :5000). Exits 1 on any failure.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";

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

const report = {
  baseUrl: BASE,
  expectedRevision: EXPECTED_BUILD_REVISION,
  observedRevision: null,
  observedRevisionStatus: null,
  revisionMatched: null,
  tag: null,
  results: [],
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

async function findLiveTag() {
  // The tags table is not the source of truth for this catalog. Probe the
  // resource filter instead, which reads the same metadata/tag relationship
  // used by TagLanding. Keep a short list of stable catalog vocabulary so the
  // audit does not need to crawl every resource.
  const candidates = process.env.TAG_AUDIT_SLUG
    ? [process.env.TAG_AUDIT_SLUG]
    : ["encoding", "player", "streaming", "video", "audio"];
  for (const candidate of candidates) {
    const response = await fetch(
      `${BASE}/api/resources?tags=${encodeURIComponent(candidate)}&limit=1`,
    );
    if (!response.ok) continue;
    const data = await response.json();
    if (Number(data?.total) > 0) return { slug: candidate, total: Number(data.total) };
  }
  throw new Error(`No live tag found for candidates: ${candidates.join(", ")}`);
}

const log = (name, pass, detail) => {
  report.results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} :: ${detail}`);
  writeReport();
};

async function check(name, assertion) {
  try {
    const detail = await assertion();
    log(name, true, detail);
  } catch (error) {
    log(name, false, error instanceof Error ? error.message : String(error));
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

await waitForServer();
await assertReleasedRevision();
const tag = await findLiveTag();
report.tag = tag;
writeReport();
console.log(`Using live tag /tag/${tag.slug} (${tag.total} resources)`);

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
  });

  // The redirect uses replace semantics, so back returns to the page before
  // the attempted /tag navigation and forward returns to /categories.
  await check("history-navigation", async () => {
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForPath(page, "/");
    await assertSpaShell(page, "history-back");
    await page.goForward({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await assertCategories(page, "history-forward");
    return `back=/ forward=${new URL(page.url()).pathname}`;
  });

  const directPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await check("direct-redirect", async () => {
      await directPage.goto(`${BASE}/tag`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await assertCategories(directPage, "direct-navigation-/tag");
      return `url=${directPage.url()}`;
    });
  } finally {
    await directPage.close();
  }

  await check("live-tag-rendering", async () => {
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
    return `url=${page.url()} total=${tag.total}`;
  });
} catch (error) {
  log("audit-runtime", false, error instanceof Error ? error.message : String(error));
  await page.screenshot({ path: path.join(OUT, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  writeReport();
  const failures = report.results.filter((result) => !result.pass);
  console.log(`\nTOTAL ${report.results.length}, FAIL ${failures.length} (evidence: ${OUT})`);
  await browser.close();
  if (failures.length) process.exitCode = 1;
}
