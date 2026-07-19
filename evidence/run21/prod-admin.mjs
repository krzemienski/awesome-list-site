import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome' });
const page = await (await browser.newContext()).newPage();
await page.goto('https://awesome.video/admin', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
console.log('prod url:', page.url());
await browser.close();
