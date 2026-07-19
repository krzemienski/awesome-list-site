import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const url = process.argv[2];
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0,150)); });
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 8*1024*1024/8, uploadThroughput: 2*1024*1024/8 });
const t0 = Date.now();
await page.goto(url, { waitUntil: 'commit' });
let removedAt = 0, sawOverlay = false;
for (let i = 0; i < 150; i++) {
  const s = await page.evaluate(() => ({ overlay: !!document.getElementById('ssr-seo-hold'), rootKids: document.getElementById('root')?.children.length ?? 0, h1: document.querySelector('#root h1')?.textContent || '' })).catch(() => null);
  if (s) { if (s.overlay) sawOverlay = true; if (sawOverlay && !s.overlay) { removedAt = Date.now() - t0; console.log('overlayRemoved@', removedAt, 'rootKids', s.rootKids, 'h1:', s.h1.slice(0,60)); break; } }
  await new Promise(r => setTimeout(r, 80));
}
console.log(JSON.stringify({ sawOverlay, removedAt, errs: errs.filter(e => !/favicon|gtag|analytics/i.test(e)) }));
await browser.close();
