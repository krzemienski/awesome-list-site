const fs = require('fs');
const r = JSON.parse(fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/sweep-summary.json', 'utf8'));
// Find undersized entries and their actual computed selectors
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('https://awesome.video/category/community-events', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
  const undersized = await p.evaluate(() => {
    const list = [];
    for (const el of document.querySelectorAll('button, a, [role="button"], input[type="checkbox"], input[type="radio"], label')) {
      if (el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 24 || r.height < 24) {
        list.push({
          tag: el.tagName,
          text: (el.textContent||'').trim().slice(0, 40),
          aria: el.getAttribute('aria-label'),
          cls: el.className.slice(0, 60),
          w: Math.round(r.width),
          h: Math.round(r.height),
          href: el.getAttribute('href')?.slice(0, 30),
        });
      }
    }
    return list.slice(0, 30);
  });
  console.log('undersized on /category/community-events:', JSON.stringify(undersized, null, 0).slice(0, 4500));
  await b.close();
})();
