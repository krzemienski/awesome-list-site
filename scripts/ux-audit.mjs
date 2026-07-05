import { chromium } from 'playwright-core';
import fs from 'fs';

const EXEC = '/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const OUT = 'screenshots/ux-audit';
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = { mobile: 390, tablet: 768, desktop: 1440 };
const HEIGHTS = { mobile: 844, tablet: 1024, desktop: 900 };

const ROUTES = [
  ['home', '/'],
  ['category-encoding', '/category/encoding-codecs'],
  ['subcategory', '/subcategory/community-groups'],
  ['journeys', '/journeys'],
  ['journey-6', '/journey/6'],
  ['advanced', '/advanced'],
  ['search', '/search?q=ffmpeg'],
  ['recommendations', '/recommendations'],
  ['submit', '/submit'],
  ['login', '/login'],
  ['about', '/about'],
  ['settings-theme', '/settings/theme'],
  ['resource-detail', '/resource/186811'],
];

const bp = process.argv[2];
if (!WIDTHS[bp]) { console.error('usage: node ux-audit.mjs <mobile|tablet|desktop> [start] [count]'); process.exit(1); }
const start = parseInt(process.argv[3] || '0', 10);
const count = parseInt(process.argv[4] || String(ROUTES.length), 10);
const slice = ROUTES.slice(start, start + count);

const browser = await chromium.launch({ executablePath: EXEC });
const results = [];
for (const [name, route] of slice) {
  const ctx = await browser.newContext({ viewport: { width: WIDTHS[bp], height: HEIGHTS[bp] } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));
  let httpStatus = 0;
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 15000 });
    httpStatus = resp ? resp.status() : 0;
  } catch (e) {
    errors.push('NAV: ' + String(e).slice(0, 120));
  }
  await page.waitForTimeout(1800);
  // detect horizontal overflow
  const overflow = await page.evaluate((w) => {
    const de = document.documentElement;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, overflow: de.scrollWidth > w + 2 };
  }, WIDTHS[bp]).catch(() => ({ overflow: 'n/a' }));
  const file = `${OUT}/${name}_${bp}.jpg`;
  await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 70 }).catch((e) => errors.push('SHOT: ' + e));
  results.push({ name, route, httpStatus, overflow, errors });
  console.log(`${name.padEnd(20)} ${bp.padEnd(8)} http=${httpStatus} overflowX=${JSON.stringify(overflow.overflow)} errs=${errors.length}${errors.length ? ' :: ' + errors.join(' | ').slice(0, 160) : ''}`);
  await ctx.close();
}
fs.writeFileSync(`${OUT}/_report_${bp}.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log('DONE ' + bp);
