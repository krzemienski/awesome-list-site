// Phase 7: bookmark/favorite click toggling and state persistence
const { chromium } = require('playwright');
const fs = require('fs');

const ROOT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace';
const AUTH_FILE = `${ROOT}/hunt-auth.json`;
const OUT = `${ROOT}/bugs/resources-phase7.json`;

const URL = 'https://awesome.video/resource/185020';

(async () => {
  const out = { clicks: [] };
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ storageState: AUTH_FILE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  // Helper: find buttons by exact text
  async function clickByExactText(text, label) {
    const before = await p.evaluate((t) => {
      const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').trim() === t);
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { found: true, x: r.x, y: r.y, w: r.width, h: r.height };
    }, text);
    if (!before) { out.clicks.push({ label, found: false }); return; }
    // click via coords
    await p.mouse.click(before.x + before.w / 2, before.y + before.h / 2);
    await p.waitForTimeout(800);
    const after = await p.evaluate((t) => {
      const all = [...document.querySelectorAll('button')].map(b => (b.textContent||'').trim()).filter(Boolean);
      const matches = all.filter(s => /bookmark/i.test(s) || /favorite/i.test(s));
      return matches;
    }, text);
    out.clicks.push({ label, action: text, before, afterAllBookmarkOrFavorite: after });
  }

  await clickByExactText('Bookmarked', 'initialClick_Bookmarked');
  await clickByExactText('Add to Bookmarks', 'afterClick_Add');
  await clickByExactText('Remove Bookmark', 'afterClick_Remove');
  await clickByExactText('Favorite', 'clickFavorite_top');
  await clickByExactText('Add to Favorites', 'clickFavorite_sidebar');
  await clickByExactText('Remove Bookmark', 'clickRemoveBm_again');

  // reload and read state again
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  out.afterReloadBmFav = await p.evaluate(() => {
    return [...document.querySelectorAll('button')].map(b => (b.textContent||'').trim()).filter(t => /bookmark|favorite/i.test(t)).slice(0, 10);
  });

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await ctx.close();
  await b.close();
})();
