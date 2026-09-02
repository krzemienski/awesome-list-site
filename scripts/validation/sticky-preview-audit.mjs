// Real-browser regression guard for the mobile theme page's pinned preview.
// `overflow-x: hidden` on the shared <main> creates a vertical scroll
// container, which silently disables position: sticky for descendants. This
// check proves both the CSS contract and the user-visible behavior after a
// real document scroll.
//
// Requires the dev server on :5000 (no authentication needed). Evidence is
// written only to /tmp/validation/sticky-preview-audit. Exits 1 on failure.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));
const BASE = process.env.AUDIT_BASE_URL || "http://localhost:5000";
const OUT = "/tmp/validation/sticky-preview-audit";
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  const cache = path.join(ROOT, ".cache/ms-playwright");
  const dir = fs.readdirSync(cache).filter((entry) => /^chromium-\d+$/.test(entry)).sort().pop();
  if (!dir) {
    throw new Error("No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium");
  }
  return path.join(cache, dir, "chrome-linux64/chrome");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryableStatus = (status) => status === 429 || status === 503;

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
    await sleep(3000);
  }
  throw new Error(`App not reachable at ${BASE} after 120s (${lastError})`);
}

async function gotoPage(page, route) {
  const deadline = Date.now() + 90_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await page.goto(`${BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      const status = response?.status() ?? 0;
      if (status > 0 && !retryableStatus(status)) {
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        return;
      }
      lastError = `status ${status}`;
      const retryAfter = Number(response?.headers()["retry-after"] || 1);
      await page.waitForTimeout(Math.max(1000, Math.min(retryAfter * 1000, 5000)));
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await page.waitForTimeout(1500);
    }
  }
  throw new Error(`Unable to load ${route} (${lastError})`);
}

const results = [];
const log = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} :: ${detail}`);
};

await waitForServer();
const browser = await launchBrowserWithLease(
  chromium,
  {
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  },
  "sticky-preview-audit",
);

try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  try {
    await gotoPage(page, "/settings/theme");
    const previewSelector = '[data-testid="theme-sticky-preview"]';
    const previewReady = await page.waitForSelector(previewSelector, {
      state: "visible",
      timeout: 30_000,
    }).then(() => true).catch(() => false);

    if (!previewReady) {
      log("theme-sticky-preview-present@375", false, "sticky preview was not rendered");
    } else {
      const before = await page.evaluate((selector) => {
        const preview = document.querySelector(selector);
        const main = document.querySelector("main");
        const header = document.querySelector("header");
        if (!preview || !main || !header) return null;
        const previewRect = preview.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const mainStyle = getComputedStyle(main);
        return {
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          scrollY: window.scrollY,
          previewTop: previewRect.top,
          previewHeight: previewRect.height,
          headerBottom: headerRect.bottom,
          position: getComputedStyle(preview).position,
          overflowX: mainStyle.overflowX,
          overflowY: mainStyle.overflowY,
        };
      }, previewSelector);

      const stylePass = Boolean(
        before &&
          before.position === "sticky" &&
          before.overflowX === "clip" &&
          before.overflowY === "visible" &&
          before.previewHeight > 0 &&
          before.documentHeight > before.viewportHeight,
      );
      log(
        "theme-sticky-preview-css@375",
        stylePass,
        before
          ? `position=${before.position} mainOverflow=${before.overflowX}/${before.overflowY} documentHeight=${before.documentHeight}`
          : "main, header, or preview not found",
      );

      const scrollTarget = before
        ? Math.min(1200, Math.max(240, before.documentHeight - before.viewportHeight - 1))
        : 0;
      await page.evaluate((top) => window.scrollTo({ top, left: 0, behavior: "instant" }), scrollTarget);
      await page.waitForFunction(() => window.scrollY > 0, { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(100);

      const after = await page.evaluate((selector) => {
        const preview = document.querySelector(selector);
        const header = document.querySelector("header");
        if (!preview || !header) return null;
        const previewRect = preview.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        return {
          scrollY: window.scrollY,
          previewTop: previewRect.top,
          previewBottom: previewRect.bottom,
          headerBottom: headerRect.bottom,
        };
      }, previewSelector);

      const tolerance = 2;
      const scrollPass = Boolean(
        before &&
          after &&
          after.scrollY > 0 &&
          after.previewTop >= -tolerance &&
          Math.abs(after.previewTop - after.headerBottom) <= tolerance &&
          after.previewBottom > after.previewTop,
      );
      log(
        "theme-sticky-preview-scroll@375",
        scrollPass,
        after
          ? `scrollY=${Math.round(after.scrollY)} previewTop=${Math.round(after.previewTop)} headerBottom=${Math.round(after.headerBottom)}`
          : "preview or header not found after scroll",
      );

      if (!scrollPass) {
        await page.screenshot({ path: `${OUT}/theme-sticky-preview-scroll.png` }).catch(() => {});
      }
    }
  } finally {
    await context.close().catch(() => {});
  }
} finally {
  fs.writeFileSync(`${OUT}/sticky-preview-audit.json`, JSON.stringify(results, null, 2));
  await browser.close();
}

const failures = results.filter((result) => !result.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${failures.length} (evidence: ${OUT})`);
process.exit(failures.length ? 1 : 0);