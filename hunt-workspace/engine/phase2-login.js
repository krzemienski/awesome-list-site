// Phase 2 — Authenticate admin / detect gates
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  const inputs = await p.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder })));
  console.log('LOGIN-INPUTS:', JSON.stringify(inputs));
  // Try filling admin and submit
  try {
    await p.fill('input[name="email"], input[type="email"]', 'admin@example.com');
    await p.fill('input[name="password"], input[type="password"]', process.env.HUNT_PW || '');
    const submit = await p.$('button[type="submit"], input[type="submit"]');
    if (submit) {
      await submit.click();
      await p.waitForLoadState('domcontentloaded');
      await p.waitForTimeout(2000);
    }
  } catch (e) { console.log('LOGIN-FILL-ERR', e.message); }
  const url = p.url();
  const title = await p.title();
  const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 400);
  console.log('POST-LOGIN-URL:', url);
  console.log('POST-LOGIN-TITLE:', title);
  console.log('POST-LOGIN-TXT:', txt.replace(/\n/g,' | '));
  // Check cookies
  const cookies = await ctx.cookies();
  console.log('COOKIES:', cookies.map(c => c.name).join(','));
  await b.close();
})();
