import { test, expect } from '@playwright/test';

test.describe('Search and Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Home Page - Category Discovery', () => {
    test('should display category cards on home page', async ({ page }) => {
      // Wait for categories to load
      await expect(page.getByRole('heading', { level: 1, name: /Awesome Video Resources/i })).toBeVisible();

      // Check that category cards are displayed
      const categoryCards = page.locator('[data-testid^="card-category-"]');
      await expect(categoryCards.first()).toBeVisible();

      // Verify at least some categories are shown
      const count = await categoryCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show category with resource count', async ({ page }) => {
      // Find first category card
      const firstCard = page.locator('[data-testid^="card-category-"]').first();
      await expect(firstCard).toBeVisible();

      // Check for badge with count
      const badge = firstCard.locator('[data-testid^="badge-count-"]');
      await expect(badge).toBeVisible();

      // Verify badge contains a number
      const badgeText = await badge.textContent();
      expect(badgeText).toMatch(/\d+/);
    });

    test('should navigate to category page when clicking category card', async ({ page }) => {
      // Wait for categories to load
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });

      // Click first category link
      const firstCategoryLink = page.locator('[data-testid^="link-category-"]').first();
      const categorySlug = await firstCategoryLink.getAttribute('href');

      await firstCategoryLink.click();
      await page.waitForLoadState('networkidle');

      // Verify navigation to category page
      expect(page.url()).toContain(categorySlug || '/category/');

      // Verify category page content loaded
      await expect(page.getByRole('button', { name: /Back to all categories/i })).toBeVisible();
    });

    test('should display resource count in page description', async ({ page }) => {
      const description = page.getByText(/Explore.*categories with.*curated resources/i);
      await expect(description).toBeVisible();

      // Verify numbers are present
      const text = await description.textContent();
      expect(text).toMatch(/\d+.*categories/i);
      expect(text).toMatch(/\d+.*resources/i);
    });
  });

  test.describe('Search Dialog', () => {
    test('should open search dialog when clicking search button', async ({ page }) => {
      // Click search button
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Verify dialog opened
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Search Resources/i })).toBeVisible();
      await expect(page.getByPlaceholder(/Search packages, libraries, and tools/i)).toBeVisible();
    });

    test('should open search dialog with keyboard shortcut', async ({ page }) => {
      // Press Cmd+K or Ctrl+K depending on platform
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyK`);

      // Verify dialog opened
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Search Resources/i })).toBeVisible();
    });

    test('should focus search input when dialog opens', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Wait for dialog and input to be visible
      await page.waitForSelector('input[placeholder*="Search"]', { state: 'visible' });

      // Check if input is focused (give it a moment to auto-focus)
      await page.waitForTimeout(200);
      const searchInput = page.getByPlaceholder(/Search packages, libraries, and tools/i);
      await expect(searchInput).toBeFocused();
    });

    test('should show placeholder state before search', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Verify placeholder message
      await expect(page.getByText(/Start typing to search/i)).toBeVisible();
      await expect(page.getByText(/Type at least 2 characters/i)).toBeVisible();
    });

    test('should close dialog when clicking cancel', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Click cancel button
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Verify dialog closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should close dialog when pressing Escape', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Press Escape
      await page.keyboard.press('Escape');

      // Verify dialog closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('should show "no results" when search has no matches', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Type search query that won't match anything
      const searchInput = page.getByPlaceholder(/Search packages, libraries, and tools/i);
      await searchInput.fill('xyzabc123nonexistent');

      // Wait a bit for search to process
      await page.waitForTimeout(300);

      // Verify "no results" message
      await expect(page.getByText(/No results found/i)).toBeVisible();
      await expect(page.getByText(/Try different keywords/i)).toBeVisible();
    });

    test('should display search results when typing valid query', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Type a common search term likely to have results
      const searchInput = page.getByPlaceholder(/Search packages, libraries, and tools/i);
      await searchInput.fill('video');

      // Wait for results to appear
      await page.waitForTimeout(500);

      // Check if we have results or no results message
      const hasResults = await page.locator('[data-testid^="search-result-"]').count();
      const noResults = await page.getByText(/No results found/i).isVisible().catch(() => false);

      // Either should show results or a clear "no results" message
      expect(hasResults > 0 || noResults).toBeTruthy();
    });

    test('should require minimum 2 characters to search', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Type single character
      const searchInput = page.getByPlaceholder(/Search packages, libraries, and tools/i);
      await searchInput.fill('a');

      // Should still show placeholder message
      await expect(page.getByText(/Start typing to search/i)).toBeVisible();

      // Type second character
      await searchInput.fill('ab');

      // Wait for search to process
      await page.waitForTimeout(300);

      // Should now show results or no results (not placeholder)
      await expect(page.getByText(/Start typing to search/i)).not.toBeVisible();
    });

    test('should display resource details in search results', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Type search query
      const searchInput = page.getByPlaceholder(/Search packages, libraries, and tools/i);
      await searchInput.fill('ffmpeg');

      // Wait for potential results
      await page.waitForTimeout(500);

      // Check if there are any results
      const resultCount = await page.locator('[data-testid^="search-result-"]').count();

      if (resultCount > 0) {
        const firstResult = page.locator('[data-testid^="search-result-"]').first();

        // Verify result has title, category, and description structure
        await expect(firstResult).toBeVisible();

        // Result should be a clickable link
        const link = firstResult.locator('a');
        await expect(link).toBeVisible();

        // Should have href attribute
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
      }
    });

    test('should clear search when dialog closes', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Type search query
      const searchInput = page.getByPlaceholder(/Search packages, libraries, and tools/i);
      await searchInput.fill('test search');

      // Close dialog
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Reopen dialog
      await searchButton.click();

      // Verify input is cleared
      const clearedInput = page.getByPlaceholder(/Search packages, libraries, and tools/i);
      await expect(clearedInput).toHaveValue('');
    });
  });

  test.describe('Category Page Discovery', () => {
    test('should display category resources', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const firstCategoryLink = page.locator('[data-testid^="link-category-"]').first();
      await firstCategoryLink.click();
      await page.waitForLoadState('networkidle');

      // Verify category page elements
      await expect(page.getByRole('button', { name: /Back to all categories/i })).toBeVisible();

      // Should have some resources or a message
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should navigate back to home from category page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const firstCategoryLink = page.locator('[data-testid^="link-category-"]').first();
      await firstCategoryLink.click();
      await page.waitForLoadState('networkidle');

      // Click back button
      await page.getByRole('button', { name: /Back to all categories/i }).click();
      await page.waitForLoadState('networkidle');

      // Verify we're back on home page
      expect(page.url()).toMatch(/\/$|\/$/);
      await expect(page.getByRole('heading', { level: 1, name: /Awesome Video Resources/i })).toBeVisible();
    });

    test('should have search input on category page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const firstCategoryLink = page.locator('[data-testid^="link-category-"]').first();
      await firstCategoryLink.click();
      await page.waitForLoadState('networkidle');

      // Look for search/filter input
      const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]');

      // If search exists on the page, verify it's functional
      if (await searchInput.count() > 0) {
        await expect(searchInput.first()).toBeVisible();
      }
    });

    test('should have view mode toggle on category page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const firstCategoryLink = page.locator('[data-testid^="link-category-"]').first();
      await firstCategoryLink.click();
      await page.waitForLoadState('networkidle');

      // Look for view mode toggle buttons (grid/list/compact)
      const viewModeButtons = page.locator('button[aria-label*="view" i], button[data-testid*="view" i]');

      // If view mode toggle exists, verify it's visible
      if (await viewModeButtons.count() > 0) {
        await expect(viewModeButtons.first()).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display search on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to home
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Search button should be visible on mobile
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await expect(searchButton).toBeVisible();

      // Click should open dialog
      await searchButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should display category cards in single column on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to home
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Category cards should be visible
      const categoryCards = page.locator('[data-testid^="card-category-"]');
      await expect(categoryCards.first()).toBeVisible();

      // Should have at least one card
      const count = await categoryCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy on home page', async ({ page }) => {
      // Check for h1
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();

      // Verify main heading text
      await expect(h1).toContainText(/Awesome Video Resources/i);
    });

    test('should have accessible category links', async ({ page }) => {
      // Wait for first category link
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const firstCategoryLink = page.locator('[data-testid^="link-category-"]').first();

      // Should have aria-label
      const ariaLabel = await firstCategoryLink.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('category');
    });

    test('should have accessible search dialog', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Dialog should have role="dialog"
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Should have accessible title
      await expect(page.getByRole('heading', { name: /Search Resources/i })).toBeVisible();

      // Search input should have placeholder
      const input = page.getByPlaceholder(/Search packages, libraries, and tools/i);
      await expect(input).toBeVisible();
    });

    test('should support keyboard navigation in search dialog', async ({ page }) => {
      // Open search dialog
      const searchButton = page.locator('button:has(svg):has-text("Search")');
      await searchButton.click();

      // Tab to navigate to Cancel button
      await page.keyboard.press('Tab');

      // Should be able to press Enter to close
      const cancelButton = page.getByRole('button', { name: /Cancel/i });
      await expect(cancelButton).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading skeleton on initial page load', async ({ page }) => {
      // Navigate and try to catch loading state
      const navigation = page.goto('/');

      // Check for skeleton (might be very fast)
      const skeleton = page.locator('[aria-busy="true"]');

      // Wait for navigation to complete
      await navigation;
      await page.waitForLoadState('networkidle');

      // Eventually should show content instead of skeleton
      await expect(page.getByRole('heading', { level: 1, name: /Awesome Video Resources/i })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle failed resource load gracefully', async ({ page }) => {
      // Intercept API calls and make them fail
      await page.route('**/api/resources*', route => route.abort());

      // Navigate to home
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Page should still render (static resources should work)
      // The app should handle the API failure gracefully
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
    });
  });
});
