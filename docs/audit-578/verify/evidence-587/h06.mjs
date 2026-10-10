import { chromium } from "playwright";
const B = process.env.B || "http://127.0.0.1:5000";
const EXE = "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const out = [];
for (const [system, w] of [["editorial", 1440], ["brutalist", 390]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
  await ctx.addInitScript(s => { localStorage.setItem("ds-system", s); localStorage.setItem("analytics-consent", "denied"); }, system);
  const page = await ctx.newPage();
  const hits = { detail: 0, related: 0 };
  // A) detail 503 on every attempt.
  await page.route(/\/api\/resources\/184739$/, r => { hits.detail++; r.fulfill({ status: 503, contentType: "application/json", body: '{"message":"Service unavailable"}' }); });
  await page.goto(B + "/resource/184739");
  await page.waitForSelector('[data-testid="resource-unavailable"]', { timeout: 60000 });
  await page.waitForTimeout(1500);
  const a = await page.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, alert: document.querySelector('[data-testid="resource-unavailable"] [role="alert"]')?.textContent, removedCopy: /removed|Not Found/i.test(document.querySelector("main")?.innerText || document.body.innerText), title: document.title, robots: [...document.querySelectorAll('meta[name="robots"]')].map(m => m.content) }));
  await page.screenshot({ path: `/tmp/h587/shots/h06-detail-503-${system}-${w}.png` });
  const detailAttempts = hits.detail;
  await page.unroute(/\/api\/resources\/184739$/);
  // B) related 500 while detail is genuine; click Retry on the detail card.
  await page.route(/\/api\/resources\/184739\/related/, r => { hits.related++; r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"boom"}' }); });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.waitForSelector("h1", { timeout: 20000 });
  await page.getByText("Related resources are temporarily unavailable.").waitFor({ timeout: 60000 });
  const b = await page.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, emptyClaim: !!document.querySelector('[data-testid="related-empty-state"]'), relatedErr: document.body.innerText.includes("Related resources are temporarily unavailable.") }));
  const relErr = page.getByText("Related resources are temporarily unavailable.");
  await relErr.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/h587/shots/h06-related-500-${system}-${w}.png` });
  const relatedAttempts = hits.related;
  await page.unroute(/\/api\/resources\/184739\/related/);
  await page.getByRole("button", { name: "Retry related resources" }).click();
  await page.waitForSelector('[data-testid^="related-resource-"], [data-testid="related-empty-state"]', { timeout: 60000 });
  const c = await page.evaluate(() => ({ relatedCards: document.querySelectorAll('[data-testid^="related-resource-"]').length, relatedErr: document.body.innerText.includes("Related resources are temporarily unavailable.") }));
  await page.locator('[data-testid^="related-resource-"]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/h587/shots/h06-related-restored-${system}-${w}.png` });
  // D) offline: SPA-navigate to another resource while offline, then reconnect + Retry.
  await ctx.setOffline(true);
  await page.evaluate(() => { history.pushState(null, "", "/resource/185020"); dispatchEvent(new PopStateEvent("popstate")); });
  await page.waitForSelector('[data-testid="resource-offline"], [data-testid="resource-unavailable"]', { timeout: 60000 });
  const d = await page.evaluate(() => ({ offline: !!document.querySelector('[data-testid="resource-offline"]'), unavailable: !!document.querySelector('[data-testid="resource-unavailable"]'), text: (document.querySelector('[data-testid="resource-offline"]')?.innerText || "").slice(0, 160) }));
  await page.screenshot({ path: `/tmp/h587/shots/h06-offline-${system}-${w}.png` });
  await ctx.setOffline(false);
  await page.waitForTimeout(500);
  const retryBtn = page.locator('[data-testid="resource-offline-retry"]');
  if (await retryBtn.isVisible().catch(() => false)) await retryBtn.click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="resource-offline"]') && document.querySelector("h1") && !/unavailable|offline/i.test(document.querySelector("h1").textContent), null, { timeout: 60000 });
  const e = { h1: await page.locator("h1").first().textContent(), url: page.url().replace(B, "") };
  // C) genuine missing id.
  const resp = await page.goto(B + "/resource/99999999");
  await page.waitForSelector('[data-testid="resource-not-found"]', { timeout: 60000 });
  const f = { docStatus: resp.status(), h1: await page.locator("h1").first().textContent(), retryButton: await page.getByRole("button", { name: "Retry", exact: true }).count() };
  await page.screenshot({ path: `/tmp/h587/shots/h06-missing-${system}-${w}.png` });
  out.push({ system, w, detail503: { ...a, attempts: detailAttempts }, related500: { ...b, attempts: relatedAttempts }, relatedRestored: c, offline: d, reconnected: e, missing: f });
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
