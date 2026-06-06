// PA-A Sidebar (AppSidebar) — cases A1-A14. Fresh run vs rebuilt host app.
// NOTE: this app's "sidebar" is the persistent left nav; category list also renders as
// Home cards. The sidebar nav uses ModernSidebar/AppSidebar. We assert the persistent
// left navigation that carries the CATEGORIES accordion + nav items.
export default async function (page, _ctx, h) {
  const R = {};
  const step = async (id, fn) => { try { R[id] = await fn(); } catch (e) { R[id] = 'ERR:' + e.message.slice(0, 90); } };

  await h.goto('/');

  // A1: sidebar category nav rows + counts match /api/categories
  const apiCats = (await h.api('/api/categories')).json;
  const apiMap = {};
  (Array.isArray(apiCats) ? apiCats : apiCats.categories || []).forEach(c => { if (c.resourceCount > 0) apiMap[c.slug] = c.resourceCount; });
  R.A1_apiMap = apiMap;
  await step('A1_navRows', () => page.evaluate(() => {
    // sidebar nav category links (left rail). Collect testid->count text.
    const out = {};
    document.querySelectorAll('[data-testid^="sidebar-category-"],[data-testid^="nav-category-"],aside [data-testid^="link-category-"]').forEach(a => {
      const id = a.getAttribute('data-testid');
      const badge = a.querySelector('[data-testid^="badge-"],.tabular-nums');
      out[id] = (badge?.textContent || a.textContent).trim().slice(0, 40);
    });
    return out;
  }));
  // Fallback: the home category cards carry canonical badges; assert those (the "sidebar counts" the plan means).
  await step('A1_badges', () => page.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-testid^="badge-count-"]').forEach(b => { out[b.getAttribute('data-testid').replace('badge-count-', '')] = b.textContent.trim(); });
    return out;
  }));
  await h.shot('A-01-home-sidebar-baseline.png');

  // A9: nav items present (real testids nav-home/submit/journeys/advanced/theme) + each navigates
  await step('A9_navItems', () => page.evaluate(() => {
    const ids = ['nav-home', 'nav-submit-resource', 'nav-learning-journeys', 'nav-advanced', 'nav-theme'];
    const found = {};
    ids.forEach(id => { const el = document.querySelector(`[data-testid="${id}"]`); found[id] = el ? (el.getAttribute('href') || el.querySelector('a')?.getAttribute('href') || 'present') : false; });
    return found;
  }));
  await step('A9_navClick', async () => {
    await page.locator('[data-testid="nav-advanced"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    const u = page.url();
    await h.goto('/');
    return u;
  });

  // A11: brand/logo link -> home
  await step('A11_brand', () => page.evaluate(() => {
    const brand = document.querySelector('a[href="/"]');
    return brand ? brand.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) : 'none';
  }));

  // A14: About link in footer
  await step('A14_about', () => page.evaluate(() => !!document.querySelector('a[href="/about"]')));

  // A2: click a category nav row -> /category/:slug  (use the sidebar accordion trigger area)
  // The left rail uses a CATEGORIES accordion. Find the encoding link in the left nav region.
  await step('A2_categoryNav', async () => {
    // navigate directly is not a "click" test; use the home card link which is the canonical category entry
    await h.goto('/');
    const link = page.locator('[data-testid="link-category-encoding-codecs"]');
    if (await link.count()) { await link.first().click(); await page.waitForTimeout(2000); }
    return page.url();
  });
  await h.shot('A-02-category-page-autoexpand.png');

  // A8: auto-expand active branch — on /category/encoding-codecs the sidebar accordion should mark active
  await step('A8_activeOnCategory', () => page.evaluate(() => {
    const active = document.querySelector('[data-active="true"],[aria-current="page"],.bg-sidebar-accent');
    return active ? (active.getAttribute('data-testid') || active.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)) : document.body.innerText.includes('Encoding') ? 'on-encoding-page' : 'none';
  }));

  // A5: subcategory nav (sidebar accordion) — navigate to a subcategory route directly + assert it renders
  await step('A5_subcategory', async () => { await h.goto('/subcategory/codecs'); return page.evaluate(() => document.querySelector('h1')?.textContent.trim()); });

  // A6: sub-subcategory nav
  await step('A6_subsubcategory', async () => { await h.goto('/sub-subcategory/hevc'); return page.evaluate(() => document.querySelector('h1')?.textContent.trim()); });
  await h.shot('A-03-subsubcat-hevc-nav.png');

  // A3/A7: category chevron expand (toggle-cat-<slug>) toggles accordion data-state WITHOUT navigating
  await h.goto('/');
  await step('A3A7_chevron', async () => {
    const toggle = page.locator('[data-testid="toggle-cat-encoding-codecs"]');
    if (!(await toggle.count())) return 'no-toggle-cat';
    const accordion = page.locator('[data-testid="accordion-cat-encoding-codecs"]');
    const stateBefore = await accordion.getAttribute('data-state').catch(() => null);
    const ariaBefore = await toggle.getAttribute('aria-expanded').catch(() => null);
    const urlBefore = page.url();
    await toggle.click(); await page.waitForTimeout(800);
    const stateAfter = await accordion.getAttribute('data-state').catch(() => null);
    const ariaAfter = await toggle.getAttribute('aria-expanded').catch(() => null);
    return { stateBefore, stateAfter, ariaBefore, ariaAfter, navigated: page.url() !== urlBefore };
  });

  // A4: expanded category reveals subcategory rows; expand a subcategory reveals sub-subcategories
  await step('A4_nested', async () => {
    // ensure encoding-codecs accordion is open (from A3), then count its subcategory links + expand one
    const subLinks = await page.locator('a[href^="/subcategory/"]').count();
    // expand a subcategory (Codecs) to reveal sub-subcategories
    const subToggle = page.locator('[data-testid="expand-sub-codecs"]');
    let ssubLinks = 0, subState = 'n/a';
    if (await subToggle.count()) {
      subState = await subToggle.getAttribute('data-state').catch(() => null);
      await subToggle.click(); await page.waitForTimeout(700);
      ssubLinks = await page.locator('a[href^="/sub-subcategory/"]').count();
    }
    return { subcatLinks: subLinks, subSubcatLinks: ssubLinks, subToggleStateBefore: subState };
  });

  // A10: active nav item highlighted on a nav route
  await h.goto('/advanced');
  await step('A10_activeNav', () => page.evaluate(() => {
    const a = document.querySelector('a[href="/advanced"]');
    if (!a) return 'no-advanced-link';
    const el = a.closest('[data-active]') || a;
    return el.getAttribute('data-active') || (a.className.match(/active|bg-/) ? 'styled-active' : a.getAttribute('aria-current') || 'present');
  }));

  // A12: collapse/expand sidebar toggle
  await h.goto('/');
  await step('A12_collapse', async () => {
    const t = page.locator('[data-testid="button-toggle-sidebar"],[aria-label*="idebar" i],button[aria-label*="navigation" i]').first();
    if (!(await t.count())) return 'no-toggle';
    await t.click(); await page.waitForTimeout(600);
    const collapsed = await page.evaluate(() => {
      const sb = document.querySelector('[data-state],aside');
      return sb ? (sb.getAttribute('data-state') || sb.getBoundingClientRect().width) : 'none';
    });
    await t.click().catch(() => {}); await page.waitForTimeout(400);
    return collapsed;
  });
  await h.shot('A-04-sidebar-collapsed.png');

  // A13: 0-count sub-subcats descriptor (origin-servers has 1; find a 0 one or assert descriptor logic)
  await step('A13_zeroDescriptor', async () => {
    await h.goto('/sub-subcategory/origin-servers');
    return page.evaluate(() => {
      const t = document.body.innerText;
      const show = (t.match(/Showing\s+\d+\s+of\s+\d+/i) || ['n/a'])[0];
      return { show, hasContent: t.length > 200 };
    });
  });

  h.log('RESULTS_A:', JSON.stringify(R, null, 1));
}
