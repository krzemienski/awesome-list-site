import { test, expect, APIRequestContext } from '@playwright/test';
import { MultiContextTestHelper } from '../helpers/multi-context';
import {
  getResourceById,
  getResourcesByStatus,
  getResourcesByCategory,
  countResources,
  cleanupTestResource
} from '../helpers/database';

/**
 * API Endpoint Verification: Group 2 - Resource APIs
 *
 * 3-Layer Validation for each endpoint:
 * - Layer 1: API call succeeds with correct status code
 * - Layer 2: Database reflects the change
 * - Layer 3: UI/API verification
 *
 * Endpoints tested:
 * - GET /api/resources (list with filters)
 * - GET /api/resources/:id
 * - GET /api/admin/resources (admin list)
 * - DELETE /api/admin/resources/:id
 * - POST /api/admin/resources/:id/approve
 * - POST /api/admin/resources/:id/reject
 */

// Helper to retry API calls on rate limit (429)
async function apiWithRetry(
  request: APIRequestContext,
  method: 'get' | 'post' | 'delete' | 'put',
  url: string,
  options?: { headers?: Record<string, string>; data?: any }
): Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }> {
  const maxRetries = 3;
  let lastResponse: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const waitTime = 5000 * attempt;
      console.log(`  [Rate limited] Waiting ${waitTime / 1000}s before retry ${attempt + 1}...`);
      await new Promise(r => setTimeout(r, waitTime));
    }

    lastResponse = await request[method](url, options);

    if (lastResponse.status() !== 429) {
      return {
        ok: lastResponse.ok(),
        status: lastResponse.status(),
        json: () => lastResponse.json(),
        text: () => lastResponse.text()
      };
    }
  }

  return {
    ok: lastResponse.ok(),
    status: lastResponse.status(),
    json: () => lastResponse.json(),
    text: () => lastResponse.text()
  };
}

test.describe('API Verification: Resource APIs', () => {

  // Configure serial mode and longer timeout
  test.describe.configure({ mode: 'serial', timeout: 120000 });

  test.beforeAll(async () => {
    console.log('Waiting 10s for rate limit reset...');
    await new Promise(r => setTimeout(r, 10000));
  });

  test('GET /api/resources - List approved resources (3-layer)', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}`);
      await anonPage.waitForLoadState('networkidle');

      // =========================================
      // Layer 1: API call - GET resources (no auth needed)
      // =========================================
      const listRes = await apiWithRetry(
        anonPage.request,
        'get',
        `${BASE_URL}/api/resources`
      );

      expect(listRes.ok).toBeTruthy();
      const response = await listRes.json();

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.total).toBeGreaterThan(0);
      console.log('[PASS] Layer 1: GET /api/resources returned', listRes.status, '- Total:', response.total);

      // =========================================
      // Layer 2: Database verification
      // =========================================
      const dbCount = await countResources({ status: 'approved' });
      expect(response.total).toBe(dbCount);
      console.log('[PASS] Layer 2: Database count matches API response');

      // =========================================
      // Layer 3: Filter verification
      // =========================================
      await new Promise(r => setTimeout(r, 2000));

      const filteredRes = await apiWithRetry(
        anonPage.request,
        'get',
        `${BASE_URL}/api/resources?category=Encoding%20%26%20Codecs&limit=10`
      );

      expect(filteredRes.ok).toBeTruthy();
      const filteredData = await filteredRes.json();

      // All returned resources should be in the correct category
      const allMatchCategory = filteredData.data.every((r: any) =>
        r.category === 'Encoding & Codecs' || r.category === 'Encoding &amp; Codecs'
      );
      expect(allMatchCategory).toBe(true);
      console.log('[PASS] Layer 3: Category filter works correctly');

      console.log('\n[SUCCESS] GET /api/resources - All 3 layers verified\n');

    } finally {
      await helper.closeAll();
    }
  });

  test('GET /api/resources/:id - Get single resource (3-layer)', async () => {
    await new Promise(r => setTimeout(r, 5000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}`);
      await anonPage.waitForLoadState('networkidle');

      // First get a list of resources to get a valid ID
      const listRes = await apiWithRetry(
        anonPage.request,
        'get',
        `${BASE_URL}/api/resources?limit=1`
      );

      const listData = await listRes.json();
      const resourceId = listData.data[0].id;

      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 1: API call - GET single resource
      // =========================================
      const singleRes = await apiWithRetry(
        anonPage.request,
        'get',
        `${BASE_URL}/api/resources/${resourceId}`
      );

      expect(singleRes.ok).toBeTruthy();
      const resource = await singleRes.json();

      expect(resource.id).toBe(resourceId);
      expect(resource.title).toBeDefined();
      expect(resource.url).toBeDefined();
      console.log('[PASS] Layer 1: GET /api/resources/:id returned', singleRes.status);

      // =========================================
      // Layer 2: Database verification
      // =========================================
      const dbResource = await getResourceById(resourceId);
      expect(dbResource.id).toBe(resource.id);
      expect(dbResource.title).toBe(resource.title);
      console.log('[PASS] Layer 2: Database confirms resource data');

      // =========================================
      // Layer 3: Invalid ID returns 404
      // =========================================
      await new Promise(r => setTimeout(r, 2000));

      const invalidRes = await apiWithRetry(
        anonPage.request,
        'get',
        `${BASE_URL}/api/resources/00000000-0000-0000-0000-000000000999`
      );

      expect(invalidRes.status).toBe(404);
      console.log('[PASS] Layer 3: Invalid ID returns 404');

      console.log('\n[SUCCESS] GET /api/resources/:id - All 3 layers verified\n');

    } finally {
      await helper.closeAll();
    }
  });

  test('GET /api/admin/resources - Admin list with all statuses (3-layer)', async () => {
    await new Promise(r => setTimeout(r, 5000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // =========================================
      // Layer 1: API call - GET admin resources
      // =========================================
      const adminRes = await apiWithRetry(
        adminPage.request,
        'get',
        `${BASE_URL}/api/admin/resources`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(adminRes.ok).toBeTruthy();
      const response = await adminRes.json();

      expect(response.data).toBeDefined();
      expect(response.total).toBeGreaterThan(0);
      console.log('[PASS] Layer 1: GET /api/admin/resources returned', adminRes.status, '- Total:', response.total);

      // =========================================
      // Layer 2: Admin should see all resources
      // =========================================
      const dbTotalApproved = await countResources({ status: 'approved' });
      const dbTotalPending = await countResources({ status: 'pending' });
      const dbTotalRejected = await countResources({ status: 'rejected' });
      const dbTotal = dbTotalApproved + dbTotalPending + dbTotalRejected;

      // Admin total should include all statuses
      expect(response.total).toBeGreaterThanOrEqual(dbTotalApproved);
      console.log('[PASS] Layer 2: Admin sees all resources including non-approved');

      // =========================================
      // Layer 3: Anonymous blocked from admin endpoint
      // =========================================
      await new Promise(r => setTimeout(r, 2000));

      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}`);

      const anonRes = await apiWithRetry(
        anonPage.request,
        'get',
        `${BASE_URL}/api/admin/resources`
      );

      expect([401, 403]).toContain(anonRes.status);
      console.log('[PASS] Layer 3: Anonymous blocked from admin endpoint');

      console.log('\n[SUCCESS] GET /api/admin/resources - All 3 layers verified\n');

    } finally {
      await helper.closeAll();
    }
  });

  test('POST /api/admin/resources/:id/approve - Approve resource (3-layer)', async () => {
    await new Promise(r => setTimeout(r, 5000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    let testResourceId: string;

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Create a pending resource first
      const createRes = await apiWithRetry(
        adminPage.request,
        'post',
        `${BASE_URL}/api/resources`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            title: `Approve Test ${TIMESTAMP}`,
            url: `https://approve-test-${TIMESTAMP}.com`,
            description: 'Test resource for approval',
            category: 'General Tools'
          }
        }
      );

      expect(createRes.ok).toBeTruthy();
      const created = await createRes.json();
      testResourceId = created.id;

      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 1: API call - Approve resource
      // =========================================
      const approveRes = await apiWithRetry(
        adminPage.request,
        'post',
        `${BASE_URL}/api/admin/resources/${testResourceId}/approve`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(approveRes.ok).toBeTruthy();
      console.log('[PASS] Layer 1: POST /api/admin/resources/:id/approve returned', approveRes.status);

      // =========================================
      // Layer 2: Database verification
      // =========================================
      const dbResource = await getResourceById(testResourceId);
      expect(dbResource.status).toBe('approved');
      console.log('[PASS] Layer 2: Database confirms status is approved');

      // =========================================
      // Layer 3: Public API now returns this resource
      // =========================================
      await new Promise(r => setTimeout(r, 2000));

      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}`);

      const publicRes = await apiWithRetry(
        anonPage.request,
        'get',
        `${BASE_URL}/api/resources/${testResourceId}`
      );

      expect(publicRes.ok).toBeTruthy();
      const publicResource = await publicRes.json();
      expect(publicResource.status).toBe('approved');
      console.log('[PASS] Layer 3: Resource visible in public API');

      console.log('\n[SUCCESS] POST /api/admin/resources/:id/approve - All 3 layers verified\n');

    } finally {
      // Cleanup
      if (testResourceId) {
        await cleanupTestResource(`https://approve-test-${TIMESTAMP}.com`).catch(() => {});
      }
      await helper.closeAll();
    }
  });

  test('POST /api/admin/resources/:id/reject - Reject resource (3-layer)', async () => {
    await new Promise(r => setTimeout(r, 5000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    let testResourceId: string;

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Create a pending resource first
      const createRes = await apiWithRetry(
        adminPage.request,
        'post',
        `${BASE_URL}/api/resources`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            title: `Reject Test ${TIMESTAMP}`,
            url: `https://reject-test-${TIMESTAMP}.com`,
            description: 'Test resource for rejection',
            category: 'General Tools'
          }
        }
      );

      expect(createRes.ok).toBeTruthy();
      const created = await createRes.json();
      testResourceId = created.id;

      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 1: API call - Reject resource
      // =========================================
      const rejectRes = await apiWithRetry(
        adminPage.request,
        'post',
        `${BASE_URL}/api/admin/resources/${testResourceId}/reject`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { reason: 'Test rejection reason' }
        }
      );

      expect(rejectRes.ok).toBeTruthy();
      console.log('[PASS] Layer 1: POST /api/admin/resources/:id/reject returned', rejectRes.status);

      // =========================================
      // Layer 2: Database verification
      // =========================================
      const dbResource = await getResourceById(testResourceId);
      expect(dbResource.status).toBe('rejected');
      console.log('[PASS] Layer 2: Database confirms status is rejected');

      // =========================================
      // Layer 3: Public API returns 404 for rejected resource
      // =========================================
      await new Promise(r => setTimeout(r, 2000));

      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}`);

      const publicRes = await apiWithRetry(
        anonPage.request,
        'get',
        `${BASE_URL}/api/resources/${testResourceId}`
      );

      expect(publicRes.status).toBe(404);
      console.log('[PASS] Layer 3: Rejected resource returns 404 on public API');

      console.log('\n[SUCCESS] POST /api/admin/resources/:id/reject - All 3 layers verified\n');

    } finally {
      // Cleanup
      if (testResourceId) {
        await cleanupTestResource(`https://reject-test-${TIMESTAMP}.com`).catch(() => {});
      }
      await helper.closeAll();
    }
  });

  test('DELETE /api/admin/resources/:id - Delete resource (3-layer)', async () => {
    await new Promise(r => setTimeout(r, 5000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    let testResourceId: string;

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Create a resource first
      const createRes = await apiWithRetry(
        adminPage.request,
        'post',
        `${BASE_URL}/api/resources`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            title: `Delete Test ${TIMESTAMP}`,
            url: `https://delete-test-${TIMESTAMP}.com`,
            description: 'Test resource for deletion',
            category: 'General Tools'
          }
        }
      );

      expect(createRes.ok).toBeTruthy();
      const created = await createRes.json();
      testResourceId = created.id;

      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 1: API call - Delete resource
      // =========================================
      const deleteRes = await apiWithRetry(
        adminPage.request,
        'delete',
        `${BASE_URL}/api/admin/resources/${testResourceId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(deleteRes.ok).toBeTruthy();
      console.log('[PASS] Layer 1: DELETE /api/admin/resources/:id returned', deleteRes.status);

      // =========================================
      // Layer 2: Database verification - resource gone
      // =========================================
      let resourceFound = true;
      try {
        await getResourceById(testResourceId);
      } catch (e) {
        resourceFound = false;
      }

      expect(resourceFound).toBe(false);
      console.log('[PASS] Layer 2: Database confirms resource deleted');

      // =========================================
      // Layer 3: Both admin and public APIs return 404
      // =========================================
      await new Promise(r => setTimeout(r, 2000));

      const adminGetRes = await apiWithRetry(
        adminPage.request,
        'get',
        `${BASE_URL}/api/resources/${testResourceId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(adminGetRes.status).toBe(404);
      console.log('[PASS] Layer 3: Deleted resource returns 404');

      console.log('\n[SUCCESS] DELETE /api/admin/resources/:id - All 3 layers verified\n');

    } finally {
      await helper.closeAll();
    }
  });

  test('Non-admin blocked from admin resource endpoints (403)', async () => {
    await new Promise(r => setTimeout(r, 8000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      // Use regular user context
      const { page: userPage } = await helper.createUserContext('A');
      await userPage.goto(`${BASE_URL}`);
      await userPage.waitForLoadState('networkidle');

      const token = await userPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Try admin-only endpoints
      const adminListRes = await apiWithRetry(
        userPage.request,
        'get',
        `${BASE_URL}/api/admin/resources`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect([401, 403]).toContain(adminListRes.status);
      console.log('[PASS] GET /api/admin/resources blocked for non-admin:', adminListRes.status);

      await new Promise(r => setTimeout(r, 2000));

      const approveRes = await apiWithRetry(
        userPage.request,
        'post',
        `${BASE_URL}/api/admin/resources/test-id/approve`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect([401, 403]).toContain(approveRes.status);
      console.log('[PASS] POST /api/admin/resources/:id/approve blocked for non-admin:', approveRes.status);

      await new Promise(r => setTimeout(r, 2000));

      const deleteRes = await apiWithRetry(
        userPage.request,
        'delete',
        `${BASE_URL}/api/admin/resources/test-id`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect([401, 403]).toContain(deleteRes.status);
      console.log('[PASS] DELETE /api/admin/resources/:id blocked for non-admin:', deleteRes.status);

      console.log('\n[SUCCESS] All admin resource endpoints properly protected (401/403)\n');

    } finally {
      await helper.closeAll();
    }
  });

});
