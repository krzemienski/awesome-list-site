import { chromium } from 'playwright';
const BASE = 'https://awesome.video';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/recommendations`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const data = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-testid^="card-resource-"]')];
  const visitButtons = [...document.querySelectorAll('[data-testid^="button-visit-"]')];
  const loginPrompt = document.querySelector('[data-testid="button-login-to-get-started"]');
  return {
    cards: cards.length,
    visitButtons: visitButtons.length,
    cardSample: cards.slice(0, 3).map(c => ({
      testid: c.dataset.testid,
      isAnchor: c.tagName === 'A',
      hasRole: c.getAttribute('role'),
      tabIndex: c.tabIndex,
      titleSnippet: c.querySelector('h3, [class*="title"]')?.textContent?.slice(0, 60),
    })),
    loginPromptPresent: !!loginPrompt,
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
