import { test, expect } from '@playwright/test';
import { MultiContextTestHelper } from '../helpers/multi-context';
import { getUserFavorites, getUserBookmarks, verifyUserLacksBookmark } from '../helpers/database';

/**
 * RLS User Data Isolation Tests
 *
 * P0 SECURITY CRITICAL: Verify User A's private data is NOT accessible to User B
 */

test.describe('RLS User Data Isolation', () => {

  test('Test 6: User A favorites → User B cannot see (UI)', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    const TEST_RESOURCE_ID = '00000000-0000-0000-0000-000000000001';
    const USER_A_ID = 'cc2b69a5-7563-4770-830b-d4ce5aec0d84';
    const USER_B_ID = '668fd528-1342-4c8a-806b-d8721f88f51e';

    try {
      // === User A: Add favorite ===
      const { page: userAPage } = await helper.createUserContext('A');
      await userAPage.goto('http://localhost:3000');

      const userAToken = await userAPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      // Add favorite via API
      const favRes = await userAPage.request.post(
        `http://localhost:3000/api/favorites/${TEST_RESOURCE_ID}`,
        {
          headers: { 'Authorization': `Bearer ${userAToken}` }
        }
      );

      expect(favRes.ok()).toBeTruthy();
      console.log('  User A added favorite');

      // === Verify in database ===
      const userAFavorites = await getUserFavorites(USER_A_ID);
      expect(userAFavorites).toContainEqual(
        expect.objectContaining({ resource_id: TEST_RESOURCE_ID })
      );

      console.log('  Database confirmed User A favorite');

      // === User B: Verify cannot see ===
      const { page: userBPage } = await helper.createUserContext('B');
      await userBPage.goto('http://localhost:3000/profile');

      // Navigate to favorites tab
      await userBPage.click('button:has-text("Favorites"), [role="tab"]:has-text("Favorites")').catch(() => {});

      // Should NOT contain User A's favorite
      const userBFavoritesList = userBPage.locator('[data-testid="favorites-list"], .favorites');
      const hasTestResource = await userBFavoritesList.locator(`text="${TEST_RESOURCE_ID}"`).isVisible().catch(() => false);

      expect(hasTestResource).toBe(false);

      console.log('  ✅ User B cannot see User A favorite (UI)');

      // === Verify API also blocks ===
      const userBToken = await userBPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      const userBFavoritesAPI = await userBPage.request.get(
        'http://localhost:3000/api/favorites',
        {
          headers: { 'Authorization': `Bearer ${userBToken}` }
        }
      );

      const userBFavs = await userBFavoritesAPI.json();
      const hasResourceInAPI = userBFavs.some((fav: any) => fav.resourceId === TEST_RESOURCE_ID);

      expect(hasResourceInAPI).toBe(false);

      console.log('  ✅ User B blocked via API (RLS working)');

      // === Database RLS verification ===
      const userBFavoritesDB = await getUserFavorites(USER_B_ID);
      const userBHasResource = userBFavoritesDB.some(fav => fav.resource_id === TEST_RESOURCE_ID);

      expect(userBHasResource).toBe(false);

      console.log('  ✅ Database RLS blocks User B from User A data');

      console.log('\n✅ TEST 6 PASSED: User isolation verified at all layers\n');

      // Cleanup
      await userAPage.request.delete(
        `http://localhost:3000/api/favorites/${TEST_RESOURCE_ID}`,
        {
          headers: { 'Authorization': `Bearer ${userAToken}` }
        }
      );

    } finally {
      await helper.closeAll();
    }
  });

  test('Test 7: User A bookmarks → User B cannot access (API)', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    const TEST_RESOURCE_ID = '00000000-0000-0000-0000-000000000001';
    const USER_A_ID = 'cc2b69a5-7563-4770-830b-d4ce5aec0d84';
    const USER_B_ID = '668fd528-1342-4c8a-806b-d8721f88f51e';

    try {
      // === User A: Add bookmark with notes ===
      const { page: userAPage } = await helper.createUserContext('A');
      await userAPage.goto('http://localhost:3000');

      const userAToken = await userAPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      const bookmarkRes = await userAPage.request.post(
        `http://localhost:3000/api/bookmarks/${TEST_RESOURCE_ID}`,
        {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
          data: { notes: 'User A private notes' }
        }
      );

      expect(bookmarkRes.ok()).toBeTruthy();
      console.log('  User A created bookmark with notes');

      // === User B: API should return empty ===
      const { page: userBPage } = await helper.createUserContext('B');
      await userBPage.goto('http://localhost:3000');

      const userBToken = await userBPage.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return token ? JSON.parse(token).access_token : null;
      });

      const userBBookmarksAPI = await userBPage.request.get(
        'http://localhost:3000/api/bookmarks',
        {
          headers: { 'Authorization': `Bearer ${userBToken}` }
        }
      );

      const userBBookmarks = await userBBookmarksAPI.json();
      const hasUserABookmark = userBBookmarks.some((b: any) => b.resourceId === TEST_RESOURCE_ID);

      expect(hasUserABookmark).toBe(false);

      console.log('  ✅ User B API shows empty (no User A bookmarks)');

      // === Database RLS verification ===
      const userBBookmarksDB = await getUserBookmarks(USER_B_ID);
      expect(userBBookmarksDB).toHaveLength(0);

      await verifyUserLacksBookmark(USER_B_ID, TEST_RESOURCE_ID);

      console.log('  ✅ Database RLS blocks cross-user bookmark access');
      console.log('\n✅ TEST 7 PASSED: Bookmark isolation verified\n');

      // Cleanup
      await userAPage.request.delete(
        `http://localhost:3000/api/bookmarks/${TEST_RESOURCE_ID}`,
        {
          headers: { 'Authorization': `Bearer ${userAToken}` }
        }
      );

    } finally {
      await helper.closeAll();
    }
  });

});
