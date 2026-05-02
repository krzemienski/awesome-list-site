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
 *   3. Switch to the Audit tab, seed a fresh resource (which produces a
 *      `created` audit entry), filter by that brand-new resource id, and
 *      assert the row renders. The seeded resource is deleted in `afterAll`
 *      so dev state stays tidy and the test does not depend on any
 *      pre-existing data in the audit log.
 *
 * The tests are serial because they mutate (and revert) a shared user role
 * and share the seeded resource id between setup and teardown.
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

// Tracks the resource id created inside the Audit tab test so that the
// afterAll teardown can delete it. Module-scoped so it is visible to the
// teardown hook even though the resource is created inside a test body.
let seededAuditResourceId: number | null = null;

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
    // Restore the target user back to `user` and delete any resource the
    // Audit tab test seeded, regardless of test outcome. Pass baseURL
    // explicitly so the manually-created context resolves relative URLs
    // the same way the standard `page` fixture does.
    const ctx = await browser.newContext({ baseURL: BASE_URL });
    const page = await ctx.newPage();
    try {
      await loginAsAdmin(page);
      // Best-effort role revert: don't throw if it fails so the resource
      // cleanup below still runs.
      try {
        await setRole(page, TARGET_USER_ID, 'user');
      } catch (err) {
        console.warn('afterAll: failed to revert target user role', err);
      }
      if (seededAuditResourceId !== null) {
        const id = seededAuditResourceId;
        seededAuditResourceId = null;
        const del = await page.request.delete(`/api/admin/resources/${id}`);
        // The DELETE handler currently has a known issue where it returns
        // 500 even though the underlying resource row is removed, so don't
        // trust the status alone. Re-check via GET and only warn if the
        // resource is genuinely still present after our delete attempt.
        if (!del.ok() && del.status() !== 404) {
          const verify = await page.request.get(`/api/resources/${id}`);
          if (verify.status() !== 404) {
            console.warn(
              `afterAll: failed to delete seeded resource ${id}: delete=${del.status()} ${await del.text()}, verify=${verify.status()}`,
            );
          }
        }
      }
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
    await page.waitForLoadState('domcontentloaded');

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
      await page.waitForLoadState('domcontentloaded');
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

  test('Audit tab: filter by freshly-seeded resource id renders its created row', async ({ page }) => {
    // Seed a brand-new resource via the public POST /api/resources endpoint.
    // ResourceRepository.createResource automatically writes a `created`
    // entry to the audit log, so filtering by this fresh id is guaranteed
    // to match exactly one row regardless of the state of the dev DB.
    // A nonce in the URL avoids the unique-URL constraint across re-runs.
    const nonce = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const createRes = await page.request.post('/api/resources', {
      data: {
        title: `E2E Audit Seed ${nonce}`,
        url: `https://example.invalid/e2e-audit-seed/${nonce}`,
        description: 'Temporary resource created by admin-users-audit.spec.ts',
        category: 'E2E Test',
      },
    });
    expect(
      createRes.ok(),
      `failed to seed audit resource: ${createRes.status()} ${await createRes.text()}`,
    ).toBeTruthy();
    const createdResource = await createRes.json();
    expect(typeof createdResource?.id).toBe('number');
    seededAuditResourceId = createdResource.id as number;
    const seededIdStr = String(seededAuditResourceId);

    // Sanity-check via the API that an audit entry exists for this resource
    // before we depend on it appearing in the UI. This surfaces seeding
    // problems as a clear failure rather than a vague UI timeout.
    const apiAudit = await page.request.get(
      `/api/admin/audit-logs?resourceId=${seededIdStr}&limit=10`,
    );
    expect(apiAudit.ok()).toBeTruthy();
    const apiAuditBody = await apiAudit.json();
    expect(
      Array.isArray(apiAuditBody.logs) && apiAuditBody.logs.length,
      'no audit entry was logged for the freshly-seeded resource',
    ).toBeGreaterThan(0);

    await page.goto('/admin#audit');
    await page.waitForLoadState('domcontentloaded');

    const auditTab = page.getByRole('tab', { name: /^Audit$/ });
    await expect(auditTab).toBeVisible();
    await auditTab.click();

    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible();

    // Enter the seeded resource id into the filter input and submit the form.
    const filterInput = page.getByPlaceholder(/Filter by Resource ID/i);
    await expect(filterInput).toBeVisible();
    await filterInput.fill(seededIdStr);
    // Submit by pressing Enter so the form's onSubmit fires.
    await filterInput.press('Enter');

    // Wait for the filtered request to complete by polling the rendered rows.
    // The Audit table has a header row plus one row per log entry; assert
    // that at least one log row exists for our freshly-seeded resource id
    // (formatted as "#<id>" in the Resource column).
    const dataRows = page.locator('table tbody tr');
    await expect.poll(async () => await dataRows.count(), {
      timeout: 5000,
      message: 'no audit log rows rendered for seeded resource id',
    }).toBeGreaterThan(0);

    // The "No audit log entries found" empty-state row should NOT be present.
    await expect(page.getByText('No audit log entries found')).toHaveCount(0);

    // Sanity-check the first row's Resource cell shows our filter value.
    await expect(
      page.getByText(`#${seededIdStr}`).first(),
    ).toBeVisible();
  });
});
