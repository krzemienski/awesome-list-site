// Run14 responsive verification: mobile 375px (BUG-006/022/028 + P0) and tablet 768px (BUG-015/016/017/036/037)
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const browser = await chromium.launch({ executablePath: EXE });

// ===== Mobile 375px =====
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="list-categories"]', { timeout: 15000 });
  ok("P0 mobile home renders", (await page.locator('[data-testid^="link-category-"]').count()) >= 8,
    `${await page.locator('[data-testid^="link-category-"]').count()} category cards @375px`);

  // BUG-006: drawer close button visible + 44px, Esc closes
  await page.locator('[data-testid="mobile-drawer-trigger"]').click();
  await page.waitForSelector('[data-sidebar="sidebar"][data-mobile="true"]', { timeout: 8000 });
  const closeBtn = page.locator('[data-sidebar="sidebar"][data-mobile="true"]').locator("xpath=ancestor-or-self::*[@role='dialog']").locator("button").filter({ hasText: /close/i }).first();
  // Radix Sheet close button: role=dialog > button with sr-only "Close"
  const dlgBtn = page.locator('[role="dialog"] > button').first();
  const box = await dlgBtn.boundingBox().catch(() => null);
  const visibleClose = !!box && box.width >= 40 && box.height >= 40;
  ok("BUG-006 drawer close button 44px", visibleClose,
    box ? `close btn ${box.width.toFixed(0)}x${box.height.toFixed(0)}` : "close button not found/invisible");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const drawerGone = (await page.locator('[data-sidebar="sidebar"][data-mobile="true"]').count()) === 0;
  ok("BUG-006 Esc closes drawer", drawerGone, `drawer present after Esc: ${!drawerGone}`);
  // reopen and close via the button
  await page.locator('[data-testid="mobile-drawer-trigger"]').click();
  await page.waitForSelector('[data-sidebar="sidebar"][data-mobile="true"]', { timeout: 8000 });
  await page.locator('[role="dialog"] > button').first().click();
  await page.waitForTimeout(600);
  const closedByBtn = (await page.locator('[data-sidebar="sidebar"][data-mobile="true"]').count()) === 0;
  ok("BUG-006 close button dismisses drawer", closedByBtn, `drawer present after click: ${!closedByBtn}`);

  // BUG-022: icon-only header buttons all have accessible names
  const unnamed = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll("header button, [data-slot='header'] button").forEach(b => {
      const hasText = (b.textContent || "").trim().length > 0;
      const name = b.getAttribute("aria-label") || b.getAttribute("title");
      const r = b.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && !hasText && !name) bad.push(b.outerHTML.slice(0, 80));
    });
    return bad;
  });
  ok("BUG-022 header icon buttons named", unnamed.length === 0,
    unnamed.length ? `unnamed: ${unnamed.join(" | ").slice(0, 160)}` : "all visible icon-only header buttons have aria-label");

  // BUG-028: >=24px inline auth links
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const loginLink = await page.evaluate(() => {
    const cands = [...document.querySelectorAll("a, button")].filter(el => /sign up|register|create/i.test(el.textContent || ""));
    const el = cands.find(e => e.getBoundingClientRect().height > 0);
    return el ? el.getBoundingClientRect().height : 0;
  });
  await page.goto(BASE + "/register", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const regLink = await page.evaluate(() => {
    const cands = [...document.querySelectorAll("a, button")].filter(el => /sign in|log in/i.test(el.textContent || ""));
    const el = cands.find(e => e.getBoundingClientRect().height > 0);
    return el ? el.getBoundingClientRect().height : 0;
  });
  ok("BUG-028 auth inline links >=24px", loginLink >= 24 && regLink >= 24,
    `login page link h=${loginLink.toFixed(0)} register page link h=${regLink.toFixed(0)}`);

  // P0 mobile: resource detail renders
  await page.goto(BASE + "/resource/186449", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="button-back"]', { timeout: 15000 });
  const h1 = await page.locator("h1").first().textContent();
  ok("P0 mobile resource detail", !!h1 && h1.length > 3, `h1="${h1?.slice(0, 60)}"`);
  await ctx.close();
}

// ===== Tablet 768px =====
{
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await ctx.newPage();

  // BUG-015: explorer stat rows don't bleed out of cards
  await page.goto(BASE + "/advanced", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  const bleed = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".grid > div, .grid > a")].filter(c => c.querySelector("span"));
    let overflows = 0, checked = 0;
    cards.forEach(c => {
      checked++;
      if (c.scrollWidth > c.clientWidth + 2) overflows++;
    });
    return { overflows, checked };
  });
  ok("BUG-015 explorer cards no bleed @768", bleed.checked > 0 && bleed.overflows === 0,
    `${bleed.overflows}/${bleed.checked} cards overflow horizontally`);

  // BUG-036: tab labels not truncated at 768
  const tabTrunc = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const bad = tabs.filter(t => t.scrollWidth > t.clientWidth + 2).map(t => t.textContent?.trim());
    return { total: tabs.length, bad };
  });
  ok("BUG-036 advanced tab labels intact @768", tabTrunc.total >= 3 && tabTrunc.bad.length === 0,
    `${tabTrunc.bad.length}/${tabTrunc.total} truncated ${tabTrunc.bad.join(",")}`);

  // BUG-017: breadcrumb single line, no clipping below header
  await page.goto(BASE + "/sub-subcategory/ffmpeg-sc2222", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const crumb = await page.evaluate(() => {
    const list = document.querySelector("nav ol, [data-slot='breadcrumb-list'], nav[aria-label='breadcrumb'] ol");
    if (!list) return null;
    const r = list.getBoundingClientRect();
    return { h: r.height, oneLine: r.height < 36, scrollH: list.scrollHeight, clientH: list.clientHeight };
  });
  ok("BUG-017 breadcrumb one line @768", !!crumb && crumb.oneLine,
    crumb ? `list h=${crumb.h.toFixed(0)} scrollH=${crumb.scrollH}` : "breadcrumb list not found");

  // BUG-016: category resource grid is 1 column at 768
  await page.goto(BASE + "/category/encoding-tools", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid^="link-view-details-"], .grid', { timeout: 15000 });
  await page.waitForTimeout(800);
  const gridCols = await page.evaluate(() => {
    const grids = [...document.querySelectorAll("div.grid")].filter(g =>
      g.className.includes("md:grid-cols-1") || g.querySelector('[data-testid^="link-view-details-"]'));
    const g = grids.find(x => x.children.length > 1) || grids[0];
    if (!g) return null;
    return getComputedStyle(g).gridTemplateColumns.split(" ").length;
  });
  ok("BUG-016 category grid 1 col @768", gridCols === 1, `grid columns=${gridCols}`);

  // BUG-037: journey buttons — icons not squeezed/clipped
  await page.goto(BASE + "/journeys", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid^="button-view-journey-"]', { timeout: 15000 });
  const iconCheck = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-testid^="button-view-journey-"]')];
    let badIcon = 0, badOverflow = 0;
    btns.forEach(b => {
      const svg = b.querySelector("svg");
      if (svg && svg.getBoundingClientRect().width < 14) badIcon++;
      if (b.scrollWidth > b.clientWidth + 2) badOverflow++;
    });
    return { n: btns.length, badIcon, badOverflow };
  });
  ok("BUG-037 journey button icons intact @768", iconCheck.n > 0 && iconCheck.badIcon === 0 && iconCheck.badOverflow === 0,
    `${iconCheck.n} buttons, squeezedIcons=${iconCheck.badIcon} overflow=${iconCheck.badOverflow}`);
  await ctx.close();
}

await browser.close();
const failed = results.filter(x => !x.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
