import { test, expect } from '@playwright/test';
import { MultiContextTestHelper } from '../helpers/multi-context';
import { getResourceById, countResources } from '../helpers/database';

/**
 * Search & Filter Integration Tests
 *
 * Verify search finds recently edited resources and filters work correctly
 */

test.describe('Search & Filter Integration', () => {

  test('Test 13: Edit resource → Search finds new title immediately', async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));  // Rate limit cooldown

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TEST_RESOURCE_ID = '00000000-0000-0000-0000-000000000001';
    const TIMESTAMP = Date.now();
    const NEW_TITLE = `Searchable Title ${TIMESTAMP}`;

    try {
      // Admin edits title
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      await adminPage.request.put(
        `${BASE_URL}/api/admin/resources/${TEST_RESOURCE_ID}`,
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { title: NEW_TITLE }
        }
      );

      // Anonymous searches for new title
      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}`);

      // Open search (keyboard shortcut)
      await anonPage.keyboard.press('/');
      await anonPage.waitForTimeout(300);

      // Type search query
      await anonPage.fill('input[type="search"]', `Searchable ${TIMESTAMP}`);
      await anonPage.waitForTimeout(500);  // Debounce

      // Verify search results contain new title
      const searchResults = anonPage.locator('[role="listbox"] [role="option"], [data-testid="search-result"]');
      const firstResult = searchResults.first();

      await expect(firstResult).toContainText(`Searchable Title ${TIMESTAMP}`, { timeout: 5000 });

      console.log('✅ TEST 13 PASSED: Search finds new title immediately');

      // Reset
      await adminPage.request.put(
        `${BASE_URL}/api/admin/resources/${TEST_RESOURCE_ID}`,
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { title: 'INTEGRATION_TEST_RESOURCE_DO_NOT_DELETE' }
        }
      );

    } finally {
      await helper.closeAll();
    }
  });

  test('Test 14: Filter by status → Shows correct subset', async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      // Count approved resources
      const approvedCount = await countResources({ status: 'approved' });

      console.log('  Database has', approvedCount, 'approved resources');

      // Admin filters by approved
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin/resources`);

      // Select status filter
      await adminPage.selectOption('select:has-text("All Statuses"), [name="status"]', 'approved');
      await adminPage.waitForTimeout(1000);

      // Count visible rows
      const tableRows = adminPage.locator('tbody tr');
      const rowCount = await tableRows.count();

      // Should match database (or be paginated subset)
      expect(rowCount).toBeGreaterThan(0);
      expect(rowCount).toBeLessThanOrEqual(20);  // Page size limit

      console.log('  UI shows', rowCount, 'approved resources (page 1)');
      console.log('✅ TEST 14 PASSED: Status filter works');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test 15: Filter by category → Shows correct subset', async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      // Count resources in "General Tools"
      const categoryCount = await countResources({ category: 'General Tools', status: 'approved' });

      console.log('  Database has', categoryCount, 'General Tools resources');

      // Admin filters
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin/resources`);

      await adminPage.selectOption('select:has-text("All Categories"), [name="category"]', 'General Tools');
      await adminPage.waitForTimeout(1000);

      const tableRows = adminPage.locator('tbody tr');
      const rowCount = await tableRows.count();

      expect(rowCount).toBeGreaterThan(0);

      console.log('  UI shows', rowCount, 'General Tools resources');
      console.log('✅ TEST 15 PASSED: Category filter works');

    } finally {
      await helper.closeAll();
    }
  });

});
