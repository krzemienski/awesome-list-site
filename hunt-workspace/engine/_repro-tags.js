const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const URLS = [
    'https://awesome.video/resource/186145',
    'https://awesome.video/resource/186231',
    'https://awesome.video/resource/186212',
    'https://awesome.video/resource/186609',
    'https://awesome.video/resource/187911',
    'https://awesome.video/resource/188002',
    // 184751 / 185020 / 186477 / 184763 / 184789 / 184838 — pages WITH tags (control)
    'https://awesome.video/resource/184751',
    'https://awesome.video/resource/185020',
  ];
  for (const url of URLS) {
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const result = await p.evaluate(() => {
      let tagsLabel = false;
      for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,span,div')) {
        const t = (el.textContent||'').trim();
        if (t === 'Tags' || /^Tags\s*$/i.test(t)) { tagsLabel = true; break; }
      }
      let hashCount = 0;
      let hashSamples = [];
      for (const el of document.querySelectorAll('span, a, button, div, li')) {
        const t = (el.textContent||'').trim();
        if (/^#[A-Za-z0-9_\-]{2,30}$/.test(t) && !el.querySelector('*')) {
          hashCount++;
          hashSamples.push(t);
        }
      }
      return { tagsLabel, hashCount, hashSamples: hashSamples.slice(0, 8) };
    });
    console.log(`${url}  tagsLabel=${result.tagsLabel}  hashCount=${result.hashCount}  hashes=${JSON.stringify(result.hashSamples)}`);
    await p.close();
  }
  await b.close();
})();
