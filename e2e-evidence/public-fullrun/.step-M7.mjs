import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const res = await h.rid('subcategory=Codecs'); const RID = res.id;
  await login(page, h);
  await page.evaluate(async (r)=>{await fetch('/api/bookmarks/'+r,{method:'POST',credentials:'include'});}, RID);
  await h.goto('/bookmarks'); await page.waitForTimeout(2000);
  const sort = await page.evaluate(()=>{ const sel=document.querySelector('button[role="combobox"], [data-testid*="sort"]'); return sel? sel.textContent.replace(/\s+/g,' ').trim().slice(0,40):'none'; });
  // cleanup
  await page.evaluate(async (r)=>{await fetch('/api/bookmarks/'+r,{method:'DELETE',credentials:'include'});}, RID);
  await logout(page, h);
  h.log('M7:', JSON.stringify({ sortSelect: sort }));
}
