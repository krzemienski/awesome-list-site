// Run15 desktop (1440px, anon) verification:
// Part 1: BUG-040/022/024 (home), BUG-007 (search overflow), BUG-023/048 (search), BUG-047/036 (login), BUG-043/031 (register)
// Part 2: BUG-026 (journeys/advanced h1), BUG-012/039 (metrics), BUG-004 (export), BUG-018 (AI prefs), BUG-027 (theme h1), BUG-028 (about headings), BUG-033 (404 chrome)
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const PART = process.argv[2] ?? "all";
const run1 = PART === "all" || PART === "1";
const run2 = PART === "all" || PART === "2";

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

if (run1) {
// --- Home: sidebar focus (024); category page: tag pills (040), +N more (022)
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="list-categories"]', { timeout: 20000 });
{
  // real keyboard Tab until focus lands inside the sidebar, then read ring
  await page.evaluate(() => { document.body.focus(); window.scrollTo(0, 0); });
  let focusInfo = null;
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press("Tab");
    focusInfo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const inSidebar = !!el.closest('[data-sidebar], aside, nav');
      const isSidebarItem = el.matches('.sub-item, [data-testid^="row-cat-"], [data-testid^="toggle-cat-"], [data-testid^="nav-"]') ||
        !!el.closest('.sub-item');
      if (!inSidebar || !isSidebarItem) return null;
      const cs = getComputedStyle(el);
      return {
        testid: el.getAttribute("data-testid") || el.className?.toString().slice(0, 40),
        outline: cs.outlineWidth + " " + cs.outlineStyle,
        boxShadow: cs.boxShadow,
      };
    });
    if (focusInfo) break;
  }
  const visible = focusInfo && (
    (!focusInfo.outline.includes("none") && parseFloat(focusInfo.outline) > 0) ||
    (focusInfo.boxShadow && focusInfo.boxShadow !== "none"));
  ok("BUG-024 sidebar focus visible", !!visible,
    focusInfo ? `focused=${focusInfo.testid} outline=${focusInfo.outline} shadow=${(focusInfo.boxShadow || "").slice(0, 60)}` : "never landed on a sidebar item in 50 Tabs");
}
await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid^="card-resource-"]', { timeout: 20000 });
{
  const pills = await page.locator('[data-testid^="tag-pill-"]').count();
  const commaText = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid^="card-resource-"]')].slice(0, 6);
    return cards.some(c => /(\w+,\s*){3,}/.test(
      [...c.querySelectorAll("p,span")].filter(el => !el.closest('[data-testid^="tag-pill-"]'))
        .map(el => el.textContent).join(" ")));
  });
  ok("BUG-040 tags render as chips", pills > 0 && !commaText,
    `tag pills=${pills} comma-text-detected=${commaText}`);
}
// H265ize (7 tags) is one of 2 results under ?tags=h265; category cards use
// slug-index ids (e.g. card-resource-h265ize-1), so grab the button generically.
await page.goto(`${BASE}/category/encoding-codecs?tags=h265`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid^="card-resource-"]', { timeout: 15000 });
{
  const moreBtn = page.locator('[data-testid^="button-more-tags-"]').first();
  if (!(await moreBtn.count())) ok("BUG-022 +N more expandable", false, "no button-more-tags on h265-filtered category cards");
  else {
    const cardId = (await moreBtn.getAttribute("data-testid")).replace("button-more-tags-", "");
    const before = await page.locator(`[data-testid^="tag-pill-${cardId}-"]`).count();
    const label = await moreBtn.textContent();
    await moreBtn.click();
    await page.waitForTimeout(200);
    const after = await page.locator(`[data-testid^="tag-pill-${cardId}-"]`).count();
    const collapseLabel = await moreBtn.textContent();
    ok("BUG-022 +N more expandable", after > before && /show fewer/i.test(collapseLabel || ""),
      `card ${cardId}: pills ${before} -> ${after}; label "${label}" -> "${collapseLabel}"`);
  }
}

// --- Search: long-query overflow (007), aria-label (023), page jump (048) --
const LONGQ = "x".repeat(80);
await page.goto(`${BASE}/search?q=${LONGQ}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="text-no-results"]', { timeout: 15000 });
{
  const m = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  ok("BUG-007 long query no overflow (desktop)", m.scrollW <= m.clientW + 1,
    `scrollWidth=${m.scrollW} clientWidth=${m.clientW}`);
}
{
  const aria = await page.getAttribute('[data-testid="input-search-page"]', "aria-label");
  ok("BUG-023 search input aria-label", !!aria && aria.length > 3, `aria-label="${aria}"`);
}
await page.goto(`${BASE}/search?q=video`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="text-result-count"]', { timeout: 15000 });
{
  const jump = page.locator('[data-testid="input-search-page-jump"]');
  const exists = await jump.count();
  if (!exists) ok("BUG-048 search page jump", false, "no page-jump input (query may not paginate)");
  else {
    const urlBefore = page.url();
    await jump.fill("2");
    await jump.press("Enter");
    await page.waitForTimeout(600);
    const rangeText = await page.textContent('[data-testid="text-result-count"]');
    const onPage2 = page.url().includes("page=2") || /\b51\b|\bpage 2\b/i.test(rangeText || "");
    ok("BUG-048 search page jump", onPage2, `before=${urlBefore.slice(-30)} after=${page.url().slice(-30)} range="${(rangeText || "").slice(0, 60)}"`);
  }
}

// --- Login: method=post (047), honest copy (036) ----------------------------
await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="login-card"]', { timeout: 15000 });
{
  const method = await page.evaluate(() => document.querySelector("form")?.method);
  ok("BUG-047 login form method=post", method === "post", `form.method=${method}`);
  const text = await page.textContent('[data-testid="login-card"]');
  const falseAdvert = /github,? google,? apple/i.test(text || "") || /4 (oauth )?providers/i.test(text || "");
  ok("BUG-036 login copy honest", !falseAdvert && /replit/i.test(text || ""),
    `advertises-multi-provider=${falseAdvert} card-text-sample="${(text || "").replace(/\s+/g, " ").slice(0, 120)}"`);
}

// --- Register: confirm password (043), dictionary rating (031) -------------
await page.goto(BASE + "/register", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="register-card"]', { timeout: 15000 });
{
  const confirm = await page.locator('[data-testid="input-confirm-password"]').count();
  ok("BUG-043 confirm-password field", confirm === 1, `input-confirm-password count=${confirm}`);
  await page.fill('[data-testid="input-password"]', "password1!");
  await page.waitForTimeout(300);
  const label = await page.textContent('[data-testid="password-strength-label"]');
  ok("BUG-031 'password1!' rated weak", /very weak|weak/i.test(label || "") && !/good|strong/i.test(label || ""),
    `strength label="${label}"`);
  const method = await page.evaluate(() => document.querySelector("form")?.method);
  ok("BUG-047 register form method=post", method === "post", `form.method=${method}`);
}
}

if (run2) {
// --- Journeys + Advanced h1 (026) -------------------------------------------
await page.goto(BASE + "/journeys", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid^="card-journey-"]', { timeout: 15000 });
{
  const h1s = await page.locator("h1").count();
  ok("BUG-026 /journeys h1", h1s === 1, `h1 count=${h1s} text="${await page.textContent("h1")}"`);
}
await page.goto(BASE + "/advanced", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("h1", { timeout: 15000 });
await page.waitForTimeout(1500);
{
  const h1s = await page.locator("h1").count();
  ok("BUG-026 /advanced h1", h1s === 1, `h1 count=${h1s} text="${await page.textContent("h1")}"`);
}

// --- Community metrics (012/039) — inside Advanced tabs ---------------------
{
  const tab = page.locator('[role="tab"]', { hasText: /community|metrics/i }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(1200); }
  const body = await page.textContent("body");
  const newWeek = /New This Week/i.test(body || "");
  const rawPct = /\+\d+%\s*(vs|growth)?\s*(last week)?/i.test((body || "").split("New This Week")[1]?.slice(0, 80) || "");
  ok("BUG-012 New This Week raw count", newWeek && !rawPct,
    `label-present=${newWeek} pct-after-label=${rawPct} sample="${((body || "").split("New This Week")[1] || "").replace(/\s+/g, " ").slice(0, 60)}"`);
  const scoreEls = await page.evaluate(() =>
    [...document.querySelectorAll("span,p,div")].map(e => e.textContent?.trim() || "")
      .filter(t => /^\d+%$/.test(t)).length);
  const bareDash = await page.evaluate(() =>
    [...document.querySelectorAll("span,p")].some(e => e.textContent?.trim() === "—" && e.closest('[class*="score"], [class*="metric"]')));
  ok("BUG-039 scores always N%", scoreEls > 0 && !bareDash, `N% elements=${scoreEls} bare-dash-in-score=${bareDash}`);
}

// --- Export tools PDF via hidden iframe, no popup (004) ---------------------
{
  const tab = page.locator('[role="tab"]', { hasText: /export/i }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(800); }
  await page.evaluate(() => {
    window.__opens = 0; window.__printed = 0;
    const origOpen = window.open.bind(window);
    window.open = (...a) => { window.__opens++; return origOpen(...a); };
    HTMLIFrameElement.prototype.__proto__ && null;
  });
  const pdfBtn = page.locator('[data-testid="button-format-pdf"]');
  if (!(await pdfBtn.count())) ok("BUG-004 PDF export no popup", false, "no button-format-pdf on export tab");
  else {
    await pdfBtn.click();
    const iframesBefore = await page.evaluate(() => document.querySelectorAll("iframe").length);
    await page.locator("button", { hasText: /Export \d+ Resources/i }).first().click();
    await page.waitForTimeout(2500);
    const state = await page.evaluate(() => ({
      opens: window.__opens,
      iframes: document.querySelectorAll("iframe").length,
      srcdoc: [...document.querySelectorAll("iframe")].some(f => (f.getAttribute("srcdoc") || "").length > 100 || (f.contentDocument?.body?.innerHTML?.length ?? 0) > 100),
    }));
    ok("BUG-004 PDF export no popup", state.opens === 0 && state.iframes > iframesBefore,
      `window.open calls=${state.opens} iframes ${iframesBefore}->${state.iframes} populated=${state.srcdoc}`);
  }
}

// --- AI rec prefs persist (018) ----------------------------------------------
{
  const tab = page.locator('[role="tab"]', { hasText: /ai|recommend/i }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(800); }
  const trigger = page.locator('[data-testid="trigger-skill-level"]');
  if (!(await trigger.count())) ok("BUG-018 AI prefs persist", false, "no skill-level select found");
  else {
    // Radix Select: retry until the trigger really shows "Advanced"
    for (let i = 0; i < 3; i++) {
      await trigger.click();
      await page.waitForTimeout(250);
      const opt = page.locator('[data-testid="option-skill-advanced"]');
      if (await opt.count()) await opt.click();
      await page.waitForTimeout(250);
      if (/advanced/i.test((await trigger.textContent()) || "")) break;
    }
    const preSubmitSkill = await trigger.textContent();
    const box = page.locator('[data-testid^="checkbox-category-"]').first();
    let boxId = null;
    if (await box.count()) { boxId = await box.getAttribute("data-testid"); await box.click(); }
    // prefs persist on submit (Generate) — that's the designed save point
    await page.locator('[data-testid="button-generate-recommendations"]').click();
    await page.waitForTimeout(1500); // persistence write; don't wait for API results
    const savedProfile = await page.evaluate(() => localStorage.getItem("awesome-video-user-profile"));
    console.log(`  BUG-018 pre-reload: trigger="${(preSubmitSkill || "").slice(0, 30)}" saved=${(savedProfile || "").slice(0, 160)}`);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const tab2 = page.locator('[role="tab"]', { hasText: /ai|recommend/i }).first();
    if (await tab2.count()) { await tab2.click(); await page.waitForTimeout(1000); }
    const skillText = await page.textContent('[data-testid="trigger-skill-level"]').catch(() => null);
    const boxChecked = boxId
      ? await page.locator(`[data-testid="${boxId}"]`).getAttribute("data-state").catch(() => null)
      : null;
    ok("BUG-018 AI prefs persist", /advanced/i.test(skillText || "") && (boxId === null || boxChecked === "checked"),
      `after reload skill="${skillText}" ${boxId}=${boxChecked}`);
  }
}

// --- /settings/theme single h1 (027) -----------------------------------------
await page.goto(BASE + "/settings/theme", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1000);
{
  const h1s = await page.evaluate(() => [...document.querySelectorAll("h1")].map(h => h.textContent?.trim()));
  ok("BUG-027 theme page single h1", h1s.length === 1, `h1 count=${h1s.length} [${h1s.join(" | ")}]`);
}

// --- /about heading order (028) ----------------------------------------------
await page.goto(BASE + "/about", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(800);
{
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,h4")].filter(h => h.offsetParent !== null).map(h => Number(h.tagName[1])));
  let skip = false;
  for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) skip = true;
  ok("BUG-028 about heading order", levels[0] === 1 && !skip, `sequence=[${levels.join(",")}]`);
}

// --- 404 page keeps nav chrome (033) ------------------------------------------
await page.goto(BASE + "/qa-run15-404-probe", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1200);
{
  const state = await page.evaluate(() => ({
    sidebar: !!document.querySelector('[data-testid^="row-cat-"], [data-testid^="nav-"]'),
    header: !!document.querySelector("header"),
    notFound: /404|not found/i.test(document.body.textContent || ""),
  }));
  ok("BUG-033 404 has nav chrome", state.sidebar && state.header && state.notFound,
    `sidebar=${state.sidebar} header=${state.header} 404-copy=${state.notFound}`);
}
}

await browser.close();
const fails = results.filter(x => !x.pass);
console.log(`\n${results.length - fails.length}/${results.length} PASS (part ${PART})`);
process.exit(fails.length ? 1 : 0);
