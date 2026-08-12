// Repeatable real-system validation for collections + learning queue (Task #295).
// Creates one disposable local account, exercises the live server through its
// real API and Chromium UI, and always removes every QA row in finally.
//
// Requires the development server on :5000 and DATABASE_URL. Evidence is
// written only to /tmp/validation/collections-audit.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));
const { Pool } = pg;
const BASE = process.env.AUDIT_BASE_URL || "http://localhost:5000";
const DATABASE_URL = process.env.DATABASE_URL;
const OUT = "/tmp/validation/collections-audit";
const PREFIX = "__qa_test_collections_audit_";
fs.mkdirSync(OUT, { recursive: true });

if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is required for guaranteed QA teardown");
  process.exit(1);
}

function chromePath() {
  const cache = path.join(ROOT, ".cache/ms-playwright");
  const dir = fs.readdirSync(cache).filter((entry) => /^chromium-\d+$/.test(entry)).sort().pop();
  if (!dir) throw new Error("No cached Chromium installation");
  return path.join(cache, dir, "chrome-linux64/chrome");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const results = [];
const log = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} :: ${detail}`);
};

async function purgeQaUsers() {
  const users = await pool.query("SELECT id FROM users WHERE email LIKE $1", [`${PREFIX}%`]);
  for (const { id } of users.rows) {
    await pool.query("DELETE FROM sessions WHERE sess::text LIKE $1", [`%${id}%`]);
  }
  await pool.query("DELETE FROM users WHERE email LIKE $1", [`${PREFIX}%`]);
}

async function requestJson(request, method, route, body) {
  const response = await request.fetch(`${BASE}${route}`, {
    method,
    headers: { Origin: BASE, "Content-Type": "application/json" },
    data: body,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok()) {
    throw new Error(`${method} ${route} -> ${response.status()}: ${text.slice(0, 200)}`);
  }
  return { status: response.status(), data };
}

// Wait for the application before creating any data.
{
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (Date.now() < deadline && !ready) {
    try {
      const response = await fetch(`${BASE}/api/awesome-list`, { method: "HEAD" });
      ready = response.ok || response.status === 405;
    } catch {}
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!ready) {
    console.error("FATAL: app did not become ready within 120 seconds");
    process.exit(1);
  }
}

await purgeQaUsers();
const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const email = `${PREFIX}${suffix}@example.com`;
const password = `CollectionAudit-${suffix}!`;
const collectionName = `Collection audit ${suffix}`;
let browser;
let ownerContext;
let anonymousContext;

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  ownerContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const request = ownerContext.request;

  await requestJson(request, "POST", "/api/auth/register", { email, password });
  await requestJson(request, "POST", "/api/auth/local/login", { email, password });
  const auth = await requestJson(request, "GET", "/api/auth/user");
  log("auth:local-session", auth.data?.isAuthenticated === true, `authenticated=${auth.data?.isAuthenticated}`);

  const catalog = await requestJson(request, "GET", "/api/resources?limit=2");
  const resources = catalog.data?.resources ?? catalog.data ?? [];
  if (resources.length < 2) throw new Error("Need at least two approved catalog resources");
  const [resource, mobileResource] = resources;

  const created = await requestJson(request, "POST", "/api/collections", { name: collectionName });
  const collectionId = created.data.id;
  await requestJson(request, "POST", `/api/bookmarks/${resource.id}`, {
    notes: `Audit note ${suffix}`,
  });
  await requestJson(
    request,
    "POST",
    `/api/collections/${collectionId}/items/${resource.id}`,
  );
  await requestJson(request, "PATCH", `/api/bookmarks/${resource.id}/state`, {
    queueStatus: "in-progress",
    personalTags: [`audit-${suffix}`],
  });

  const page = await ownerContext.newPage();
  await page.goto(`${BASE}/bookmarks?collection=${collectionId}`, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  await page.waitForSelector(`[data-testid="bookmark-card-${resource.id}"]`, { timeout: 20_000 });
  const libraryText = await page.locator("#main").innerText();
  log(
    "library:state-rendered",
    libraryText.includes(resource.title) &&
      libraryText.includes("In progress") &&
      libraryText.includes(`#audit-${suffix}`),
    `resource=${libraryText.includes(resource.title)} status=${libraryText.includes("In progress")} tag=${libraryText.includes(`#audit-${suffix}`)}`,
  );
  await page.getByLabel("Select all visible bookmarks").click();
  const selectedText = await page.getByText(/bookmark selected/).first().textContent();
  log("library:selection-live-region", /1 bookmark selected/.test(selectedText || ""), selectedText || "missing");

  const published = await requestJson(
    request,
    "POST",
    `/api/collections/${collectionId}/publish`,
  );
  const shareId = published.data.shareId;
  const route = `/collection/${shareId}`;

  const crawlerResponse = await fetch(`${BASE}${route}`, {
    headers: { "User-Agent": "Twitterbot/1.0" },
  });
  const crawlerHtml = await crawlerResponse.text();
  log(
    "share:ssr-metadata",
    crawlerResponse.status === 200 &&
      /<meta name="robots" content="noindex, follow"/.test(crawlerHtml) &&
      crawlerHtml.includes(`property="og:url" content="https://awesome.video${route}"`),
    `status=${crawlerResponse.status} robots=${/noindex, follow/.test(crawlerHtml)} ogUrl=${crawlerHtml.includes(`https://awesome.video${route}`)}`,
  );

  anonymousContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const publicPage = await anonymousContext.newPage();
  await publicPage.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
  await publicPage.waitForSelector(`[data-testid="card-resource-${resource.id}"]`, { timeout: 20_000 });
  const publicControls = {
    detail: await publicPage.locator(`[data-testid="link-view-details-${resource.id}"]`).count(),
    visit: await publicPage.locator(`[data-testid="button-visit-${resource.id}"]`).count(),
    suggest: await publicPage.locator(`[data-testid="button-suggest-edit-${resource.id}"]`).count(),
    bookmark: await publicPage.locator('[data-testid="button-bookmark"]').count(),
  };
  log(
    "share:read-only-card",
    publicControls.detail === 1 &&
      publicControls.visit === 1 &&
      publicControls.suggest === 0 &&
      publicControls.bookmark === 0,
    JSON.stringify(publicControls),
  );
  const breadcrumb = await publicPage
    .locator('nav[aria-label="breadcrumb"]')
    .first()
    .innerText()
    .catch(() => "");
  log(
    "share:breadcrumb",
    /shared collection/i.test(breadcrumb) && !/not found/i.test(breadcrumb),
    breadcrumb.replace(/\s+/g, " ").trim(),
  );
  await publicPage.screenshot({ path: `${OUT}/public-collection.png`, fullPage: true });

  await requestJson(request, "DELETE", `/api/collections/${collectionId}/publish`);
  const revoked = await fetch(`${BASE}${route}`, { headers: { "User-Agent": "Twitterbot/1.0" } });
  log("share:unpublish-revokes", revoked.status === 404, `status=${revoked.status}`);
  const republished = await requestJson(
    request,
    "POST",
    `/api/collections/${collectionId}/publish`,
  );
  log("share:stable-id", republished.data.shareId === shareId, `reused=${republished.data.shareId === shareId}`);

  await requestJson(request, "PATCH", `/api/collections/${collectionId}`, { archived: true });
  const archived = await fetch(`${BASE}${route}`, { headers: { "User-Agent": "Twitterbot/1.0" } });
  log("share:archive-revokes", archived.status === 404, `status=${archived.status}`);
  await requestJson(request, "PATCH", `/api/collections/${collectionId}`, { archived: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/resource/${mobileResource.id}`, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  await page.getByRole("button", { name: "Add bookmark" }).click();
  await page.getByText("Add to collections (optional)").waitFor({ timeout: 20_000 });
  const chooser = page.getByLabel(`Add bookmark to ${collectionName}`);
  const chooserBox = await chooser.locator("xpath=..").boundingBox();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  log(
    "mobile:collection-chooser",
    !!chooserBox && chooserBox.height >= 44 && overflow <= 0,
    `rowHeight=${chooserBox?.height ?? 0} overflow=${overflow}`,
  );
  await chooser.click();
  await page.getByTestId("button-save-without-notes").click();
  await page.getByText("Add Bookmark").waitFor({ state: "hidden", timeout: 20_000 });
  const saved = await requestJson(request, "GET", "/api/bookmarks");
  const mobileSaved = saved.data.find((item) => item.id === mobileResource.id);
  log(
    "mobile:membership-persisted",
    mobileSaved?.collectionIds?.includes(collectionId) === true,
    `collectionIds=${JSON.stringify(mobileSaved?.collectionIds ?? [])}`,
  );
  await page.screenshot({ path: `${OUT}/mobile-library.png`, fullPage: true });
} catch (error) {
  console.error("AUDIT ERROR:", error);
  log("audit:uncaught", false, error instanceof Error ? error.message : String(error));
} finally {
  await anonymousContext?.close().catch(() => {});
  await ownerContext?.close().catch(() => {});
  await browser?.close().catch(() => {});
  try {
    await purgeQaUsers();
    const residue = await pool.query("SELECT count(*)::int AS count FROM users WHERE email LIKE $1", [
      `${PREFIX}%`,
    ]);
    log("teardown:zero-qa-users", residue.rows[0].count === 0, `remaining=${residue.rows[0].count}`);
  } catch (error) {
    log("teardown:zero-qa-users", false, error instanceof Error ? error.message : String(error));
  }
  await pool.end();
}

const failed = results.filter((result) => !result.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${failed.length} (evidence: ${OUT})`);
if (failed.length) process.exit(1);