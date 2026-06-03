// Smoke: confirm driver reaches live app, capture home DOM facts to ground step authoring.
export default async function (page, _ctx, h) {
  const R = {};
  await h.goto('/');
  R.title = await page.title();
  R.hero = await page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/Explore\s+(\d+)\s+categили?ies?.*?(\d[\d,]+)\s+curated/is) ||
              t.match(/(\d+)\s+categories[\s\S]{0,40}?(\d[\d,]+)\s+(?:curated|resources)/i);
    return m ? { n: m[1], total: m[2] } : (t.match(/\d[\d,]{2,}/g) || []).slice(0, 6);
  });
  R.heroRaw = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h1,h2,p')].map(e => e.textContent.trim()).filter(s => /categ|curat|resource/i.test(s));
    return h2.slice(0, 4);
  });
  // sidebar category badges (data-testid badge-count-<slug>)
  R.sidebarBadges = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-testid^="badge-count-"]').forEach(b => {
      out[b.getAttribute('data-testid').replace('badge-count-', '')] = b.textContent.trim();
    });
    return out;
  });
  // any element carrying counts in sidebar nav
  R.sidebarCatRows = await page.evaluate(() => {
    return [...document.querySelectorAll('[data-testid^="link-category-"],[data-testid^="nav-category-"]')]
      .map(a => ({ id: a.getAttribute('data-testid'), txt: a.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) })).slice(0, 12);
  });
  R.api_total = (await h.api('/api/resources?limit=1')).json?.total;
  await h.shot('SMOKE-home.png');
  h.log('SMOKE:', JSON.stringify(R, null, 1));
}
