import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  await login(page, h);
  const RID = 186677;
  const cnt = async () => page.evaluate(async () => { const d = await (await fetch('/api/bookmarks', { credentials:'include' })).json(); return Array.isArray(d)?d.length:d; });
  // Test A: DELETE with Content-Type json (exactly what apiRequest sends)
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method:'DELETE', credentials:'include' }); }, RID);
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method:'POST', credentials:'include' }); }, RID);
  R.seeded = await cnt();
  R.delWithJsonHdr = await page.evaluate(async (rid) => { const r = await fetch('/api/bookmarks/'+rid, { method:'DELETE', credentials:'include', headers:{'Content-Type':'application/json'} }); return r.status; }, RID);
  R.countAfterJsonHdrDel = await cnt();
  // reset + Test B: through the SAME apiRequest the app uses (import it)
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method:'POST', credentials:'include' }); }, RID);
  R.reseed = await cnt();
  // simulate apiRequest exactly: spread options, json header, credentials include, no body
  R.delViaApiReqShape = await page.evaluate(async (rid) => {
    const res = await fetch('/api/bookmarks/'+rid, { method:'DELETE', headers:{'Content-Type':'application/json'}, credentials:'include' });
    return res.status;
  }, RID);
  R.countAfterApiReqShape = await cnt();
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method:'DELETE', credentials:'include' }); }, RID);
  R.final = await cnt();
  await logout(page, h);
  h.log('DELHDR:', JSON.stringify(R, null, 1));
}
