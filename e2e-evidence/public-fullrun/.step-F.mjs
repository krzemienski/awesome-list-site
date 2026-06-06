// PA-F Subcategory page F1-F8. Use /subcategory/codecs (known live slug).
export default async function (page, _ctx, h) {
  const R = {};
  const cardCount = () => page.evaluate(() => document.querySelectorAll('article[data-testid^="card-resource"]').length);
  const showText = () => page.evaluate(() => (document.body.innerText.match(/Showing\s+[\d,]+(\s+of\s+[\d,]+)?/i) || [null])[0]);
  const titles = () => page.evaluate(() => [...document.querySelectorAll('article[data-testid^="card-resource"] .line-clamp-2')].slice(0, 4).map(e => e.textContent.trim()));
  const breadcrumb = () => page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label*="readcrumb"],ol,[class*="breadcrumb"]');
    return nav ? nav.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : document.querySelector('header')?.innerText.replace(/\s+/g,' ').slice(0,120);
  });

  // F1: resources render
  await h.goto('/subcategory/codecs');
  R.F1_url = page.url();
  R.F1_cards = await cardCount();
  R.F1_show = await showText();
  R.F6_breadcrumb = await breadcrumb();
  // cross-check vs API (subcategory filter)
  const api = await h.api('/api/resources?subcategory=Codecs&limit=1');
  R.F1_apiTotal = api.json?.total ?? api.text;
  await h.shot('F-01-subcategory-codecs.png');

  // F3: sort works
  const sortBtns = page.locator('button[role="combobox"]');
  R.F_comboCount = await sortBtns.count();
  R.F3_before = await titles();
  // last combobox is sort (subcategory page may have only sort, no subcat select)
  await sortBtns.last().click();
  await page.waitForTimeout(500);
  const sortOpts = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim()));
  R.F3_sortOpts = sortOpts;
  if (sortOpts.includes('Name A-Z')) {
    await page.locator('[role="option"]', { hasText: 'Name A-Z' }).click();
    await page.waitForTimeout(1500);
    R.F3_nameAsc = await titles();
    R.F4_sortUrl = page.url();
  } else { await page.keyboard.press('Escape'); }
  await h.shot('F-03-sort.png');

  // F4: reload preserves
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  R.F4_urlAfterReload = page.url();
  R.F4_titlesAfterReload = await titles();

  // F2: tag filter — pick a PARTIAL-coverage tag (open-source=6 of 14) to prove filtering
  await h.goto('/subcategory/codecs');
  const tagBtn = page.locator('button', { hasText: 'Filter by Tag' }).first();
  R.F2_tagBtn = await tagBtn.count();
  if (await tagBtn.count()) {
    R.F2_before = await cardCount();
    await tagBtn.click();
    await page.waitForTimeout(800);
    // pick the first tag whose trailing count is < 14 (partial coverage proves filtering)
    const pick = await page.evaluate(() => {
      const cbs = [...document.querySelectorAll('[role="checkbox"]')];
      for (let i = 0; i < cbs.length; i++) {
        const row = cbs[i].closest('label,div,li') || cbs[i].parentElement;
        const txt = (row?.textContent || '').trim();
        const m = txt.match(/(\d+)\s*$/);
        if (m && parseInt(m[1], 10) < 14) return { i, txt: txt.slice(0, 30), count: parseInt(m[1], 10) };
      }
      return { i: -1 };
    });
    R.F2_pickedTag = pick.txt;
    R.F2_pickedCount = pick.count;
    const idx = pick.i;
    R.F2_tagIdx = idx;
    if (idx >= 0) {
      await page.locator('[role="checkbox"]').nth(idx).click();
      await page.waitForTimeout(1200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(900);
      R.F2_after = await cardCount();
      R.F2_show = await showText();
    }
    await h.shot('F-02-tag-filter.png');
  }

  // F5: card BODY click -> /resource/:id detail (NOT external new tab)
  await h.goto('/subcategory/codecs');
  const tabsBefore = _ctx.pages().length;
  await page.locator('article[data-testid^="card-resource"] .line-clamp-2').first().click();
  await page.waitForTimeout(2000);
  R.F5_url = page.url();
  R.F5_extraTabs = _ctx.pages().length - tabsBefore;
  await h.shot('F-05-detail-nav.png');
  for (const p of _ctx.pages().slice(1)) { try { await p.close(); } catch {} }
  // F5b: external button still opens new tab
  await h.goto('/subcategory/codecs');
  const tb2 = _ctx.pages().length;
  const extBtn = page.locator('button[data-testid^="button-external"]').first();
  R.F5b_extBtnCount = await extBtn.count();
  if (await extBtn.count()) {
    await extBtn.click();
    await page.waitForTimeout(1200);
    R.F5b_newTab = _ctx.pages().length > tb2;
    R.F5b_url = R.F5b_newTab ? _ctx.pages()[_ctx.pages().length - 1].url().slice(0, 50) : 'none';
    for (const p of _ctx.pages().slice(1)) { try { await p.close(); } catch {} }
  }

  // F6: breadcrumb category > subcategory
  await h.goto('/subcategory/codecs');
  R.F6_breadcrumbs = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-label*="readcrumb" i]')].map(n => n.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)));

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
