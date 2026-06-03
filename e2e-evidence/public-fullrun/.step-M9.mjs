// M9: seed a bookmark, prove it appears on /bookmarks, REMOVE via UI, prove it's gone. Restore baseline.
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  const RID = 186677; // FFV1 Codec
  await login(page, h);

  // seed via API (clean known state) — canonical route: POST /api/bookmarks/:resourceId (path param)
  R.seedStatus = await page.evaluate(async (rid) => {
    const res = await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' });
    return res.status;
  }, RID);
  await h.goto('/bookmarks');
  await page.waitForTimeout(1500);

  R.afterSeed = await page.evaluate(() => {
    const t = document.body.innerText;
    return { hasFFV1: /FFV1/i.test(t), savedText: (t.match(/\d+ saved resource/i) || [''])[0] };
  });
  await h.shot('M-09-bookmark-present.png');

  // find remove affordance on the bookmark card: any button inside the FFV1 card
  R.cardButtons = await page.evaluate(() => {
    const card = [...document.querySelectorAll('article,[data-testid*="card" i],.cursor-pointer')].find(c => /FFV1/i.test(c.textContent));
    if (!card) return 'no-card';
    return [...card.querySelectorAll('button')].map(b => ({ testid: b.getAttribute('data-testid'), aria: b.getAttribute('aria-label'), txt: b.textContent.trim().slice(0, 14) }));
  });

  // click the bookmark/remove button (filled icon = remove)
  R.removed = await page.evaluate(async () => {
    const card = [...document.querySelectorAll('article,[data-testid*="card" i],.cursor-pointer')].find(c => /FFV1/i.test(c.textContent));
    if (!card) return 'no-card';
    const btn = [...card.querySelectorAll('button')].find(b => /bookmark|remove|save/i.test((b.getAttribute('data-testid') || '') + (b.getAttribute('aria-label') || '')));
    if (!btn) { // fallback: first icon-only button
      const icons = [...card.querySelectorAll('button')].filter(b => !b.textContent.trim());
      if (icons[0]) { icons[0].click(); return 'clicked-icon'; }
      return 'no-remove-btn';
    }
    btn.click();
    return 'clicked-' + (btn.getAttribute('data-testid') || btn.getAttribute('aria-label'));
  });
  await page.waitForTimeout(1500);

  R.afterRemoveApi = await page.evaluate(async () => {
    const res = await fetch('/api/bookmarks', { credentials: 'include' });
    const d = await res.json();
    return Array.isArray(d) ? d.length : d;
  });
  R.afterRemoveDom = await page.evaluate(() => /FFV1/i.test(document.body.innerText));

  // ensure baseline: if still present, delete via canonical DELETE /api/bookmarks/:resourceId
  if (R.afterRemoveApi > 0) {
    await page.evaluate(async (rid) => { await fetch(`/api/bookmarks/${rid}`, { method: 'DELETE', credentials: 'include' }); }, RID);
    R.forcedClean = (await page.evaluate(async () => { const r = await fetch('/api/bookmarks', { credentials: 'include' }); const d = await r.json(); return Array.isArray(d) ? d.length : d; }));
  }
  R.finalBmCount = (await h.api('/api/bookmarks')).json;
  R.finalBmCount = Array.isArray(R.finalBmCount) ? R.finalBmCount.length : R.finalBmCount;

  await logout(page, h);
  h.log('M9_RESULT:', JSON.stringify(R, null, 1));
}
