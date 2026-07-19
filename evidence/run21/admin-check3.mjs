import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome' });
const page = await (await browser.newContext()).newPage();
await page.goto('http://localhost:5000/admin', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
console.log('url:', page.url());
await browser.close();
