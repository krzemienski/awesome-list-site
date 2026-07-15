import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);
await page.goto(`${BASE}/advanced`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("[role='tab']", { timeout: 30000 });
const metricsTab = page.locator("[role='tab']", { hasText: /metrics/i }).first();
await metricsTab.click();
await page.waitForTimeout(1000);
const active = await metricsTab.getAttribute("aria-selected");
console.log("metrics tab aria-selected:", active);
// inner CommunityMetrics tabs: overview is default and holds Recent Activity
await page.waitForSelector("text=/recent activity/i", { timeout: 15000 });
const m = await page.evaluate(() => {
  const b = document.body.innerText;
  return {
    hint: /tracked in this browser only/i.test(b),
    zeroPctShown: /(^|\s)0%\s*engagement/i.test(b.replace(/\n/g, " ")),
    noLocal: /no local activity yet/i.test(b),
    dashShown: /—\s*\n?\s*engagement/.test(b),
  };
});
const pass = m.hint && !m.zeroPctShown;
console.log(`${pass ? "PASS" : "FAIL"} BUG-016 local-metrics honest zero-state — ${JSON.stringify(m)}`);
await browser.close();
process.exit(pass ? 0 : 1);
