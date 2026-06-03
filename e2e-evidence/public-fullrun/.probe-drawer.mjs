export default async function (page, _ctx, h) {
  const R = {};
  await page.setViewportSize({ width: 375, height: 800 });
  await h.goto('/');
  R.trigger = await page.locator('[data-testid="mobile-drawer-trigger"]').count();
  // click hamburger
  await page.locator('[data-testid="mobile-drawer-trigger"]').first().click();
  await page.waitForTimeout(1200);
  R.afterClick = await page.evaluate(() => {
    // drawer = a sheet/dialog that now shows nav links
    const sheet = document.querySelector('[role="dialog"],[data-state="open"],[class*="sheet" i],aside');
    const navLinks = [...document.querySelectorAll('[data-testid^="nav-"],a[href^="/category/"]')].filter(e => e.offsetParent !== null).length;
    return { sheetPresent: !!sheet, visibleNavLinks: navLinks, bodyHasCategories: /Categories/i.test(document.body.innerText) };
  });
  await h.shot('P-01b-mobile-drawer.png');
  h.log('DRAWER:', JSON.stringify(R, null, 1));
}
