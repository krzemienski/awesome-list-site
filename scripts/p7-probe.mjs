import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'https://awesome.video';
const OUT = '/tmp/p7-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const consoleErrs = [];
page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });

async function probe(path, name) {
  consoleErrs.length = 0;
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const allAnchors = document.querySelectorAll('a[href]');
    const journeyAnchors = document.querySelectorAll('a[href^="/journey/"]');
    const resourceAnchors = document.querySelectorAll('a[href^="/resource/"]');
    const categoryAnchors = document.querySelectorAll('a[href^="/category/"]');
    const h2s = document.querySelectorAll('h2');
    const h1s = document.querySelectorAll('h1');
    const cardTestids = document.querySelectorAll('[data-testid^="card-journey-"], [data-testid^="category-card-"]');
    return {
      mainTextLen: main.innerText.length,
      allAnchors: allAnchors.length,
      journeyAnchors: journeyAnchors.length,
      resourceAnchors: resourceAnchors.length,
      categoryAnchors: categoryAnchors.length,
      h2s: h2s.length,
      h1s: h1s.length,
      cards: cardTestids.length,
      rootChildCount: document.getElementById('root')?.children?.length || 0,
    };
  });
  const shot = `${OUT}/${name}.png`;
  await page.screenshot({ path: shot, fullPage: false });
  console.log(`\n=== ${path} (${name}) ===`);
  console.log(JSON.stringify(data, null, 2));
  console.log('Console errors:', consoleErrs.slice(0, 3));
  return data;
}

await probe('/categories', 'categories');
await probe('/about', 'about');
await probe('/recommendations', 'recommendations');
await probe('/journeys', 'journeys');
for (const n of [6, 7, 8, 9, 10]) {
  await probe(`/journey/${n}`, `journey-${n}`);
}

await browser.close();
console.log('\nDone');