// Probe the actual left-nav / sidebar DOM to fix A3/A4/A7 selectors.
export default async function (page, _ctx, h) {
  await h.goto('/');
  const info = await page.evaluate(() => {
    // find the persistent sidebar container
    const aside = document.querySelector('aside') || document.querySelector('[data-sidebar]') || document.querySelector('[class*="sidebar" i]');
    const out = { asideFound: !!aside };
    // all category links anywhere
    out.catLinks = [...document.querySelectorAll('a[href^="/category/"]')].map(a => ({ href: a.getAttribute('href'), where: a.closest('aside') ? 'aside' : a.closest('header') ? 'header' : 'main' })).slice(0, 20);
    out.subLinks = [...document.querySelectorAll('a[href^="/subcategory/"]')].length;
    out.subSubLinks = [...document.querySelectorAll('a[href^="/sub-subcategory/"]')].length;
    // expandable buttons with aria-expanded anywhere
    out.expandBtns = [...document.querySelectorAll('button[aria-expanded]')].map(b => ({ exp: b.getAttribute('aria-expanded'), label: (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim().slice(0, 40), testid: b.getAttribute('data-testid') })).slice(0, 25);
    // collapsible triggers (radix data-state)
    out.collapsibles = [...document.querySelectorAll('[data-state="open"],[data-state="closed"]')].map(e => ({ tag: e.tagName, state: e.getAttribute('data-state'), testid: e.getAttribute('data-testid'), label: (e.getAttribute('aria-label')||'').slice(0,30) })).slice(0, 25);
    // sidebar testids
    out.sidebarTestids = [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')).filter(t => /sidebar|category|nav|toggle|expand|collaps/i.test(t)).slice(0, 40);
    return out;
  });
  h.log('NAV_PROBE:', JSON.stringify(info, null, 1));
}
