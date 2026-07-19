import { chromium } from 'playwright';
const EXEC = process.env.CHROMIUM_PATH || '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const URLS = [
  'https://awesome.video/category/intro-learning',
  'https://awesome.video/category/encoding-codecs',
  'https://awesome.video/subcategory/smart-tv-players',
];
const browser = await chromium.launch({ executablePath: EXEC });
for (const url of URLS) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // cache disabled via CDP
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // wait until real resource content: a card link to /resource/ appears
  let contentMs = null;
  try {
    await page.waitForSelector('a[href^="/resource/"], [data-testid^="card-resource"]', { timeout: 20000 });
    contentMs = Date.now() - t0;
  } catch { contentMs = 'TIMEOUT'; }
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { ttfb: nav?.responseStart, dcl: nav?.domContentLoadedEventEnd, fcp: fcp?.startTime };
  });
  console.log(JSON.stringify({ url, contentMs, ...perf }));
  await ctx.close();
}
await browser.close();
