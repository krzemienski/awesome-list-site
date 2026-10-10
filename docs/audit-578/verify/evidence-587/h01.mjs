import { chromium } from "playwright";
import fs from "node:fs";
const B = "http://127.0.0.1:5000";
const EXE = "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
// Ground truth from the same public corpus the page loads.
const al = await (await fetch(B + "/api/awesome-list")).json();
const norm = t => t.trim().toLowerCase().replace(/[\s_]+/g, "-");
const all = [];
const walk = (c, cat) => { for (const r of c.resources || []) all.push({ r, cat }); for (const s of c.subcategories || []) walk(s, cat); for (const s of c.subSubcategories || []) walk(s, cat); };
for (const c of al.categories) walk(c, c.name);
const expectUnused = 0;
const hls = all.filter(x => (x.r.metadata?.tags || []).some(t => norm(t) === "hls"));
const expect = {}; for (const x of hls) expect[x.cat] = (expect[x.cat] || 0) + 1;
console.log("truth", JSON.stringify({ resources: all.length, tagged: all.filter(x => (x.r.metadata?.tags || []).length).length, topLevelTags: all.filter(x => (x.r.tags || []).length).length, hls: hls.length, expect }));
const browser = await chromium.launch({ headless: true, executablePath: EXE });
for (const [system, w, h] of [["editorial", 1440, 900], ["brutalist", 1440, 900], ["editorial", 390, 844], ["brutalist", 390, 844], ["editorial", 375, 812]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(s => { localStorage.setItem("ds-system", s); }, system);
  const page = await ctx.newPage();
  await page.goto(B + "/advanced", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid^="button-explorer-tag-"]', { timeout: 30000 });
  await page.waitForTimeout(800);
  const decline = page.getByRole("button", { name: "Decline" }).first();
  if (await decline.isVisible().catch(() => false)) await decline.click();
  const before = await page.evaluate(() => ({ tagButtons: document.querySelectorAll('[data-testid^="button-explorer-tag-"]').length, cards: document.querySelectorAll('.grid a[href^="/category/"]').length, desc: document.body.innerText.match(/Discover and explore[^\n]+/)?.[0], toggle: document.querySelector('[data-testid="button-explorer-tags-toggle"]')?.textContent }));
  // Keyboard: focus the chip before HLS, Tab onto HLS, press Space.
  const ids = await page.$$eval('[data-testid^="button-explorer-tag-"]', els => els.map(e => e.dataset.testid));
  const idx = ids.indexOf("button-explorer-tag-hls");
  if (idx < 1) throw new Error("hls not in visible set: " + ids.join(","));
  await page.locator(`[data-testid="${ids[idx - 1]}"]`).focus();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => ({ id: document.activeElement?.dataset?.testid, focusVisible: document.activeElement?.matches(":focus-visible"), outline: getComputedStyle(document.activeElement).outlineStyle + " " + getComputedStyle(document.activeElement).outlineWidth, boxShadow: getComputedStyle(document.activeElement).boxShadow.slice(0, 60) }));
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  const hlsBtn = page.locator('[data-testid="button-explorer-tag-hls"]');
  await hlsBtn.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/h587/shots/h01-hls-selected-${system}-${w}.png` });
  const cardsJs = () => [...document.querySelectorAll("span")].filter(sp => /^\d+ match(es)?$/.test(sp.textContent.trim())).map(sp => {
      let el = sp; while (el && !el.querySelector('a[href^="/category/"]')) el = el.parentElement;
      return { name: el.querySelector('a[href^="/category/"]').textContent.trim(), matches: Number(sp.textContent.trim().split(" ")[0]), card: el };
    });
  const after = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("span")].filter(sp => /^\d+ match(es)?$/.test(sp.textContent.trim())).map(sp => {
      let el = sp; while (el && !el.querySelector('a[href^="/category/"]')) el = el.parentElement;
      el = el.parentElement.closest("div.grid > *") || el; el.setAttribute("data-h01-card", "1");
      return { name: el.querySelector('a[href^="/category/"]').textContent.trim(), matches: Number(sp.textContent.trim().split(" ")[0]) };
    });
    const total = document.querySelectorAll('[data-h01-card]').length;
    return { pressed: document.querySelector('[data-testid="button-explorer-tag-hls"]').getAttribute("aria-pressed"), cards, nameOnly: (document.body.innerText.match(/matches category name/g) || []).length };
  });
  // Card shows subcategories expanded by default; collapse then re-expand via keyboard.
  const tog = page.locator('[data-h01-card] button[aria-label^="Collapse "]').first();
  let expanded = null;
  if (await tog.count()) { const hnd = await tog.elementHandle(); await hnd.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(250); const collapsed = await hnd.getAttribute("aria-expanded"); await page.keyboard.press("Enter"); await page.waitForTimeout(250); expanded = { afterFirstEnter: collapsed, afterSecondEnter: await hnd.getAttribute("aria-expanded"), focusVisible: await hnd.evaluate(e => e.matches(":focus-visible")) }; }
  const firstCard = page.locator('[data-h01-card]').first();
  await firstCard.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/h587/shots/h01-hls-card-${system}-${w}.png` });
  const preview = await firstCard.evaluate(el => [...el.querySelectorAll('a[href^="http"]')].slice(0, 3).map(a => a.getAttribute("href")));
  const ok = after.cards.every(c => expect[c.name] === c.matches) && after.cards.length === Object.keys(expect).length;
  const ca = page.locator("button", { hasText: "Clear all" });
  await ca.first().click();
  await page.waitForTimeout(400);
  const cleared = await page.evaluate(() => ({ cards: document.querySelectorAll('.grid a[href^="/category/"]').length, pressed: document.querySelector('[data-testid="button-explorer-tag-hls"]').getAttribute("aria-pressed"), matchLabels: (document.body.innerText.match(/\d+ match(es)?/g) || []).length }));
  const previewIsHls = preview.length > 0 && preview.every(h => hls.some(x => x.r.url === h));
  console.log(JSON.stringify({ system, w, before, hlsIndex: idx, focused, after, matchesEqualTruth: ok, expandedAfterEnter: expanded, preview, previewIsHls, cleared }));
  await ctx.close();
}
await browser.close();
