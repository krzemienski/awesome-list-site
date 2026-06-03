export default async function (page, _ctx, h) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await h.goto('/category/encoding-codecs');
  await page.waitForTimeout(1500);
  // click compact, then WAIT for the card height to actually shrink (real reflow)
  await page.locator('button[aria-label="Compact view"]').click();
  // poll until first card height < 120 (compact) or timeout
  let h0 = 999;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(300);
    h0 = await page.evaluate(() => { const c = document.querySelector('article[data-testid^="card-resource"]'); return c ? Math.round(c.getBoundingClientRect().height) : 999; });
    if (h0 < 120) break;
  }
  await page.waitForTimeout(500);
  await h.shot('E-10-view-compact.png');
  const mode = await page.evaluate(() => localStorage.getItem('awesome-list-view-mode'));
  h.log('COMPACT:', JSON.stringify({ mode, firstCardH: h0 }));
}
