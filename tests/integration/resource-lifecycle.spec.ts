import { test, expect } from '@playwright/test';
import { MultiContextTestHelper } from '../helpers/multi-context';
import { getResourcesByStatus, getResourceById } from '../helpers/database';

/**
 * Resource Lifecycle Integration Tests
 *
 * Verify complete Submit → Approve/Reject → Public Visibility flows
 */

test.describe('Resource Lifecycle Integration', () => {

  test('Test 10: Submit → Approve → Visible on public pages', async () => {
    // Wait to avoid rate limiting from previous tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    const TEST_RESOURCE = {
      title: `Lifecycle Test ${TIMESTAMP}`,
      url: `https://lifecycle-test-${TIMESTAMP}.example.com`,
      description: 'End-to-end lifecycle test',
      category: 'General Tools'
    };

    let createdResourceId: string;

    try {
      // === Step 1: Submit resource (authenticated user) ===
      const { page: userPage } = await helper.createUserContext('A');
      await userPage.goto(`${BASE_URL}`);

      const userToken = await userPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      const submitRes = await userPage.request.post(
        `${BASE_URL}/api/resources`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          data: TEST_RESOURCE
        }
      );

      if (!submitRes.ok()) {
        const errorBody = await submitRes.text();
        console.error('  Submit failed:', submitRes.status(), errorBody);
        throw new Error(`Submit failed: ${submitRes.status()} - ${errorBody}`);
      }

      const created = await submitRes.json();
      createdResourceId = created.id;

      console.log('  ✅ Resource submitted, ID:', createdResourceId);

      // === Step 2: Verify pending in database ===
      const pendingResources = await getResourcesByStatus('pending');
      const isPending = pendingResources.some(r => r.id === createdResourceId);

      expect(isPending).toBeTruthy();

      console.log('  ✅ Resource in pending status');

      // === Step 3: Admin approves ===
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);

      const adminToken = await adminPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      const approveRes = await adminPage.request.post(
        `${BASE_URL}/api/admin/resources/${createdResourceId}/approve`,
        {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }
      );

      if (!approveRes.ok()) {
        const errorBody = await approveRes.text();
        console.error('  Approve failed:', approveRes.status(), errorBody);
        throw new Error(`Approve failed: ${approveRes.status()}`);
      }

      console.log('  ✅ Admin approved resource (API returned', approveRes.status(), ')');

      // === Step 4: Verify approved in database ===
      await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for DB write

      const resource = await getResourceById(createdResourceId);

      if (resource.status !== 'approved') {
        console.error('  ❌ Resource status:', resource.status, '(expected: approved)');
        throw new Error(`Resource not approved. Status: ${resource.status}`);
      }

      console.log('  ✅ Database shows approved');

      // === Step 5: Anonymous user sees on public page ===
      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}/category/general-tools`);
      await anonPage.waitForLoadState('networkidle');

      const resourceCard = anonPage.locator(`text="${TEST_RESOURCE.title}"`);
      await expect(resourceCard).toBeVisible({ timeout: 5000 });

      console.log('  ✅ Anonymous user sees approved resource');
      console.log('\n✅ TEST 10 PASSED: Complete lifecycle verified\n');

      // Cleanup
      await adminPage.request.delete(
        `${BASE_URL}/api/admin/resources/${createdResourceId}`,
        {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }
      ).catch(() => {});

    } finally {
      await helper.closeAll();
    }
  });

  test('Test 11: Submit → Reject → NOT visible on public pages', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    const TEST_RESOURCE = {
      title: `Reject Test ${TIMESTAMP}`,
      url: `https://reject-test-${TIMESTAMP}.example.com`,
      description: 'Should be rejected',
      category: 'General Tools'
    };

    let createdResourceId: string;

    try {
      // Submit
      const { page: userPage } = await helper.createUserContext('A');
      await userPage.goto(`${BASE_URL}`);

      const userToken = await userPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      const submitRes = await userPage.request.post(
        `${BASE_URL}/api/resources`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          data: TEST_RESOURCE
        }
      );

      const created = await submitRes.json();
      createdResourceId = created.id;

      // Admin rejects
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);

      const adminToken = await adminPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      const rejectRes = await adminPage.request.post(
        `${BASE_URL}/api/admin/resources/${createdResourceId}/reject`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          data: { reason: 'Integration test rejection' }
        }
      );

      expect(rejectRes.ok()).toBeTruthy();

      console.log('  ✅ Admin rejected resource');

      // Verify rejected in database
      const rejectedResources = await getResourcesByStatus('rejected');
      const isRejected = rejectedResources.some(r => r.id === createdResourceId);

      expect(isRejected).toBeTruthy();

      console.log('  ✅ Database shows rejected');

      // Anonymous should NOT see
      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}/category/general-tools`);

      const resourceCard = anonPage.locator(`text="${TEST_RESOURCE.title}"`);
      await expect(resourceCard).not.toBeVisible();

      console.log('  ✅ Rejected resource NOT visible to public');
      console.log('\n✅ TEST 11 PASSED: Rejection flow verified\n');

      // Cleanup
      await adminPage.request.delete(
        `${BASE_URL}/api/admin/resources/${createdResourceId}`,
        {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }
      ).catch(() => {});

    } finally {
      await helper.closeAll();
    }
  });

});
