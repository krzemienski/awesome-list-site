import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "http://127.0.0.1:5101";
const out = process.argv[3] || "/tmp/atmo";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const rows = [];
for (const system of ["editorial", "terminal", "geist", "brutalist", "swiss"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="system-picker"]').waitFor({ timeout: 30000 });
  await page.locator(`[data-testid="system-option-${system}"]`).click();
  await page.waitForFunction((s) => document.documentElement.getAttribute("data-system") === s, system);
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.waitForFunction((s) => document.documentElement.getAttribute("data-system") === s && document.fonts.status === "loaded", system);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const el = document.querySelector(".page");
    const cs = getComputedStyle(el, "::after");
    return { system: document.documentElement.dataset.system, repeat: cs.backgroundRepeat, size: cs.backgroundSize.slice(0, 40), clip: getComputedStyle(el).getPropertyValue("--bg-atmosphere-clip").trim().slice(0, 30), token: getComputedStyle(el).getPropertyValue("--bg-atmosphere-repeat").trim() };
  });
  await page.screenshot({ path: `${out}/${system}-1440-home.png`, fullPage: false });
  rows.push(r); console.log(JSON.stringify(r));
  await ctx.close();
}
fs.writeFileSync(`${out}/atmosphere-repeat.json`, JSON.stringify(rows, null, 2));
await browser.close();
