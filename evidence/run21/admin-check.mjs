import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome' });
const page = await (await browser.newContext()).newPage();
page.on('pageerror', e => console.log('ERR', e));
page.on('response', r => { if (r.url().includes('/api/auth')) console.log('resp', r.status(), r.url()); });
await page.goto('http://localhost:5000/admin', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
console.log(await page.locator('#root').innerText().then(t=>t.slice(0,500)));
await browser.close();
