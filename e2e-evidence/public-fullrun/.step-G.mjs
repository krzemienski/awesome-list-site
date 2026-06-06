// PA-G Sub-subcategory G1-G8. Slugs: hevc (10), ffmpeg (65), origin-servers (1).
export default async function (page, _ctx, h) {
  const R = {};
  const cardCount = () => page.evaluate(() => document.querySelectorAll('article[data-testid^="card-resource"]').length);
  const showText = () => page.evaluate(() => (document.body.innerText.match(/Showing\s+[\d,]+(\s+of\s+[\d,]+)?/i) || [null])[0]);
  const titles = () => page.evaluate(() => [...document.querySelectorAll('article[data-testid^="card-resource"] .line-clamp-2')].slice(0, 3).map(e => e.textContent.trim().slice(0, 30)));

  // G1: HEVC=10
  await h.goto('/sub-subcategory/hevc');
  R.G1_hevc_cards = await cardCount();
  R.G1_hevc_show = await showText();
  const apiHevc = await h.api('/api/resources?subSubcategory=HEVC&limit=1');
  R.G1_hevc_api = apiHevc.json?.total ?? apiHevc.text;
  await h.shot('G-01-hevc.png');

  // G1b: FFMPEG=65
  await h.goto('/sub-subcategory/ffmpeg');
  R.G1_ffmpeg_cards = await cardCount();
  R.G1_ffmpeg_show = await showText();
  const apiFf = await h.api('/api/resources?subSubcategory=FFMPEG&limit=1');
  R.G1_ffmpeg_api = apiFf.json?.total ?? apiFf.text;
  await h.shot('G-01b-ffmpeg.png');

  // G7: origin-servers=1
  await h.goto('/sub-subcategory/origin-servers');
  R.G7_origin_cards = await cardCount();
  R.G7_origin_show = await showText();
  R.G7_breadcrumbs = await page.evaluate(() => [...document.querySelectorAll('[aria-label*="readcrumb" i]')].map(n => n.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)));
  await h.shot('G-07-origin-servers.png');

  // G2: tag filter (on hevc)
  await h.goto('/sub-subcategory/hevc');
  const tagBtn = page.locator('button', { hasText: 'Filter by Tag' }).first();
  R.G2_tagBtn = await tagBtn.count();
  if (await tagBtn.count()) {
    R.G2_before = await cardCount();
    await tagBtn.click();
    await page.waitForTimeout(800);
    const pick = await page.evaluate(() => {
      const cbs = [...document.querySelectorAll('[role="checkbox"]')];
      for (let i = 0; i < cbs.length; i++) {
        const row = cbs[i].closest('label,div,li') || cbs[i].parentElement;
        const txt = (row?.textContent || '').trim();
        const m = txt.match(/(\d+)\s*$/);
        if (m) return { i, txt: txt.slice(0, 30), count: parseInt(m[1], 10) };
      }
      return { i: -1 };
    });
    R.G2_pickedTag = pick.txt; R.G2_pickedCount = pick.count;
    if (pick.i >= 0) {
      await page.locator('[role="checkbox"]').nth(pick.i).click();
      await page.waitForTimeout(1200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      R.G2_after = await cardCount();
      R.G2_show = await showText();
    }
    await h.shot('G-02-tag-filter.png');
  }

  // G3: sort
  await h.goto('/sub-subcategory/ffmpeg');
  R.G3_before = await titles();
  const sortBtn = page.locator('button[role="combobox"]').last();
  await sortBtn.click();
  await page.waitForTimeout(500);
  await page.locator('[role="option"]', { hasText: 'Name A-Z' }).click();
  await page.waitForTimeout(1500);
  R.G3_nameAsc = await titles();
  R.G4_sortUrl = page.url();
  // G4: reload preserves
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  R.G4_urlAfterReload = page.url();
  R.G4_titlesAfterReload = await titles();
  await h.shot('G-03-sort.png');

  // G5: card click -> detail (the SubSubcategory fix)
  await h.goto('/sub-subcategory/hevc');
  const tabsBefore = _ctx.pages().length;
  await page.locator('article[data-testid^="card-resource"] .line-clamp-2').first().click();
  await page.waitForTimeout(2000);
  R.G5_url = page.url();
  R.G5_extraTabs = _ctx.pages().length - tabsBefore;
  R.G5_isDetail = /\/resource\/\d+/.test(page.url());
  await h.shot('G-05-detail-nav.png');
  for (const p of _ctx.pages().slice(1)) { try { await p.close(); } catch {} }

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
