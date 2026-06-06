// M9b: prove UI remove of bookmark works (proper settle + re-check). Restore baseline after.
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  const RID = 186677;
  await login(page, h);
  // seed
  R.seed = await page.evaluate(async (rid) => (await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' })).status, RID);
  await h.goto('/bookmarks'); await page.waitForTimeout(2000);
  R.beforeApi = (await h.api('/api/bookmarks')).json?.length ?? (await h.api('/api/bookmarks')).json;
  R.beforeDom = await page.evaluate(() => /FFV1/i.test(document.body.innerText));

  // click Remove bookmark button via Playwright locator (real pointer)
  const btn = page.locator('[data-testid="button-bookmark"][aria-label="Remove bookmark"]').first();
  R.btnCount = await btn.count();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(2500); // settle optimistic update + refetch
  }
  R.afterApi = (await h.api('/api/bookmarks')).json;
  R.afterApi = Array.isArray(R.afterApi) ? R.afterApi.length : R.afterApi;
  // re-read DOM after settle
  await page.waitForTimeout(500);
  R.afterDom = await page.evaluate(() => /FFV1/i.test(document.body.innerText) ? 'still-present' : 'gone');
  R.savedText = await page.evaluate(() => (document.body.innerText.match(/\d+ saved resource|no bookmark|haven.t saved|empty/i) || [''])[0]);
  await h.shot('M-09-bookmark-removed.png');

  // ensure baseline 0
  if (R.afterApi > 0) await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  R.finalBm = (await h.api('/api/bookmarks')).json;
  R.finalBm = Array.isArray(R.finalBm) ? R.finalBm.length : R.finalBm;

  await logout(page, h);
  h.log('M9B:', JSON.stringify(R, null, 1));
}
