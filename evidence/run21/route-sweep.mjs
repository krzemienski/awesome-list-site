import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const ROUTES = ['/', '/login', '/register', '/forgot-password', '/about', '/advanced', '/submit', '/journeys', '/search?q=ffmpeg', '/settings', '/settings/theme', '/terms', '/privacy', '/categories', '/category/intro-learning', '/subcategory/smart-tv-players', '/resource/185380', '/recommendations', '/bookmarks', '/profile', '/nope-404'];
const browser = await chromium.launch({ executablePath: EXEC });
const page = await (await browser.newContext()).newPage();
const errs = [];
page.on('pageerror', e => errs.push(page.url() + ' :: ' + String(e).slice(0, 150)));
for (const r of ROUTES) {
  await page.goto('http://localhost:3001' + r, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const text = (await page.locator('main, #root').first().innerText().catch(() => '')).trim();
  console.log(r, '->', text ? 'OK(' + text.slice(0, 40).replace(/\n/g, ' ') + ')' : 'EMPTY');
}
console.log('pageerrors:', JSON.stringify(errs, null, 1));
await browser.close();
