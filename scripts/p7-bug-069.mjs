import { chromium } from 'playwright';
const BASE = 'https://awesome.video';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/journey/6`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const data = await page.evaluate(() => {
  // Find any element that looks like a step nav (numbered step indicator or list of titles)
  const stepCards = [...document.querySelectorAll('[data-testid^="card-step-"]')];
  const stepHeadings = stepCards.map(c => {
    const rect = c.getBoundingClientRect();
    const heading = c.querySelector('h3, [data-testid^="step-status-"]');
    return {
      stepNum: c.dataset.testid,
      width: Math.round(rect.width),
      scrollWidth: c.scrollWidth,
      overflow: c.scrollWidth > rect.width + 1,
      headingText: heading?.textContent?.slice(0, 80),
    };
  });
  return { stepHeadings };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
