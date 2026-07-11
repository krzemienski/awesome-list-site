// Phase 3: deeper investigations
//  1) Verify Share button "Unable to copy" actually fails in non-headless too — confirm + capture full popover text
//  2) Inspect the "tag" classes that look empty — maybe SVG-only icons but ALWAYS empty across most pages
//  3) Check the "Add to Bookmarks" -> "Remove from Bookmarks" state toggle
//  4) Look for upvote / vote button existence & whether it functions
//  5) Take fresh fullPage screenshots at 1440 with no zoom for reproduction evidence
const { chromium } = require('playwright');
const fs = require('fs');

const ROOT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace';
const SHOTS = `${ROOT}/screenshots`;
const AUTH_FILE = `${ROOT}/hunt-auth.json`;
const OUT = `${ROOT}/bugs/resources-phase3.json`;

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
  // also add some pages found earlier that lacked description / tags
  // 186145, 186231, 186609, 187911, 188002, 186212 — already covered
];

function safeSlug(url){const m = url.match(/\/resource\/(\d+)/);return m?m[1]:'unknown';}

(async () => {
  const out = {};
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ storageState: AUTH_FILE, viewport: { width: 1440, height: 900 } });
  for (const url of URLS) {
    const slug = safeSlug(url);
    const p = await ctx.newPage();
    const consoleErrs = [];
    p.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
    p.on('pageerror', e => consoleErrs.push('pageerror:' + e.message));
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch (e) {}
    await p.waitForTimeout(2500);

    const rec = { url, slug, consoleErrs, checks: {} };

    // (A) Full share-button investigation
    // Try clipboard fallback detection
    const shareProbe = await p.evaluate(() => {
      // Look for the FIRST button containing exactly "Share" (not "Share This")
      const candidates = [...document.querySelectorAll('button')].filter(b => {
        const t = (b.textContent||'').trim();
        return t === 'Share' || t.startsWith('Share ');
      });
      const out = candidates.map(b => ({ text: b.textContent.trim().slice(0,30), ariaLabel: b.getAttribute('aria-label'), cls: (b.className||'').slice(0,80) }));
      return { count: candidates.length, list: out, clipboardAvailable: typeof navigator.clipboard !== 'undefined' && typeof navigator.clipboard.writeText === 'function' };
    });
    rec.checks.shareButtonsFound = shareProbe;

    // (B) Click Share, capture the EXACT toast text
    try {
      const shareBtn = await p.$('button:has-text("Share"):not(:has-text("Share This"))');
      if (shareBtn) {
        await shareBtn.scrollIntoViewIfNeeded().catch(()=>{});
        await shareBtn.click().catch(()=>{});
        await p.waitForTimeout(800);
        const toast = await p.evaluate(() => {
          // Toast / popover text after click
          const candidates = [...document.querySelectorAll('[role="dialog"], [role="alert"], [role="status"], .Toastify__toast, [data-state="open"], .modal')];
          return candidates.map(c => ({ role: c.getAttribute('role'), text: (c.textContent||'').trim().slice(0, 200) })).filter(c => c.text.length > 0).slice(0, 5);
        });
        rec.checks.shareToast = toast;
      }
    } catch (e) {}

    // (C) Bookmark toggle — find "Add to Bookmarks" then click twice, verify state
    try {
      const addBtn = await p.$('button:has-text("Add to Bookmarks"), button:has-text("Remove from Bookmarks")');
      if (addBtn) {
        const beforeText = await addBtn.evaluate(el => (el.textContent||'').trim().slice(0,40));
        await addBtn.scrollIntoViewIfNeeded().catch(()=>{});
        await addBtn.click().catch(()=>{});
        await p.waitForTimeout(800);
        const afterText1 = await p.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find(el => /bookmark/i.test(el.textContent||''));
          return b ? (b.textContent||'').trim().slice(0,40) : null;
        });
        await addBtn.click().catch(()=>{});
        await p.waitForTimeout(800);
        const afterText2 = await p.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find(el => /bookmark/i.test(el.textContent||''));
          return b ? (b.textContent||'').trim().slice(0,40) : null;
        });
        rec.checks.bookmarkToggle = { beforeText, after1: afterText1, after2: afterText2, toggledToRemove: /Remove from Bookmarks/i.test(afterText1||''), toggledBackToAdd: /Add to Bookmarks/i.test(afterText2||'') };
      } else {
        rec.checks.bookmarkToggle = { found: false };
      }
    } catch (e) { rec.checks.bookmarkToggleErr = e.message; }

    // (D) Look for Vote / Upvote / Like / Star — these aren't in the labeled list but maybe a star-shaped widget exists
    rec.checks.voteButtons = await p.evaluate(() => {
      // Pattern A: explicit text
      const labels = ['Upvote', 'Vote', 'Vote Up', 'Vote Down', 'Like', 'Star', 'Recommend', 'Rate', 'Helpful', 'Mark Helpful'];
      const all = [...document.querySelectorAll('button, a[role="button"], [role="button"]')];
      const hits = [];
      for (const el of all) {
        const t = (el.textContent||'').trim().slice(0, 30);
        const aria = (el.getAttribute('aria-label') || '');
        if (labels.some(L => t.toLowerCase().includes(L.toLowerCase()) || aria.toLowerCase().includes(L.toLowerCase()))) {
          hits.push({ text: t, aria, cls: (el.className||'').slice(0,60) });
        }
      }
      // Also: a star-shaped icon only — count any element with className containing "star" / "thumbs" / "vote"
      const starClass = [...document.querySelectorAll('[class*="thumbs"], [class*="upvote"], [class*="like"], [class*="vote-button"]')];
      return { hits: hits.slice(0, 20), starClass: starClass.map(e => ({ tag: e.tagName.toLowerCase(), cls: (e.className||'').slice(0,80), text: (e.textContent||'').trim().slice(0,30) })).slice(0, 10) };
    });

    // (E) Look for a per-page "score" / rating widget near the title
    rec.checks.scoreWidget = await p.evaluate(() => {
      const main = document.querySelector('main, article, [role="main"]');
      if (!main) return null;
      const txt = main.innerText || '';
      // Look for a numeric pattern near "score", "rating", "votes", "popularity"
      const scoreNearby = [];
      const counts = [...document.querySelectorAll('*')]
        .filter(e => /score|rating|votes|popularity/i.test(e.className||'') || /score|rating|votes/i.test(e.id||''))
        .slice(0,10);
      for (const c of counts) {
        scoreNearby.push({ tag: c.tagName.toLowerCase(), cls: (c.className||'').slice(0,80), text: (c.textContent||'').trim().slice(0, 60) });
      }
      return { sampleText: txt.slice(0, 600), scoreNearby };
    });

    out[slug] = rec;
    await p.close();
    console.log('DONE', slug);
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  await ctx.close();
  await b.close();
})();
