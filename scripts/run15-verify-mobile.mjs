// Run15 mobile (375x812, anon) verification:
// BUG-025 touch targets >=24px (tag chips + sidebar subcategory toggles),
// BUG-044 single search box on /search, BUG-007 long no-results query wraps.
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await ctx.newPage();

// --- BUG-025a: tag chips on category cards >= 24px tall
await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid^="tag-pill-"]', { timeout: 20000 });
{
  const sizes = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-testid^="tag-pill-"]')].slice(0, 12);
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
  });
  const bad = sizes.filter((s) => s.h < 24);
  ok("BUG-025a tag chips >=24px", sizes.length > 0 && bad.length === 0,
    `sampled=${sizes.length} under24=${bad.length} sample=${JSON.stringify(sizes.slice(0, 3))}`);
}

// --- BUG-025b: sidebar subcategory expand toggles >= 24px
{
  // open the drawer; retry once if the first tap doesn't register
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.locator('[data-testid="mobile-drawer-trigger"]').click();
    try {
      await page.waitForSelector('[data-testid^="toggle-cat-"]', { state: "visible", timeout: 5000 });
      break;
    } catch { /* retry */ }
  }
  // expand the first category accordion so subcategory rows render
  const catToggle = page.locator('[data-testid^="toggle-cat-"]').first();
  if (await catToggle.count()) {
    await catToggle.click();
    await page.waitForTimeout(600);
  }
  const sizes = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-testid^="expand-sub-"], [data-testid^="toggle-cat-"]')].slice(0, 12);
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      return { t: el.getAttribute("data-testid")?.slice(0, 18), w: Math.round(r.width), h: Math.round(r.height) };
    }).filter((s) => s.w > 0 && s.h > 0); // visible only
  });
  const bad = sizes.filter((s) => s.h < 24 || s.w < 24);
  ok("BUG-025b sidebar toggles >=24px", sizes.length > 0 && bad.length === 0,
    `sampled=${sizes.length} under24=${bad.length} sample=${JSON.stringify(sizes.slice(0, 3))}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

// --- BUG-044: exactly one visible search input on /search at 375px
await page.goto(BASE + "/search", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="input-search-page"]', { timeout: 20000 });
{
  const inputs = await page.evaluate(() =>
    [...document.querySelectorAll('input[type="search"], input[type="text"], input:not([type])')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const visible = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
        const searchy = /search/i.test(el.placeholder || "") || /search/i.test(el.getAttribute("data-testid") || "") || /search/i.test(el.getAttribute("aria-label") || "");
        return visible && searchy;
      })
      .map((el) => el.getAttribute("data-testid") || el.placeholder)
  );
  ok("BUG-044 single search box on mobile /search", inputs.length === 1, `visible search inputs=${JSON.stringify(inputs)}`);
}

// --- BUG-007 (mobile): 80-char unbroken no-results query wraps, no horizontal overflow
{
  // type the query (goto with ?q= races the Search page's URL-sync effect)
  const longQ = "x".repeat(80);
  const input = page.locator('[data-testid="input-search-page"]');
  await input.click();
  await input.fill(longQ);
  let appeared = false;
  try {
    await page.waitForSelector('[data-testid="text-no-results"]', { timeout: 15000 });
    appeared = true;
  } catch {
    // one retype retry — debounce occasionally swallows a programmatic fill
    await input.fill("");
    await page.waitForTimeout(500);
    await input.fill(longQ);
    await page.waitForSelector('[data-testid="text-no-results"]', { timeout: 15000 });
    appeared = true;
  }
  const probe = await page.evaluate(() => {
    const doc = document.documentElement;
    const el = document.querySelector('[data-testid="text-no-results"]');
    const r = el.getBoundingClientRect();
    return {
      overflowX: doc.scrollWidth > doc.clientWidth + 1,
      echoRight: Math.round(r.right),
      viewport: doc.clientWidth,
      echoOverflow: r.right > doc.clientWidth + 1,
    };
  });
  ok("BUG-007 mobile no-results wraps", !probe.overflowX && !probe.echoOverflow,
    `docOverflowX=${probe.overflowX} echoRight=${probe.echoRight}/${probe.viewport}`);
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} PASS (mobile 375)`);
process.exit(passed === results.length ? 0 : 1);
