import { chromium } from 'playwright';

const exePath = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exePath });
const context = await browser.newContext();
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://awesome.video' });
const page = await context.newPage();

await page.goto('https://awesome.video/resource/186145', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('[data-testid="button-share"]', { timeout: 15000 });
await page.click('[data-testid="button-share"]');
await page.waitForTimeout(2000);

const toasts = await page.$$eval('[role="status"], li[data-state]', els => els.map(e => e.innerText.trim()).filter(Boolean));
const bodyHasCopied = await page.evaluate(() => /copied|Unable to share/i.test(document.body.innerText));
let clip = '';
try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch (e) { clip = 'READ_FAIL: ' + e.message; }

console.log(JSON.stringify({ toasts, bodyHasCopied, clipboard: clip }, null, 2));
await page.screenshot({ path: 'evidence/run5/share-toast-prod.png' });
await browser.close();
