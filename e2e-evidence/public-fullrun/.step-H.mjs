import { login, logout } from './.lib-login.mjs';

export default async function (page, _ctx, h) {
  const R = {};
  const RID = 186677; // FFV1 Codec

  // ---- logged-out cases first ----
  await logout(page, h); // ensure clean logged-out
  await h.goto(`/resource/${RID}`);
  R.H1_title = await page.evaluate(() => document.querySelector('h1')?.textContent.trim());
  R.H1_hasUrl = await page.evaluate(() => /ffmpeg\.org/.test(document.body.innerText));
  R.H1_hasDesc = await page.evaluate(() => document.body.innerText.includes('lossless'));
  // logged-out favorite/bookmark state
  R.H4H6_loggedOut = await page.evaluate(() => {
    const fav = document.querySelector('[data-testid*="favorite"],[aria-label*="avorite"]');
    const bm = document.querySelector('[data-testid*="bookmark"],[aria-label*="ookmark"]');
    return { favPresent: !!fav, bmPresent: !!bm };
  });
  await h.shot('H-01-detail-loggedout.png');

  // H3: external Visit link target
  R.H3 = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="http"]')].find(x => /ffmpeg/.test(x.href));
    return a ? { href: a.href.slice(0, 45), target: a.target } : 'none';
  });
  // H8: share button present
  R.H8_shareBtn = await page.locator('[data-testid="button-share"]').count();
  // H2: back button
  R.H2_backBtn = await page.locator('[data-testid="button-back"]').count();

  // H10: invalid id
  await h.goto('/resource/999999');
  R.H10 = await page.evaluate(() => /not found|doesn.t exist|404|no resource/i.test(document.body.innerText) ? 'NOT-FOUND-STATE' : document.body.innerText.replace(/\s+/g,' ').slice(0,80));
  await h.shot('H-10-invalid-id.png');

  // ---- logged-in cases ----
  R.loginResult = await login(page, h);
  await h.goto(`/resource/${RID}`);
  // re-probe favorite/bookmark buttons now logged in
  R.H_loggedInBtns = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    return [...main.querySelectorAll('button')].map(b => ({ txt: b.textContent.trim().slice(0,18), aria: b.getAttribute('aria-label'), testid: b.getAttribute('data-testid') })).filter(b => /fav|book|mark|star|save/i.test((b.txt||'')+(b.aria||'')+(b.testid||'')));
  });

  // H5: favorite toggle via API-state cross-check + UI click
  const favBefore = (await h.api('/api/favorites')).json;
  R.H5_favCountBefore = Array.isArray(favBefore) ? favBefore.length : (favBefore?.length ?? JSON.stringify(favBefore).slice(0,40));
  const favBtn = page.locator('[data-testid*="favorite"],[aria-label*="avorite" i]').first();
  R.H5_btnFound = await favBtn.count();
  if (await favBtn.count()) {
    await favBtn.click();
    await page.waitForTimeout(1500);
    const favAfter = (await h.api('/api/favorites')).json;
    R.H5_favCountAfter = Array.isArray(favAfter) ? favAfter.length : favAfter?.length;
    R.H5_toastOrState = await page.evaluate(() => document.body.innerText.match(/added|favorit|saved/i)?.[0] || 'no-toast-text');
    await h.shot('H-05-favorite-toggled.png');
    // toggle back off to restore baseline
    await favBtn.click();
    await page.waitForTimeout(1200);
    const favRestore = (await h.api('/api/favorites')).json;
    R.H5_favCountRestored = Array.isArray(favRestore) ? favRestore.length : favRestore?.length;
  }

  // H7: bookmark toggle
  const bmBefore = (await h.api('/api/bookmarks')).json;
  R.H7_bmCountBefore = Array.isArray(bmBefore) ? bmBefore.length : bmBefore?.length;
  const bmBtn = page.locator('[data-testid*="bookmark"],[aria-label*="ookmark" i]').first();
  R.H7_btnFound = await bmBtn.count();
  if (await bmBtn.count()) {
    await bmBtn.click();
    await page.waitForTimeout(1500);
    const bmAfter = (await h.api('/api/bookmarks')).json;
    R.H7_bmCountAfter = Array.isArray(bmAfter) ? bmAfter.length : bmAfter?.length;
    await h.shot('H-07-bookmark-toggled.png');
    await bmBtn.click();
    await page.waitForTimeout(1200);
    const bmRestore = (await h.api('/api/bookmarks')).json;
    R.H7_bmCountRestored = Array.isArray(bmRestore) ? bmRestore.length : bmRestore?.length;
  }

  // H9: related resources render + clickable
  await h.goto(`/resource/${RID}`);
  const relApi = await h.api(`/api/resources/${RID}/related`);
  R.H9_relatedApiCount = relApi.json?.resources?.length ?? relApi.json?.length ?? JSON.stringify(relApi).slice(0,60);
  R.H9_relatedSectionPresent = await page.evaluate(() => /Related/i.test(document.body.innerText));
  await h.shot('H-09-related.png');

  await logout(page, h); // restore logged-out baseline
  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
