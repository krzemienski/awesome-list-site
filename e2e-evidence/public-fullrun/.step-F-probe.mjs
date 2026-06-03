export default async function (page, _ctx, h) {
  await h.goto('/subcategory/codecs');
  // F6: where is the breadcrumb? dump header text + any nav/ol
  const chrome = await page.evaluate(() => {
    const header = document.querySelector('header');
    const navs = [...document.querySelectorAll('nav,ol[class*=bread],[class*=readcrumb],[aria-label*=readcrumb]')].map(n => n.getAttribute('aria-label') + '::' + n.textContent.replace(/\s+/g, ' ').trim().slice(0, 80));
    return { headerText: header?.innerText.replace(/\s+/g, ' ').slice(0, 150), navs };
  });
  h.log('CHROME:', JSON.stringify(chrome, null, 1));

  // F5: inspect first card click behavior — is article clickable here?
  const cardProbe = await page.evaluate(() => {
    const art = document.querySelector('article[data-testid^="card-resource"]');
    return { testid: art?.getAttribute('data-testid'), cls: art?.className.slice(0, 60), hasCursorPointer: art?.className.includes('cursor-pointer') };
  });
  h.log('CARD:', JSON.stringify(cardProbe));
  // click and watch
  await page.locator('article[data-testid^="card-resource"]').first().click({ force: true });
  await page.waitForTimeout(2500);
  h.log('URL after force click:', page.url());

  // F2 better: find a tag whose count < 14
  await h.goto('/subcategory/codecs');
  await page.locator('button', { hasText: 'Filter by Tag' }).first().click();
  await page.waitForTimeout(800);
  const tags = await page.evaluate(() => [...document.querySelectorAll('[role="checkbox"]')].map(c => {
    const row = c.closest('label,div,li') || c.parentElement;
    return (row?.textContent || '').trim().slice(0, 30);
  }));
  h.log('ALL TAGS:', JSON.stringify(tags));
}
