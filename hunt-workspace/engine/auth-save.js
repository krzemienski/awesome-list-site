// Save auth state for parallel auditors
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await p.fill('input[name="email"]', 'admin@example.com');
  await p.fill('input[name="password"]', process.env.HUNT_PW || '');
  await p.click('button[type="submit"]');
  await p.waitForLoadState('domcontentloaded');
  await p.waitForTimeout(1800);
  await ctx.storageState({ path: '/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json' });
  console.log('SAVED:', p.url());
  await b.close();
})();
