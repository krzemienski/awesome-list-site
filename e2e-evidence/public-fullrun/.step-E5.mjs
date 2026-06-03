export default async function (page, _ctx, h) {
  const R = {};
  const cardCount = () => page.evaluate(() => document.querySelectorAll('article[data-testid^="card-resource"]').length);
  const showText = () => page.evaluate(() => (document.body.innerText.match(/Showing\s+[\d,]+\s+of\s+[\d,]+/i) || [null])[0]);

  await h.goto('/category/encoding-codecs');
  R.before = await cardCount();
  await page.locator('button', { hasText: 'Filter by Tag' }).first().click();
  await page.waitForTimeout(900);
  // inspect first few checkbox rows (label text lives in sibling)
  const cbInfo = await page.evaluate(() => {
    const cbs = [...document.querySelectorAll('[role="checkbox"]')];
    return cbs.slice(0, 6).map(cb => {
      // label often the parent/next text
      const row = cb.closest('label,div,li') || cb.parentElement;
      return { txt: (row?.textContent || '').trim().slice(0, 40), state: cb.getAttribute('data-state') || cb.getAttribute('aria-checked') };
    });
  });
  R.checkboxes = cbInfo;
  // click the first checkbox
  await page.locator('[role="checkbox"]').first().click();
  await page.waitForTimeout(1500);
  R.firstCbState = await page.evaluate(() => { const c = document.querySelector('[role="checkbox"]'); return c.getAttribute('data-state') || c.getAttribute('aria-checked'); });
  // close popover to see filtered list
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  R.afterCards = await cardCount();
  R.afterShow = await showText();
  await h.shot('E-05-tag-filter.png');
  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
