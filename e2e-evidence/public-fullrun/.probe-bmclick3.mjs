import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  await login(page, h);
  const RID = 186677;
  const cnt = async () => page.evaluate(async () => { const d = await (await fetch('/api/bookmarks', { credentials:'include' })).json(); return Array.isArray(d)?d.length:d; });
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' }); }, RID);
  await h.goto('/bookmarks'); await page.waitForTimeout(2000);
  R.before = await cnt();
  R.ariaBefore = await page.evaluate(() => document.querySelector('[data-testid="button-bookmark"]')?.getAttribute('aria-label'));
  await page.locator('[data-testid="button-bookmark"]').first().click();
  await page.waitForTimeout(1000); R.count_1s = await cnt();
  await page.waitForTimeout(2000); R.count_3s = await cnt();
  R.ariaAfter = await page.evaluate(() => document.querySelector('[data-testid="button-bookmark"]')?.getAttribute('aria-label'));
  R.domGone = await page.evaluate(() => !/FFV1/i.test(document.body.innerText));
  // cleanup
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  R.final = await cnt();
  await logout(page, h);
  h.log('BMCLICK3:', JSON.stringify(R, null, 1));
}
