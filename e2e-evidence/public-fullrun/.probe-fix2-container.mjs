import { login } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  await login(page, h);
  const RID = 1827; // SVT-HEVC, valid container id
  const cnt = async () => page.evaluate(async () => { const d = await (await fetch('/api/bookmarks',{credentials:'include'})).json(); return Array.isArray(d)?d.length:d; });
  await page.evaluate(async (r)=>{await fetch('/api/bookmarks/'+r,{method:'DELETE',credentials:'include'});}, RID);
  R.seed = await page.evaluate(async (r)=>(await fetch('/api/bookmarks/'+r,{method:'POST',credentials:'include'})).status, RID);
  R.afterSeed = await cnt();
  // UI remove on /bookmarks
  await h.goto('/bookmarks'); await page.waitForTimeout(2000);
  R.before = await cnt();
  const btn = page.locator('[data-testid="button-bookmark"][aria-label="Remove bookmark"]').first();
  R.btn = await btn.count();
  if (await btn.count()) { await btn.click(); await page.waitForTimeout(2500); }
  R.afterRemove = await cnt();
  R.domGone = await page.evaluate(()=>!/SVT-HEVC/i.test(document.body.innerText));
  if (R.afterRemove>0) await page.evaluate(async (r)=>{await fetch('/api/bookmarks/'+r,{method:'DELETE',credentials:'include'});}, RID);
  R.final = await cnt();
  h.log('FIX2C:', JSON.stringify(R,null,1));
}
