import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 8*1024*1024/8, uploadThroughput: 2*1024*1024/8 });
const t0 = Date.now();
await page.goto('http://localhost:3001/category/intro-learning', { waitUntil: 'commit' });
const seen = {};
for (let i = 0; i < 40; i++) {
  const s = await page.evaluate(() => {
    const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const link = document.querySelector('a[href^="/resource/"]');
    const card = document.querySelector('[data-testid^="card-resource"]');
    return { linkVis: vis(link), cardVis: vis(card), rootChildren: document.getElementById('root')?.children.length ?? -1, bodyText: (document.body?.innerText || '').length };
  }).catch(() => null);
  if (s) {
    const t = Date.now() - t0;
    if (s.linkVis && !seen.link) { seen.link = t; console.log('linkVisible@', t); }
    if (s.cardVis && !seen.card) { seen.card = t; console.log('cardVisible@', t); }
    if (i % 5 === 0) console.log(t, JSON.stringify(s));
    if (seen.card) break;
  }
  await new Promise(r => setTimeout(r, 150));
}
await browser.close();
