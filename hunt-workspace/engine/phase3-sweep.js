// Phase 3 — Multi-viewport sweep across all 205 URLs
// For each URL x viewport: load, screenshot, capture metrics (overflow, broken images,
// contrast on key elements, touch-target stats, hover/focus behavior).
// Distinct per-page findings = separate bugs.
const { chromium } = require('playwright');
const fs = require('fs');

const URLS_FILE = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/all-urls.txt';
const URLS = fs.readFileSync(URLS_FILE, 'utf8').split('\n').filter(Boolean);
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: '768',  width: 768,  height: 1024, isMobile: false, hasTouch: true },
  { name: '375',  width: 375,  height: 812, isMobile: true,  hasTouch: true },
];
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  let total = 0;
  const summary = [];

  async function processUrl(url) {
    for (const vp of VIEWPORTS) {
      const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      try {
        const p = await ctx.newPage();
        const consoleErrs = [];
        const netErrs = [];
        p.on('console', m => { if (m.type()==='error') consoleErrs.push(m.text().slice(0,200)); });
        p.on('pageerror', e => consoleErrs.push('[pageerror] ' + e.message.slice(0,200)));
        p.on('response', r => { if (r.status() >= 400 && r.status() !== 304 && !r.url().endsWith('.map')) netErrs.push(r.status() + ' ' + r.url()); });
        try {
          const resp = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
          await p.waitForTimeout(1100);
          const status = resp ? resp.status() : null;
          const slug = url.replace(/^https?:\/\/awesome\.video/, '').replace(/[^a-zA-Z0-9]+/g,'_').slice(0,60) || 'root';
          await p.screenshot({ path: `${OUT}/sweep_${vp.name}_${slug}.png`, fullPage: false });
          const m = await p.evaluate((vpW) => {
            const d = document.documentElement;
            const w = window.innerWidth;
            const ovX = d.scrollWidth > w;
            // count broken images
            const imgs = [...document.querySelectorAll('img')];
            const brokenImgs = imgs.filter(i => i.complete && i.naturalWidth === 0).length;
            // hover-overflow check: small element near right edge
            const overflowBtns = [...document.querySelectorAll('button, a')]
              .filter(el => {
                const r = el.getBoundingClientRect();
                return r.right > w + 2 || (r.left < -2 && r.width > 0);
              }).length;
            // alt-text missing
            const imgsNoAlt = imgs.filter(i => !i.alt && !i.getAttribute('aria-label')).length;
            // empty links
            const emptyLinks = [...document.querySelectorAll('a')]
              .filter(a => !a.textContent.trim() && !a.querySelector('img') && !a.getAttribute('aria-label')).length;
            // touch target: links/buttons under 24x24
            const undersized = [...document.querySelectorAll('button, a, [role="button"], input[type="checkbox"], input[type="radio"]')]
              .filter(el => {
                if (el.offsetParent === null) return false;
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24);
              }).length;
            // aria-hidden interactive (a11y bug)
            const ariaHiddenButtons = [...document.querySelectorAll('[aria-hidden="true"]')]
              .filter(el => el.matches('button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]')).length;
            // text color of body & main headings
            const sampleColors = (() => {
              const colors = [];
              for (const el of document.querySelectorAll('h1, h2, h3, p, body')) {
                const s = getComputedStyle(el).color;
                const bg = getComputedStyle(el).backgroundColor;
                colors.push({ tag: el.tagName, color: s, bg });
              }
              return colors.slice(0, 8);
            })();
            return {
              overflow: ovX,
              brokenImgs,
              overflowBtns,
              imgsNoAlt,
              emptyLinks,
              undersized,
              ariaHiddenButtons,
              pageHeight: d.scrollHeight,
              sampleColors
            };
          }, vp.width);

          summary.push({ url, vp: vp.name, status, ...m, consoleErrs: [...new Set(consoleErrs)].slice(0,3), netErrs: [...new Set(netErrs)].slice(0,3) });
        } catch (e) {
          summary.push({ url, vp: vp.name, error: e.message.slice(0,200) });
        }
        await p.close();
      } finally { await ctx.close(); }
      total++;
    }
  }

  // Parallelism — 4 contexts at once
  const queue = [...URLS];
  let active = 0;
  async function worker() {
    while (queue.length) {
      const u = queue.shift();
      if (!u) break;
      active++;
      try { await processUrl(u); }
      catch (e) { summary.push({ url: u, error: 'fatal:' + e.message.slice(0,160) }); }
      active--;
      if (active % 5 === 0) console.log('done', total, 'active', active, 'remaining', queue.length);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/sweep-summary.json', JSON.stringify(summary, null, 1));
  console.log('TOTAL', total, 'URLS', URLS.length);
})();
