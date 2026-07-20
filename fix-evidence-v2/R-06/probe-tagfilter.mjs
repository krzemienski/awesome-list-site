import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const reqs = [];
const errs = [];
page.on('request', r => { const u = r.url(); if (u.includes('/api/')) reqs.push(u.replace(BASE, '')); });
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).slice(0, 200)));

await page.goto(BASE + '/?tags=open-source', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('[data-testid="list-categories"], [data-testid="empty-categories"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);

const corpusFetched = reqs.some(u => u.startsWith('/api/awesome-list') && !u.includes('/nav'));
const navFetched = reqs.some(u => u.includes('/api/awesome-list/nav'));
const mainText = await page.locator('main').innerText().catch(() => '');
const heading = mainText.split('\n').slice(0, 6).join(' | ');
const counts = (mainText.match(/\d+\s+resources/gi) || []).slice(0, 12);
const catLinks = await page.locator('[data-testid="list-categories"] a[href^="/category/"]').count();
const firstHref = catLinks ? await page.locator('[data-testid="list-categories"] a[href^="/category/"]').first().getAttribute('href') : null;
await page.screenshot({ path: '/tmp/r06-home-tagfilter-url.png' });
console.log(JSON.stringify({ corpusFetched, navFetched, heading, counts, catLinks, firstHref, apiRequests: reqs, consoleErrors: errs }, null, 2));
await browser.close();
