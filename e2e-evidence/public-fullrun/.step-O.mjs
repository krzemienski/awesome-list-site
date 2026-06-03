// PA-O About + 404.
export default async function (page, _ctx, h) {
  const R = {};
  // O1: /about renders
  await h.goto('/about');
  await page.waitForTimeout(1000);
  R.O1 = await page.evaluate(() => ({
    path: location.pathname,
    h1: document.querySelector('h1')?.textContent.trim().slice(0, 40),
    textLen: document.body.innerText.trim().length,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 150),
  }));
  // O2: external links
  R.O2_externalLinks = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const sidebar = document.querySelector('[data-sidebar],aside');
    return [...main.querySelectorAll('a[href^="http"]')].filter(a => !sidebar || !sidebar.contains(a)).map(a => ({ href: a.href.slice(0, 50), txt: a.textContent.trim().slice(0, 25), target: a.target })).slice(0, 10);
  });
  await h.shot('O-01-about.png');

  // O3: 404
  await h.goto('/this-route-does-not-exist-xyz');
  await page.waitForTimeout(1200);
  R.O3 = await page.evaluate(() => ({
    path: location.pathname,
    is404: /404|not found|doesn.t exist|page.*not.*found|can.t find/i.test(document.body.innerText),
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 150),
    noCrash: document.body.innerText.trim().length > 30,
  }));
  // O4: way back home
  R.O4_homeLink = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href="/"],a,button')].filter(el => /home|back|return|go to/i.test(el.textContent || ''));
    return links.map(l => l.textContent.trim().slice(0, 25)).slice(0, 5);
  });
  R.O4_hasHomeHref = await page.locator('a[href="/"]').count();
  await h.shot('O-03-404.png');

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
