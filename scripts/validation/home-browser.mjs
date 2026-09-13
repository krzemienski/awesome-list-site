// Live Home interaction/capture probe. Run on an unchanged development checkout.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createDisposableAdmin } from "../../tests/parity/identity.mjs";
import { acquireGateLease } from "./gate-lease.mjs";

const base = process.env.BASE_URL || "http://127.0.0.1:5000";
const out = process.env.HOME_EVIDENCE_DIR || "/tmp/home542-browser";
await fs.mkdir(out, { recursive: true });
const release = await acquireGateLease("db-heavy", "home-browser");
const browser = await chromium.launch({
  headless: true,
  executablePath: path.resolve(".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"),
  args: ["--disable-partial-raster"],
});
const evidence = { checks: [], frames: [], errors: [], axe: [] };
const check = (name, ok, detail) => {
  evidence.checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
};
let identity;
async function prepare(context) {
  await context.addInitScript(() => {
    localStorage.setItem("ds-system", "editorial");
    localStorage.setItem("ds-accent", "crimson");
    localStorage.setItem("analytics-consent", "denied");
  });
}
async function ready(page) {
  await page.locator('[data-testid="list-categories"]').waitFor({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;backdrop-filter:none!important}" });
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "UTC", locale: "en-US" });
  await prepare(context);
  const page = await context.newPage();
  page.on("pageerror", error => evidence.errors.push(error.message));
  const corpusRequests = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/awesome-list") corpusRequests.push(request.url());
  });
  await page.goto(base);
  await ready(page);
  check("Index is the guest default", await page.locator('[data-testid="home-layout-index"]').count() === 1);
  check("Default Home avoids the corpus", corpusRequests.length === 0);
  const kindsBefore = await page.locator('[data-testid="home-kind-strip"]').innerText();
  const countBefore = await page.locator('[data-testid^="badge-count-"]').allTextContents();
  await page.getByTestId("home-kind-chip-libraries").click();
  await page.waitForURL(/kind=libraries/);
  await ready(page);
  const filteredCounts = (await page.locator('[data-testid^="badge-count-"]').allTextContents())
    .map(value => Number(value.replace(/,/g, "")))
    .filter(Number.isFinite);
  const fullTotal = countBefore
    .map(value => Number(value.replace(/,/g, "")))
    .filter(Number.isFinite)
    .reduce((total, value) => total + value, 0);
  const filteredTotal = filteredCounts.reduce((total, value) => total + value, 0);
  check("Kind filtering leaves full-set chip counts unchanged", await page.locator('[data-testid="home-kind-strip"]').innerText() === kindsBefore);
  check(
    "Libraries kind keeps a non-empty matching subset and excludes nonmatches",
    filteredTotal > 0 && filteredTotal < fullTotal,
    { fullTotal, filteredTotal, visibleCategories: filteredCounts.length },
  );
  await page.evaluate(() => localStorage.setItem("awesome-video-home-layout", "curated"));
  await page.goto(base);
  await ready(page);
  check("Guest saved Curated survives navigation", await page.getByTestId("home-layout-curated").count() === 1);
  await page.reload();
  await ready(page);
  check("Guest saved Curated survives reload", await page.getByTestId("home-layout-curated").count() === 1);
  await page.goto(`${base}/?layout=curated&tags=hls`);
  await ready(page);
  const curatedCategory = page.locator('[data-testid^="link-category-"]').first();
  check(
    "Curated category links retain active tags",
    (await curatedCategory.getAttribute("href"))?.includes("tags=hls") === true,
  );
  await curatedCategory.click();
  await page.waitForURL(/\/category\/[^?]+\?tags=hls/);
  check(
    "Curated category drilldown keeps active tags",
    new URL(page.url()).searchParams.get("tags") === "hls",
  );
  await page.goto(`${base}/?layout=index`);
  await ready(page);
  check("Explicit Index overrides guest Curated", await page.getByTestId("home-layout-index").count() === 1);
  const links = await page.locator('[data-testid="list-categories"] a').evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
  const failedLinks = [];
  for (const href of [...new Set(links)]) {
    const response = await context.request.get(`${base}${href}`);
    if (response.status() !== 200) failedLinks.push({ href, status: response.status() });
  }
  check("Every index category/subcategory route resolves", failedLinks.length === 0, { links: links.length, failedLinks });
  for (const layout of ["index", "curated"]) {
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/?layout=${layout}`);
      await ready(page);
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        root: document.querySelector(".home-page").getBoundingClientRect().toJSON(),
      }));
      check(`${layout} ${width}: no horizontal overflow`, geometry.scrollWidth <= width, geometry);
      const filename = `${layout}-${width}-visitor.png`;
      await page.screenshot({ path: path.join(out, filename), fullPage: true });
      evidence.frames.push({ layout, width, filename, geometry, identity: "visitor" });
      if (width === 375 || width === 1440) {
        await page.addScriptTag({ path: path.resolve("node_modules/axe-core/axe.min.js") });
        const violations = await page.evaluate(async () => {
          const result = await window.axe.run(document.querySelector(".home-page"));
          return result.violations.filter(item => ["serious", "critical"].includes(item.impact))
            .map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }));
        });
        evidence.axe.push({ layout, width, violations });
        check(`${layout} ${width}: Home axe serious/critical zero`, violations.length === 0, violations);
      }
    }
  }
  await context.close();
  if (process.env.CLERK_SECRET_KEY && process.env.ADMIN_PASSWORD) {
    identity = await createDisposableAdmin({ browser, appBase: base, secretKey: process.env.CLERK_SECRET_KEY, auditKey: process.env.ADMIN_PASSWORD });
    const adminPage = identity.page;
    await prepare(adminPage.context());
    async function preferences(method = "GET", body) {
      return adminPage.evaluate(async ({ method, body }) => {
        const response = await fetch("/api/user/preferences", {
          method, headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, data: await response.json() };
      }, { method, body });
    }
    const initial = await preferences();
    const saved = await preferences("PUT", { homeLayout: "curated", expectedRevision: initial.data.revision });
    check("Account layout PUT succeeds without enrolling learning profile", saved.status === 200 && saved.data.homeLayout === "curated" && saved.data.preferences === null);
    const stale = await preferences("PUT", { homeLayout: "index", expectedRevision: initial.data.revision });
    check("Stale layout revision is rejected", stale.status === 409);
    await adminPage.goto(base);
    await ready(adminPage);
    check("Signed-in saved Curated loads", await adminPage.getByTestId("home-layout-curated").count() === 1);
    await adminPage.reload();
    await ready(adminPage);
    check("Signed-in Curated survives reload", await adminPage.getByTestId("home-layout-curated").count() === 1);
    const reset = await preferences("DELETE", { expectedRevision: saved.data.revision });
    check("Learning reset preserves layout", reset.status === 200 && reset.data.homeLayout === "curated" && reset.data.preferences === null);
    const afterReset = await preferences("PUT", { homeLayout: "index", expectedRevision: reset.data.revision });
    check("Layout-only tombstone update stays cleared", afterReset.status === 200 && afterReset.data.preferences === null);
    for (const layout of ["index", "curated"]) {
      for (const width of [375, 768, 1024, 1440]) {
        await adminPage.setViewportSize({ width, height: 900 });
        await adminPage.goto(`${base}/?layout=${layout}`);
        await ready(adminPage);
        const filename = `${layout}-${width}-nick.png`;
        await adminPage.screenshot({ path: path.join(out, filename), fullPage: true });
        evidence.frames.push({ layout, width, filename, identity: "Nick" });
      }
    }
  } else {
    evidence.checks.push({ name: "Account persistence and Nick captures", ok: null, detail: "Required identity environment unavailable" });
  }
  assert.equal(evidence.checks.filter(item => item.ok === false).length, 0, "Home checks failed");
} catch (error) {
  evidence.errors.push(error.message);
  process.exitCode = 1;
} finally {
  if (identity) {
    try {
      const teardown = await identity.teardown();
      evidence.teardown = { localDeleted: teardown.localDeleted, clerkDeleted: teardown.clerkDeleted, errors: teardown.errors };
    } catch (error) {
      evidence.errors.push(`Identity teardown: ${error.message}`);
      process.exitCode = 1;
    }
  }
  await browser.close();
  release();
  await fs.writeFile(path.join(out, "results.json"), JSON.stringify(evidence, null, 2));
}