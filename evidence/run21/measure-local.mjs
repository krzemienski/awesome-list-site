import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const URLS = [
  'http://localhost:3001/category/intro-learning',
  'http://localhost:3001/category/encoding-codecs',
  'http://localhost:3001/subcategory/smart-tv-players',
];
const browser = await chromium.launch({ executablePath: EXEC });
for (const url of URLS) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const reqStarts = {};
  const navStart = Date.now();
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/api/auth/user') || u.includes('/api/awesome-list')) {
      reqStarts[u.split('3001')[1]] = Date.now() - navStart;
    }
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  let contentMs;
  try {
    await page.waitForSelector('a[href^="/resource/"], [data-testid^="card-resource"]', { timeout: 20000 });
    contentMs = Date.now() - t0;
  } catch { contentMs = 'TIMEOUT'; }
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { ttfb: Math.round(nav?.responseStart), dcl: Math.round(nav?.domContentLoadedEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null };
  });
  console.log(JSON.stringify({ url, contentMs, ...perf, reqStarts }));
  await ctx.close();
}
await browser.close();
