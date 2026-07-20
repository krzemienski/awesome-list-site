import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

const measure = (sel) => page.$$eval(sel, els => els.map(el => {
  const cs = getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
  const lines = Math.round(el.getBoundingClientRect().height / lh);
  return { text: (el.textContent||'').slice(0,60), lines, h: Math.round(el.getBoundingClientRect().height), lh: Math.round(lh) };
}));

await page.goto(BASE + '/journeys', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForSelector('[data-testid^="link-journey-title-"]', { timeout: 20000 });
const cards = await measure('[data-testid^="link-journey-title-"]');
console.log('/journeys card titles @375:');
for (const c of cards) console.log(JSON.stringify(c));

// journey detail: pick first journey link
const firstHref = await page.$eval('[data-testid^="link-journey-title-"]', a => a.getAttribute('href'));
await page.goto(BASE + firstHref, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2000);
const stepTitles = await measure('[data-testid^="text-step-title"], h3');
console.log('\n' + firstHref + ' step titles @375:');
for (const c of stepTitles) console.log(JSON.stringify(c));
// also resource rows inside steps
const resTitles = await measure('[data-testid^="link-step-resource"], .font-medium');
console.log('\nstep resource titles @375 (first 15):');
for (const c of resTitles.slice(0,15)) console.log(JSON.stringify(c));
await page.screenshot({ path: '/tmp/r10-journeys-375.png' });
await browser.close();
