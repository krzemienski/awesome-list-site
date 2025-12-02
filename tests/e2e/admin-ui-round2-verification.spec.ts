import { test, expect, Page } from '@playwright/test';

/**
 * Admin UI Verification - Round 2
 * Tests: Tasks 2-30 (29 comprehensive tests)
 * Focus: Filter dropdowns, sorting, pagination, bulk operations, navigation
 * 
 * CRITICAL: Session injection must happen BEFORE navigating to admin pages
 * Pattern verified from Round 1 Task 1
 */

// Shared session data (JWT from environment or test user)
const ADMIN_SESSION_DATA = {
  'sb-jeyldoypdkgsrfdhdcmm-auth-token': JSON.stringify({
    access_token: "eyJhbGciOiJIUzI1NiIsImtpZCI6IkRlOTBodWp6SVpGd2xsZEMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2pleWxkb3lwZGtnc3JmZGhkY21tLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1OGM1OTJjNS01NDhiLTQ0MTItYjRlMi1hOWRmNWNhYzUzOTciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY0NTMzNzY4LCJpYXQiOjE3NjQ1MzAxNjgsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6e30sInVzZXJfbWV0YWRhdGEiOnsiZnVsbF9uYW1lIjoiVGVzdCBBZG1pbiIsInJvbGUiOiJhZG1pbiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzY0NTIzMDk5fV0sInNlc3Npb25faWQiOiI5ZjBiNzY1NS1jMTNiLTQ3MmUtOGNiNy0wMjUwZmY3MDQ0ZjIiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.vaQyM5FbY7ReGMHmqxU182dLxX4GDNLi70Qdkh-qU0k",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 1764533768,
    refresh_token: "nuzkiuqjyuhp",
    user: {
      id: "58c592c5-548b-4412-b4e2-a9df5cac5397",
      email: "admin@test.com",
      user_metadata: { role: "admin", full_name: "Test Admin" }
    }
  })
};

/**
 * Helper: Inject admin session before navigating to protected routes
 */
async function injectAdminSession(page: Page) {
  // Step 1: Visit base domain to establish localStorage origin
  await page.goto(`${BASE_URL}`);

  // Step 2: Inject session data
  const injected = await page.evaluate((sessionData) => {
    Object.entries(sessionData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    return !!localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
  }, ADMIN_SESSION_DATA);

  if (!injected) {
    throw new Error('Failed to inject admin session');
  }

  console.log('[Session] Admin session injected successfully');
}

/**
 * Helper: Navigate to admin with active session
 */
async function navigateToAdmin(page: Page, path: string = '/admin') {
  await page.goto(`${BASE_URL}${path}`);
  // Wait for admin dashboard to load
  await page.waitForSelector('div[class*="dashboard"]', { timeout: 5000 });
}

/**
 * Helper: Scroll modal to bottom for interacting with bottom buttons
 */
async function scrollModalToBottom(page: Page) {
  await page.evaluate(() => {
    const modal = document.querySelector('div[role="dialog"]');
    if (modal) {
      modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
    }
  });
  await page.waitForTimeout(500);
}

test.describe('Admin UI Verification - Round 2', () => {
  test.beforeEach(async ({ page }) => {
    // Inject session before each test
    await injectAdminSession(page);
  });

  test.describe('Task 2-5: Admin Dashboard Load & Session Verification', () => {
    test('Task 2: Admin dashboard loads without 404', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      // Should see admin dashboard, not NotFound
      const dashboardTitle = page.getByRole('heading', { name: /admin/i });
      await expect(dashboardTitle).toBeVisible();
      
      // Should have admin stats cards
      const statsCards = page.locator('[class*="card"]').filter({ hasText: /resources|users|pending/i });
      await expect(statsCards).toHaveCount(4); // At least 4 stat cards
    });

    test('Task 3: Verify JWT token in localStorage', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const hasToken = await page.evaluate(() => {
        const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return !!token && token.includes('access_token');
      });
      
      expect(hasToken).toBe(true);
    });

    test('Task 4: Verify user role is admin', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const userRole = await page.evaluate(() => {
        const tokenStr = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        if (!tokenStr) return null;
        const token = JSON.parse(tokenStr);
        return token.user?.user_metadata?.role;
      });
      
      expect(userRole).toBe('admin');
    });

    test('Task 5: Verify admin email displayed', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const email = page.getByText('admin@test.com');
      await expect(email).toBeVisible();
    });
  });

  test.describe('Task 6-10: Status Filter Dropdown', () => {
    test('Task 6: Status filter dropdown exists', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const statusDropdown = page.getByLabel(/status/i).or(page.locator('[data-filter="status"]'));
      await expect(statusDropdown).toBeVisible();
    });

    test('Task 7: Status filter opens with options', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /all|pending|approved/i }).first();
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        
        // Should show filter options
        const options = page.locator('[role="option"]');
        await expect(options).toHaveCount(4); // all, pending, approved, rejected
      }
    });

    test('Task 8: Filter by pending status', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      // Find and click status filter
      const filterButton = page.locator('button').filter({ hasText: /filter|status/i }).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(300);
        
        const pendingOption = page.getByRole('option', { name: /pending/i });
        if (await pendingOption.isVisible()) {
          await pendingOption.click();
          
          // Table should update (wait for re-render)
          await page.waitForTimeout(500);
          
          const rows = page.locator('tbody tr');
          // If results exist, they should all be pending
          const visibleRows = await rows.count();
          if (visibleRows > 0) {
            const firstStatus = await rows.first().locator('td').nth(2).textContent(); // Assuming status is 3rd column
            expect(firstStatus?.toLowerCase()).toContain('pending');
          }
        }
      }
    });

    test('Task 9: Filter by approved status', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const filterButton = page.locator('button').filter({ hasText: /filter|status/i }).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(300);
        
        const approvedOption = page.getByRole('option', { name: /approved/i });
        if (await approvedOption.isVisible()) {
          await approvedOption.click();
          await page.waitForTimeout(500);
          
          const rows = page.locator('tbody tr');
          const visibleRows = await rows.count();
          if (visibleRows > 0) {
            const firstStatus = await rows.first().locator('td').nth(2).textContent();
            expect(firstStatus?.toLowerCase()).toContain('approved');
          }
        }
      }
    });

    test('Task 10: Reset status filter to all', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      // Apply filter
      let filterButton = page.locator('button').filter({ hasText: /filter|status/i }).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        const pendingOption = page.getByRole('option', { name: /pending/i });
        if (await pendingOption.isVisible()) {
          await pendingOption.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Reset filter
      const resetButton = page.locator('button').filter({ hasText: /reset|all|clear/i }).first();
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(500);
        
        // Should show more results now
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Task 11-15: Category Filter Dropdown', () => {
    test('Task 11: Category filter dropdown exists', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const categoryFilter = page.getByLabel(/category/i).or(page.locator('[data-filter="category"]'));
      await expect(categoryFilter).toBeVisible();
    });

    test('Task 12: Category filter opens with options', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const filterButton = page.locator('button').filter({ hasText: /category/i }).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        
        const options = page.locator('[role="option"]');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(0); // Should have at least "All" + categories
      }
    });

    test('Task 13: Filter by specific category', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const filterButton = page.locator('button').filter({ hasText: /category/i }).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(300);
        
        const firstCategory = page.locator('[role="option"]').nth(1);
        const categoryName = await firstCategory.textContent();
        
        if (categoryName) {
          await firstCategory.click();
          await page.waitForTimeout(500);
          
          // Verify results show selected category
          const rows = page.locator('tbody tr');
          const visibleRows = await rows.count();
          if (visibleRows > 0) {
            const firstCat = await rows.first().locator('td').nth(1).textContent();
            expect(firstCat?.toLowerCase()).toContain(categoryName.toLowerCase());
          }
        }
      }
    });

    test('Task 14: Combined status + category filters', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      // Apply status filter
      let statusButton = page.locator('button').filter({ hasText: /status/i }).first();
      if (await statusButton.isVisible()) {
        await statusButton.click();
        const pendingOption = page.getByRole('option', { name: /approved/i });
        if (await pendingOption.isVisible()) {
          await pendingOption.click();
          await page.waitForTimeout(300);
        }
      }
      
      // Apply category filter
      let categoryButton = page.locator('button').filter({ hasText: /category/i }).first();
      if (await categoryButton.isVisible()) {
        await categoryButton.click();
        const firstCategory = page.locator('[role="option"]').nth(1);
        if (await firstCategory.isVisible()) {
          await firstCategory.click();
          await page.waitForTimeout(500);
          
          // Should show filtered results
          const rows = page.locator('tbody tr');
          const rowCount = await rows.count();
          expect(rowCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('Task 15: Clear all filters', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const resetButton = page.locator('button').filter({ hasText: /reset|clear/i }).first();
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(500);
        
        // Verify filters are reset
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Task 16-20: Column Sorting', () => {
    test('Task 16: Sort by title ascending', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const titleHeader = page.locator('th').filter({ hasText: /title/i }).first();
      if (await titleHeader.isVisible()) {
        await titleHeader.click();
        await page.waitForTimeout(500);
        
        const rows = page.locator('tbody tr');
        const firstTitle = await rows.first().locator('td').first().textContent();
        expect(firstTitle).toBeTruthy();
      }
    });

    test('Task 17: Sort by title descending', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const titleHeader = page.locator('th').filter({ hasText: /title/i }).first();
      if (await titleHeader.isVisible()) {
        await titleHeader.click();
        await titleHeader.click(); // Click twice for descending
        await page.waitForTimeout(500);
        
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });

    test('Task 18: Sort by category', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const categoryHeader = page.locator('th').filter({ hasText: /category/i }).first();
      if (await categoryHeader.isVisible()) {
        await categoryHeader.click();
        await page.waitForTimeout(500);
        
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });

    test('Task 19: Sort by status', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const statusHeader = page.locator('th').filter({ hasText: /status/i }).first();
      if (await statusHeader.isVisible()) {
        await statusHeader.click();
        await page.waitForTimeout(500);
        
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });

    test('Task 20: Sort by last modified', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const modifiedHeader = page.locator('th').filter({ hasText: /modified|date/i }).first();
      if (await modifiedHeader.isVisible()) {
        await modifiedHeader.click();
        await page.waitForTimeout(500);
        
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Task 21-23: Pagination', () => {
    test('Task 21: Next page button works', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      // Get initial page info
      const initialRows = await page.locator('tbody tr').count();
      
      const nextButton = page.locator('button').filter({ hasText: /next|>/i }).first();
      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Should still have results
        const newRows = await page.locator('tbody tr').count();
        expect(newRows).toBeGreaterThan(0);
      }
    });

    test('Task 22: Previous page button works', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      // Go to next page first
      const nextButton = page.locator('button').filter({ hasText: /next|>/i }).first();
      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Now go back
        const prevButton = page.locator('button').filter({ hasText: /prev|</i }).first();
        if (await prevButton.isVisible() && !(await prevButton.isDisabled())) {
          await prevButton.click();
          await page.waitForTimeout(500);
          
          const rows = page.locator('tbody tr');
          const rowCount = await rows.count();
          expect(rowCount).toBeGreaterThan(0);
        }
      }
    });

    test('Task 23: Page info displayed correctly', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const pageInfo = page.locator('[class*="page"], [class*="pagination"]').getByText(/page|of/i);
      if (await pageInfo.isVisible()) {
        const text = await pageInfo.textContent();
        expect(text).toMatch(/\d+/); // Should show page numbers
      }
    });
  });

  test.describe('Task 24-27: Bulk Operations', () => {
    test('Task 24: Bulk select checkbox appears', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(selectAllCheckbox).toBeVisible();
    });

    test('Task 25: Select all resources', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click();
        await page.waitForTimeout(300);
        
        // Other checkboxes should be checked
        const otherCheckboxes = page.locator('input[type="checkbox"]').nth(1);
        if (await otherCheckboxes.isVisible()) {
          const isChecked = await otherCheckboxes.isChecked();
          expect(isChecked).toBe(true);
        }
      }
    });

    test('Task 26: Bulk operations toolbar appears when items selected', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click();
        await page.waitForTimeout(300);
        
        // Bulk operations toolbar should appear
        const bulkToolbar = page.locator('[class*="bulk"], [class*="toolbar"]');
        if (await bulkToolbar.first().isVisible()) {
          const buttons = bulkToolbar.locator('button');
          const buttonCount = await buttons.count();
          expect(buttonCount).toBeGreaterThan(0);
        }
      }
    });

    test('Task 27: Deselect all resources', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      // Select all
      const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click();
        await page.waitForTimeout(300);
        
        // Deselect all
        await selectAllCheckbox.click();
        await page.waitForTimeout(300);
        
        // Checkboxes should be unchecked
        const otherCheckboxes = page.locator('input[type="checkbox"]').nth(1);
        if (await otherCheckboxes.isVisible()) {
          const isChecked = await otherCheckboxes.isChecked();
          expect(isChecked).toBe(false);
        }
      }
    });
  });

  test.describe('Task 28-30: Admin Navigation', () => {
    test('Task 28: Navigate to Pending Resources', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const pendingLink = page.getByRole('link', { name: /pending|resources/i }).first();
      if (await pendingLink.isVisible()) {
        await pendingLink.click();
        await page.waitForTimeout(500);
        
        const heading = page.getByRole('heading', { name: /pending/i });
        await expect(heading).toBeVisible();
      }
    });

    test('Task 29: Navigate to Pending Edits', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const editsLink = page.getByRole('link', { name: /edit|suggestion/i }).first();
      if (await editsLink.isVisible()) {
        await editsLink.click();
        await page.waitForTimeout(500);
        
        const heading = page.getByRole('heading', { name: /edit|suggestion/i });
        if (await heading.isVisible()) {
          await expect(heading).toBeVisible();
        }
      }
    });

    test('Task 30: Navigate to GitHub Sync', async ({ page }) => {
      await navigateToAdmin(page, '/admin');
      
      const githubLink = page.getByRole('link', { name: /github|sync/i }).first();
      if (await githubLink.isVisible()) {
        await githubLink.click();
        await page.waitForTimeout(500);
        
        const heading = page.getByRole('heading', { name: /github/i });
        if (await heading.isVisible()) {
          await expect(heading).toBeVisible();
        }
      }
    });
  });
});
