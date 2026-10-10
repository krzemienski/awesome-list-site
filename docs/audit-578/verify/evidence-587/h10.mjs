import { chromium } from "playwright";
const B = "http://127.0.0.1:5000";
const EXE = "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const rows = [];
for (const system of ["editorial", "terminal", "geist", "brutalist", "swiss"]) for (const w of [375, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(s => { localStorage.setItem("ds-system", s); localStorage.setItem("analytics-consent", "denied"); }, system);
  const page = await ctx.newPage();
  await page.goto(B + "/"); await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(1200);
  const home = await page.evaluate(() => Object.fromEntries(["standards-industry", "protocols-transport"].map(slug => {
    const a = [...document.querySelectorAll(`a[href="/category/${slug}"]`)].map(x => x.textContent.trim()).find(t => /^[^\w\s]/.test(t));
    return [slug, a ? [...a][0] : null];
  })));
  for (const [id, slug] of [[184739, "standards-industry"], [185020, "protocols-transport"]]) {
    await page.goto(`${B}/resource/${id}`); await page.locator('[data-testid="badge-category"]').first().waitFor({ timeout: 20000 });
    const chip = await page.locator('[data-testid="badge-category"]').first();
    const glyph = await chip.locator('span[aria-hidden="true"]').textContent();
    const label = await chip.innerText();
    const sys = await page.evaluate(() => document.documentElement.dataset.system);
    if ((system === "editorial" || system === "brutalist") || w === 375) await chip.screenshot({ path: `/tmp/h587/shots/h10-${id}-${system}-${w}.png` });
    if (system === "editorial" || system === "brutalist") await page.screenshot({ path: `/tmp/h587/shots/h10-page-${id}-${system}-${w}.png` });
    rows.push({ system, appliedSystem: sys, w, id, slug, chipGlyph: glyph, chipLabel: label.replace(/\s+/g, " "), homeGlyph: home[slug], match: glyph === home[slug] });
  }
  await ctx.close();
}
for (const r of rows) console.log(JSON.stringify(r));
console.log("ALL_MATCH", rows.every(r => r.match && r.appliedSystem === r.system), rows.length);
await browser.close();
