import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('#email', 'admin@example.com');
await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL('**/admin', { timeout: 20000 }).catch(()=>{});
await page.waitForSelector('[data-testid="tab-users"]', { timeout: 20000 });
await page.click('[data-testid="tab-users"]');
await page.waitForSelector('table', { timeout: 15000 });
await page.waitForTimeout(1500);
const rows = await page.locator('table tbody tr').allTextContents();
const re = /[a-z0-9._%+-]{2,}[a-z0-9]@[a-z0-9.-]+/gi;
for (const r of rows) {
  const m = r.match(re);
  if (m) console.log('MATCH:', JSON.stringify(m), 'IN ROW:', r.slice(0, 120));
}
console.log('total rows:', rows.length);
await browser.close();
