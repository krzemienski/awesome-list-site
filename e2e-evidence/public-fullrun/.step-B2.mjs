// PA-B redo: B9 (Bookmarks), B10 (Admin nav), B11 (Sign Out) via the avatar = LAST header button.
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  const step = async (id, fn) => { try { R[id] = await fn(); } catch (e) { R[id] = 'ERR:' + e.message.slice(0, 100); } };
  const openMenu = async () => {
    const btns = page.locator('header button');
    const n = await btns.count();
    await btns.nth(n - 1).click();
    await page.waitForTimeout(800);
  };

  await login(page, h);

  // B9: dropdown -> Bookmarks -> /bookmarks
  await step('B9_bookmarks', async () => {
    await h.goto('/');
    await openMenu();
    await page.locator('[role="menuitem"]:has-text("Bookmark")').first().click();
    await page.waitForTimeout(1500);
    const u = page.url();
    await h.shot('B-03-bookmarks-via-dropdown.png');
    return u;
  });

  // B10: dropdown -> Admin -> /admin (admin user; nav works)
  await step('B10_adminNav', async () => {
    await h.goto('/');
    await openMenu();
    const adminItem = page.locator('[role="menuitem"]:has-text("Admin")').first();
    const present = await adminItem.count();
    if (!present) return { adminItemPresent: false };
    await adminItem.click(); await page.waitForTimeout(1800);
    return { adminItemPresent: true, url: page.url() };
  });

  // B7 re-capture clean dropdown screenshot
  await step('B7_dropdownShot', async () => {
    await h.goto('/');
    await openMenu();
    const items = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map(i => i.textContent.replace(/\s+/g,' ').trim()));
    await h.shot('B-01-profile-via-dropdown.png');
    return items;
  });

  // B11: Sign Out -> logged-out
  await step('B11_signOut', async () => {
    await h.goto('/');
    await openMenu();
    await page.locator('[role="menuitem"]:has-text("Sign Out")').first().click();
    await page.waitForTimeout(1500);
    const me = await h.api('/api/auth/user');
    return { loggedOut: me.status === 401 || !me.json?.email, status: me.status };
  });

  await logout(page, h);
  h.log('RESULTS_B2:', JSON.stringify(R, null, 1));
}
