// Phase 3f — Resource page functional audit + collect errors
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

const URLS_FILE = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/all-urls.txt';
const allURLs = fs.readFileSync(URLS_FILE, 'utf8').split('\n').filter(Boolean);
const resourceURLs = allURLs.filter(u => /\/resource\/[a-z0-9-]+$/.test(u)).slice(0, 25);

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = [];
  for (const url of resourceURLs) {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    p.on('pageerror', e => errs.push('[pageerror] ' + e.message.slice(0,200)));
    try {
      const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await p.waitForTimeout(1500);
      const status = r ? r.status() : null;
      const slug = url.split('/resource/')[1].slice(0, 40) || 'root';
      await p.screenshot({ path: `${OUT}/res_deep_${slug}.png`, fullPage: true });

      const data = await p.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')].map(b => ({
          text: (b.textContent||'').trim().slice(0,40),
          aria: b.getAttribute('aria-label'),
          disabled: b.disabled
        }));
        const externals = [...document.querySelectorAll('a[href^="http"]')]
          .map(a => a.getAttribute('href'))
          .filter(h => !h.startsWith('https://awesome.video'));
        const outline = [...document.querySelectorAll('h1, .prose, main p, [class*="description"]')]
          .map(e => (e.textContent||'').trim()).filter(Boolean).slice(0, 3);
        return { buttons: buttons.slice(0, 20), externals: externals.slice(0, 5), outline };
      });

      // Test outbound link
      const outboundResults = [];
      if (data.externals && data.externals.length) {
        for (const ext of data.externals.slice(0, 2)) {
          try {
            const resp = await ctx.request.head(ext, { timeout: 5000 });
            outboundResults.push({ url: ext, status: resp.status() });
          } catch (e) {
            outboundResults.push({ url: ext, error: e.message.slice(0,80) });
          }
        }
      }

      // Try voting/upvote if button exists
      let voteTest = null;
      const upBtn = data.buttons.find(b => /upvote|vot|like|\b\d+\s*bump|\bstarr/i.test(b.text) || /upvote|star|vot|like/i.test(b.aria || ''));
      if (upBtn) {
        // capture before
        const beforeTxt = await p.evaluate(() => document.body.innerText).catch(() => '');
        try {
          await p.click(`button[aria-label*="upvote" i], button[aria-label*="vote" i], button[aria-label*="like" i], button:has-text("${upBtn.text.slice(0,8)}")`);
          await p.waitForTimeout(800);
          const afterTxt = await p.evaluate(() => document.body.innerText).catch(() => '');
          voteTest = { clicked: upBtn, beforeLen: beforeTxt.length, afterLen: afterTxt.length, changed: beforeTxt !== afterTxt };
        } catch (e) {
          voteTest = { clicked: upBtn, error: e.message.slice(0, 80) };
        }
      }

      findings.push({ url, status, slug, slugTaken: slug.length > 0, consoleErrs: [...new Set(errs)].slice(0, 3), ...data, outboundResults, voteTest });
    } catch (e) {
      findings.push({ url, error: e.message.slice(0, 200) });
    }
    await p.close();
  }
  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/resource-deep.json', JSON.stringify(findings, null, 1));
  console.log('resource pages audited:', findings.length);
})();
