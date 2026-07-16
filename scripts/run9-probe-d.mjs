import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
// login
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('[data-testid="input-email"], input[type="email"]', 'admin@example.com');
await page.fill('[data-testid="input-password"], input[type="password"]', process.env.ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
console.log('login url:', page.url());

// BUG-016 advanced metrics
await page.goto(BASE + '/advanced', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
const mt = await page.$('[role="tab"]:has-text("Metrics")');
if (mt) { await mt.click(); await page.waitForTimeout(2500); }
const panel = await page.evaluate(() => (document.querySelector('[role="tabpanel"][data-state="active"]')?.innerText || '').slice(0, 600));
console.log('BUG-016 metrics panel:', JSON.stringify(panel));

// BUG-007 feedback widget while logged in (home)
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
const widget = await page.evaluate(() => {
  const hits = [];
  for (const el of document.querySelectorAll('*')) {
    const t = (el.textContent || '');
    if (el.children.length === 0 && /share your feedback/i.test(t)) hits.push(el.tagName);
  }
  const scripts = [...document.querySelectorAll('script[src*="replit-cdn"]')].map(s => s.src);
  const iframe = [...document.querySelectorAll('iframe')].map(f => f.src).slice(0, 3);
  return { hits: hits.slice(0, 3), scripts, iframe };
});
console.log('BUG-007 widget presence:', JSON.stringify(widget));

// BUG-021 logged-in journeys badges
await page.goto(BASE + '/journeys', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const badges = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href^="/journey/"]')];
  const seen = new Set(); const out = [];
  for (const l of links) {
    const card = l.closest('div[class*="rounded"], div[class*="card"]') || l;
    if (seen.has(card)) continue; seen.add(card);
    const m = (card.innerText || '').match(/\d+\s*steps/gi) || [];
    out.push({ t: (card.innerText || '').split('\n').filter(Boolean).slice(1, 2).join('').slice(0, 45), m });
  }
  return out.slice(0, 8);
});
console.log('BUG-021 logged-in badges:', JSON.stringify(badges));
await browser.close();
