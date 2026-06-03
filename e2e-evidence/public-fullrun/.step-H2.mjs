// PA-H Resource Detail H1-H11 — dataset-agnostic (resolves real ids via h.rid).
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  const res = await h.rid('subcategory=Codecs'); // a stable codec resource
  const RID = res.id;
  R.resource = res;

  await logout(page, h);
  await h.goto(`/resource/${RID}`);
  R.H1_title = await page.evaluate(() => document.querySelector('h1')?.textContent.trim());
  R.H1_hasDesc = await page.evaluate(() => (document.querySelector('main')||document.body).innerText.length > 200);
  R.H4H6_loggedOut = await page.evaluate(() => ({
    favPresent: !!document.querySelector('[data-testid="button-favorite"]'),
    bmPresent: !!document.querySelector('[data-testid="button-bookmark"]'),
  }));
  await h.shot('H-01-detail-loggedout.png');
  R.H3 = await page.evaluate(() => { const a = document.querySelector('a[href^="http"]'); return a ? { hasExternal: true, target: a.target } : 'none'; });
  R.H8_shareBtn = await page.locator('[data-testid="button-share"]').count();
  R.H2_backBtn = await page.locator('[data-testid="button-back"]').count();

  // H10 invalid id
  await h.goto('/resource/999999');
  R.H10 = await page.evaluate(() => /not found|doesn.t exist|404|no resource/i.test(document.body.innerText) ? 'NOT-FOUND-STATE' : 'no-state');
  await h.shot('H-10-invalid-id.png');

  // logged-in fav/bookmark toggles + restore baseline
  R.login = await login(page, h);
  await h.goto(`/resource/${RID}`);
  const favBtn = page.locator('[data-testid="button-favorite"]').first();
  R.H5_btn = await favBtn.count();
  R.H5_before = (await h.api('/api/favorites')).json?.length ?? 0;
  if (await favBtn.count()) {
    await favBtn.click(); await page.waitForTimeout(1500);
    R.H5_after = (await h.api('/api/favorites')).json?.length ?? 0;
    await h.shot('H-05-favorite-toggled.png');
    await favBtn.click(); await page.waitForTimeout(1200); // restore
    R.H5_restored = (await h.api('/api/favorites')).json?.length ?? 0;
  }
  const bmBtn = page.locator('[data-testid="button-bookmark"]').first();
  R.H7_btn = await bmBtn.count();
  R.H7_before = (await h.api('/api/bookmarks')).json?.length ?? 0;
  if (await bmBtn.count()) {
    await bmBtn.click(); await page.waitForTimeout(1500);
    R.H7_after = (await h.api('/api/bookmarks')).json?.length ?? 0;
    await h.shot('H-07-bookmark-toggled.png');
    await bmBtn.click(); await page.waitForTimeout(1200); // restore
    R.H7_restored = (await h.api('/api/bookmarks')).json?.length ?? 0;
  }

  // H9 related
  await h.goto(`/resource/${RID}`);
  const rel = await h.api(`/api/resources/${RID}/related`);
  R.H9_relatedApi = rel.json?.resources?.length ?? rel.json?.length ?? 0;
  R.H9_section = await page.evaluate(() => /Related/i.test(document.body.innerText));
  await h.shot('H-09-related.png');

  // hard-restore baseline regardless
  await page.evaluate(async (rid) => { await fetch('/api/favorites/'+rid,{method:'DELETE',credentials:'include'}); await fetch('/api/bookmarks/'+rid,{method:'DELETE',credentials:'include'}); }, RID);
  R.favFinal = (await h.api('/api/favorites')).json?.length ?? 0;
  R.bmFinal = (await h.api('/api/bookmarks')).json?.length ?? 0;
  await logout(page, h);
  h.log('RESULTS_H:', JSON.stringify(R, null, 1));
}
