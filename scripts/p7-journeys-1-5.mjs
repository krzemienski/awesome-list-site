import { chromium } from 'playwright';
const BASE = 'https://awesome.video';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const id of [1, 2, 3, 4, 5]) {
  await page.goto(`${BASE}/journey/${id}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.slice(0, 60),
    stepCards: document.querySelectorAll('[data-testid^="card-step-"]').length,
    resourceLinks: document.querySelectorAll('[data-testid^="link-resource-"]').length,
    bodyLen: document.body.innerText.length,
  }));
  console.log(`/journey/${id}:`, JSON.stringify(data));
}
await browser.close();
