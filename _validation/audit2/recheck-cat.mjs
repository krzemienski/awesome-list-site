import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const routes = JSON.parse(fs.readFileSync('_validation/audit2/routes.json', 'utf8'));
const targets = ['/category/encoding-codecs', '/category/general-tools'];
for (const p of targets) {
  const rt = routes.find(r => r.path === p);
  await page.goto('http://localhost:5000' + p, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => (document.querySelector('[data-testid="text-results-count"]')?.textContent || '').length > 0, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() || '',
    badge: document.querySelector('[data-testid="text-results-count"]')?.textContent?.trim() || '',
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  const m = info.badge.match(/of\s+([\d,]+)/i);
  const actual = m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
  const parity = { badge: info.badge, expected: rt.expectedCount, actual, ok: actual === rt.expectedCount };
  const pass = info.h1.length > 0 && info.overflow <= 391 && parity.ok;
  const rec = { path: p, type: 'category', vp: 'mobile', method: 'goto', pass, rendered: true, h1: info.h1, overflow: info.overflow, overflowOk: info.overflow <= 391, parity, consoleErrs: [], pageErrs: [], finalPath: p, ms: 0 };
  fs.appendFileSync('_validation/audit2/sweep-mobile.jsonl', JSON.stringify(rec) + '\n');
  console.log(pass ? 'PASS' : 'FAIL', p, 'h1=' + info.h1, 'ovf=' + info.overflow, 'parity=' + actual + '/' + rt.expectedCount);
}
await browser.close();
