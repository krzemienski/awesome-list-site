#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PERF_BASE_URL ?? "http://127.0.0.1:5000";
const runs = Math.max(1, Number(process.env.PERF_RUNS ?? 3));
const executableCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
].filter(Boolean);
const executablePath = executableCandidates.find((candidate) =>
  fs.existsSync(candidate),
);
const jsonArg = process.argv.indexOf("--json");
const jsonPath =
  jsonArg >= 0 && process.argv[jsonArg + 1]
    ? path.resolve(process.argv[jsonArg + 1])
    : null;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
const results = [];

try {
  for (let run = 1; run <= runs; run += 1) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const scriptRequests = new Set();
    let scriptTransferBytes = 0;
    const fontStylesheetRequests = new Set();
    const fontRequests = new Set();
    let fontTransferBytes = 0;

    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      connectionType: "cellular3g",
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Performance.enable");
    cdp.on("Network.responseReceived", ({ requestId, type, response }) => {
      if (type === "Script") scriptRequests.add(requestId);
      if (type === "Stylesheet" && response.url.startsWith("https://fonts.googleapis.com/")) {
        fontStylesheetRequests.add(requestId);
      }
      if (type === "Font") fontRequests.add(requestId);
    });
    cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
      if (scriptRequests.has(requestId)) scriptTransferBytes += encodedDataLength;
      if (fontStylesheetRequests.has(requestId) || fontRequests.has(requestId)) {
        fontTransferBytes += encodedDataLength;
      }
    });

    await page.goto(`${baseUrl}/`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const consent = page.getByRole("button", {
      name: /decline|reject non-essential/i,
    });
    if (await consent.isVisible().catch(() => false)) await consent.click();

    const firstCategory = page.locator('[data-testid^="link-category-"]').first();
    await firstCategory.waitFor({ state: "visible", timeout: 60_000 });
    const homeReadyMs = await page.evaluate(() => performance.now());
    const homeNavigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType(
        "navigation",
      )[0];
      return {
        domContentLoadedMs: entry?.domContentLoadedEventEnd ?? 0,
        decodedScriptBytes: performance
          .getEntriesByType("resource")
          .filter((item) => item.initiatorType === "script")
          .reduce((total, item) => total + item.decodedBodySize, 0),
      };
    });
    const homePerformance = await cdp.send("Performance.getMetrics");
    const homeMetric = (name) =>
      homePerformance.metrics.find((item) => item.name === name)?.value ?? 0;
    const homeScriptTransferBytes = scriptTransferBytes;

    await firstCategory.click();
    await page
      .locator('[data-testid^="card-resource"], [data-testid="empty-resources"]')
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
    const categoryReadyMs = await page.evaluate(() => performance.now());
    const categoryDecodedScriptBytes = await page.evaluate(() => {
      return performance
        .getEntriesByType("resource")
        .filter((item) => item.initiatorType === "script")
        .reduce((total, item) => total + item.decodedBodySize, 0);
    });
    const categoryPerformance = await cdp.send("Performance.getMetrics");
    const categoryMetric = (name) =>
      categoryPerformance.metrics.find((item) => item.name === name)?.value ?? 0;
    const result = {
      run,
      domContentLoadedMs: Math.round(homeNavigation.domContentLoadedMs),
      homeReadyMs: Math.round(homeReadyMs),
      scriptEvaluationMs: Math.round(homeMetric("ScriptDuration") * 1000),
      taskDurationMs: Math.round(homeMetric("TaskDuration") * 1000),
      scriptTransferBytes: Math.round(homeScriptTransferBytes),
      decodedScriptBytes: Math.round(homeNavigation.decodedScriptBytes),
      fontStylesheetRequests: fontStylesheetRequests.size,
      fontRequests: fontRequests.size,
      fontTransferBytes: Math.round(fontTransferBytes),
      categoryReadyMs: Math.round(categoryReadyMs),
      categoryTransitionMs: Math.round(categoryReadyMs - homeReadyMs),
      categoryScriptEvaluationMs: Math.round(
        categoryMetric("ScriptDuration") * 1000,
      ),
      categoryTaskDurationMs: Math.round(
        categoryMetric("TaskDuration") * 1000,
      ),
      categoryScriptTransferBytes: Math.round(scriptTransferBytes),
      categoryDecodedScriptBytes: Math.round(categoryDecodedScriptBytes),
    };
    results.push(result);
    console.log(`mobile run ${run}/${runs}: ${JSON.stringify(result)}`);
    await context.close();
  }
} finally {
  await browser.close();
}

const metrics = [
  "domContentLoadedMs",
  "homeReadyMs",
  "scriptEvaluationMs",
  "taskDurationMs",
  "scriptTransferBytes",
  "decodedScriptBytes",
  "fontStylesheetRequests",
  "fontRequests",
  "fontTransferBytes",
  "categoryReadyMs",
  "categoryTransitionMs",
  "categoryScriptEvaluationMs",
  "categoryTaskDurationMs",
  "categoryScriptTransferBytes",
  "categoryDecodedScriptBytes",
];
const medians = Object.fromEntries(
  metrics.map((name) => [name, Math.round(median(results.map((r) => r[name])))]),
);
const report = {
  schemaVersion: 1,
  profile: {
    viewport: "390x844@2x",
    latencyMs: 150,
    downloadMbps: 1.6,
    uploadKbps: 750,
    cpuSlowdown: 4,
    cacheDisabled: true,
    runs,
    baseUrl,
  },
  runs: results,
  median: medians,
};
console.log(`mobile median: ${JSON.stringify(medians, null, 2)}`);
if (jsonPath) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`wrote ${jsonPath}`);
}