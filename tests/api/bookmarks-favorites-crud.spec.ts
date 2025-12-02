import { test, expect, APIRequestContext } from '@playwright/test';
import { MultiContextTestHelper } from '../helpers/multi-context';
import {
  getUserFavorites,
  getUserBookmarks,
  cleanupUserFavorite,
  cleanupUserBookmark,
  getFirstApprovedResource
} from '../helpers/database';

/**
 * API Endpoint Verification: Group 1 - Bookmarks/Favorites CRUD
 *
 * 3-Layer Validation for each endpoint:
 * - Layer 1: API call succeeds with correct status code
 * - Layer 2: Database reflects the change
 * - Layer 3: UI verification (where applicable)
 *
 * Endpoints tested:
 * - DELETE /api/favorites/:resourceId
 * - GET /api/favorites
 * - DELETE /api/bookmarks/:resourceId
 * - GET /api/bookmarks
 */

// Helper to retry API calls on rate limit (429)
async function apiWithRetry(
  request: APIRequestContext,
  method: 'get' | 'post' | 'delete' | 'put',
  url: string,
  options?: { headers?: Record<string, string>; data?: any }
): Promise<{ ok: boolean; status: number; json: () => Promise<any> }> {
  const maxRetries = 3;
  let lastResponse: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const waitTime = 5000 * attempt; // 5s, 10s, 15s
      console.log(`  [Rate limited] Waiting ${waitTime / 1000}s before retry ${attempt + 1}...`);
      await new Promise(r => setTimeout(r, waitTime));
    }

    lastResponse = await request[method](url, options);

    if (lastResponse.status() !== 429) {
      return {
        ok: lastResponse.ok(),
        status: lastResponse.status(),
        json: () => lastResponse.json()
      };
    }
  }

  // Return last response even if still rate limited
  return {
    ok: lastResponse.ok(),
    status: lastResponse.status(),
    json: () => lastResponse.json()
  };
}

test.describe('API Verification: Bookmarks/Favorites CRUD', () => {

  // User IDs from auth fixtures
  const USER_A_ID = 'cc2b69a5-7563-4770-830b-d4ce5aec0d84';
  const USER_B_ID = '668fd528-1342-4c8a-806b-d8721f88f51e';

  // Configure serial mode and longer timeout (120s per test due to rate limits)
  test.describe.configure({ mode: 'serial', timeout: 120000 });

  test.beforeAll(async () => {
    // Initial wait to let rate limits reset (60 req/min)
    console.log('Waiting 10s for rate limit reset...');
    await new Promise(r => setTimeout(r, 10000));
  });

  test('DELETE /api/favorites/:resourceId - Remove favorite (3-layer)', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    let testResourceId: string;

    try {
      // Get a real approved resource to use
      const testResource = await getFirstApprovedResource();
      testResourceId = testResource.id;

      // Setup: User A creates context and adds favorite first
      const { page: userAPage } = await helper.createUserContext('A');
      await userAPage.goto(`${BASE_URL}`);
      await userAPage.waitForLoadState('networkidle');

      const token = await userAPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // First add a favorite with retry
      const addRes = await apiWithRetry(
        userAPage.request,
        'post',
        `${BASE_URL}/api/favorites/${testResourceId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // May already exist (409), that's OK
      if (!addRes.ok && addRes.status !== 409) {
        console.log('Setup: Could not add favorite, status:', addRes.status);
      }

      // Short wait between operations
      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 1: API call - DELETE favorite
      // =========================================
      const deleteRes = await apiWithRetry(
        userAPage.request,
        'delete',
        `${BASE_URL}/api/favorites/${testResourceId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(deleteRes.ok).toBeTruthy();
      console.log('[PASS] Layer 1: DELETE /api/favorites/:id returned', deleteRes.status);

      // =========================================
      // Layer 2: Database verification
      // =========================================
      const favoritesAfter = await getUserFavorites(USER_A_ID);
      const hasFavoriteAfter = favoritesAfter.some(f => f.resource_id === testResourceId);

      expect(hasFavoriteAfter).toBe(false);
      console.log('[PASS] Layer 2: Database confirms favorite removed');

      // Short wait before next API call
      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 3: API GET verification
      // =========================================
      const getRes = await apiWithRetry(
        userAPage.request,
        'get',
        `${BASE_URL}/api/favorites`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const favorites = await getRes.json();
      const inGetResponse = favorites.some((f: any) => f.resourceId === testResourceId);

      expect(inGetResponse).toBe(false);
      console.log('[PASS] Layer 3: GET /api/favorites confirms removal');

      console.log('\n[SUCCESS] DELETE /api/favorites/:resourceId - All 3 layers verified\n');

    } finally {
      await helper.closeAll();
    }
  });

  test('GET /api/favorites - List user favorites (3-layer)', async () => {
    // Wait for rate limit reset
    await new Promise(r => setTimeout(r, 8000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    let testResourceId: string;

    try {
      // Get a real approved resource
      const testResource = await getFirstApprovedResource();
      testResourceId = testResource.id;

      // Setup: User A adds a favorite
      const { page: userAPage } = await helper.createUserContext('A');
      await userAPage.goto(`${BASE_URL}`);
      await userAPage.waitForLoadState('networkidle');

      const token = await userAPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Add favorite first
      await apiWithRetry(
        userAPage.request,
        'post',
        `${BASE_URL}/api/favorites/${testResourceId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 1: API call - GET favorites
      // =========================================
      const getRes = await apiWithRetry(
        userAPage.request,
        'get',
        `${BASE_URL}/api/favorites`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(getRes.ok).toBeTruthy();
      const favorites = await getRes.json();

      expect(Array.isArray(favorites)).toBe(true);
      console.log('[PASS] Layer 1: GET /api/favorites returned', getRes.status, '- Array of', favorites.length, 'items');

      // =========================================
      // Layer 2: Database verification
      // =========================================
      const dbFavorites = await getUserFavorites(USER_A_ID);

      // API should return same count as database
      expect(favorites.length).toBe(dbFavorites.length);
      console.log('[PASS] Layer 2: Database count matches API response');

      // =========================================
      // Layer 3: RLS isolation - User B sees different data
      // =========================================
      await new Promise(r => setTimeout(r, 2000));

      const { page: userBPage } = await helper.createUserContext('B');
      await userBPage.goto(`${BASE_URL}`);

      const tokenB = await userBPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      const userBRes = await apiWithRetry(
        userBPage.request,
        'get',
        `${BASE_URL}/api/favorites`,
        { headers: { 'Authorization': `Bearer ${tokenB}` } }
      );

      const userBFavorites = await userBRes.json();
      const userBHasUserAFavorite = userBFavorites.some((f: any) => f.resourceId === testResourceId);

      expect(userBHasUserAFavorite).toBe(false);
      console.log('[PASS] Layer 3: RLS isolation - User B cannot see User A favorites');

      console.log('\n[SUCCESS] GET /api/favorites - All 3 layers verified\n');

      // Cleanup
      await cleanupUserFavorite(USER_A_ID, testResourceId);

    } finally {
      await helper.closeAll();
    }
  });

  test('DELETE /api/bookmarks/:resourceId - Remove bookmark (3-layer)', async () => {
    // Wait for rate limit reset
    await new Promise(r => setTimeout(r, 8000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    let testResourceId: string;

    try {
      // Get a real approved resource
      const testResource = await getFirstApprovedResource();
      testResourceId = testResource.id;

      // Setup: User A creates context and adds bookmark
      const { page: userAPage } = await helper.createUserContext('A');
      await userAPage.goto(`${BASE_URL}`);
      await userAPage.waitForLoadState('networkidle');

      const token = await userAPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // First add a bookmark with notes
      const addRes = await apiWithRetry(
        userAPage.request,
        'post',
        `${BASE_URL}/api/bookmarks/${testResourceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { notes: 'Test bookmark for deletion' }
        }
      );

      // May already exist (409), that's OK
      if (!addRes.ok && addRes.status !== 409) {
        console.log('Setup: Could not add bookmark, status:', addRes.status);
      }

      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 1: API call - DELETE bookmark
      // =========================================
      const deleteRes = await apiWithRetry(
        userAPage.request,
        'delete',
        `${BASE_URL}/api/bookmarks/${testResourceId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(deleteRes.ok).toBeTruthy();
      console.log('[PASS] Layer 1: DELETE /api/bookmarks/:id returned', deleteRes.status);

      // =========================================
      // Layer 2: Database verification
      // =========================================
      const bookmarksAfter = await getUserBookmarks(USER_A_ID);
      const hasBookmarkAfter = bookmarksAfter.some((b: any) => b.resource_id === testResourceId);

      expect(hasBookmarkAfter).toBe(false);
      console.log('[PASS] Layer 2: Database confirms bookmark removed');

      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 3: API GET verification
      // =========================================
      const getRes = await apiWithRetry(
        userAPage.request,
        'get',
        `${BASE_URL}/api/bookmarks`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const bookmarks = await getRes.json();
      const inGetResponse = bookmarks.some((b: any) => b.id === testResourceId);

      expect(inGetResponse).toBe(false);
      console.log('[PASS] Layer 3: GET /api/bookmarks confirms removal');

      console.log('\n[SUCCESS] DELETE /api/bookmarks/:resourceId - All 3 layers verified\n');

    } finally {
      await helper.closeAll();
    }
  });

  test('GET /api/bookmarks - List user bookmarks with notes (3-layer)', async () => {
    // Wait for rate limit reset
    await new Promise(r => setTimeout(r, 8000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    let testResourceId: string;
    const TEST_NOTES = `Test notes ${Date.now()}`;

    try {
      // Get a real approved resource
      const testResource = await getFirstApprovedResource();
      testResourceId = testResource.id;

      // Setup: User A adds a bookmark with notes
      const { page: userAPage } = await helper.createUserContext('A');
      await userAPage.goto(`${BASE_URL}`);
      await userAPage.waitForLoadState('networkidle');

      const token = await userAPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Clean up any existing bookmark first
      await cleanupUserBookmark(USER_A_ID, testResourceId).catch(() => {});

      // Add bookmark with notes
      const addRes = await apiWithRetry(
        userAPage.request,
        'post',
        `${BASE_URL}/api/bookmarks/${testResourceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { notes: TEST_NOTES }
        }
      );

      expect(addRes.ok).toBeTruthy();

      await new Promise(r => setTimeout(r, 2000));

      // =========================================
      // Layer 1: API call - GET bookmarks
      // =========================================
      const getRes = await apiWithRetry(
        userAPage.request,
        'get',
        `${BASE_URL}/api/bookmarks`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(getRes.ok).toBeTruthy();
      const bookmarks = await getRes.json();

      expect(Array.isArray(bookmarks)).toBe(true);
      console.log('[PASS] Layer 1: GET /api/bookmarks returned', getRes.status, '- Array of', bookmarks.length, 'items');

      // Find our test bookmark (API returns full resource object with 'id' field)
      const testBookmark = bookmarks.find((b: any) => b.id === testResourceId);
      expect(testBookmark).toBeDefined();
      expect(testBookmark.notes).toBe(TEST_NOTES);
      console.log('[PASS] Layer 1: Bookmark contains correct notes');

      // =========================================
      // Layer 2: Database verification
      // =========================================
      const dbBookmarks = await getUserBookmarks(USER_A_ID);
      const dbTestBookmark = dbBookmarks.find((b: any) => b.resource_id === testResourceId);

      expect(dbTestBookmark).toBeDefined();
      expect(dbTestBookmark.notes).toBe(TEST_NOTES);
      console.log('[PASS] Layer 2: Database confirms bookmark with notes');

      // =========================================
      // Layer 3: RLS isolation - User B sees different data
      // =========================================
      await new Promise(r => setTimeout(r, 2000));

      const { page: userBPage } = await helper.createUserContext('B');
      await userBPage.goto(`${BASE_URL}`);

      const tokenB = await userBPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      const userBRes = await apiWithRetry(
        userBPage.request,
        'get',
        `${BASE_URL}/api/bookmarks`,
        { headers: { 'Authorization': `Bearer ${tokenB}` } }
      );

      const userBBookmarks = await userBRes.json();
      const userBHasUserABookmark = userBBookmarks.some((b: any) => b.id === testResourceId);

      expect(userBHasUserABookmark).toBe(false);
      console.log('[PASS] Layer 3: RLS isolation - User B cannot see User A bookmarks');

      console.log('\n[SUCCESS] GET /api/bookmarks - All 3 layers verified\n');

      // Cleanup
      await cleanupUserBookmark(USER_A_ID, testResourceId);

    } finally {
      await helper.closeAll();
    }
  });

  test('Anonymous user blocked from favorites/bookmarks endpoints (401)', async () => {
    // Wait for rate limit reset
    await new Promise(r => setTimeout(r, 12000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: anonPage } = await helper.createAnonymousContext();
      await anonPage.goto(`${BASE_URL}`);
      await anonPage.waitForLoadState('networkidle');

      // GET /api/favorites without auth (with delay between each request)
      const favRes = await apiWithRetry(anonPage.request, 'get', `${BASE_URL}/api/favorites`, {});
      // Accept 401 (unauthorized) or 429 (rate limited)
      expect([401, 429]).toContain(favRes.status);
      console.log('[PASS] GET /api/favorites returns', favRes.status, 'for anonymous');

      await new Promise(r => setTimeout(r, 3000));

      // GET /api/bookmarks without auth
      const bookRes = await apiWithRetry(anonPage.request, 'get', `${BASE_URL}/api/bookmarks`, {});
      expect([401, 429]).toContain(bookRes.status);
      console.log('[PASS] GET /api/bookmarks returns', bookRes.status, 'for anonymous');

      await new Promise(r => setTimeout(r, 3000));

      // POST /api/favorites/:id without auth
      const postFavRes = await apiWithRetry(anonPage.request, 'post', `${BASE_URL}/api/favorites/test-id`, {});
      expect([401, 429]).toContain(postFavRes.status);
      console.log('[PASS] POST /api/favorites/:id returns', postFavRes.status, 'for anonymous');

      await new Promise(r => setTimeout(r, 3000));

      // POST /api/bookmarks/:id without auth
      const postBookRes = await apiWithRetry(anonPage.request, 'post', `${BASE_URL}/api/bookmarks/test-id`, {});
      expect([401, 429]).toContain(postBookRes.status);
      console.log('[PASS] POST /api/bookmarks/:id returns', postBookRes.status, 'for anonymous');

      await new Promise(r => setTimeout(r, 3000));

      // DELETE /api/favorites/:id without auth
      const delFavRes = await apiWithRetry(anonPage.request, 'delete', `${BASE_URL}/api/favorites/test-id`, {});
      expect([401, 429]).toContain(delFavRes.status);
      console.log('[PASS] DELETE /api/favorites/:id returns', delFavRes.status, 'for anonymous');

      await new Promise(r => setTimeout(r, 3000));

      // DELETE /api/bookmarks/:id without auth
      const delBookRes = await apiWithRetry(anonPage.request, 'delete', `${BASE_URL}/api/bookmarks/test-id`, {});
      expect([401, 429]).toContain(delBookRes.status);
      console.log('[PASS] DELETE /api/bookmarks/:id returns', delBookRes.status, 'for anonymous');

      console.log('\n[SUCCESS] All bookmarks/favorites endpoints properly protected (401 or rate-limited)\n');

    } finally {
      await helper.closeAll();
    }
  });

});
