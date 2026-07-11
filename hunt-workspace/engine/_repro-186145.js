const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  // Run TWICE for reproducibility
  for (let i = 0; i < 2; i++) {
    await p.goto('https://awesome.video/resource/186145', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const metaDesc = await p.evaluate(() => {
      const m = document.querySelector('meta[name="description"]');
      return m ? m.getAttribute('content') : null;
    });
    const descBody = await p.evaluate(() => {
      const els = [...document.querySelectorAll('*')];
      for (const el of els) {
        const t = (el.textContent||'').trim();
        if (t === 'Description') {
          let n = el.nextElementSibling;
          let i = 0;
          while (n && i < 3) {
            const nt = (n.textContent||'').trim();
            if (nt) return nt;
            n = n.nextElementSibling; i++;
          }
        }
      }
      return null;
    });
    console.log(`run ${i+1}: metaDesc=${JSON.stringify(metaDesc)} bodyDesc=${JSON.stringify(descBody)}`);
  }
  await b.close();
})();
