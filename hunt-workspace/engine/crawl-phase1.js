// Phase 1 — Crawl & inventory for https://awesome.video/
// Discovers every same-origin URL via BFS, with page-level metrics + console/network errors.
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://awesome.video';
const CAP = 200;  // raised from 50 — surface is large

const errs = [];

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });

  // 0) landing
  const p0 = await ctx.newPage();
  await p0.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p0.waitForTimeout(2500);

  // 1) harvest same-origin links
  const initial = await p0.evaluate(() => {
    const m = new Map();
    document.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (!h) return;
      let url = h;
      if (url.startsWith('/')) url = location.origin + url;
      else if (!url.startsWith('http')) return;
      if (url.startsWith(location.origin)) {
        const u = new URL(url);
        const norm = u.origin + u.pathname.replace(/\/$/, '') + (u.search || '');
        if (!m.has(norm)) m.set(norm, (a.textContent||'').trim().slice(0, 50));
      }
    });
    return [...m.entries()];
  });
  await p0.close();
  console.log('initial links:', initial.length);

  // 2) also probe sitemap / robots
  const extra = [];
  for (const path of ['/sitemap.xml', '/sitemap-0.xml', '/sitemap_index.xml', '/robots.txt']) {
    try {
      const r = await ctx.request.get(BASE + path);
      if (r.ok()) {
        const body = await r.text();
        const matches = body.match(/https?:\/\/[^\s<>"]+/g) || [];
        for (const u of matches) {
          if (u.startsWith(BASE)) {
            const nu = new URL(u);
            const norm = nu.origin + nu.pathname.replace(/\/$/, '') + (nu.search || '');
            extra.push([norm, '']);
          }
        }
      }
    } catch {}
  }
  const seen = new Map(initial);
  for (const [u, t] of extra) if (!seen.has(u)) seen.set(u, t || '(sitemap)');
  console.log('after sitemap:', seen.size);

  // 3) BFS crawl with parallel pages
  const queue = [...seen.keys()];
  const results = [];
  const visited = new Set();
  let scanned = 0;

  async function worker(id) {
    const p = await ctx.newPage();
    const localConsole = [];
    const localNet = [];
    p.on('console', m => { if (m.type()==='error') localConsole.push(m.text().slice(0,200)); });
    p.on('pageerror', e => localConsole.push('[pageerror] ' + e.message.slice(0,200)));
    p.on('response', r => { if (r.status() >= 400) localNet.push([r.status(), r.url()]); });

    while (queue.length && scanned < CAP) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      const r = { url, status: null, title: '', h1: '', links: 0, overflow: false, notFound: false, consoleErrs: [], netErrs: [] };
      try {
        const resp = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        r.status = resp ? resp.status() : null;
        await p.waitForTimeout(900);
        const data = await p.evaluate(() => {
          const main = document.querySelector('main') || document.body;
          const txt = (main.innerText||'').trim();
          return {
            title: document.title.slice(0,120),
            h1: (document.querySelector('h1')?.textContent||'').trim().slice(0,120),
            links: document.querySelectorAll('a[href]').length,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            notFound: /404|not found|nothing here|page not found/i.test(txt.slice(0,300))
          };
        });
        Object.assign(r, data);

        // enqueue new same-origin URLs
        const newHrefs = await p.evaluate(() => {
          const m = new Map();
          document.querySelectorAll('a[href]').forEach(a => {
            const h = a.getAttribute('href');
            if (!h) return;
            let url = h;
            if (url.startsWith('/')) url = location.origin + url;
            else if (!url.startsWith('http')) return;
            if (url.startsWith(location.origin)) {
              const u = new URL(url);
              const norm = u.origin + u.pathname.replace(/\/$/, '') + (u.search || '');
              if (!m.has(norm)) m.set(norm, (a.textContent||'').trim().slice(0, 50));
            }
          });
          return [...m.keys()];
        });
        for (const nu of newHrefs) {
          if (!visited.has(nu)) queue.push(nu);
        }
        r.consoleErrs = [...new Set(localConsole)].slice(0, 5);
        r.netErrs = [...new Set(localNet.map(x => x.join(' ')))].slice(0, 5);
        localConsole.length = 0;
        localNet.length = 0;
      } catch (e) {
        r.error = e.message.slice(0, 200);
      }
      results.push(r);
      scanned++;
      if (scanned % 10 === 0) console.log('scanned', scanned, 'queue', queue.length, 'visited', visited.size);
    }
    await p.close();
  }

  await Promise.all(Array.from({ length: 6 }, worker));
  await b.close();

  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/crawl-results.json', JSON.stringify({ results, total: scanned }, null, 1));

  // URLs only — for inventory partitioning
  const urls = results.map(r => r.url).filter(Boolean);
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/all-urls.txt', urls.join('\n'));
  console.log('total scanned:', scanned, 'distinct visited:', visited.size);
  console.log('unique-with-errors:', results.filter(r => r.consoleErrs.length || r.netErrs.length).length);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
