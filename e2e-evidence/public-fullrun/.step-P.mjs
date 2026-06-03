// PA-P Responsive P1-P4. Resize viewport per case.
export default async function (page, _ctx, h) {
  const R = {};
  const setVP = async (w, hh) => {
    try { await page.setViewportSize({ width: w, height: hh }); } catch (e) { R[`vpErr_${w}`] = e.message.slice(0, 60); }
    await page.waitForTimeout(800);
  };
  const overflow = () => page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    horizOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  }));

  // P4: desktop 1280 baseline
  await setVP(1280, 900);
  await h.goto('/');
  R.P4_desktop = await overflow();
  R.P4_sidebarVisible = await page.evaluate(() => {
    const sb = document.querySelector('[data-sidebar],aside,nav');
    return sb ? getComputedStyle(sb).display !== 'none' && sb.getBoundingClientRect().width > 50 : false;
  });
  await h.shot('P-04-desktop-1280.png');

  // P3: tablet 768
  await setVP(768, 1024);
  await h.goto('/');
  R.P3_tablet = await overflow();
  await h.shot('P-03-tablet-768.png');
  // P3 category page
  await h.goto('/category/encoding-codecs');
  R.P3_categoryOverflow = await overflow();

  // P1: mobile 375 — sidebar collapses, hamburger appears
  await setVP(375, 812);
  await h.goto('/');
  await page.waitForTimeout(1000);
  R.P1_mobile = await overflow();
  R.P1_hamburger = await page.evaluate(() => {
    const ham = document.querySelector('[data-testid="mobile-drawer-trigger"],[aria-label*="navigation" i],[aria-label*="menu" i],button[aria-label*="sidebar" i]');
    return ham ? { found: true, visible: ham.getBoundingClientRect().width > 0 } : { found: false };
  });
  R.P1_sidebarCollapsed = await page.evaluate(() => {
    // the persistent desktop sidebar should be hidden/offscreen at mobile
    const sb = document.querySelector('aside,[data-sidebar="sidebar"]');
    if (!sb) return 'no-aside';
    const r = sb.getBoundingClientRect();
    return r.left < -50 || r.width === 0 || getComputedStyle(sb).display === 'none' ? 'collapsed' : `visible(left=${Math.round(r.left)},w=${Math.round(r.width)})`;
  });
  await h.shot('P-01-mobile-375-home.png');

  // P1b: open hamburger -> nav drawer
  const ham = page.locator('[data-testid="mobile-drawer-trigger"]').first();
  if (await ham.count()) {
    await ham.click();
    await page.waitForTimeout(1000);
    R.P1_drawerOpened = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"],[data-state="open"]');
      return drawer ? /home|categor|submit/i.test(drawer.textContent || '') : false;
    });
    await h.shot('P-01b-mobile-drawer.png');
    await page.keyboard.press('Escape').catch(() => {});
  }

  // P2: mobile category page filters usable
  await h.goto('/category/encoding-codecs');
  await page.waitForTimeout(1000);
  R.P2_mobile = await overflow();
  R.P2_filtersPresent = await page.evaluate(() => ({
    tagBtn: !!document.querySelector('button'),
    combobox: document.querySelectorAll('button[role="combobox"]').length,
    cardsRender: document.querySelectorAll('article[data-testid^="card-resource"]').length,
  }));
  await h.shot('P-02-mobile-category.png');

  // restore desktop
  await setVP(1280, 900);
  h.log('RESULTS:', JSON.stringify(R, null, 1));
}
