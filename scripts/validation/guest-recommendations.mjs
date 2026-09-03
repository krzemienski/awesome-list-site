// Guest recommendation regression check.
//
// Populated scenarios use the real anonymous recommendation API. Empty
// scenarios intercept only that API request so the empty UI path is
// deterministic without modifying catalog data.
//
// Requires the development server on :5000 (or AUDIT_BASE_URL/BASE_URL).
// Pass --populated-only for a production-safe post-release check.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));
const BASE = process.env.AUDIT_BASE_URL || process.env.BASE_URL || "http://localhost:5000";
const OUT =
  process.env.GUEST_RECOMMENDATIONS_EVIDENCE_DIR || "/tmp/validation/guest-recommendations";
const POPULATED_ONLY = process.argv.includes("--populated-only");
const RECOMMENDATIONS_PATH = "/api/recommendations";
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 900 },
];

fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  const cache = path.join(ROOT, ".cache/ms-playwright");
  const dir = fs
    .readdirSync(cache)
    .filter((entry) => /^chromium-\d+$/.test(entry))
    .sort()
    .pop();
  if (!dir) throw new Error("No cached Chromium installation");
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

function isRecommendationGet(response) {
  const request = response.request();
  return request.method() === "GET" && new URL(response.url()).pathname === RECOMMENDATIONS_PATH;
}

async function waitForRecommendationResponse(page, pathName) {
  const responsePromise = page.waitForResponse((response) => isRecommendationGet(response), {
    timeout: 60_000,
  });
  await page.goto(`${BASE}${pathName}`, { waitUntil: "domcontentloaded" });
  const response = await responsePromise;
  if (response.status() !== 200) {
    throw new Error(`Recommendation API returned HTTP ${response.status()}`);
  }
  const body = await response.json();
  if (!Array.isArray(body)) {
    throw new Error(`Expected recommendation array, got ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}

async function assertHidden(locator, label) {
  if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
    throw new Error(`${label} is visible`);
  }
}

async function populatedScenario(browser, viewport, pathName, surface) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const evidence = {
    route: pathName,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    apiItemCount: null,
    renderedCardCount: 0,
  };
  try {
    const body = await waitForRecommendationResponse(page, pathName);
    evidence.apiItemCount = body.length;
    if (body.length === 0) {
      throw new Error("Expected populated recommendation response, got []");
    }
    const auth = await page.evaluate(async () => {
      const response = await fetch("/api/auth/user", { credentials: "include" });
      return response.json();
    });
    if (auth?.isAuthenticated === true) {
      throw new Error("Fresh browser context is unexpectedly authenticated");
    }
    if (surface === "advanced") {
      await page.locator('[data-testid="recommendations-list"]').waitFor({
        state: "visible",
        timeout: 60_000,
      });
      const cards = page.locator('[data-testid^="recommendation-explanation-"]');
      const cardCount = await cards.count();
      evidence.renderedCardCount = cardCount;
      if (cardCount === 0) throw new Error("Advanced panel rendered no recommendation cards");
      await assertHidden(
        page.locator('[data-testid="no-recommendations"]'),
        "Advanced empty state",
      );
      await assertHidden(page.locator('[data-testid="loading-state"]'), "Advanced loading state");
      await assertHidden(page.locator('[data-testid="error-state"]'), "Advanced error state");
      return evidence;
    }

    const cards = page.locator('[data-testid^="card-resource-"]');
    await cards.first().waitFor({ state: "visible", timeout: 60_000 });
    const cardCount = await cards.count();
    evidence.renderedCardCount = cardCount;
    if (cardCount === 0) throw new Error("Standalone page rendered no recommendation cards");
    await assertHidden(
      page.getByText("No recommendations available yet.", { exact: false }),
      "Standalone empty state",
    );
    await assertHidden(
      page.locator('[data-testid="button-retry-recommendations"]'),
      "Standalone retry/error control",
    );
    return evidence;
  } catch (error) {
    error.evidence = evidence;
    throw error;
  } finally {
    await page
      .screenshot({
        path: path.join(OUT, `${surface}-${viewport.name}-populated.jpg`),
        quality: 70,
      })
      .catch(() => {});
    await context.close();
  }
}

async function emptyScenario(browser, pathName, surface) {
  const context = await browser.newContext({ viewport: VIEWPORTS[0] });
  await context.route("**/api/recommendations**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
  const page = await context.newPage();
  try {
    const body = await waitForRecommendationResponse(page, pathName);
    if (body.length !== 0) {
      throw new Error(`Expected empty recommendation response, got ${body.length} item(s)`);
    }
    const auth = await page.evaluate(async () => {
      const response = await fetch("/api/auth/user", { credentials: "include" });
      return response.json();
    });
    if (auth?.isAuthenticated === true) {
      throw new Error("Fresh browser context is unexpectedly authenticated");
    }
    if (surface === "advanced") {
      await page.locator('[data-testid="no-recommendations"]').waitFor({
        state: "visible",
        timeout: 60_000,
      });
      await assertHidden(page.locator('[data-testid="loading-state"]'), "Advanced loading state");
      await assertHidden(page.locator('[data-testid="error-state"]'), "Advanced error state");
      return "Rendered data-testid=no-recommendations for an empty API response";
    }

    await page.getByText("No recommendations available yet.", { exact: false }).waitFor({
      state: "visible",
      timeout: 60_000,
    });
    await assertHidden(
      page.locator('[data-testid="button-retry-recommendations"]'),
      "Standalone retry/error control",
    );
    return "Rendered the standalone empty copy for an empty API response";
  } finally {
    await page
      .screenshot({
        path: path.join(OUT, `${surface}-mobile-empty.jpg`),
        quality: 70,
      })
      .catch(() => {});
    await context.close();
  }
}

const results = [];
const log = (name, passed, detail, evidence = null) => {
  results.push({ name, passed, detail, ...(evidence || {}) });
  const counts = evidence
    ? `route=${evidence.route} viewport=${evidence.viewport} apiItems=${evidence.apiItemCount ?? "unknown"} renderedCards=${evidence.renderedCardCount}`
    : detail;
  console.log(`${passed ? "PASS" : "FAIL"} ${name} :: ${counts}`);
};

await waitForServer();
const browser = await launchBrowserWithLease(
  chromium,
  {
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  },
  "guest-recommendations",
);

try {
  for (const viewport of VIEWPORTS) {
    for (const scenario of [
      { surface: "advanced", pathName: "/advanced?tab=recommendations" },
      { surface: "standalone", pathName: "/recommendations" },
    ]) {
      const name = `${scenario.surface}-${viewport.name}-populated`;
      try {
        const evidence = await populatedScenario(
          browser,
          viewport,
          scenario.pathName,
          scenario.surface,
        );
        log(name, true, "Populated guest recommendations rendered", evidence);
      } catch (error) {
        log(
          name,
          false,
          error instanceof Error ? error.message : String(error),
          error?.evidence || {
            route: scenario.pathName,
            viewport: viewport.name,
            width: viewport.width,
            height: viewport.height,
            apiItemCount: null,
            renderedCardCount: 0,
          },
        );
      }
    }
  }

  if (!POPULATED_ONLY) {
    for (const scenario of [
      { surface: "advanced", pathName: "/advanced?tab=recommendations" },
      { surface: "standalone", pathName: "/recommendations" },
    ]) {
      const name = `${scenario.surface}-mobile-empty`;
      try {
        log(name, true, await emptyScenario(browser, scenario.pathName, scenario.surface));
      } catch (error) {
        log(name, false, error instanceof Error ? error.message : String(error));
      }
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(OUT, "report.json"),
  `${JSON.stringify({ baseUrl: BASE, populatedOnly: POPULATED_ONLY, results }, null, 2)}\n`,
);

const failed = results.filter((result) => !result.passed);
if (failed.length > 0) {
  console.error(`\n${failed.length} guest recommendation scenario(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${results.length} guest recommendation scenarios passed.`);
}
