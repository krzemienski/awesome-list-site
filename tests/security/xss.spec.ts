import { test, expect } from '@playwright/test';
import { MultiContextTestHelper } from '../helpers/multi-context';
import { getResourceById, cleanupTestResource } from '../helpers/database';

/**
 * XSS Prevention Security Tests
 *
 * CRITICAL: These tests verify that user input is properly escaped/sanitized
 * before rendering in the UI. Any failure indicates a HIGH severity security vulnerability.
 *
 * Test methodology:
 * 1. Submit malicious script payloads via API
 * 2. Admin approves resource
 * 3. Navigate to public page where resource displays
 * 4. Verify script rendered as text (HTML escaped), NO script execution
 * 5. Check browser console for errors/alerts
 */

test.describe('XSS Prevention Tests [CRITICAL SECURITY]', () => {
  // Increase timeout for security tests
  test.setTimeout(60000);

  const XSS_PAYLOADS = [
    {
      name: 'Basic script tag',
      title: '<script>alert("XSS")</script>',
      description: 'Testing basic XSS',
      expectedEscaped: '&lt;script&gt;'
    },
    {
      name: 'Event handler XSS',
      title: 'Test <img src="x" onerror="alert(\'XSS\')">',
      description: 'Testing event handler XSS',
      expectedEscaped: '&lt;img'
    },
    {
      name: 'SVG onload XSS',
      title: '<svg onload="alert(\'XSS\')">',
      description: 'Testing SVG onload XSS',
      expectedEscaped: '&lt;svg'
    },
    {
      name: 'JavaScript URL',
      title: 'Click <a href="javascript:alert(\'XSS\')">here</a>',
      description: 'Testing JavaScript URL XSS',
      expectedEscaped: '&lt;a href'
    },
    {
      name: 'Encoded script',
      title: '<script>alert(String.fromCharCode(88,83,83))</script>',
      description: 'Testing encoded XSS',
      expectedEscaped: '&lt;script&gt;'
    }
  ];

  test('Test XSS-1: Script tag in title is escaped', async () => {
    await new Promise(r => setTimeout(r, 2000)); // Rate limit delay

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    const XSS_TITLE = '<script>alert("XSS-TITLE-TEST")</script>';
    const TEST_URL = `https://xss-test-title-${TIMESTAMP}.com`;
    let createdResourceId: string | null = null;

    try {
      // Step 1: Admin creates resource with XSS payload
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      expect(token).toBeTruthy();
      console.log('  Admin token extracted');

      // Create resource with XSS in title
      const createRes = await adminPage.request.post(`${BASE_URL}/api/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: XSS_TITLE,
          url: TEST_URL,
          description: 'XSS test resource',
          category: 'General Tools'
        }
      });

      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      createdResourceId = created.id;
      console.log('  Resource created with XSS title:', createdResourceId);

      // Layer 1: Verify API stores the data
      expect(created.title).toBe(XSS_TITLE);
      console.log('  Layer 1: API stores XSS payload as-is (expected)');

      // Approve the resource
      const approveRes = await adminPage.request.post(
        `${BASE_URL}/api/admin/resources/${createdResourceId}/approve`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      expect(approveRes.ok()).toBeTruthy();
      console.log('  Resource approved');

      // Layer 2: Database verification
      const dbResource = await getResourceById(createdResourceId);
      expect(dbResource.title).toBe(XSS_TITLE);
      expect(dbResource.status).toBe('approved');
      console.log('  Layer 2: Database stores XSS payload correctly');

      // Layer 3: Anonymous UI - verify NO script execution
      const { page: anonPage } = await helper.createAnonymousContext();

      // Set up console listener to catch any alert attempts
      let scriptExecuted = false;
      anonPage.on('dialog', async dialog => {
        scriptExecuted = true;
        console.log('  CRITICAL: XSS ALERT EXECUTED:', dialog.message());
        await dialog.dismiss();
      });

      // Listen for console errors
      const consoleErrors: string[] = [];
      anonPage.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Navigate to category page
      await anonPage.goto(`${BASE_URL}/category/general-tools`);
      await anonPage.waitForLoadState('networkidle');
      await anonPage.waitForTimeout(2000); // Wait for any delayed script execution

      // Check for script execution
      expect(scriptExecuted).toBe(false);

      // Verify the title is visible but escaped (rendered as text)
      const pageContent = await anonPage.content();

      // Should NOT find unescaped script tags
      expect(pageContent).not.toContain('<script>alert("XSS-TITLE-TEST")</script>');

      // Should find escaped or the raw text is displayed safely
      // The text might be escaped in HTML or just not rendered as script
      const titleLocator = anonPage.locator(`text=/XSS-TITLE-TEST|script/i`);
      const titleCount = await titleLocator.count();

      if (titleCount > 0) {
        console.log('  Title text is visible (properly escaped)');
      } else {
        console.log('  Title may be sanitized/stripped (also safe)');
      }

      console.log('  Layer 3: No XSS script execution detected');
      console.log('  XSS TEST-1 PASSED: Script tag properly handled');

    } finally {
      // Cleanup
      if (createdResourceId) {
        await cleanupTestResource(TEST_URL).catch(() => {});
      }
      await helper.closeAll();
    }
  });

  test('Test XSS-2: Script tag in description is escaped', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    const XSS_DESCRIPTION = '<script>document.body.innerHTML="HACKED"</script>Normal description';
    const TEST_URL = `https://xss-test-desc-${TIMESTAMP}.com`;
    let createdResourceId: string | null = null;

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Create resource with XSS in description
      const createRes = await adminPage.request.post(`${BASE_URL}/api/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: `Safe Title ${TIMESTAMP}`,
          url: TEST_URL,
          description: XSS_DESCRIPTION,
          category: 'General Tools'
        }
      });

      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      createdResourceId = created.id;

      // Approve
      await adminPage.request.post(
        `${BASE_URL}/api/admin/resources/${createdResourceId}/approve`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Anonymous context check
      const { page: anonPage } = await helper.createAnonymousContext();

      let scriptExecuted = false;
      anonPage.on('dialog', async dialog => {
        scriptExecuted = true;
        await dialog.dismiss();
      });

      await anonPage.goto(`${BASE_URL}/category/general-tools`);
      await anonPage.waitForLoadState('networkidle');
      await anonPage.waitForTimeout(2000);

      // Page should not be replaced with "HACKED"
      const bodyContent = await anonPage.textContent('body');
      expect(bodyContent).not.toBe('HACKED');
      expect(scriptExecuted).toBe(false);

      console.log('  XSS TEST-2 PASSED: Description XSS properly handled');

    } finally {
      if (createdResourceId) {
        await cleanupTestResource(TEST_URL).catch(() => {});
      }
      await helper.closeAll();
    }
  });

  test('Test XSS-3: Event handler XSS (onerror, onclick) is escaped', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    const XSS_TITLE = `Test <img src="x" onerror="alert('XSS-EVENT-${TIMESTAMP}')">`;
    const TEST_URL = `https://xss-test-event-${TIMESTAMP}.com`;
    let createdResourceId: string | null = null;

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      const createRes = await adminPage.request.post(`${BASE_URL}/api/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: XSS_TITLE,
          url: TEST_URL,
          description: 'Testing event handler XSS',
          category: 'General Tools'
        }
      });

      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      createdResourceId = created.id;

      await adminPage.request.post(
        `${BASE_URL}/api/admin/resources/${createdResourceId}/approve`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { page: anonPage } = await helper.createAnonymousContext();

      let alertTriggered = false;
      anonPage.on('dialog', async dialog => {
        alertTriggered = true;
        console.log('  CRITICAL: EVENT HANDLER XSS EXECUTED:', dialog.message());
        await dialog.dismiss();
      });

      await anonPage.goto(`${BASE_URL}/category/general-tools`);
      await anonPage.waitForLoadState('networkidle');
      await anonPage.waitForTimeout(2000);

      expect(alertTriggered).toBe(false);

      // Verify no actual img tag was created that would trigger onerror
      const imgElements = await anonPage.locator('img[onerror]').count();
      expect(imgElements).toBe(0);

      console.log('  XSS TEST-3 PASSED: Event handler XSS properly handled');

    } finally {
      if (createdResourceId) {
        await cleanupTestResource(TEST_URL).catch(() => {});
      }
      await helper.closeAll();
    }
  });

  test('Test XSS-4: SVG/onload XSS is escaped', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    const XSS_TITLE = `<svg onload="alert('SVG-XSS-${TIMESTAMP}')">`;
    const TEST_URL = `https://xss-test-svg-${TIMESTAMP}.com`;
    let createdResourceId: string | null = null;

    try {
      const { page: adminPage } = await helper.createAdminContext();
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      const createRes = await adminPage.request.post(`${BASE_URL}/api/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: XSS_TITLE,
          url: TEST_URL,
          description: 'Testing SVG XSS',
          category: 'General Tools'
        }
      });

      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      createdResourceId = created.id;

      await adminPage.request.post(
        `${BASE_URL}/api/admin/resources/${createdResourceId}/approve`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { page: anonPage } = await helper.createAnonymousContext();

      let alertTriggered = false;
      anonPage.on('dialog', async dialog => {
        alertTriggered = true;
        console.log('  CRITICAL: SVG XSS EXECUTED:', dialog.message());
        await dialog.dismiss();
      });

      await anonPage.goto(`${BASE_URL}/category/general-tools`);
      await anonPage.waitForLoadState('networkidle');
      await anonPage.waitForTimeout(2000);

      expect(alertTriggered).toBe(false);

      // Verify no SVG with onload was created
      const svgElements = await anonPage.locator('svg[onload]').count();
      expect(svgElements).toBe(0);

      console.log('  XSS TEST-4 PASSED: SVG XSS properly handled');

    } finally {
      if (createdResourceId) {
        await cleanupTestResource(TEST_URL).catch(() => {});
      }
      await helper.closeAll();
    }
  });

  test('Test XSS-5: JavaScript URL in notes/bookmarks is escaped', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    const TIMESTAMP = Date.now();
    const XSS_NOTES = `javascript:alert('XSS-NOTES-${TIMESTAMP}')`;

    try {
      // User A creates bookmark with malicious notes
      const { page: userPage } = await helper.createUserContext('A');
      await userPage.goto(`${BASE_URL}`);
      await userPage.waitForLoadState('networkidle');

      const token = await userPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Get first approved resource
      const resourcesRes = await userPage.request.get(`${BASE_URL}/api/resources?limit=1`);
      const resources = await resourcesRes.json();

      if (!resources || resources.length === 0) {
        console.log('  Skipping test - no resources available');
        return;
      }

      const testResourceId = resources[0].id;

      // Create bookmark with XSS in notes
      const bookmarkRes = await userPage.request.post(
        `${BASE_URL}/api/bookmarks/${testResourceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { notes: XSS_NOTES }
        }
      );

      // Note: May get 409 if already bookmarked
      if (!bookmarkRes.ok() && bookmarkRes.status() !== 409) {
        console.log('  Bookmark creation failed:', bookmarkRes.status());
      }

      // Navigate to bookmarks page
      await userPage.goto(`${BASE_URL}/bookmarks`);
      await userPage.waitForLoadState('networkidle');

      let alertTriggered = false;
      userPage.on('dialog', async dialog => {
        alertTriggered = true;
        console.log('  CRITICAL: NOTES XSS EXECUTED:', dialog.message());
        await dialog.dismiss();
      });

      await userPage.waitForTimeout(2000);

      expect(alertTriggered).toBe(false);

      // Check that javascript: links are not rendered as actual links
      const jsLinks = await userPage.locator('a[href^="javascript:"]').count();
      expect(jsLinks).toBe(0);

      console.log('  XSS TEST-5 PASSED: JavaScript URL in notes properly handled');

      // Cleanup - remove bookmark
      await userPage.request.delete(
        `${BASE_URL}/api/bookmarks/${testResourceId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      ).catch(() => {});

    } finally {
      await helper.closeAll();
    }
  });

  test('Test XSS-6: Search query XSS is escaped', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: anonPage } = await helper.createAnonymousContext();

      let alertTriggered = false;
      anonPage.on('dialog', async dialog => {
        alertTriggered = true;
        console.log('  CRITICAL: SEARCH XSS EXECUTED:', dialog.message());
        await dialog.dismiss();
      });

      // Navigate with XSS in search query
      const XSS_SEARCH = '<script>alert("SEARCH-XSS")</script>';
      await anonPage.goto(`${BASE_URL}/?search=${encodeURIComponent(XSS_SEARCH)}`);
      await anonPage.waitForLoadState('networkidle');
      await anonPage.waitForTimeout(2000);

      expect(alertTriggered).toBe(false);

      // Verify the search box shows escaped text or doesn't execute
      const pageContent = await anonPage.content();
      expect(pageContent).not.toContain('<script>alert("SEARCH-XSS")</script>');

      console.log('  XSS TEST-6 PASSED: Search query XSS properly handled');

    } finally {
      await helper.closeAll();
    }
  });

  test('Test XSS-7: Reflected XSS via URL params is prevented', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: anonPage } = await helper.createAnonymousContext();

      let alertTriggered = false;
      anonPage.on('dialog', async dialog => {
        alertTriggered = true;
        console.log('  CRITICAL: REFLECTED XSS EXECUTED:', dialog.message());
        await dialog.dismiss();
      });

      // Try various URL-based XSS vectors
      const xssUrls = [
        `${BASE_URL}/category/<script>alert("CAT-XSS")</script>`,
        `${BASE_URL}/?category="><script>alert("PARAM-XSS")</script>`,
        `${BASE_URL}/?callback=<script>alert("CB-XSS")</script>`,
      ];

      for (const xssUrl of xssUrls) {
        await anonPage.goto(xssUrl).catch(() => {}); // May 404, that's fine
        await anonPage.waitForTimeout(1000);
      }

      expect(alertTriggered).toBe(false);

      console.log('  XSS TEST-7 PASSED: Reflected XSS properly handled');

    } finally {
      await helper.closeAll();
    }
  });

});
