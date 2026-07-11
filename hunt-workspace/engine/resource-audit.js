// Audit /resource/* detail pages
// For each URL: 3 viewports × {screenshot, console errors, network errors, click every button, check outbound heads, check missing-description/tags/images/alt}
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace';
const SHOTS = `${ROOT}/screenshots`;
const AUTH_FILE = `${ROOT}/hunt-auth.json`;
const OUT = `${ROOT}/bugs/resources-audit.json`;

const URLS = [
  // 12 mix of slug length, mix of recency
  'https://awesome.video/resource/185020',
  'https://awesome.video/resource/184751',
  'https://awesome.video/resource/186231',
  'https://awesome.video/resource/186145',
  'https://awesome.video/resource/186477',
  'https://awesome.video/resource/184763', // very short
  'https://awesome.video/resource/188002', // longer
  'https://awesome.video/resource/187911',
  'https://awesome.video/resource/186609',
  'https://awesome.video/resource/186212',
  'https://awesome.video/resource/184789',
  'https://awesome.video/resource/184838',
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 768, height: 1024 },
  mobile:  { width: 375, height: 812 },
};

function safeSlug(url) {
  const m = url.match(/\/resource\/(\d+)/);
  return m ? m[1] : 'unknown';
}

(async () => {
  const found = { confirmedBugs: [], pagesTouched: 0 };
  fs.writeFileSync(OUT, JSON.stringify(found, null, 2));

  const b = await chromium.launch({ headless: true });

  // Use auth saved state
  const ctx = await b.newContext({
    storageState: AUTH_FILE,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  });

  // Pass 1: walk every page × viewport, screenshot+ capture
  const pageReports = {};
  for (const url of URLS) {
    const slug = safeSlug(url);
    pageReports[slug] = { url, viewports: {}, consoleErrs: new Set(), networkErrs: [], outbound: [], domProbe: null, clicks: [] };
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const ctxInner = await b.newContext({
        storageState: AUTH_FILE,
        viewport: vp,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      });
      const p = await ctxInner.newPage();

      const consoleErrs = [];
      const failedReqs = [];
      p.on('console', m => {
        if (m.type() === 'error' || m.type() === 'warning') consoleErrs.push({ t: m.type(), text: m.text() });
      });
      p.on('pageerror', err => consoleErrs.push({ t: 'pageerror', text: err.message }));
      p.on('requestfailed', req => failedReqs.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText }));
      p.on('response', resp => {
        const u = resp.url();
        const s = resp.status();
        if (s >= 400 && !u.startsWith('data:')) {
          failedReqs.push({ url: u, status: s });
        }
      });

      try {
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      } catch (e) {
        pageReports[slug].loadError = String(e.message || e);
      }
      await p.waitForTimeout(2000);
      // Probe the DOM once per page (use the first viewport for DOM probing)
      const out = `${SHOTS}/res_${slug}_${vpName}.png`;
      try {
        await p.screenshot({ path: out, fullPage: true });
      } catch (e) {}

      const probe = await p.evaluate(() => {
        const out = {};
        const desc = document.querySelector('meta[name="description"]');
        out.title = document.title;
        out.metaDescription = desc ? desc.getAttribute('content') : null;
        // Description block heuristic
        const allText = document.body.innerText || '';
        out.bodyLen = allText.length;
        out.hasDescWord = /description/i.test(allText.slice(0, 4000));
        // Tags
        const tagCandidates = document.querySelectorAll('[class*="tag"], [data-tag], a[href*="tag"], .badge, .chip');
        out.tagCount = tagCandidates.length;
        out.tagTexts = [...tagCandidates].slice(0, 30).map(e => (e.textContent || '').trim().slice(0, 40));
        // Images
        const imgs = document.querySelectorAll('img');
        out.images = [];
        for (const img of imgs) {
          out.images.push({
            src: img.src,
            alt: img.getAttribute('alt'),
            naturalW: img.naturalWidth,
            naturalH: img.naturalHeight,
            complete: img.complete,
          });
        }
        // Buttons (incl anchors with role)
        const btns = [];
        for (const sel of ['button', 'a[role="button"]', '[role="button"]']) {
          for (const el of document.querySelectorAll(sel)) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            btns.push({
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || '').trim().slice(0, 40),
              aria: el.getAttribute('aria-label'),
              cls: (el.className || '').slice(0, 80),
              href: el.getAttribute('href'),
            });
          }
        }
        out.buttons = btns;

        // Outbound external URL(s): find anchors pointing to non-awesome.video
        const anchors = document.querySelectorAll('a[href]');
        out.outbound = [];
        for (const a of anchors) {
          const h = a.getAttribute('href');
          if (!h) continue;
          if (h.startsWith('#') || h.startsWith('/') || h.startsWith('javascript:')) continue;
          try {
            const u = new URL(h);
            if (!/awesome\.video$/.test(u.hostname) && !/replit\.com$/.test(u.hostname)) {
              out.outbound.push({ href: h, host: u.hostname });
            }
          } catch (e) {}
        }
        return out;
      });

      pageReports[slug].viewports[vpName] = {
        screenshot: out,
        consoleErrCount: consoleErrs.length,
        consoleErrSample: consoleErrs.slice(0, 8),
        networkErrCount: failedReqs.length,
        networkErrSample: failedReqs.slice(0, 8),
      };
      if (vpName === 'desktop') {
        // store full probe + clicks
        pageReports[slug].domProbe = probe;
      }
      pageReports[slug].consoleErrs = new Set([...(pageReports[slug].consoleErrs || []), ...consoleErrs.map(c => c.text)]);
      pageReports[slug].networkErrs = failedReqs;

      await ctxInner.close();
    }
    found.pagesTouched++;
  }

  // Save full pageReports snapshot for downstream analysis
  fs.writeFileSync(`${ROOT}/bugs/resources-pageReports.json`, JSON.stringify(pageReports, null, 2));

  await b.close();
  console.log('PASS1 DONE pages=', found.pagesTouched);
})();
