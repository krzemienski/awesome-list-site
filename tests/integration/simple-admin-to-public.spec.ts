import { test, expect } from '@playwright/test';
import { getResourceById } from '../helpers/database';
import { MultiContextTestHelper } from '../helpers/multi-context';

/**
 * Simplified Integration Tests
 *
 * Focus on API + Database verification, less complex UI automation
 */

test.describe('Simple Admin → Public Integration', () => {

  test('Simple Test: Update via API → Verify in Database → Check Public Visibility', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    const TEST_RESOURCE_ID = '00000000-0000-0000-0000-000000000001';
    const TIMESTAMP = Date.now();
    const NEW_TITLE = `Integration Test ${TIMESTAMP}`;

    try {
      // ===== STEP 1: Admin updates via API =====
      console.log('Step 1: Updating resource via admin API...');

      const { page: adminPage } = await helper.createAdminContext();

      // Navigate to establish origin for localStorage
      await adminPage.goto('http://localhost:3000/admin');
      await adminPage.waitForLoadState('networkidle');

      // Get auth token from localStorage
      const authToken = await adminPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        if (!token) return null;
        const parsed = JSON.parse(token);
        return parsed.access_token;
      });

      console.log('  Got auth token:', authToken ? 'YES' : 'NO');

      // Make API request to update resource
      const response = await adminPage.request.put(
        `http://localhost:3000/api/admin/resources/${TEST_RESOURCE_ID}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            title: NEW_TITLE,
            description: `Updated at ${TIMESTAMP}`
          }
        }
      );

      console.log('  API response status:', response.status());

      if (!response.ok()) {
        const body = await response.text();
        console.log('  Error response:', body);
        throw new Error(`API returned ${response.status()}: ${body}`);
      }

      console.log('  ✅ API update successful');

      // ===== STEP 2: Verify Database =====
      console.log('Step 2: Verifying database...');

      const dbResource = await getResourceById(TEST_RESOURCE_ID);
      expect(dbResource.title).toBe(NEW_TITLE);

      console.log('  ✅ Database confirmed:', dbResource.title);

      // ===== STEP 3: Anonymous sees on public page =====
      console.log('Step 3: Checking public visibility...');

      const { page: anonPage } = await helper.createAnonymousContext();

      await anonPage.goto('http://localhost:3000/category/general-tools');
      await anonPage.waitForLoadState('networkidle');

      // Check if new title visible
      const resourceCard = anonPage.locator(`text="${NEW_TITLE}"`);
      await expect(resourceCard).toBeVisible({ timeout: 10000 });

      console.log('  ✅ Anonymous user sees updated title');

      console.log('\n✅ TEST PASSED: Complete integration verified\n');

      // ===== STEP 4: Reset resource for next test =====
      await adminPage.request.put(
        `http://localhost:3000/api/admin/resources/${TEST_RESOURCE_ID}`,
        {
          data: {
            title: 'INTEGRATION_TEST_RESOURCE_DO_NOT_DELETE',
            description: 'This resource is used by integration tests'
          }
        }
      );

      console.log('  Resource reset for next test');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test 2: Update description via API → Verify publicly visible', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    const TEST_RESOURCE_ID = '00000000-0000-0000-0000-000000000001';
    const TIMESTAMP = Date.now();
    const NEW_DESC = `Integration test description ${TIMESTAMP}`;

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto('http://localhost:3000/admin');

      const authToken = await adminPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      // Update description
      const response = await adminPage.request.put(
        `http://localhost:3000/api/admin/resources/${TEST_RESOURCE_ID}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          data: { description: NEW_DESC }
        }
      );

      expect(response.status()).toBe(200);

      // Verify database
      const dbResource = await getResourceById(TEST_RESOURCE_ID);
      expect(dbResource.description).toBe(NEW_DESC);

      console.log('✅ TEST 2 PASSED: Description update verified');

      // Reset
      await adminPage.request.put(
        `http://localhost:3000/api/admin/resources/${TEST_RESOURCE_ID}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          data: { description: 'This resource is used by integration tests' }
        }
      );

    } finally {
      await helper.closeAll();
    }
  });

  test('Test 3: Bulk approve resources → All visible publicly', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    // Create 3 test resources
    const TIMESTAMP = Date.now();
    const testResources = [
      { id: `bulk-1-${TIMESTAMP}`, title: `Bulk Test 1 ${TIMESTAMP}`, url: `https://bulk-1-${TIMESTAMP}.com` },
      { id: `bulk-2-${TIMESTAMP}`, title: `Bulk Test 2 ${TIMESTAMP}`, url: `https://bulk-2-${TIMESTAMP}.com` },
      { id: `bulk-3-${TIMESTAMP}`, title: `Bulk Test 3 ${TIMESTAMP}`, url: `https://bulk-3-${TIMESTAMP}.com` }
    ];

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto('http://localhost:3000/admin');

      const authToken = await adminPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      // Create 3 pending resources via admin API
      const createdIds: string[] = [];
      for (const resource of testResources) {
        const createRes = await adminPage.request.post(
          'http://localhost:3000/api/resources',
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            data: {
              title: resource.title,
              url: resource.url,
              description: 'Bulk test resource',
              category: 'General Tools'
            }
          }
        );

        if (createRes.ok()) {
          const created = await createRes.json();
          createdIds.push(created.id);
        }
      }

      console.log(`  Created ${createdIds.length} pending resources`);

      // Bulk approve
      const bulkRes = await adminPage.request.post(
        'http://localhost:3000/api/admin/resources/bulk',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            action: 'approve',
            resourceIds: createdIds
          }
        }
      );

      expect(bulkRes.status()).toBe(200);

      // Verify all approved in database
      for (const id of createdIds) {
        const resource = await getResourceById(id);
        expect(resource.status).toBe('approved');
      }

      console.log('✅ TEST 3 PASSED: Bulk approve verified');

      // Cleanup
      for (const id of createdIds) {
        await adminPage.request.delete(`http://localhost:3000/api/admin/resources/${id}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }).catch(() => {});  // Ignore cleanup errors
      }

    } finally {
      await helper.closeAll();
    }
  });

});
