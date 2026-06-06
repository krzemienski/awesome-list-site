import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  await login(page, h);
  const total = (await h.api('/api/resources?limit=1')).json?.total;
  const fav = (await h.api('/api/favorites')).json;
  const bm = (await h.api('/api/bookmarks')).json;
  const zz = await page.evaluate(async () => { const r = await fetch('/api/admin/resources?search=Audit Test', { credentials:'include' }); const d = await r.json(); const l = d.resources||d; return Array.isArray(l)?l.filter(x=>/audit test|ZZ /i.test(x.title)).length:l; });
  console.log('BASELINE_FINAL:', JSON.stringify({ total, favorites: Array.isArray(fav)?fav.length:fav, bookmarks: Array.isArray(bm)?bm.length:bm, leftoverTestResources: zz }));
  await logout(page, h);
}
