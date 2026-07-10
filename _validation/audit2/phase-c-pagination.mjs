import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const out = [];
const log = (id, pass, detail) => { out.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };

await page.goto('http://localhost:5000/category/encoding-codecs', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => (document.querySelector('[data-testid="text-results-count"]')?.textContent || '').includes('325'), { timeout: 15000 });
await page.waitForTimeout(800);

const grab = () => page.evaluate(() => ({
  pageLabel: (document.body.innerText.match(/Page \d+ of \d+/) || [''])[0],
  cardCount: document.querySelectorAll('[data-testid^="card-resource-"]').length,
  firstTitle: document.querySelector('[data-testid^="card-resource-"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60) || '',
  badge: document.querySelector('[data-testid="text-results-count"]')?.textContent?.trim() || '',
}));

let p = await grab();
log('C5-page1', p.pageLabel === 'Page 1 of 14' && p.cardCount === 24 && /325 of 325/.test(p.badge), `label="${p.pageLabel}" cards=${p.cardCount} badge="${p.badge}" first="${p.firstTitle}"`);
const seen = [p.firstTitle];
for (let i = 2; i <= 4; i++) {
  await page.click('[data-testid="button-next-page"]');
  await page.waitForFunction((prev) => {
    const t = document.querySelector('[data-testid^="card-resource-"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60) || '';
    return t && t !== prev;
  }, seen[seen.length - 1], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  p = await grab();
  const distinct = !seen.includes(p.firstTitle);
  seen.push(p.firstTitle);
  log(`C5-page${i}`, p.pageLabel === `Page ${i} of 14` && p.cardCount === 24 && distinct, `label="${p.pageLabel}" cards=${p.cardCount} distinct=${distinct} first="${p.firstTitle}"`);
}
// jump to last page: click Next until disabled or label = 14 (14 pages total, at page 4 now → 10 clicks)
for (let i = 0; i < 10; i++) { await page.click('[data-testid="button-next-page"]').catch(() => {}); await page.waitForTimeout(500); }
p = await grab();
const lastCards = 325 - 24 * 13; // 13 remainder on page 14
log('C5-last-page', p.pageLabel === 'Page 14 of 14' && p.cardCount === lastCards, `label="${p.pageLabel}" cards=${p.cardCount} (expect ${lastCards})`);
const nextDisabled = await page.evaluate(() => document.querySelector('[data-testid="button-next-page"]')?.disabled ?? null);
log('C5-next-disabled-at-end', nextDisabled === true, `next.disabled=${nextDisabled}`);

fs.writeFileSync('_validation/audit2/phaseC-pagination.json', JSON.stringify(out, null, 1));
console.log(`\nPAGINATION: ${out.filter(o => o.pass).length}/${out.length} pass`);
await browser.close();
