// Capture BUG-001 evidence: CSP violation fires on landing
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const consoleErrs = [];
  p.on('console', m => { if (m.type()==='error') consoleErrs.push(m.text()); });
  p.on('pageerror', e => consoleErrs.push('[pageerror] ' + e.message));

  await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots/landing-1440-initial.png', fullPage: false });
  console.log('CSP-ERR-FOUND:', consoleErrs.filter(e => /replit-cdn|feedback-widget/i.test(e)).length);
  console.log(JSON.stringify(consoleErrs.filter(e => /replit-cdn|feedback-widget/i.test(e))[0]));
  await b.close();
})();
