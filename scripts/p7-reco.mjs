import { chromium } from 'playwright';
const BASE = 'https://awesome.video';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/recommendations`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const data = await page.evaluate(() => {
  const allLinks = [...document.querySelectorAll('a[href^="/resource/"]')];
  return {
    resourceLinks: allLinks.length,
    resourceSample: allLinks.slice(0, 3).map(a => a.getAttribute('href')),
    bodyText: document.body.innerText.slice(0, 1500),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
