import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for the admin Users and Audit tabs.
 *
 * These tests:
 *   1. Log in as an admin via the local auth endpoint (POST /api/auth/local/login).
 *      The admin account is the seeded admin@example.com / admin123 user that
 *      `scripts/reset-admin-password.ts` provisions.
 *   2. Open the admin dashboard, switch to the Users tab, change a user's role
 *      via the role dropdown, and assert the change is reflected in the API
 *      and the UI. The role is reverted in `afterAll` so tests are
 *      idempotent.
 *   3. Switch to the Audit tab, filter by a known resource id (one with a
 *      large existing audit history), and assert at least one log row
 *      renders.
 *
 * The tests are serial because they mutate (and revert) a shared user role.
 */

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Mirror the default baseURL configured in playwright.config.ts so contexts
// created outside of the standard `page` fixture (e.g. in afterAll) also
// resolve relative URLs correctly.
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// `test-user-123` is the long-lived non-admin test user seeded in dev.
// We toggle this user's role between `user` and `moderator` and then revert.
const TARGET_USER_ID = 'test-user-123';
const TARGET_USER_EMAIL = 'test@example.com';

// Resource id known to have an extensive audit-log history. The Audit tab's
// filter searches by `resourceId`; this id is used to assert that at least
// one row renders for a known-good filter value.
const KNOWN_AUDIT_RESOURCE_ID = '186689';

async function loginAsAdmin(page: Page) {
  // Use the page's request context so cookies propagate to subsequent navigations.
  const response = await page.request.post('/api/auth/local/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.ok(), `admin login failed: ${response.status()} ${await response.text()}`)
    .toBeTruthy();
  const body = await response.json();
  expect(body.user?.role).toBe('admin');
}

async function getRole(page: Page, userId: string): Promise<string | undefined> {
  const res = await page.request.get('/api/admin/users?limit=200');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const user = (body.users as Array<{ id: string; role: string }>)
    .find((u) => u.id === userId);
  return user?.role;
}

async function setRole(page: Page, userId: string, role: 'user' | 'moderator' | 'admin') {
  const res = await page.request.put(`/api/admin/users/${userId}/role`, {
    data: { role },
  });
  expect(res.ok(), `failed to set role: ${res.status()} ${await res.text()}`)
    .toBeTruthy();
}

test.describe.serial('Admin Users & Audit tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterAll(async ({ browser }) => {
    // Restore the target user back to `user` regardless of test outcome.
    // Pass baseURL explicitly so the manually-created context resolves
    // relative URLs the same way the standard `page` fixture does.
    const ctx = await browser.newContext({ baseURL: BASE_URL });
    const page = await ctx.newPage();
    try {
      await loginAsAdmin(page);
      await setRole(page, TARGET_USER_ID, 'user');
    } finally {
      await ctx.close();
    }
  });

  test('Users tab: change role via dropdown and verify update', async ({ page }) => {
    // Make sure we start from a known role, even if a prior failed run left
    // the user in another state.
    await setRole(page, TARGET_USER_ID, 'user');

    // Sanity-check that the target user exists at all before we depend on the
    // UI rendering it. This makes a missing seed fixture surface as a clear
    // assertion instead of a vague "row not visible" timeout.
    const initialRole = await getRole(page, TARGET_USER_ID);
    expect(initialRole, `seed fixture missing: user ${TARGET_USER_ID}`).toBe('user');

    await page.goto('/admin#users');
    await page.waitForLoadState('networkidle');

    // The Users tab trigger is rendered with the visible label "Users". Click
    // it to ensure that tab is active even if the URL hash didn't auto-select.
    const usersTab = page.getByRole('tab', { name: /^Users$/ });
    await expect(usersTab).toBeVisible();
    await usersTab.click();

    // The User Management card header should be visible.
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible();

    // The Users table paginates at 20 rows/page. If the target user isn't on
    // the first page, walk forward via the "next page" pagination button
    // until we find it (or until we run out of pages, in which case fail
    // with a clear message). The pagination control is rendered as two
    // icon-only buttons next to a "Page X of Y" label; we scope to that
    // container and pick the second (next) button so the selector doesn't
    // depend on a specific icon library/class.
    const targetRowSelector = () =>
      page.locator('tr', { has: page.getByText(TARGET_USER_EMAIL, { exact: true }) });
    const paginationContainer = page
      .locator('div', { has: page.getByText(/^Page \d+ of \d+$/) })
      .last();
    const nextPageBtn = paginationContainer.getByRole('button').nth(1);
    for (let i = 0; i < 25; i++) {
      if ((await targetRowSelector().count()) > 0) break;
      // If pagination isn't even rendered (only one page), or the next button
      // is disabled, the user genuinely isn't in the table.
      if ((await paginationContainer.count()) === 0) break;
      if (await nextPageBtn.isDisabled().catch(() => true)) break;
      await nextPageBtn.click();
      await page.waitForLoadState('networkidle');
    }
    const targetRow = targetRowSelector();
    await expect(targetRow, `target user ${TARGET_USER_EMAIL} not visible in any Users page`)
      .toBeVisible();

    // The role badge in the row should currently read "user".
    await expect(targetRow.getByText('user', { exact: true }).first()).toBeVisible();

    // Change role: open the Select trigger inside this row and pick "Moderator".
    const roleTrigger = targetRow.getByRole('combobox');
    await roleTrigger.click();
    // Radix renders the listbox in a portal, so look for the option globally.
    await page.getByRole('option', { name: 'Moderator' }).click();

    // Wait for the toast confirming the role change.
    await expect(page.getByText('Role Updated', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Verify via API that the change was persisted.
    await expect.poll(async () => await getRole(page, TARGET_USER_ID), {
      timeout: 5000,
      message: 'role did not update server-side',
    }).toBe('moderator');

    // And verify the UI reflects the new role badge.
    const refreshedRow = page.locator('tr', {
      has: page.getByText(TARGET_USER_EMAIL, { exact: true }),
    });
    await expect(refreshedRow.getByText('moderator', { exact: true }).first()).toBeVisible({
      timeout: 5000,
    });

    // Revert role within the test so other tests/runs see a stable state.
    await setRole(page, TARGET_USER_ID, 'user');
  });

  test('Audit tab: filter by known resource id renders at least one row', async ({ page }) => {
    await page.goto('/admin#audit');
    await page.waitForLoadState('networkidle');

    const auditTab = page.getByRole('tab', { name: /^Audit$/ });
    await expect(auditTab).toBeVisible();
    await auditTab.click();

    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible();

    // Enter the resource id into the filter input and submit the form.
    const filterInput = page.getByPlaceholder(/Filter by Resource ID/i);
    await expect(filterInput).toBeVisible();
    await filterInput.fill(KNOWN_AUDIT_RESOURCE_ID);
    // Submit by pressing Enter so the form's onSubmit fires.
    await filterInput.press('Enter');

    // Wait for the filtered request to complete by polling the rendered rows.
    // The Audit table has a header row plus one row per log entry; assert that
    // at least one log row exists and that every visible resource cell points
    // to our filtered id (formatted as "#186689" in the Resource column).
    const dataRows = page.locator('table tbody tr');
    await expect.poll(async () => await dataRows.count(), {
      timeout: 5000,
      message: 'no audit log rows rendered for known resource id',
    }).toBeGreaterThan(0);

    // The "No audit log entries found" empty-state row should NOT be present.
    await expect(page.getByText('No audit log entries found')).toHaveCount(0);

    // Sanity-check the first row's Resource cell shows our filter value.
    await expect(
      page.getByText(`#${KNOWN_AUDIT_RESOURCE_ID}`).first(),
    ).toBeVisible();
  });
});
