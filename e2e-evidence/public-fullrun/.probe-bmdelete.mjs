// Probe: does DELETE /api/bookmarks/:id actually remove? Test the raw endpoint + the UI click path.
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  const RID = 186677;
  await login(page, h);
  // clean slate
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  // seed
  R.seed = await page.evaluate(async (rid) => (await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' })).status, RID);
  R.countAfterSeed = await page.evaluate(async () => { const d = await (await fetch('/api/bookmarks', { credentials: 'include' })).json(); return Array.isArray(d) ? d.length : d; });

  // raw DELETE
  R.deleteStatus = await page.evaluate(async (rid) => {
    const res = await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' });
    let body; try { body = await res.text(); } catch { body = ''; }
    return { status: res.status, body: body.slice(0, 120) };
  }, RID);
  R.countAfterDelete = await page.evaluate(async () => { const d = await (await fetch('/api/bookmarks', { credentials: 'include' })).json(); return Array.isArray(d) ? d.length : d; });

  await logout(page, h);
  h.log('BMDELETE:', JSON.stringify(R, null, 1));
}
