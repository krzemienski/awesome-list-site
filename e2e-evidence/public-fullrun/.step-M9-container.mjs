import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  const res = await h.rid('subcategory=Codecs'); const RID = res.id; R.res = res;
  await login(page, h);
  const cnt = async () => page.evaluate(async () => { const d = await (await fetch('/api/bookmarks',{credentials:'include'})).json(); return Array.isArray(d)?d.length:d; });
  await page.evaluate(async (r)=>{await fetch('/api/bookmarks/'+r,{method:'DELETE',credentials:'include'});}, RID);
  R.seed = await page.evaluate(async (r)=>(await fetch('/api/bookmarks/'+r,{method:'POST',credentials:'include'})).status, RID);
  await h.goto('/bookmarks'); await page.waitForTimeout(2000);
  R.before = await cnt();
  R.savedText = await page.evaluate(()=>(document.body.innerText.match(/\d+ saved resource/i)||[''])[0]);
  await h.shot('M-09-bookmark-present.png');
  const btn = page.locator('[data-testid="button-bookmark"][aria-label="Remove bookmark"]').first();
  R.btn = await btn.count();
  if (await btn.count()) { await btn.click(); await page.waitForTimeout(2500); }
  R.afterRemove = await cnt();
  R.domGone = await page.evaluate(()=>!/saved resource/i.test(document.body.innerText) || /No Bookmark/i.test(document.body.innerText));
  R.emptyText = await page.evaluate(()=>(document.body.innerText.match(/No Bookmark|saved resource/i)||[''])[0]);
  await h.shot('M-09-bookmark-removed.png');
  if (R.afterRemove>0) await page.evaluate(async (r)=>{await fetch('/api/bookmarks/'+r,{method:'DELETE',credentials:'include'});}, RID);
  R.final = await cnt();
  await logout(page, h);
  h.log('M9C:', JSON.stringify(R,null,1));
}
