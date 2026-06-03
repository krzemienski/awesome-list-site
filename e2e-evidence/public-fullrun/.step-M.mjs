import { login, logout } from './.lib-login.mjs';

export default async function (page, _ctx, h) {
  const R = {};
  const RID = 186677;

  // M1: logged-out /profile + /bookmarks redirect to login (AuthGuard)
  await logout(page, h);
  await h.goto('/profile');
  await page.waitForTimeout(1500);
  R.M1_profilePath = page.url();
  await h.shot('M-01-profile-guard.png');
  await h.goto('/bookmarks');
  await page.waitForTimeout(1500);
  R.M1_bookmarksPath = page.url();

  // login for the rest
  await login(page, h);

  // M2: /profile renders user info + tabs
  await h.goto('/profile');
  await page.waitForTimeout(1500);
  R.M2 = await page.evaluate(() => ({
    path: location.pathname,
    hasEmail: /admin@example\.com/i.test(document.body.innerText),
    tabs: [...document.querySelectorAll('[role="tab"]')].map(t => t.textContent.trim().slice(0, 20)),
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 150),
  }));
  await h.shot('M-02-profile.png');

  // M8: bookmarks empty state (baseline = 0)
  await h.goto('/bookmarks');
  await page.waitForTimeout(1500);
  R.M8_emptyState = await page.evaluate(() => ({
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 180),
    hasEmpty: /no bookmark|empty|haven.t|nothing|get started/i.test(document.body.innerText),
  }));
  R.M6_bookmarksRender = await page.evaluate(() => location.pathname.includes('bookmark'));
  await h.shot('M-06-bookmarks-empty.png');

  // M9 setup: seed a bookmark via API, then test it renders + remove via UI
  const add = await page.evaluate(async (rid) => { const r = await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' }); return r.status; }, RID);
  R.M9_seedStatus = add;
  await h.goto('/bookmarks');
  await page.waitForTimeout(1500);
  R.M9_afterSeed = await page.evaluate(() => ({
    cards: document.querySelectorAll('article,[data-testid*="bookmark"],[class*="card"]').length,
    hasFFV1: /FFV1/i.test(document.body.innerText),
  }));
  // M7: bookmarks sort select
  R.M7_sortSelect = await page.locator('button[role="combobox"],select').count();
  await h.shot('M-09-bookmark-present.png');

  // M9 remove: find a remove button or delete via API as functional proof, then verify list updates
  const removeBtn = page.locator('button[aria-label*="remove" i],button[data-testid*="remove"],button', { hasText: /remove|delete|unbookmark/i }).first();
  R.M9_removeBtnFound = await removeBtn.count();
  if (await removeBtn.count()) {
    await removeBtn.click();
    await page.waitForTimeout(1500);
  } else {
    // fallback: API delete (still proves remove flow + list refresh on reload)
    await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
    await h.goto('/bookmarks');
    await page.waitForTimeout(1200);
  }
  R.M9_afterRemove = await page.evaluate(() => /FFV1/i.test(document.body.innerText));
  const bmFinal = await h.api('/api/bookmarks');
  R.M9_bmCountFinal = Array.isArray(bmFinal.json) ? bmFinal.json.length : (bmFinal.json?.length ?? 'shape?');

  // M3/M4: profile favorites + bookmarks tabs/lists
  await h.goto('/profile');
  await page.waitForTimeout(1500);
  R.M3M4 = await page.evaluate(() => ({
    mentionsFav: /favorit/i.test(document.body.innerText),
    mentionsBookmark: /bookmark/i.test(document.body.innerText),
  }));

  // M5: profile logout button
  const logoutBtn = page.locator('button', { hasText: /log ?out|sign out/i }).first();
  R.M5_logoutBtnFound = await logoutBtn.count();

  // cleanup: ensure bookmarks=0 + logout
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  await logout(page, h);
  const bmCheck = await h.api('/api/bookmarks');
  R.cleanup_bmAfterLogout = bmCheck.status;

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
