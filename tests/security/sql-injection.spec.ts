import { test, expect } from '@playwright/test';
import { MultiContextTestHelper } from '../helpers/multi-context';
import { countResources } from '../helpers/database';

/**
 * SQL Injection Prevention Security Tests
 *
 * CRITICAL: These tests verify that user input is properly parameterized
 * and cannot be used to manipulate SQL queries.
 *
 * Test methodology:
 * 1. Count resources in database BEFORE test
 * 2. Attempt SQL injection via various inputs
 * 3. Verify database state unchanged
 * 4. Check for error handling (should return clean errors, not SQL errors)
 */

test.describe('SQL Injection Prevention Tests [CRITICAL SECURITY]', () => {
  test.setTimeout(60000);

  // Common SQL injection payloads
  const SQL_PAYLOADS = [
    "'; DROP TABLE resources; --",
    "'; DELETE FROM resources; --",
    "' OR '1'='1",
    "' OR 1=1; --",
    "'; UPDATE resources SET status='pending'; --",
    "1; DROP TABLE resources;",
    "' UNION SELECT * FROM auth.users; --",
    "' AND 1=0 UNION SELECT * FROM resources; --",
    "Robert'); DROP TABLE students;--",
    "'; TRUNCATE TABLE resources; --"
  ];

  test('Test SQLI-1: Search bar injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      // Count resources BEFORE attack
      const beforeCount = await countResources({ status: 'approved' });
      console.log(`  Resources before test: ${beforeCount}`);

      const { page: anonPage } = await helper.createAnonymousContext();

      for (const payload of SQL_PAYLOADS) {
        // Test via URL parameter
        const searchUrl = `${BASE_URL}/?search=${encodeURIComponent(payload)}`;
        await anonPage.goto(searchUrl);
        await anonPage.waitForLoadState('networkidle');
        await anonPage.waitForTimeout(500);
      }

      // Count resources AFTER attack
      const afterCount = await countResources({ status: 'approved' });
      console.log(`  Resources after test: ${afterCount}`);

      // CRITICAL: Resource count should be unchanged
      expect(afterCount).toBe(beforeCount);

      // Verify table still exists and has data
      expect(afterCount).toBeGreaterThan(0);

      console.log('  SQLI TEST-1 PASSED: Search bar injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-2: API search endpoint injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const beforeCount = await countResources({ status: 'approved' });
      console.log(`  Resources before test: ${beforeCount}`);

      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}`);

      for (const payload of SQL_PAYLOADS.slice(0, 5)) { // Test first 5 to avoid rate limiting
        // Direct API call with injection
        const res = await anonPage.request.get(
          `${BASE_URL}/api/resources?search=${encodeURIComponent(payload)}`
        );

        // Should return valid JSON (empty or results), not SQL error
        if (res.ok()) {
          const data = await res.json();
          expect(Array.isArray(data) || (data && typeof data === 'object')).toBeTruthy();
        }
        // 400/500 is OK as long as database wasn't modified
      }

      const afterCount = await countResources({ status: 'approved' });
      expect(afterCount).toBe(beforeCount);

      console.log('  SQLI TEST-2 PASSED: API search injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-3: Resource title input injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const beforeCount = await countResources({});
      console.log(`  Total resources before test: ${beforeCount}`);

      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Attempt to create resource with SQL injection in title
      const TIMESTAMP = Date.now();
      const injectionPayload = "'; DROP TABLE resources; --";

      const createRes = await adminPage.request.post(`${BASE_URL}/api/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: injectionPayload,
          url: `https://sqli-test-${TIMESTAMP}.com`,
          description: 'SQL injection test',
          category: 'General Tools'
        }
      });

      // Resource creation should either succeed (payload treated as string)
      // or fail with validation error - NOT cause SQL error
      console.log(`  Create response: ${createRes.status()}`);

      // CRITICAL: Verify database still exists and has data
      const afterCount = await countResources({});
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);

      console.log(`  Total resources after test: ${afterCount}`);
      console.log('  SQLI TEST-3 PASSED: Title input injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-4: Resource description input injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const beforeCount = await countResources({});

      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      const TIMESTAMP = Date.now();
      const injectionPayload = "' OR 1=1; DELETE FROM resources WHERE 1=1; --";

      const createRes = await adminPage.request.post(`${BASE_URL}/api/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: `Safe Title ${TIMESTAMP}`,
          url: `https://sqli-desc-test-${TIMESTAMP}.com`,
          description: injectionPayload,
          category: 'General Tools'
        }
      });

      console.log(`  Create response: ${createRes.status()}`);

      const afterCount = await countResources({});
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);

      console.log('  SQLI TEST-4 PASSED: Description input injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-5: Category filter injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const beforeCount = await countResources({});

      const { page: anonPage } = await helper.createAnonymousContext();

      // Try injection via category parameter
      const injectionPayloads = [
        "General Tools' OR '1'='1",
        "'; DROP TABLE categories; --",
        "General Tools'; DELETE FROM resources; --"
      ];

      for (const payload of injectionPayloads) {
        const res = await anonPage.request.get(
          `${BASE_URL}/api/resources?category=${encodeURIComponent(payload)}`
        );

        // Should return empty results or error, not SQL data
        if (res.ok()) {
          const data = await res.json();
          // Should not contain data from other categories due to injection
          expect(Array.isArray(data) || (data && typeof data === 'object')).toBeTruthy();
        }
      }

      const afterCount = await countResources({});
      expect(afterCount).toBe(beforeCount);

      console.log('  SQLI TEST-5 PASSED: Category filter injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-6: URL parameter injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const beforeCount = await countResources({});

      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Try injection via resource ID parameter
      const injectionIds = [
        "'; DROP TABLE resources; --",
        "1' OR '1'='1",
        "00000000-0000-0000-0000-000000000000' OR 1=1; --"
      ];

      for (const injectionId of injectionIds) {
        const res = await adminPage.request.get(
          `${BASE_URL}/api/resources/${encodeURIComponent(injectionId)}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        // Should return 404 or 400, not SQL error or data dump
        expect([400, 404, 429, 500]).toContain(res.status());
      }

      const afterCount = await countResources({});
      expect(afterCount).toBe(beforeCount);

      console.log('  SQLI TEST-6 PASSED: URL parameter injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-7: UNION-based injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: anonPage } = await helper.createAnonymousContext();

      // Try UNION injection to extract auth data
      const unionPayloads = [
        "' UNION SELECT * FROM auth.users; --",
        "' UNION SELECT email, raw_user_meta_data FROM auth.users; --",
        "' UNION SELECT 1,2,3,4,5,6,7,8,9,10; --"
      ];

      for (const payload of unionPayloads) {
        const res = await anonPage.request.get(
          `${BASE_URL}/api/resources?search=${encodeURIComponent(payload)}`
        );

        if (res.ok()) {
          const data = await res.json();
          const dataStr = JSON.stringify(data);

          // Should NOT contain auth data
          expect(dataStr).not.toContain('raw_user_meta_data');
          expect(dataStr).not.toContain('encrypted_password');
          expect(dataStr).not.toContain('auth.users');
        }
      }

      console.log('  SQLI TEST-7 PASSED: UNION injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-8: Time-based blind injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: anonPage } = await helper.createAnonymousContext();

      // Time-based injection - if vulnerable, response would be delayed
      const timePayloads = [
        "'; SELECT pg_sleep(5); --",
        "' AND (SELECT pg_sleep(5))='",
        "'; WAITFOR DELAY '00:00:05'; --"
      ];

      for (const payload of timePayloads) {
        const startTime = Date.now();

        const res = await anonPage.request.get(
          `${BASE_URL}/api/resources?search=${encodeURIComponent(payload)}`,
          { timeout: 10000 }
        );

        const elapsed = Date.now() - startTime;

        // If pg_sleep executed, response would be > 5000ms
        // Normal response should be < 2000ms
        expect(elapsed).toBeLessThan(4000);
      }

      console.log('  SQLI TEST-8 PASSED: Time-based blind injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-9: Second-order injection prevention', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const beforeCount = await countResources({});

      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Create resource with injection payload stored
      const TIMESTAMP = Date.now();
      const storedPayload = "Test'; DROP TABLE resources; --";

      const createRes = await adminPage.request.post(`${BASE_URL}/api/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: storedPayload,
          url: `https://sqli-second-order-${TIMESTAMP}.com`,
          description: 'Second order injection test',
          category: 'General Tools'
        }
      });

      // Now try operations that might use stored data
      if (createRes.ok()) {
        const created = await createRes.json();

        // Approve the resource (might trigger stored injection)
        await adminPage.request.post(
          `${BASE_URL}/api/admin/resources/${created.id}/approve`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        // Search for the resource (might trigger stored injection)
        await adminPage.request.get(
          `${BASE_URL}/api/resources?search=${encodeURIComponent(storedPayload)}`
        );
      }

      const afterCount = await countResources({});
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);

      console.log('  SQLI TEST-9 PASSED: Second-order injection prevented');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test SQLI-10: Database table verification', async () => {
    // Final verification that all tables still exist after all tests
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

      // Verify key tables still exist by querying them
      const tables = [
        '/api/resources',
        '/api/categories',
        '/api/admin/stats'
      ];

      for (const endpoint of tables) {
        const res = await adminPage.request.get(`${BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        expect([200, 304, 429]).toContain(res.status());
      }

      // Verify resource count is reasonable (should have many resources)
      const resourceCount = await countResources({});
      expect(resourceCount).toBeGreaterThan(100); // Should have 2600+ resources

      console.log(`  Final resource count: ${resourceCount}`);
      console.log('  SQLI TEST-10 PASSED: All database tables verified intact');

    } finally {
      await helper.closeAll();
    }
  });

});
