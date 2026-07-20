import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
const reqs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
page.on('request', r => { const u = r.url(); if (u.includes('/api/')) reqs.push(r.method() + ' ' + u.replace(BASE, '')); });

const login = await page.request.post(BASE + '/api/auth/local/login', {
  data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD },
});
console.log('login:', login.status());

await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1500);

const genBtn = page.locator('[data-testid="button-generate-recommendations"]');
const genVisible = await genBtn.count();
console.log('generate button count:', genVisible);
if (genVisible) {
  await genBtn.first().click();
  // real Claude call — up to ~30s
  await page.waitForSelector('[data-testid^="feedback-"], text=/Was this helpful/i', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

const mainText = await page.locator('main').innerText().catch(() => '');
const feedbackBtns = await page.locator('[data-testid^="feedback-"]').count();
const helpfulRows = (mainText.match(/Was this helpful\?/g) || []).length;
const externalBadges = await page.locator('main :text-is("External")').count();
const recTitles = await page.locator('main a[href^="/resource/"]').count();
const corpusFetched = reqs.some(u => u.includes('/api/awesome-list') && !u.includes('/nav'));
await page.screenshot({ path: '/tmp/r06-home-authed-recs.png', fullPage: false });
console.log(JSON.stringify({ feedbackBtns, helpfulRows, externalBadges, resourceLinks: recTitles, corpusFetched, pageErrors: errs, recApiCalls: reqs.filter(r => r.includes('/recommendations')) }, null, 2));
await browser.close();
