export default async function (page, _ctx, h) {
  await h.goto('/resource/186677');
  const info = await page.evaluate(() => {
    // main content = everything not in aside/nav sidebar
    const main = document.querySelector('main') || document.body;
    const sidebar = document.querySelector('[data-sidebar],aside,nav');
    const inMain = (el) => main.contains(el) && (!sidebar || !sidebar.contains(el));
    const btns = [...document.querySelectorAll('button')].filter(inMain).map(b => ({
      txt: b.textContent.trim().slice(0, 22),
      aria: b.getAttribute('aria-label'),
      testid: b.getAttribute('data-testid'),
    }));
    const visitLink = [...document.querySelectorAll('a[href^="http"]')].filter(inMain).map(a => ({ href: a.href.slice(0, 45), txt: a.textContent.trim().slice(0, 20), target: a.target }));
    const relatedTitles = [...document.querySelectorAll('a[href^="/resource/"]')].filter(inMain).map(a => a.textContent.trim().slice(0, 25)).slice(0, 8);
    return { btns, visitLink, relatedCount: relatedTitles.length, relatedTitles };
  });
  h.log('MAIN:', JSON.stringify(info, null, 1));

  await h.goto('/resource/999999');
  const invalid = await page.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160), hasNotFound: /not found|doesn.t exist|404|no resource/i.test(document.body.innerText) }));
  h.log('INVALID:', JSON.stringify(invalid));
}
