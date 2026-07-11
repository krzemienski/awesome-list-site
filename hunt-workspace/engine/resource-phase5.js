// Phase 5: precise look at body of suspect pages
const { chromium } = require('playwright');
const fs = require('fs');

const ROOT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace';
const AUTH_FILE = `${ROOT}/hunt-auth.json`;
const OUT = `${ROOT}/bugs/resources-phase5.json`;

const URLS = [
  'https://awesome.video/resource/186145',
  'https://awesome.video/resource/186231',
  'https://awesome.video/resource/187911',
  'https://awesome.video/resource/188002',
  'https://awesome.video/resource/186212',
  'https://awesome.video/resource/186609',
];

function safeSlug(url){const m = url.match(/\/resource\/(\d+)/);return m?m[1]:'unknown';}

(async () => {
  const out = {};
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ storageState: AUTH_FILE, viewport: { width: 1440, height: 900 } });
  for (const url of URLS) {
    const slug = safeSlug(url);
    const p = await ctx.newPage();
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch (e) {}
    await p.waitForTimeout(2500);

    const rec = { slug, url, body: {} };

    // Capture the body text
    rec.body.fullText = await p.evaluate(() => document.body.innerText.slice(0, 3000));
    rec.body.description = await p.evaluate(() => {
      // Find any element whose label/preceding header says "Description"
      const all = [...document.querySelectorAll('*')];
      for (const el of all) {
        const t = (el.textContent||'').trim();
        if (t.startsWith('Description') && t.length < 30) {
          // try to get next paragraph
          let n = el.nextElementSibling;
          let i = 0;
          while (n && i < 4) {
            const nt = (n.textContent||'').trim();
            if (nt && nt !== 'Description') return nt.slice(0, 500);
            n = n.nextElementSibling; i++;
          }
        }
      }
      return null;
    });
    rec.body.mainText = await p.evaluate(() => {
      const m = document.querySelector('main') || document.querySelector('article') || document.body;
      return m.innerText.slice(0, 1200);
    });

    out[slug] = rec;
    console.log('DONE', slug);
    await p.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  await ctx.close();
  await b.close();
})();
