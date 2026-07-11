// Phase 2: drill into the suspect buttons + outbound URL HEAD checks + alt-text/empty-class probe
const { chromium } = require('playwright');
const fs = require('fs');

const ROOT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace';
const SHOTS = `${ROOT}/screenshots`;
const AUTH_FILE = `${ROOT}/hunt-auth.json`;
const REPORT_IN = `${ROOT}/bugs/resources-pageReports.json`;
const REPORT_OUT = `${ROOT}/bugs/resources-phase2.json`;

const URLS = [
  'https://awesome.video/resource/185020',
  'https://awesome.video/resource/184751',
  'https://awesome.video/resource/186231',
  'https://awesome.video/resource/186145',
  'https://awesome.video/resource/186477',
  'https://awesome.video/resource/184763',
  'https://awesome.video/resource/188002',
  'https://awesome.video/resource/187911',
  'https://awesome.video/resource/186609',
  'https://awesome.video/resource/186212',
  'https://awesome.video/resource/184789',
  'https://awesome.video/resource/184838',
];

function safeSlug(url){const m = url.match(/\/resource\/(\d+)/);return m?m[1]:'unknown';}

(async () => {
  const data = JSON.parse(fs.readFileSync(REPORT_IN, 'utf8'));
  const out = {};

  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  });

  for (const url of URLS) {
    const slug = safeSlug(url);
    const rep = data[slug];
    if (!rep) continue;
    const dom = rep.domProbe || {};
    const p = await ctx.newPage();
    const consoleErrs = [];
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleErrs.push({t:m.type(), text:m.text()}); });
    p.on('pageerror', e => consoleErrs.push({t:'pageerror', text:e.message}));

    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch (e) {}
    await p.waitForTimeout(2000);

    const outRec = {
      slug, url,
      consoleErrs,
      tagInvestigation: [],
      missingAltImgs: [],
      brokenImgs: [],
      outbound: [],
      clickProbe: {},
    };

    // 1) Probe tag UI - is it just ".tag" with empty content?
    outRec.tagInvestigation = await p.evaluate(() => {
      const all = [...document.querySelectorAll('[class*="tag"], .badge, .chip, [data-tag]')];
      return all.slice(0, 40).map(e => ({ tag: e.tagName.toLowerCase(), text: (e.textContent||'').trim().slice(0,40), cls: (e.className||'').toString().slice(0,80), href: e.getAttribute && e.getAttribute('href') }));
    });

    // 2) probe all images deeply incl. svgs rendered as <img>, and inline svg count
    const imgProbe = await p.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      return imgs.slice(0, 80).map(img => ({
        src: img.src, alt: img.getAttribute('alt'),
        naturalW: img.naturalWidth, naturalH: img.naturalHeight,
        complete: img.complete, loading: img.loading,
        role: img.getAttribute('role'),
        ariaLabel: img.getAttribute('aria-label'),
      }));
    });
    outRec.brokenImgs = imgProbe.filter(i => i.complete && i.naturalW === 0 && !i.src.startsWith('data:'));
    outRec.missingAltImgs = imgProbe.filter(i => (i.alt === null || i.alt === '') && i.src && i.src.startsWith('http'));

    // 3) Click probes for Bookmark/Share/Report/Upvote
    // First find the unique "primary" action in the page (one near the title) and click it
    const labels = [
      { name: 'Bookmark', sel: 'button:has-text("Bookmark"):not(:has-text("Add to Bookmarks"))' },
      { name: 'Add to Bookmarks', sel: 'button:has-text("Add to Bookmarks")' },
      { name: 'Share', sel: 'button:has-text("Share"):not(:has-text("Share This"))' },
      { name: 'Share This Page', sel: 'button:has-text("Share This Page")' },
      { name: 'Report', sel: 'button:has-text("Report")' },
      { name: 'Upvote', sel: 'button:has-text("Upvote")' },
      { name: 'Vote', sel: 'button:has-text("Vote"), button:has-text("Vote Up")' },
      { name: 'Like', sel: 'button:has-text("Like")' },
      { name: 'Star', sel: 'button:has-text("Star")' },
      { name: 'Save', sel: 'button:has-text("Save")' },
    ];
    for (const L of labels) {
      try {
        const c = await p.$(L.sel);
        if (!c) { outRec.clickProbe[L.name] = { found: false }; continue; }
        // try to capture before/after state of relevant counters
        const beforeCount = await p.evaluate(() => {
          // best-effort: any numeric label visible on page that could be a "vote count"
          const texts = [...document.querySelectorAll('span,div')]
            .map(e => (e.textContent||'').trim())
            .filter(t => /^\d+(\.\d+)?[kKmM]?$/.test(t))
            .slice(0, 20);
          return texts;
        });
        await c.scrollIntoViewIfNeeded().catch(()=>{});
        const beforeURL = p.url();
        await c.click().catch(e=>outRec.clickProbe[L.name] = { found: true, clickErr: e.message });
        await p.waitForTimeout(800);
        const newURL = p.url();
        const newDialogs = await p.evaluate(() => {
          // look for any new modals/popovers that opened
          const popovers = [...document.querySelectorAll('[role="dialog"], .modal, .popover, [data-state="open"]')];
          return popovers.map(el => ({ role: el.getAttribute('role'), text: (el.textContent||'').trim().slice(0, 200) })).filter(o => o.text);
        });
        const afterCount = await p.evaluate(() => {
          const texts = [...document.querySelectorAll('span,div')]
            .map(e => (e.textContent||'').trim())
            .filter(t => /^\d+(\.\d+)?[kKmM]?$/.test(t))
            .slice(0, 20);
          return texts;
        });
        outRec.clickProbe[L.name] = {
          found: true,
          urlChanged: beforeURL !== newURL,
          newURL,
          countersChanged: beforeCount.join(',') !== afterCount.join(','),
          beforeCount: beforeCount.slice(0, 6),
          afterCount: afterCount.slice(0, 6),
          popoversAfter: newDialogs,
        };
        // If navigated away, navigate back for the next probe
        if (beforeURL !== newURL) {
          try { await p.goBack({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800); } catch {}
        }
      } catch (e) {
        outRec.clickProbe[L.name] = { found: false, err: e.message };
      }
    }

    // 4) Outbound URL HEAD probes via fetch (no auth, only external URLs from page)
    const outbound = dom.outbound || [];
    for (const o of outbound) {
      try {
        const head = await p.request.fetch(o.href, { method: 'HEAD', timeout: 12000 });
        outRec.outbound.push({ href: o.href, status: head.status(), ok: head.ok() });
      } catch (e) {
        // Try GET fallback
        try {
          const get = await p.request.fetch(o.href, { method: 'GET', timeout: 12000 });
          outRec.outbound.push({ href: o.href, status: get.status(), ok: get.ok(), triedGet: true });
        } catch (e2) {
          outRec.outbound.push({ href: o.href, err: String(e.message || e) });
        }
      }
    }

    out[slug] = outRec;
    console.log('DONE', slug, 'tags=', outRec.tagInvestigation.length, 'imgs=', imgProbe.length, 'outbound=', outRec.outbound.length);
    await p.close();
  }

  fs.writeFileSync(REPORT_OUT, JSON.stringify(out, null, 2));
  await ctx.close();
  await b.close();
  console.log('PASS2 DONE');
})();
