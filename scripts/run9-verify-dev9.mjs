import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);
await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("button[aria-label='Sort resources']", { timeout: 30000 });
await page.locator("button", { hasText: "Filter by Tag" }).first().click();
await page.waitForTimeout(600);
const catChips = await page.evaluate(() => {
  const wrap = document.querySelector("[data-radix-popper-content-wrapper]");
  if (!wrap) return null;
  const lines = wrap.innerText.split("\n").map(s=>s.trim()).filter(Boolean);
  return {
    openSource: lines.filter(l => /^open[ _-]?source$/i.test(l)),
    hasSpaceVariant: lines.some(l => /^open source$/i.test(l)),
    first6: lines.slice(0, 6),
  };
});
const pass = catChips && !catChips.hasSpaceVariant && catChips.openSource.every(t=>t==="open-source");
console.log(`${pass?"PASS":"FAIL"} BUG-018 category filter canonical chips — ${JSON.stringify(catChips)}`);
await browser.close();
process.exit(pass?0:1);
