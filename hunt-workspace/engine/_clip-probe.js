const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  // NO auth — fresh context
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('https://awesome.video/resource/185020', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const result = await p.evaluate(async () => {
    let writeOK = null;
    let writeErr = null;
    try {
      if (!navigator.clipboard) { return { available: false }; }
      await navigator.clipboard.writeText('test-string-clipboard-probe');
      writeOK = true;
    } catch (e) { writeErr = String(e.message || e); }
    return { available: typeof navigator.clipboard !== 'undefined', isSecureContext: window.isSecureContext, writeOK, writeErr };
  });
  console.log('CLIPBOARD:', JSON.stringify(result));

  // Find the share button — even without auth, the page renders one
  const share = await p.$('button:has-text("Share"):not(:has-text("Share This"))');
  if (share) {
    await share.scrollIntoViewIfNeeded().catch(()=>{});
    await share.click();
    await p.waitForTimeout(1200);
    const toast = await p.evaluate(() => {
      const els = [...document.querySelectorAll('[role="alert"], [role="status"], [data-state="open"], .fixed')];
      return els.map(e => (e.textContent||'').trim().slice(0, 200));
    });
    console.log('TOAST:', JSON.stringify(toast));
  } else {
    console.log('NO share button found in unauth context');
  }
  await b.close();
})();
