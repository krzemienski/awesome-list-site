// Is it replica lag, or does the bookmark truly persist? POST, DELETE, then read count at intervals.
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  await login(page, h);
  const RID = 186677;
  const cnt = async () => page.evaluate(async () => { const d = await (await fetch('/api/bookmarks', { credentials:'include' })).json(); return Array.isArray(d)?d.length:d; });
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  R.afterClean = await cnt();
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' }); }, RID);
  R.afterPost = await cnt();
  // single DELETE then read at 0ms, 1s, 3s
  const del = await page.evaluate(async (rid) => { const r = await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); return { status: r.status, body: (await r.text()).slice(0,60) }; }, RID);
  R.delResp = del;
  R.count_immediate = await cnt();
  await page.waitForTimeout(1500); R.count_1_5s = await cnt();
  await page.waitForTimeout(2000); R.count_3_5s = await cnt();
  // double-delete test: does a second delete change anything?
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' }); }, RID);
  R.afterRepost = await cnt();
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  R.afterDoubleDelete = await cnt();
  await logout(page, h);
  h.log('BMLAG:', JSON.stringify(R, null, 1));
}
