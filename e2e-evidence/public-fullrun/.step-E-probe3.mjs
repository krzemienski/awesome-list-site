export default async function (page, _ctx, h) {
  await h.goto('/category/encoding-codecs');
  const info = await page.evaluate(() => {
    const art = document.querySelector('article[data-testid^="card-resource"]');
    const btns = [...art.querySelectorAll('button')].map(b => ({
      txt: b.textContent.trim().slice(0, 25),
      aria: b.getAttribute('aria-label'),
      testid: b.getAttribute('data-testid'),
    }));
    // is the whole card clickable (cursor-pointer + onClick)?
    const cardTestid = art.getAttribute('data-testid');
    // find any anchor anywhere tied to /resource/
    const resLinks = [...document.querySelectorAll('a[href*="/resource/"]')].length;
    return { cardTestid, btns, resLinks };
  });
  h.log(JSON.stringify(info, null, 1));
  // try clicking the card itself
  await page.locator('article[data-testid^="card-resource"]').first().click();
  await page.waitForTimeout(2000);
  h.log('URL after card click:', page.url());
}
