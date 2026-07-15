import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const results = [];
const ok = (n,p,d)=>{results.push({n,p});console.log(`${p?"PASS":"FAIL"} ${n} — ${d}`)};
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);

// select the merged chip on home and assert filtering applies
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("a[data-testid^='link-category-']", { timeout: 30000 });
const before = await page.evaluate(() => document.querySelectorAll("a[data-testid^='link-category-']").length);
await page.locator("button", { hasText: "Filter by Tag" }).first().click();
await page.waitForTimeout(500);
const clicked = await page.evaluate(() => {
  const wrap = document.querySelector("[data-radix-popper-content-wrapper]");
  const el = [...wrap.querySelectorAll("*")].reverse().find(e => e.childElementCount === 0 && /^open-source$/i.test(e.textContent.trim()));
  if (!el) return false;
  (el.closest("[role='option'],label,button,div[class*='cursor']") || el).click();
  return true;
});
await page.waitForTimeout(900);
const after = await page.evaluate(() => ({
  cards: document.querySelectorAll("a[data-testid^='link-category-']").length,
  totalText: (document.body.innerText.match(/\d+ (matching )?resources?/i) || [null])[0],
}));
ok("BUG-018 selecting merged chip filters home", clicked && after.cards > 0 && after.cards <= before, `before=${before} after=${JSON.stringify(after)} clicked=${clicked}`);

// Category page filter panel canonical
await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("button[aria-label='Sort resources']", { timeout: 30000 });
await page.locator("button", { hasText: "Filter by Tag" }).first().click();
await page.waitForTimeout(500);
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
ok("BUG-018 category filter canonical chips", catChips && !catChips.hasSpaceVariant && catChips.openSource.every(t=>t==="open-source"), JSON.stringify(catChips));

await browser.close();
const f = results.filter(r=>!r.p);
console.log(`\n${results.length-f.length}/${results.length} PASS`);
process.exit(f.length?1:0);
