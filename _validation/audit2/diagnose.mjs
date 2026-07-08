import { chromium } from 'playwright';
import fs from 'fs';

const paths = JSON.parse(fs.readFileSync('_validation/audit2/fails.json', 'utf8'));
const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let pageErrs = [];
page.on('pageerror', e => pageErrs.push(String(e).slice(0, 200)));

const out = [];
for (const p of paths) {
  pageErrs = [];
  try {
    await page.goto('http://localhost:5000' + p, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2800);
    const info = await page.evaluate(() => ({
      finalUrl: location.pathname + location.search,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      h2: document.querySelector('h2')?.textContent?.trim() || '',
      badge: document.querySelector('[data-testid="text-results-count"]')?.textContent?.trim() || '',
      hasForm: !!document.querySelector('form'),
      bodyLen: document.body.innerText.length,
      snippet: document.body.innerText.replace(/\s+/g, ' ').slice(0, 220),
    }));
    const rec = { path: p, ...info, pageErrs };
    out.push(rec);
    console.log(JSON.stringify(rec));
  } catch (e) {
    console.log(JSON.stringify({ path: p, error: String(e).slice(0, 150) }));
  }
}
fs.writeFileSync('_validation/audit2/diagnose.json', JSON.stringify(out, null, 1));
await browser.close();
