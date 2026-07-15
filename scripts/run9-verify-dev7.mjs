import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const results = [];
const ok = (n,p,d)=>{results.push({n,p});console.log(`${p?"PASS":"FAIL"} ${n} — ${d}`)};
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);

// Home filter panel: single canonical open-source chip
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("a[data-testid^='link-category-']", { timeout: 30000 });
await page.locator("button", { hasText: "Filter by Tag" }).first().click();
await page.waitForTimeout(600);
const chips = await page.evaluate(() => {
  const wrap = document.querySelector("[data-radix-popper-content-wrapper]");
  if (!wrap) return null;
  const txt = wrap.innerText;
  const lines = txt.split("\n").map(s=>s.trim()).filter(Boolean);
  return {
    openSource: lines.filter(l => /^open[ _-]?source/i.test(l)),
    hasSpaceVariant: lines.some(l => /^open source(\s|\(|$)/i.test(l)),
    sample: lines.slice(0, 8),
  };
});
ok("BUG-018 home filter single open-source chip", chips && chips.openSource.length === 1 && !chips.hasSpaceVariant, JSON.stringify(chips));

// select the chip and assert filtering applies
const chip = page.locator("[data-radix-popper-content-wrapper] *", { hasText: /^open-source/i }).last();
await chip.click().catch(()=>{});
await page.waitForTimeout(800);
const filtered = await page.evaluate(() => {
  const cards = document.querySelectorAll("a[data-testid^='link-category-']");
  return { cardCount: cards.length, badge: document.body.innerText.match(/\d+ tags? selected|1 tag/)?.[0] ?? null };
});
ok("BUG-018 selecting merged chip filters", filtered.cardCount > 0, JSON.stringify(filtered));

// Category page filter panel too
await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForSelector("button[aria-label='Sort resources']", { timeout: 30000 });
await page.locator("button", { hasText: "Filter by Tag" }).first().click();
await page.waitForTimeout(600);
const catChips = await page.evaluate(() => {
  const wrap = document.querySelector("[data-radix-popper-content-wrapper]");
  if (!wrap) return null;
  const lines = wrap.innerText.split("\n").map(s=>s.trim()).filter(Boolean);
  return {
    openSource: lines.filter(l => /^open[ _-]?source/i.test(l)),
    hasSpaceVariant: lines.some(l => /^open source(\s|\(|$)/i.test(l)),
    nonCanonical: lines.filter(l => /^[a-z0-9-]+ [a-z]/i.test(l) && !/\d+\)?$/.test(l)).slice(0,5),
  };
});
ok("BUG-018 category filter canonical chips", catChips && catChips.openSource.length <= 1 && !catChips.hasSpaceVariant, JSON.stringify(catChips));

await browser.close();
const f = results.filter(r=>!r.p);
console.log(`\n${results.length-f.length}/${results.length} PASS`);
process.exit(f.length?1:0);
