import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5000/category/encoding-codecs', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => (document.querySelector('[data-testid="text-results-count"]')?.textContent || '').includes('325'), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1000);
const info = await page.evaluate(() => {
  const pag = [...document.querySelectorAll('button, a')].filter(b => /next|prev|page/i.test((b.getAttribute('aria-label') || '') + (b.getAttribute('data-testid') || '') + b.textContent.trim().slice(0, 20)));
  const cards = document.querySelectorAll('[data-testid^="card-resource"], [data-testid*="resource-card"], article');
  const anyCards = [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')).filter(t => /card|resource/.test(t)).slice(0, 8);
  return {
    pagButtons: pag.map(b => ({ tag: b.tagName, testid: b.getAttribute('data-testid'), aria: b.getAttribute('aria-label'), text: b.textContent.trim().slice(0, 25) })).slice(0, 12),
    cardCount: cards.length,
    testids: anyCards,
    pageText: (document.body.innerText.match(/Page \d+ of \d+/) || ['none'])[0],
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
