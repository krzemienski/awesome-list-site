import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', e => {
    window.__cspViolations.push({
      dir: e.violatedDirective, blockedURI: e.blockedURI,
      sourceFile: e.sourceFile, line: e.lineNumber,
      sample: (e.sample || '').slice(0, 120)
    });
  });
});
// home first
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
console.log('HOME violations:', JSON.stringify(await page.evaluate(() => window.__cspViolations), null, 1));
// login + admin
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('#email', 'admin@example.com');
await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL('**/admin', { timeout: 30000 }).catch(()=>{});
await page.goto(BASE + '/admin', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);
console.log('ADMIN violations:', JSON.stringify(await page.evaluate(() => window.__cspViolations), null, 1));
await browser.close();
