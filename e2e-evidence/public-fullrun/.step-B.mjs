// PA-B Header (AppHeader) — cases B1-B11.
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  const step = async (id, fn) => { try { R[id] = await fn(); } catch (e) { R[id] = 'ERR:' + e.message.slice(0, 90); } };

  await logout(page, h); // ensure logged-out baseline first
  await h.goto('/category/encoding-codecs');

  // B1: breadcrumb renders per route
  await step('B1_breadcrumb', () => page.evaluate(() => {
    const bc = document.querySelector('nav[aria-label*="readcrumb" i]') || document.querySelector('[data-testid*="breadcrumb" i]');
    return bc ? bc.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : 'none';
  }));
  // B2: breadcrumb Home crumb navigates
  await step('B2_breadcrumbNav', async () => {
    const home = page.locator('nav[aria-label*="readcrumb" i] a[href="/"]').first();
    if (!(await home.count())) return 'no-home-crumb';
    await home.click(); await page.waitForTimeout(1500);
    const u = page.url();
    await h.goto('/category/encoding-codecs');
    return u;
  });

  // B3: search button opens dialog
  await step('B3_searchOpens', async () => {
    await page.locator('button[aria-label="Open search"]').first().click();
    await page.waitForTimeout(900);
    const open = await page.evaluate(() => !!document.querySelector('[role="dialog"] input, [cmdk-input]'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    return open;
  });
  await h.shot('B-02-search-dialog-open.png');

  // B4: theme settings button -> /settings/theme
  await step('B4_theme', async () => {
    // theme button is the unlabeled header button; navigate via known link as fallback
    const btn = page.locator('header button').filter({ hasNot: page.locator('[aria-label="Open search"]') });
    // click the header button that routes to theme — try direct nav-theme in header region
    const themeLink = page.locator('a[href="/settings/theme"]').first();
    if (await themeLink.count()) { await themeLink.click(); await page.waitForTimeout(1200); const u = page.url(); await h.goto('/category/encoding-codecs'); return u; }
    return 'no-theme-link-in-header';
  });

  // B6: logged-out Login button -> /login
  await step('B6_loginBtn', async () => {
    const loginBtn = page.locator('button:has-text("Login"), a:has-text("Login")').first();
    const present = await loginBtn.count();
    if (present) { await loginBtn.click(); await page.waitForTimeout(1500); }
    const u = page.url();
    return { present: !!present, url: u };
  });

  // ---- logged-in: B7-B11 avatar dropdown ----
  R.loginResult = await login(page, h);
  await h.goto('/');
  await step('B7_avatarDropdown', async () => {
    const avatar = page.locator('[data-testid="button-user-menu"],[data-testid*="avatar" i],header button:has(img), header [role="button"]').first();
    if (!(await avatar.count())) {
      // try any header button that opens a menu
      const anyBtn = page.locator('header button').last();
      await anyBtn.click();
    } else {
      await avatar.click();
    }
    await page.waitForTimeout(900);
    const items = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"],[role="menu"] a,[data-radix-collection-item]')].map(i => i.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 10));
    await h.shot('B-01-profile-via-dropdown.png');
    return items;
  });
  // B8: dropdown -> Profile
  await step('B8_profile', async () => {
    const item = page.locator('[role="menuitem"]:has-text("Profile"), [role="menu"] a:has-text("Profile")').first();
    if (!(await item.count())) return 'no-profile-item';
    await item.click(); await page.waitForTimeout(1500);
    return page.url();
  });
  // B9: dropdown -> Bookmarks
  await step('B9_bookmarks', async () => {
    await h.goto('/');
    const avatar = page.locator('[data-testid="button-user-menu"],header button:has(img),header [role="button"]').first();
    await avatar.click().catch(() => {}); await page.waitForTimeout(700);
    const item = page.locator('[role="menuitem"]:has-text("Bookmark"), [role="menu"] a:has-text("Bookmark")').first();
    if (!(await item.count())) return 'no-bookmark-item';
    await item.click(); await page.waitForTimeout(1500);
    const u = page.url();
    await h.shot('B-03-bookmarks-via-dropdown.png');
    return u;
  });
  // B10: dropdown -> Admin (admin only) — route guard check (admin user IS admin so link present + routes)
  await step('B10_admin', async () => {
    await h.goto('/');
    const avatar = page.locator('[data-testid="button-user-menu"],header button:has(img),header [role="button"]').first();
    await avatar.click().catch(() => {}); await page.waitForTimeout(700);
    const item = page.locator('[role="menuitem"]:has-text("Admin"), [role="menu"] a:has-text("Admin")').first();
    const present = await item.count();
    let url = 'n/a';
    if (present) { await item.click(); await page.waitForTimeout(1500); url = page.url(); }
    return { adminItemPresent: !!present, url };
  });
  // B10b: route guard — logged OUT, /admin must NOT render admin (redirect/guard)
  await step('B10_guardLoggedOut', async () => {
    await logout(page, h);
    await h.goto('/admin');
    const u = page.url();
    const body = await page.evaluate(() => document.body.innerText.slice(0, 120));
    const me = await h.api('/api/auth/user');
    return { url: u, redirectedAway: !u.endsWith('/admin'), guarded: !/admin dashboard|approvals|enrichment/i.test(body), authUser: me.json?.email || me.status };
  });

  // B11: Sign Out from dropdown -> logged-out state
  await step('B11_signOut', async () => {
    await login(page, h);
    await h.goto('/');
    const avatar = page.locator('[data-testid="button-user-menu"],header button:has(img),header [role="button"]').first();
    await avatar.click().catch(() => {}); await page.waitForTimeout(700);
    const item = page.locator('[role="menuitem"]:has-text("Sign Out"), [role="menuitem"]:has-text("Logout"), [role="menu"] *:has-text("Sign Out")').first();
    let clicked = false;
    if (await item.count()) { await item.click(); await page.waitForTimeout(1500); clicked = true; }
    const me = await h.api('/api/auth/user');
    return { clicked, loggedOutNow: me.status === 401 || !me.json?.email };
  });

  await logout(page, h); // final baseline
  h.log('RESULTS_B:', JSON.stringify(R, null, 1));
}
