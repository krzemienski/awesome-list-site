export default async function (page, _ctx, h) {
  await h.goto('/category/encoding-codecs');
  // 1) how does a card navigate? inspect first article
  const cardInfo = await page.evaluate(() => {
    const art = document.querySelector('article');
    if (!art) return null;
    const links = [...art.querySelectorAll('a')].map(a => ({ href: a.getAttribute('href'), txt: a.textContent.trim().slice(0, 30), target: a.target }));
    const btns = [...art.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 30));
    return { html: art.outerHTML.slice(0, 600), links, btns };
  });
  h.log('CARD:', JSON.stringify(cardInfo, null, 1));
  // 2) open subcategory select (radix combobox)
  const subBtn = page.locator('button[role="combobox"]').first();
  await subBtn.click();
  await page.waitForTimeout(600);
  const subOpts = await page.evaluate(() =>
    [...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim()).slice(0, 30));
  h.log('SUBCAT OPTIONS:', JSON.stringify(subOpts));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // 3) open sort select (2nd combobox)
  const sortBtn = page.locator('button[role="combobox"]').nth(1);
  await sortBtn.click();
  await page.waitForTimeout(600);
  const sortOpts = await page.evaluate(() =>
    [...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim()).slice(0, 30));
  h.log('SORT OPTIONS:', JSON.stringify(sortOpts));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // 4) tag filter trigger + localStorage keys
  const extra = await page.evaluate(() => {
    const tagTrigger = [...document.querySelectorAll('button')]
      .filter(b => /tag|filter/i.test(b.textContent || b.getAttribute('aria-label') || ''))
      .map(b => b.textContent.trim().slice(0, 40));
    const ls = Object.keys(localStorage);
    return { tagTrigger, ls };
  });
  h.log('TAG TRIGGERS:', JSON.stringify(extra.tagTrigger));
  h.log('LS KEYS:', JSON.stringify(extra.ls));
}
