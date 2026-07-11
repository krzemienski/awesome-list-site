// Phase 6: investigation of the initial bookmark/favorite state and click-toggle behavior
const { chromium } = require('playwright');
const fs = require('fs');

const ROOT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace';
const SHOTS = `${ROOT}/screenshots`;
const AUTH_FILE = `${ROOT}/hunt-auth.json`;
const OUT = `${ROOT}/bugs/resources-phase6.json`;

const URLS = [
  'https://awesome.video/resource/185020',
  'https://awesome.video/resource/184751',
  'https://awesome.video/resource/188002',
  'https://awesome.video/resource/187911',
  'https://awesome.video/resource/186145',
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
    await p.waitForTimeout(3000);

    const rec = { slug, url, checks: {} };

    // Find every button that mentions "bookmark" OR "favorite" with its visibility and tooltip / aria-label / data-state
    const initial = await p.evaluate(() => {
      const findAll = (selector, label) => {
        return [...document.querySelectorAll(selector)].map((el, i) => ({
          index: i,
          selectorUsed: selector,
          text: (el.textContent || '').trim().slice(0, 50),
          aria: el.getAttribute('aria-label'),
          title: el.getAttribute('title'),
          dataState: el.getAttribute('data-state'),
          ariaPressed: el.getAttribute('aria-pressed'),
          ariaCurrent: el.getAttribute('aria-current'),
          classes: (el.className || '').toString().slice(0, 100),
          visible: el.getBoundingClientRect().width > 0,
        }));
      };
      const sels = ['button', 'a[role="button"]'];
      const all = sels.flatMap(s => findAll(s, s));
      const filtered = all.filter(e => /bookmark/i.test(e.text + (e.aria||'') + (e.title||'')) || /favorite/i.test(e.text + (e.aria||'') + (e.title||'')) || /\u2665|\u2661|\u2606|\u2605/i.test(e.text));
      return filtered.slice(0, 20);
    });
    rec.checks.initialBMFav = initial;

    // Look for the Favorite (heart) button — it has an SVG heart, click it
    const favState = await p.evaluate(() => {
      // Find any button with an inline SVG of a heart
      const btns = [...document.querySelectorAll('button')];
      const result = [];
      for (const b of btns) {
        const svg = b.querySelector('svg');
        if (!svg) continue;
        const inner = svg.innerHTML || '';
        if (/(heart|♥|♡|love|favorite)/i.test(b.className + (b.getAttribute('aria-label')||'') + b.outerHTML.slice(0,400))) {
          result.push({ aria: b.getAttribute('aria-label'), title: b.getAttribute('title'), text: (b.textContent||'').trim().slice(0,30), cls: (b.className||'').slice(0,80) });
        }
      }
      return result.slice(0,10);
    });
    rec.checks.heartBtns = favState;

    // The first page in URLS — try clicking the heart (Favorite) — see if it changes state and reload to see persisted state
    await p.evaluate(() => window.scrollTo(0, 0));
    const fav = await p.$('button[aria-label*="avorite"], button[title*="avorite"]');
    if (fav) {
      // Capture before/after text/data-state
      const before = await fav.evaluate(el => ({
        aria: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        pressed: el.getAttribute('aria-pressed'),
        dataState: el.getAttribute('data-state'),
        cls: (el.className||'').slice(0,80),
        text: (el.textContent||'').trim().slice(0,20),
      }));
      rec.checks.favBefore = before;
      await fav.click().catch(()=>{});
      await p.waitForTimeout(800);
      const after = await fav.evaluate(el => ({
        aria: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        pressed: el.getAttribute('aria-pressed'),
        dataState: el.getAttribute('data-state'),
        cls: (el.className||'').slice(0,80),
        text: (el.textContent||'').trim().slice(0,20),
      }));
      rec.checks.favAfter = after;
    }

    // Reload and check initial state
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const reloaded = await p.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const titles = btns.map(b => (b.textContent||'').trim()).filter(t => /bookmark|favorite/i.test(t));
      return titles.slice(0, 10);
    });
    rec.checks.reloadBmTitles = reloaded;

    // Take a focused screenshot of the action bar
    try {
      const handle = await p.$('header, main, body');
      if (handle) await handle.screenshot({ path: `${SHOTS}/actions_${slug}.png`, fullPage: false });
    } catch {}

    out[slug] = rec;
    console.log('DONE', slug);
    await p.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  await ctx.close();
  await b.close();
})();
