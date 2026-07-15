import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleMsgs = [];
const failedReqs = [];
page.on('console', m => { if (m.type() === 'error') consoleMsgs.push(m.text().slice(0, 200)); });
page.on('requestfailed', r => failedReqs.push(`${r.method()} ${r.url().slice(0,120)} :: ${r.failure()?.errorText}`));

// BUG-006: 404 page console errors
console.log('--- BUG-006: 404 page ---');
await page.goto(BASE + '/this-page-does-not-exist-xyz', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
console.log('console errors:', JSON.stringify(consoleMsgs, null, 1));
console.log('failed requests:', JSON.stringify(failedReqs, null, 1));

// BUG-002: feedback widget state on home
consoleMsgs.length = 0; failedReqs.length = 0;
console.log('--- BUG-002: feedback widget ---');
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
const widgetInfo = await page.evaluate(() => {
  const els = [...document.querySelectorAll('body *')].filter(e => {
    const t = (e.textContent || '');
    return t.includes('Share your feedback') && e.children.length < 15;
  });
  const iframes = [...document.querySelectorAll('iframe')].map(f => f.src.slice(0,100));
  const shadow = [...document.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => e.tagName);
  return { matches: els.length, iframes, shadowHosts: shadow, hasWidgetScript: !!document.querySelector('script[src*="feedback-widget"]') };
});
console.log(JSON.stringify(widgetInfo, null, 1));

// BUG-003: CSP on /admin (login first)
console.log('--- BUG-003: login + /admin CSP ---');
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('#email', 'admin@example.com');
await page.fill('input[type="password"]', 'Usmc12345!');
consoleMsgs.length = 0;
await page.click('button[type="submit"]');
await page.waitForURL('**/admin', { timeout: 30000 }).catch(()=>{});
await page.waitForTimeout(2000);
consoleMsgs.length = 0; failedReqs.length = 0;
await page.goto(BASE + '/admin', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
const cspErrors = consoleMsgs.filter(m => /Content Security Policy|CSP/i.test(m));
console.log('total console errors:', consoleMsgs.length, 'CSP violations:', cspErrors.length);
console.log(JSON.stringify(consoleMsgs.slice(0, 8), null, 1));

// BUG-005: Categories + Users tabs
console.log('--- BUG-005: admin tabs ---');
const tabs = await page.$$eval('[role="tab"], [data-testid^="tab-"]', els => els.map(e => ({ t: e.getAttribute('data-testid'), text: e.textContent?.trim().slice(0,20) })));
console.log('tab count:', tabs.length, JSON.stringify(tabs.map(x=>x.t)));
for (const t of ['tab-categories', 'tab-users']) {
  const el = page.locator(`[data-testid="${t}"]`);
  if (await el.count() === 0) { console.log(t, ': NOT FOUND'); continue; }
  await el.scrollIntoViewIfNeeded();
  await el.click();
  await page.waitForTimeout(1500);
  const state = await el.getAttribute('data-state');
  const panelVisible = await page.evaluate(() => {
    const p = document.querySelector('[role="tabpanel"][data-state="active"], [data-state="active"][role="tabpanel"]');
    return p ? p.textContent.trim().slice(0, 80) : null;
  });
  console.log(t, '-> data-state:', state, '| active panel snippet:', panelVisible);
}
await browser.close();
