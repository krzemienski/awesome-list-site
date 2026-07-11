import { chromium } from 'playwright';
const BASE = 'https://awesome.video';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// capture all /api/recommendations responses
const apiCalls = [];
page.on('response', async r => {
  if (r.url().includes('/api/recommendations')) {
    try {
      const body = await r.text();
      apiCalls.push({ url: r.url(), status: r.status(), bodyLen: body.length, body: body.slice(0, 500) });
    } catch (e) { apiCalls.push({ url: r.url(), status: r.status(), error: e.message }); }
  }
});

await page.goto(`${BASE}/recommendations`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const data = await page.evaluate(() => ({
  rootHtml: document.getElementById('root').innerHTML.length,
  h1Text: document.querySelector('h1')?.textContent,
  resourceCards: document.querySelectorAll('[data-testid^="card-resource-"], [data-testid^="card-rec-"]').length,
  loginButton: document.querySelector('[data-testid="button-login-to-get-started"]') ? 'YES' : 'NO',
  retryButton: document.querySelector('[data-testid="button-retry-recommendations"]') ? 'YES' : 'NO',
  // show whole body of root's last child
  lastChildOuter: document.getElementById('root').lastElementChild?.outerHTML?.slice(0, 2000),
}));
console.log('API calls:', JSON.stringify(apiCalls, null, 2));
console.log('\nDOM data:', JSON.stringify(data, null, 2));
await browser.close();
