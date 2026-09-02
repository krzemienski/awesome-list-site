#!/usr/bin/env node
// Real-browser regression check for the bare /tag redirect.
//
// Guards:
//   1. client-side navigation to /tag lands on /categories
//   2. direct navigation to /tag lands on /categories
//   3. a valid /tag/:slug route renders its tag landing page
//   4. browser back/forward does not leave an empty SPA shell
//
// Anonymous-only. Requires the dev server on :5000. Exits 1 on any failure.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));

const BASE = process.env.AUDIT_BASE_URL || "http://localhost:5000";
const OUT = "/tmp/validation/tag-route-audit";
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
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

const results = [];
const log = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} :: ${detail}`);
};

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
  log(`${label}:non-empty-spa-shell`, state.rootChildren > 0 && state.textLength > 0, JSON.stringify(state));
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
const tag = await findLiveTag();
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
  await assertCategories(page, "client-navigation-/tag");
  log("client-navigation-/tag", new URL(page.url()).pathname === "/categories", `url=${page.url()}`);

  // The redirect uses replace semantics, so back returns to the page before
  // the attempted /tag navigation and forward returns to /categories.
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForPath(page, "/");
  await assertSpaShell(page, "history-back");
  await page.goForward({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await assertCategories(page, "history-forward");
  log("history-back-forward", new URL(page.url()).pathname === "/categories", `url=${page.url()}`);

  const directPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await directPage.goto(`${BASE}/tag`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await assertCategories(directPage, "direct-navigation-/tag");
    log("direct-navigation-/tag", new URL(directPage.url()).pathname === "/categories", `url=${directPage.url()}`);
  } finally {
    await directPage.close();
  }

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
  log(
    "tag-landing-route",
    new URL(page.url()).pathname === `/tag/${encodeURIComponent(tag.slug)}`,
    `url=${page.url()} total=${tag.total}`,
  );
} catch (error) {
  await page.screenshot({ path: path.join(OUT, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  fs.writeFileSync(path.join(OUT, "tag-route-audit.json"), JSON.stringify(results, null, 2));
  const failures = results.filter((result) => !result.pass);
  console.log(`\nTOTAL ${results.length}, FAIL ${failures.length} (evidence: ${OUT})`);
  await browser.close();
  if (failures.length) process.exitCode = 1;
}