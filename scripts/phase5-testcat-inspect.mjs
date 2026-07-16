import { chromium } from "playwright";
const EXEC = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
// prod missing category
await p.goto("https://awesome.video/category/test", { waitUntil: "networkidle", timeout: 45000 });
await p.waitForTimeout(2000);
const main = await p.locator("main").first().innerText().catch(() => "(no main)");
console.log("=== PROD /category/test main ===");
console.log(main.slice(0, 600));
// dev missing category for comparison
await p.goto("http://localhost:5000/category/test", { waitUntil: "networkidle", timeout: 45000 });
await p.waitForTimeout(2000);
const mainDev = await p.locator("main").first().innerText().catch(() => "(no main)");
console.log("=== DEV /category/test main ===");
console.log(mainDev.slice(0, 600));
await browser.close();
