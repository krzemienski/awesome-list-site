import { chromium } from 'playwright';

const BASE = 'https://awesome.video';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const consoleAll = [];
page.on('console', m => consoleAll.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
const failures = [];
page.on('requestfailed', r => failures.push(`FAIL ${r.method()} ${r.url()} → ${r.failure()?.errorText}`));

await page.goto(`${BASE}/journey/6`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

const dump = await page.evaluate(() => {
  const root = document.getElementById('root');
  // Walk: get the body content area, find the actual route component
  const main = document.querySelector('main, [data-testid], .container, [role="main"]');
  const allH2 = [...document.querySelectorAll('h2')].map(h => h.textContent);
  const allStep = [...document.querySelectorAll('[data-testid^="card-step-"], [data-testid^="button-"], [data-testid^="link-resource-"]')].map(e => e.dataset.testid);
  const journeyStepButtons = [...document.querySelectorAll('button')].filter(b => /mark|complete|next|prev|step/i.test(b.textContent || '')).map(b => b.textContent?.slice(0,40));
  // Check the API responses captured
  return {
    rootChildren: root?.children?.length || 0,
    bodyText: document.body.innerText.slice(0, 2000),
    h2List: allH2,
    testIds: allStep,
    journeyStepButtons,
    mainInnerLen: main?.innerText?.length || 0,
  };
});
console.log('=== /journey/6 ===');
console.log(JSON.stringify(dump, null, 2));
console.log('\nConsole errors:');
consoleAll.filter(m => m.startsWith('[error]') || m.startsWith('[warning]')).forEach(m => console.log(m));
console.log('\nRequest failures:');
failures.forEach(f => console.log(f));

await browser.close();
