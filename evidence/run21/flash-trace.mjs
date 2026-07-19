import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const url = process.argv[2] || 'http://localhost:5000/category/intro-learning';
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0,200)); });
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 8*1024*1024/8, uploadThroughput: 2*1024*1024/8 });
const t0 = Date.now();
await page.goto(url, { waitUntil: 'commit' });
let seenLink = 0, seenCard = 0, disappearances = 0, wasVisible = false;
for (let i = 0; i < 200; i++) {
  const s = await page.evaluate(() => {
    const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const link = document.querySelector('#ssr-seo-hold a[href^="/resource/"], #root a[href^="/resource/"], #ssr-seo-content a[href^="/resource/"]');
    const card = document.querySelector('[data-testid^="card-resource"]');
    const overlay = !!document.getElementById('ssr-seo-hold');
    const anyContent = vis(link) || vis(card);
    return { anyContent, cardVis: vis(card), overlay, bodyText: (document.body?.innerText || '').length };
  }).catch(() => null);
  if (s) {
    const t = Date.now() - t0;
    if (s.anyContent && !seenLink) { seenLink = t; console.log('contentVisible@', t); }
    if (wasVisible && !s.anyContent) { disappearances++; console.log('CONTENT DISAPPEARED @', t, JSON.stringify(s)); }
    wasVisible = s.anyContent;
    if (s.cardVis && !seenCard) { seenCard = t; console.log('cardVisible@', t, 'overlayStill=', s.overlay); }
    if (seenCard && !s.overlay) { console.log('overlayRemoved@', Date.now() - t0); break; }
  }
  await new Promise(r => setTimeout(r, 60));
}
console.log(JSON.stringify({ seenLink, seenCard, disappearances }));
await browser.close();
