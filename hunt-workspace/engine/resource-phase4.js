// Phase 4: accurate tag probe (heavily varied selectors) + bookmark state investigation
const { chromium } = require('playwright');
const fs = require('fs');

const ROOT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace';
const AUTH_FILE = `${ROOT}/hunt-auth.json`;
const OUT = `${ROOT}/bugs/resources-phase4.json`;

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
  const out = {};
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ storageState: AUTH_FILE, viewport: { width: 1440, height: 900 } });
  for (const url of URLS) {
    const slug = safeSlug(url);
    const p = await ctx.newPage();
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch (e) {}
    await p.waitForTimeout(2500);

    const rec = { slug, url, checks: {} };

    // Comprehensive tag detection
    rec.checks.tagProbe = await p.evaluate(() => {
      // 1) Any element with text starting with # (hashtag-style tag)
      const hashTag = [];
      for (const el of document.querySelectorAll('span, a, button, div, li')) {
        const t = (el.textContent || '').trim();
        if (/^#[A-Za-z0-9_\-]{2,30}$/.test(t) && !el.querySelector('*')) {
          hashTag.push({ tag: el.tagName.toLowerCase(), text: t, cls: (el.className||'').toString().slice(0,80) });
        }
      }
      // 2) Anything with a tag-link href
      const linked = [...document.querySelectorAll('a[href*="tag"], [data-tag-name], [data-tag-id]')]
        .map(e => ({ tag: e.tagName.toLowerCase(), text: (e.textContent||'').trim().slice(0, 40), href: e.getAttribute('href'), cls: (e.className||'').toString().slice(0,80) }));
      // 3) Any element whose className includes "tag" or "Tag"
      const byCls = [...document.querySelectorAll('[class*="tag"], [class*="Tag"]')]
        .map(e => ({ tag: e.tagName.toLowerCase(), text: (e.textContent||'').trim().slice(0, 40), cls: (e.className||'').toString().slice(0,80) }));
      // 4) Look for an explicit "Tags" section header
      let hasTagsHeader = false;
      for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,strong,div,span')) {
        const t = (el.textContent||'').trim();
        if (t === 'Tags' || /^Tags\s*:?$/.test(t)) { hasTagsHeader = true; break; }
      }
      return { hashTag: hashTag.slice(0, 30), linked, byCls: byCls.slice(0, 30), hasTagsHeader };
    });

    // Bookmark reload + state investigation. Click ONLY "Add to Bookmarks" if present.
    rec.checks.bookmarkState = await p.evaluate(() => {
      const out = {};
      // Find any bookmark-related button text
      const all = [...document.querySelectorAll('button')];
      const bmBtns = all.filter(b => /bookmark/i.test(b.textContent||''));
      out.bmBtnCount = bmBtns.length;
      out.bmBtnTexts = bmBtns.map(b => (b.textContent||'').trim());
      // Check if Favorite (heart) is a separate button near top
      const favBtns = all.filter(b => /favorite/i.test(b.textContent||'') || /♥|♡/.test(b.textContent||''));
      out.favBtnCount = favBtns.length;
      out.favBtnTexts = favBtns.map(b => (b.textContent||'').trim().slice(0,30));
      // Also: any element with aria-label containing bookmark/favorite
      out.ariaBookmark = [...document.querySelectorAll('[aria-label*="ookmark"], [aria-label*="avorite"], [title*="ookmark"], [title*="avorite"]')].map(e => ({ tag: e.tagName.toLowerCase(), aria: e.getAttribute('aria-label'), title: e.getAttribute('title') }));
      return out;
    });

    // Click the bookmark and check after-state
    try {
      const bmSel = 'button:has-text("Bookmark"), button:has-text("Add to Bookmarks"), button:has-text("Remove from Bookmarks")';
      const before = await p.evaluate(sel => {
        const b = [...document.querySelectorAll(sel)].find(el => /bookmark/i.test(el.textContent||''));
        return b ? (b.textContent||'').trim() : null;
      }, bmSel);
      const bm = await p.$(bmSel);
      if (bm) {
        await bm.scrollIntoViewIfNeeded().catch(()=>{});
        await bm.click().catch(()=>{});
        await p.waitForTimeout(800);
        const after = await p.evaluate(sel => {
          const b = [...document.querySelectorAll(sel)].find(el => /bookmark/i.test(el.textContent||''));
          return b ? (b.textContent||'').trim() : null;
        }, bmSel);
        rec.checks.bookmarkClickResult = { before, after };
      } else {
        rec.checks.bookmarkClickResult = { found: false };
      }
    } catch (e) { rec.checks.bookmarkClickErr = String(e.message); }

    out[slug] = rec;
    await p.close();
    console.log('DONE', slug, 'tags=', rec.checks.tagProbe.hashTag.length, 'linked=', rec.checks.tagProbe.linked.length, 'byCls=', rec.checks.tagProbe.byCls.length, 'hasTagsHeader=', rec.checks.tagProbe.hasTagsHeader);
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  await ctx.close();
  await b.close();
})();
