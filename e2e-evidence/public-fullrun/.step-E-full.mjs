// PA-E Category page full case set E1-E19 against /category/encoding-codecs (server=337).
export default async function (page, _ctx, h) {
  const R = {};
  const cardCount = () => page.evaluate(() => document.querySelectorAll('article[data-testid^="card-resource"]').length);
  const showText = () => page.evaluate(() => (document.body.innerText.match(/Showing\s+[\d,]+\s+of\s+[\d,]+/i) || [null])[0]);
  const step = async (id, fn) => { try { await fn(); } catch (e) { R[id + '_ERR'] = e.message.slice(0, 120); h.log('CASE', id, 'ERR:', e.message.slice(0, 80)); } };

  // E1 + E19: resources render, count == server count
  await h.goto('/category/encoding-codecs');
  const api = await h.api('/api/resources?category=Encoding%20%26%20Codecs&limit=1');
  R.serverTotal = api.json?.total;
  R.E1_cards = await cardCount();
  R.E1_show = await showText();
  await h.shot('E-01-category-grid-default.png');

  // E2: subcategory select populated
  await page.locator('button[role="combobox"]').first().click();
  await page.waitForTimeout(500);
  R.E2_subOptions = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim()));
  // E3: select "Codecs" subcategory
  await page.locator('[role="option"]', { hasText: /^Codecs$/ }).click();
  await page.waitForTimeout(2000);
  R.E3_cardsAfter = await cardCount();
  R.E3_show = await showText();
  R.E4_url = page.url();
  await h.shot('E-03-subcat-codecs-filtered.png');

  // E4: reload preserves ?subcategory=
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  R.E4_urlAfterReload = page.url();
  R.E4_cardsAfterReload = await cardCount();

  // reset to all subcats for clean sort test
  await h.goto('/category/encoding-codecs');

  // E6: sort Name A-Z, capture first 3 titles
  const titles = () => page.evaluate(() => [...document.querySelectorAll('article[data-testid^="card-resource"] .line-clamp-2')].slice(0, 4).map(e => e.textContent.trim()));
  R.E6_before = await titles();
  await page.locator('button[role="combobox"]').nth(1).click();
  await page.waitForTimeout(500);
  await page.locator('[role="option"]', { hasText: 'Name A-Z' }).click();
  await page.waitForTimeout(1500);
  R.E6_nameAsc = await titles();
  R.E7_sortUrl = page.url();
  await h.shot('E-06-sort-name-asc.png');

  // E7: reload preserves sort
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  R.E7_urlAfterReload = page.url();
  R.E7_titlesAfterReload = await titles();

  // E8/E9/E10/E11: view modes
  await h.goto('/category/encoding-codecs');
  async function setView(label, shot) {
    await page.locator(`button[aria-label="${label}"]`).click();
    await page.waitForTimeout(1200);
    const ls = await page.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) o[k] = localStorage.getItem(k); return o; });
    await h.shot(shot);
    return ls;
  }
  R.E8_gridLS = await setView('Grid view', 'E-08-view-grid.png');
  R.E9_listLS = await setView('List view', 'E-09-view-list.png');
  R.E10_compactLS = await setView('Compact view', 'E-10-view-compact.png');
  // E11: reload keeps compact
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  R.E11_lsAfterReload = await page.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) o[k] = localStorage.getItem(k); return o; });
  R.E11_compactStillActive = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label="Compact view"]');
    return b ? (b.getAttribute('data-state') || b.getAttribute('aria-pressed') || b.className.includes('bg-') ) : 'no-btn';
  });

  // E12: card click -> /resource/:id (whole article is the click target)
  await h.goto('/category/encoding-codecs');
  await page.locator('article[data-testid^="card-resource"]').first().click();
  await page.waitForTimeout(2000);
  R.E12_url = page.url();
  await h.shot('E-12-resource-detail-nav.png');
  // E13: external-link button opens new tab
  await h.goto('/category/encoding-codecs');
  const pagesBefore = _ctx.pages().length;
  await page.locator('button[data-testid^="button-external"]').first().click();
  await page.waitForTimeout(1500);
  R.E13_newTabOpened = _ctx.pages().length > pagesBefore;
  R.E13_newTabUrl = R.E13_newTabOpened ? _ctx.pages()[_ctx.pages().length - 1].url().slice(0, 60) : 'no-new-tab';
  // close extra tabs to keep page[0] canonical
  for (const p of _ctx.pages().slice(1)) { try { await p.close(); } catch {} }

  // E5: tag filter
  await h.goto('/category/encoding-codecs');
  R.E5_before = await cardCount();
  const tagBtn = page.locator('button', { hasText: 'Filter by Tag' }).first();
  if (await tagBtn.count()) {
    await tagBtn.click();
    await page.waitForTimeout(800);
    R.E5_tagOptions = await page.evaluate(() => [...document.querySelectorAll('[role="option"],[role="menuitemcheckbox"],[cmdk-item]')].map(o => o.textContent.trim()).slice(0, 8));
    // pick first tag option
    const firstTag = page.locator('[role="option"],[role="menuitemcheckbox"],[cmdk-item]').first();
    if (await firstTag.count()) {
      R.E5_pickedTag = (await firstTag.textContent())?.trim();
      await firstTag.click();
      await page.waitForTimeout(1500);
      R.E5_after = await cardCount();
      R.E5_show = await showText();
    }
    await h.shot('E-05-tag-filter.png');
  } else {
    R.E5_tagOptions = 'NO Filter by Tag button';
  }

  // E17: empty filter result — combine an unlikely subcat+tag; fallback bogus query param
  await h.goto('/category/encoding-codecs?subcategory=__nonexistent__');
  await page.waitForTimeout(1500);
  R.E17_cards = await cardCount();
  R.E17_bodyText = await page.evaluate(() => {
    const t = document.body.innerText;
    return /no resources|nothing|empty|0 of 0|Showing 0/i.test(t) ? 'EMPTY-STATE-PRESENT' : t.slice(0, 120);
  });
  await h.shot('E-17-empty-state.png');

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
