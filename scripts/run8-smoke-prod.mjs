import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const browser = await chromium.launch({ executablePath: exePath });
for (const vp of [{ w: 1440, h: 900, name: 'desktop' }, { w: 375, h: 812, name: 'mobile' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const cats = await page.$$eval('a[href^="/category/"]', els => els.length);
  console.log(`[${vp.name}] home category links:`, cats);
  // search ffmpeg via API-backed search page
  await page.goto(BASE + '/search?q=ffmpeg', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const body = await page.evaluate(() => document.body.innerText.slice(0, 300));
  const hits = await page.$$eval('a[href^="/resource/"]', els => els.length);
  console.log(`[${vp.name}] /search?q=ffmpeg resource links:`, hits, '| snippet:', body.replace(/\n/g, ' ').slice(0, 120));
  await ctx.close();
}
// category page loads
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
const firstCat = await page.$eval('a[href^="/category/"]', el => el.getAttribute('href'));
await page.goto(BASE + firstCat, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);
const catRes = await page.$$eval('a[href^="/resource/"]', els => els.length);
console.log('category page', firstCat, 'resource links:', catRes);
// journey id page renders
await page.goto(BASE + '/journey/6', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);
console.log('/journey/6 h1:', await page.evaluate(() => document.querySelector('h1')?.textContent?.slice(0, 60)));
await browser.close();
