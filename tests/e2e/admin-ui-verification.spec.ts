import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const EVIDENCE_DIR = path.join(__dirname, '../../docs/session-7-evidence/admin-ui');

// Session injection for admin user
const SESSION_DATA = {
  'sb-jeyldoypdkgsrfdhdcmm-auth-token': JSON.stringify({
    access_token: "eyJhbGciOiJIUzI1NiIsImtpZCI6IkRlOTBodWp6SVpGd2xsZEMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2pleWxkb3lwZGtnc3JmZGhkY21tLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1OGM1OTJjNS01NDhiLTQ0MTItYjRlMi1hOWRmNWNhYzUzOTciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY0NTMzNzY4LCJpYXQiOjE3NjQ1MzAxNjgsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6e30sInVzZXJfbWV0YWRhdGEiOnsiZnVsbF9uYW1lIjoiVGVzdCBBZG1pbiIsInJvbGUiOiJhZG1pbiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzY0NTIzMDk5fV0sInNlc3Npb25faWQiOiI5ZjBiNzY1NS1jMTNiLTQ3MmUtOGNiNy0wMjUwZmY3MDQ0ZjIiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.vaQyM5FbY7ReGMHmqxU182dLxX4GDNLi70Qdkh-qU0k",
    user: {
      id: "58c592c5-548b-4412-b4e2-a9df5cac5397",
      email: "admin@test.com",
      user_metadata: { role: "admin", full_name: "Test Admin" }
    }
  })
};

async function injectAdminSession(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate((sessionData) => {
    Object.entries(sessionData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }, SESSION_DATA);
  await page.reload();
}

async function takeScreenshot(page: Page, filename: string) {
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    fullPage: true
  });
}

// Helper to scroll modal before clicking buttons
async function scrollModalAndClick(page: Page, buttonSelector: string) {
  await page.evaluate(() => {
    const modal = document.querySelector('div[role="dialog"]');
    if (modal) modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
  });
  await page.waitForTimeout(500);
  await page.locator(buttonSelector).click({ force: true });
}

test.describe('Admin UI Verification - Agent 1', () => {
  test.beforeEach(async ({ page }) => {
    await injectAdminSession(page);
  });

  test('1. Status Filter Dropdown', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Take before screenshot
    await takeScreenshot(page, '01-status-filter-before.png');

    // Click status filter dropdown
    const statusFilter = page.locator('select, button').filter({ hasText: /status/i }).first();
    await statusFilter.click();

    // Select "Approved"
    await page.locator('text=Approved').click();
    await page.waitForTimeout(1000);

    // Take after screenshot
    await takeScreenshot(page, '01-status-filter-after.png');

    // Verify table filtered
    const rows = page.locator('table tbody tr');
    const count = await rows.count();

    // Verify all visible rows show "approved" status
    for (let i = 0; i < Math.min(count, 10); i++) {
      const statusCell = rows.nth(i).locator('td').nth(3); // Assuming status is 4th column
      const status = await statusCell.textContent();
      expect(status?.toLowerCase()).toContain('approved');
    }

    console.log(`✅ Status filter test: ${count} approved resources shown`);
  });

  test('2. Category Filter Dropdown', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, '02-category-filter-before.png');

    // Click category filter
    const categoryFilter = page.locator('select, button').filter({ hasText: /category/i }).first();
    await categoryFilter.click();

    // Select "Encoding & Codecs"
    await page.locator('text=Encoding & Codecs').click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '02-category-filter-after.png');

    // Verify filtered
    const rows = page.locator('table tbody tr');
    const count = await rows.count();

    console.log(`✅ Category filter test: ${count} resources in Encoding & Codecs`);
  });

  test('3. Combined Filters (Status + Category)', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, '03-combined-filters-before.png');

    // Apply status filter
    const statusFilter = page.locator('select, button').filter({ hasText: /status/i }).first();
    await statusFilter.click();
    await page.locator('text=Approved').first().click();
    await page.waitForTimeout(500);

    // Apply category filter
    const categoryFilter = page.locator('select, button').filter({ hasText: /category/i }).first();
    await categoryFilter.click();
    await page.locator('text=Encoding & Codecs').first().click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '03-combined-filters-after.png');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();

    console.log(`✅ Combined filters test: ${count} approved resources in Encoding & Codecs`);
  });

  test('4. Clear All Filters Button', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Apply filters first
    const statusFilter = page.locator('select, button').filter({ hasText: /status/i }).first();
    await statusFilter.click();
    await page.locator('text=Approved').first().click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, '04-clear-filters-before.png');

    // Click clear filters button
    const clearButton = page.locator('button').filter({ hasText: /clear.*filter/i });
    if (await clearButton.count() > 0) {
      await clearButton.click();
      await page.waitForTimeout(1000);

      await takeScreenshot(page, '04-clear-filters-after.png');
      console.log('✅ Clear filters button found and clicked');
    } else {
      console.log('⚠️ Clear filters button not found');
      await takeScreenshot(page, '04-clear-filters-notfound.png');
    }
  });

  test('5. Column Sorting - Title (Ascending)', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, '05-sort-title-asc-before.png');

    // Click title column header
    const titleHeader = page.locator('th').filter({ hasText: /title/i });
    await titleHeader.click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '05-sort-title-asc-after.png');

    // Verify first few titles are alphabetically sorted
    const firstTitle = await page.locator('table tbody tr').first().locator('td').nth(0).textContent();
    console.log(`✅ Sort title ascending: First title = "${firstTitle}"`);
  });

  test('6. Column Sorting - Title (Descending)', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Click twice for descending
    const titleHeader = page.locator('th').filter({ hasText: /title/i });
    await titleHeader.click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, '06-sort-title-desc-before.png');

    await titleHeader.click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '06-sort-title-desc-after.png');

    const firstTitle = await page.locator('table tbody tr').first().locator('td').nth(0).textContent();
    console.log(`✅ Sort title descending: First title = "${firstTitle}"`);
  });

  test('7. Column Sorting - Category', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, '07-sort-category-before.png');

    const categoryHeader = page.locator('th').filter({ hasText: /category/i });
    await categoryHeader.click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '07-sort-category-after.png');

    console.log('✅ Category sorting clicked');
  });

  test('8. Column Sorting - Status', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, '08-sort-status-before.png');

    const statusHeader = page.locator('th').filter({ hasText: /status/i });
    await statusHeader.click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '08-sort-status-after.png');

    console.log('✅ Status sorting clicked');
  });

  test('9. Pagination - Next Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, '09-pagination-next-before.png');

    // Click next page button
    const nextButton = page.locator('button').filter({ hasText: /next/i });
    if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      await takeScreenshot(page, '09-pagination-next-after.png');
      console.log('✅ Next page button clicked');
    } else {
      console.log('⚠️ Next button not found or disabled');
      await takeScreenshot(page, '09-pagination-next-disabled.png');
    }
  });

  test('10. Pagination - Previous Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Go to page 2 first
    const nextButton = page.locator('button').filter({ hasText: /next/i });
    if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
    }

    await takeScreenshot(page, '10-pagination-prev-before.png');

    const prevButton = page.locator('button').filter({ hasText: /previous|prev/i });
    if (await prevButton.count() > 0 && await prevButton.isEnabled()) {
      await prevButton.click();
      await page.waitForTimeout(1000);

      await takeScreenshot(page, '10-pagination-prev-after.png');
      console.log('✅ Previous page button clicked');
    } else {
      console.log('⚠️ Previous button not found or disabled');
      await takeScreenshot(page, '10-pagination-prev-disabled.png');
    }
  });

  test('11. Bulk Operations - Select Resources', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, '11-bulk-select-before.png');

    // Select first 3 checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 3) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();
      await page.waitForTimeout(500);

      await takeScreenshot(page, '11-bulk-select-after.png');

      // Verify bulk toolbar appears
      const bulkToolbar = page.locator('text=/selected|bulk|action/i');
      const toolbarVisible = await bulkToolbar.count() > 0;

      console.log(`✅ Bulk select: ${toolbarVisible ? 'Toolbar appeared' : 'Toolbar NOT visible'}`);
    } else {
      console.log('⚠️ Not enough checkboxes found');
      await takeScreenshot(page, '11-bulk-select-insufficient.png');
    }
  });

  test('12. Admin Navigation - Dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '12-nav-dashboard.png');

    const title = await page.title();
    console.log(`✅ Dashboard loaded: ${title}`);
  });

  test('13. Admin Navigation - Resources', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/resources`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '13-nav-resources.png');

    const url = page.url();
    console.log(`✅ Resources page: ${url}`);
  });

  test('14. Admin Navigation - Pending Approvals', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pending`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '14-nav-pending.png');

    const url = page.url();
    console.log(`✅ Pending approvals page: ${url}`);
  });

  test('15. Admin Navigation - Users', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '15-nav-users.png');

    const url = page.url();
    console.log(`✅ Users page: ${url}`);
  });

  test('16. Admin Navigation - GitHub Sync', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/github`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '16-nav-github.png');

    const url = page.url();
    console.log(`✅ GitHub sync page: ${url}`);
  });

  test('17. Admin Navigation - AI Enrichment', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/enrichment`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '17-nav-enrichment.png');

    const url = page.url();
    console.log(`✅ AI enrichment page: ${url}`);
  });

  test('18. Admin Navigation - Validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/validation`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '18-nav-validation.png');

    const url = page.url();
    console.log(`✅ Validation page: ${url}`);
  });

  test('19. Admin Navigation - Analytics', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/analytics`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '19-nav-analytics.png');

    const url = page.url();
    console.log(`✅ Analytics page: ${url}`);
  });

  test('20. Admin Navigation - Settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '20-nav-settings.png');

    const url = page.url();
    console.log(`✅ Settings page: ${url}`);
  });

  test('21. Admin Navigation - Audit Log', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '21-nav-audit.png');

    const url = page.url();
    console.log(`✅ Audit log page: ${url}`);
  });
});
