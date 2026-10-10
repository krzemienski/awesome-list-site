import { chromium } from "playwright";
const B = "http://127.0.0.1:5000";
const EXE = "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const ids = page => page.$$eval('[data-testid^="card-resource-"]', els => els.map(e => +e.getAttribute("data-testid").replace("card-resource-", "")).slice(0, 5));
const url = page => page.url().replace(B, "");
for (const [system, w] of [["editorial", 1440], ["brutalist", 390]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
  await ctx.addInitScript(s => { localStorage.setItem("ds-system", s); localStorage.setItem("analytics-consent", "denied"); }, system);
  const page = await ctx.newPage();
  const log = [];
  // H02: pagination + Back keep query.
  await page.goto(B + "/search?q=video&category=encoding-codecs&sort=name-asc");
  await page.waitForSelector('[data-testid="search-results-grid"] [data-testid^="card-resource-"]');
  await page.waitForTimeout(600);
  const p1 = await ids(page);
  await page.locator('[data-testid="button-search-next"]').click();
  await page.waitForFunction(() => /page=2/.test(location.search));
  await page.waitForTimeout(1200);
  const p2 = { url: url(page), ids: await ids(page), count: await page.locator('[data-testid="text-result-count"]').textContent() };
  await page.goBack(); await page.waitForTimeout(1200);
  const back = { url: url(page), ids: await ids(page), count: await page.locator('[data-testid="text-result-count"]').textContent() };
  await page.goForward(); await page.waitForTimeout(1200);
  const fwd = { url: url(page), ids: await ids(page) };
  log.push({ h02: { p1, p2, back, backIdsEqP1: JSON.stringify(back.ids) === JSON.stringify(p1), fwd } });
  // H05: direct loads of compatibility aliases.
  for (const a of ["/subsubcategory/quality-testing?page=2", "/category/players-clients/mobile-web-players?kind=libraries&sortBy=name-desc", "/explore?category=encoding-codecs&sort=name-asc", "/explore?q=ffmpeg&tags=open-source", "/category/encoding-codecs/nope-xyz"]) {
    const resp = await page.goto(B + a); await page.waitForTimeout(1800);
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    const count = await page.evaluate(() => document.querySelector('[data-testid="text-result-count"]')?.textContent || (document.querySelector('[data-testid="taxonomy-results-region"]')?.innerText.match(/Showing[^\n]{0,60}|Page \d+ of \d+[^\n]{0,40}/) || [null])[0]);
    log.push({ alias: a, docStatus: resp.status(), final: url(page), h1: h1?.trim().slice(0, 60), count, first: await ids(page) });
    if (a.startsWith("/explore?category")) await page.screenshot({ path: `/tmp/h587/shots/h05-explore-redirect-${system}-${w}.png` });
    if (a.startsWith("/subsubcategory")) await page.screenshot({ path: `/tmp/h587/shots/h05-subsub-page2-${system}-${w}.png` });
  }
  // H05 SPA: navigate client-side to an alias from home, then Back.
  await page.goto(B + "/"); await page.waitForTimeout(1500);
  await page.evaluate(() => { history.pushState(null, "", "/subsubcategory/quality-testing?page=2"); dispatchEvent(new PopStateEvent("popstate")); });
  await page.waitForTimeout(2500);
  const spa1 = { url: url(page), first: await ids(page) };
  await page.evaluate(() => { history.pushState(null, "", "/explore?category=encoding-codecs&sort=name-asc"); dispatchEvent(new PopStateEvent("popstate")); });
  await page.waitForTimeout(2500);
  const spa2 = { url: url(page), first: await ids(page), len: await page.evaluate(() => history.length) };
  await page.goBack(); await page.waitForTimeout(2000);
  const b1 = url(page);
  await page.goBack(); await page.waitForTimeout(2000);
  const b2 = url(page);
  await page.goForward(); await page.waitForTimeout(2000);
  const f1 = url(page);
  await page.evaluate(() => { history.pushState(null, "", "/category/encoding-codecs/nope-xyz"); dispatchEvent(new PopStateEvent("popstate")); });
  await page.waitForTimeout(2500);
  const spaUnknown = { url: url(page), h1: (await page.locator("h1").first().textContent()).trim() };
  log.push({ spa: { spa1, spa2, back1: b1, back2: b2, forward1: f1, spaUnknown } });
  console.log(system, w, JSON.stringify(log, null, 1));
  await ctx.close();
}
await browser.close();
