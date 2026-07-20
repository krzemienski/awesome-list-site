import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

const measure = (sel) => page.$$eval(sel, els => els.map(el => {
  const cs = getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
  return { text: (el.textContent||'').slice(0,60), lines: Math.round(el.getBoundingClientRect().height / lh) };
}));

let worst = 0; const rows = [];
// journeys listing card titles
await page.goto(BASE + '/journeys', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForSelector('[data-testid^="link-journey-title-"]', { timeout: 20000 });
const cards = await measure('[data-testid^="link-journey-title-"]');
rows.push(['/journeys cards', cards]);

// all journey detail pages: step titles + step resource titles
const hrefs = await page.$$eval('[data-testid^="link-journey-title-"]', as => as.map(a => a.getAttribute('href')));
for (const h of hrefs) {
  await page.goto(BASE + h, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('[data-testid^="card-step-"]', { timeout: 20000 });
  const steps = await measure('[data-testid^="card-step-"] h3');
  const res = await measure('[data-testid^="link-resource-"] span.font-medium');
  rows.push([h + ' steps', steps], [h + ' resources', res]);
}
for (const [label, list] of rows) {
  const over = list.filter(x => x.lines > 2);
  worst = Math.max(worst, ...list.map(x => x.lines), 0);
  console.log(`${label}: n=${list.length} maxLines=${Math.max(...list.map(x=>x.lines),0)} over2=${over.length}`);
  for (const o of over) console.log('  OVER: ' + JSON.stringify(o));
}
console.log(`\nVERDICT: worst=${worst} → ${worst <= 2 ? 'PASS (all titles ≤2 lines @375px)' : 'FAIL'}`);
await page.goto(BASE + '/journey/7', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForSelector('[data-testid^="card-step-"]', { timeout: 20000 });
await page.screenshot({ path: '/tmp/r10-journey7-375.png', fullPage: false });
const card = await page.$('[data-testid="card-step-5"]');
if (card) { await card.scrollIntoViewIfNeeded(); await page.screenshot({ path: '/tmp/r10-journey7-step5-375.png' }); }
await browser.close();
