// Cold-load, network-throttled (100ms RTT / 8Mbps), waits for REACT-rendered
// resource cards ([data-testid^="card-resource"]) — SSR-injected HTML excluded.
import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const PAGES = ['/category/intro-learning', '/category/encoding-codecs', '/subcategory/smart-tv-players'];
const PASSES = 3;
const browser = await chromium.launch({ executablePath: EXEC });
for (let pass = 0; pass < PASSES; pass++) {
  for (const path of PAGES) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 8*1024*1024/8, uploadThroughput: 2*1024*1024/8 });
    const t0 = Date.now();
    await page.goto('http://localhost:3001' + path, { waitUntil: 'commit' });
    let cardsMs = null;
    try {
      await page.waitForSelector('[data-testid^="card-resource"]', { timeout: 25000 });
      cardsMs = Date.now() - t0;
    } catch { cardsMs = -1; }
    const nav = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0];
      const req = {}; let jsKB = 0, jsCount = 0;
      for (const r of performance.getEntriesByType('resource')) {
        if (r.name.includes('/api/awesome-list')) req.list = Math.round(r.startTime);
        if (r.name.includes('/api/auth/user')) req.auth = Math.round(r.startTime);
        if (r.name.endsWith('.js')) { jsCount++; jsKB += Math.round((r.transferSize||0)/1024); }
      }
      return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), jsCount, jsKB, req };
    });
    console.log(JSON.stringify({ pass, path, cardsMs, ...nav }));
    await ctx.close();
  }
}
await browser.close();
