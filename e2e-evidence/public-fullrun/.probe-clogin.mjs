import { login } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const r = await login(page, h);
  const me = await h.api('/api/auth/user');
  h.log('LOGIN:', JSON.stringify({ loginResult: r, authUser: me.json?.email || me.json?.user?.email || me.status }));
  // try bookmark POST + read with explicit status
  const RID = 186677;
  const post = await page.evaluate(async (rid) => { const x = await fetch('/api/bookmarks/'+rid,{method:'POST',credentials:'include'}); return x.status; }, RID);
  const cnt = await page.evaluate(async () => { const x = await fetch('/api/bookmarks',{credentials:'include'}); const d = await x.json(); return Array.isArray(d)?d.length:d; });
  h.log('BM:', JSON.stringify({ postStatus: post, count: cnt }));
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/'+rid,{method:'DELETE',credentials:'include'}); }, RID);
}
