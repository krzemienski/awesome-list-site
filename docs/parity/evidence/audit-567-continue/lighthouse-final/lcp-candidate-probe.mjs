import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome' });
for (const delayJs of [0, 1500]) {
const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true });
const p = await ctx.newPage();
if (delayJs) await p.route(/\/assets\/index-.*\.js$/, async (route) => { await new Promise(r => setTimeout(r, delayJs)); route.continue(); });
p.on('console', m => m.text().startsWith('LCP') && console.log(' ', m.text()));
await p.addInitScript(() => { new PerformanceObserver((l) => { for (const e of l.getEntries()) console.log('LCP', Math.round(e.startTime), 'size', e.size, e.element ? (e.element.className || e.element.tagName) : 'REMOVED', JSON.stringify((e.element?.textContent||'').slice(0,30))); }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l)=>{for(const e of l.getEntries()) console.log('LCP-paint', e.name, Math.round(e.startTime));}).observe({type:'paint', buffered:true}); });
await p.goto("http://127.0.0.1:5101/category/encoding-codecs", { waitUntil: "commit" });
await p.waitForSelector('p.taxonomy-description', { timeout: 30000 });
await p.waitForTimeout(2500);
await p.evaluate(() => document.body.click());
await p.waitForTimeout(300);
console.log('delayJs', delayJs, 'done');
await ctx.close();
}
await b.close();
