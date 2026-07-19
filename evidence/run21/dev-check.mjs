import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const authReqs = [];
page.on('request', r => { if (r.url().includes('/api/auth/user')) authReqs.push(r.url()); });
await page.goto('http://localhost:5000/category/intro-learning', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('a[href^="/resource/"]', { timeout: 20000 });
await page.waitForTimeout(2000);
console.log('auth requests:', authReqs.length);
console.log('page errors:', errors);
// check header rendered + sidebar
console.log('h1:', await page.locator('h1').first().textContent());
// guarded route: profile logged-out should redirect to login
await page.goto('http://localhost:5000/profile', { waitUntil: 'domcontentloaded' });
await page.waitForURL(/\/login/, { timeout: 10000 });
console.log('profile redirect OK ->', page.url());
// admin logged out shows sign-in prompt, no crash
await page.goto('http://localhost:5000/admin', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="link-admin-login"], [data-testid="text-admin-forbidden"]', { timeout: 10000 });
console.log('admin guard OK');
console.log('total errors:', errors);
await browser.close();
