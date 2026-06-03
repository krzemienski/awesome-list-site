// Re-shoot distinct view-mode screenshots (grid/list/compact) + resource-detail (H11) fresh.
export default async function (page, _ctx, h) {
  const R = {};
  await page.setViewportSize({ width: 1280, height: 900 });

  await h.goto('/category/encoding-codecs');
  await page.waitForTimeout(1500);

  async function setView(label, shot) {
    const btn = page.locator(`button[aria-label="${label}"]`);
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(1500); }
    const mode = await page.evaluate(() => localStorage.getItem('awesome-list-view-mode'));
    // capture a structural fingerprint: first card's bounding height (compact < list < grid differs)
    const firstCardH = await page.evaluate(() => {
      const c = document.querySelector('article[data-testid^="card-resource"]');
      return c ? Math.round(c.getBoundingClientRect().height) : -1;
    });
    await h.shot(shot);
    return { mode, firstCardH };
  }
  R.grid = await setView('Grid view', 'E-08-view-grid.png');
  R.list = await setView('List view', 'E-09-view-list.png');
  R.compact = await setView('Compact view', 'E-10-view-compact.png');

  // H1/H11 resource detail (logged-out) fresh — resolve a real id from the live dataset
  const res = await h.rid('subcategory=Codecs');
  await h.goto('/resource/' + res.id);
  await page.waitForTimeout(1500);
  R.detailId = res.id;
  R.detailTitle = await page.evaluate(() => document.querySelector('h1')?.textContent.trim());
  R.detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await h.shot('H-01-detail-loggedout.png');

  h.log('VIEWS:', JSON.stringify(R, null, 1));
}
