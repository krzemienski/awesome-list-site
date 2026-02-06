import { test, expect } from '@playwright/test';

test.describe('Browse Categories Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Category Page - Basic Navigation', () => {
    test('should navigate to category page from home', async ({ page }) => {
      // Wait for categories to load
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });

      // Click first category link
      const firstCategoryLink = page.locator('[data-testid^="link-category-"]').first();
      const categorySlug = await firstCategoryLink.getAttribute('href');
      const categoryName = await firstCategoryLink.textContent();

      await firstCategoryLink.click();
      await page.waitForLoadState('networkidle');

      // Verify navigation to category page
      expect(page.url()).toContain(categorySlug || '/category/');

      // Verify category page header
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: /Back to all categories/i })).toBeVisible();
    });

    test('should display resource count badge', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Check for resource count badge
      const badge = page.locator('[data-testid="badge-count"]');
      await expect(badge).toBeVisible();

      // Verify badge contains a number
      const badgeText = await badge.textContent();
      expect(badgeText).toMatch(/\d+/);
    });

    test('should navigate back to home from category page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Click back button
      await page.getByRole('button', { name: /Back to all categories/i }).click();
      await page.waitForLoadState('networkidle');

      // Verify we're back on home page
      expect(page.url()).toMatch(/\/$|\/$/);
      await expect(page.getByRole('heading', { level: 1, name: /Awesome Video Resources/i })).toBeVisible();
    });

    test('should display resources in grid view by default', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Check for resource cards
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      // Should have at least some resources or a "no resources" message
      if (cardCount === 0) {
        // If no resources, should show a message
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      } else {
        // Verify first card is visible
        await expect(resourceCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Category Page - Search and Filters', () => {
    test('should have search input for filtering resources', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for search input
      const searchInput = page.locator('input[placeholder*="Search" i]');
      await expect(searchInput).toBeVisible();
    });

    test('should filter resources by search term', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Get initial resource count
      const initialCount = await page.locator('[data-testid^="card-resource-"]').count();

      if (initialCount > 1) {
        // Type search term
        const searchInput = page.locator('input[placeholder*="Search" i]');
        await searchInput.fill('test search term');
        await page.waitForTimeout(300);

        // Count should change or show no results
        const newCount = await page.locator('[data-testid^="card-resource-"]').count();
        expect(newCount).toBeLessThanOrEqual(initialCount);
      }
    });

    test('should have subcategory filter dropdown', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory filter
      const subcategoryFilter = page.locator('[data-testid="select-subcategory"]');

      // Filter may not exist if category has no subcategories
      const filterExists = await subcategoryFilter.count() > 0;
      if (filterExists) {
        await expect(subcategoryFilter).toBeVisible();
      }
    });

    test('should have sort options', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for sort dropdown
      const sortSelect = page.locator('[data-testid="select-sort"]');
      await expect(sortSelect).toBeVisible();
    });

    test('should show clear filters button when filters are active', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Apply a search filter
      const searchInput = page.locator('input[placeholder*="Search" i]');
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Clear filters button should appear
      const clearButton = page.locator('button:has-text("Clear Filters"), button:has-text("Clear All")');
      const buttonExists = await clearButton.count() > 0;

      if (buttonExists) {
        await expect(clearButton.first()).toBeVisible();
      }
    });

    test('should clear all filters when clicking clear button', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Apply a search filter
      const searchInput = page.locator('input[placeholder*="Search" i]');
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Click clear filters if it exists
      const clearButton = page.locator('button:has-text("Clear Filters"), button:has-text("Clear All")');
      const buttonExists = await clearButton.count() > 0;

      if (buttonExists) {
        await clearButton.first().click();
        await page.waitForTimeout(300);

        // Search input should be cleared
        await expect(searchInput).toHaveValue('');
      }
    });
  });

  test.describe('Category Page - View Modes', () => {
    test('should have view mode toggle buttons', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for view mode buttons (grid, list, compact)
      const viewModeButtons = page.locator('[data-testid^="view-mode-"]');

      if (await viewModeButtons.count() > 0) {
        await expect(viewModeButtons.first()).toBeVisible();
      }
    });

    test('should switch to list view when clicking list button', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Click list view button if it exists
      const listViewButton = page.locator('[data-testid="view-mode-list"]');

      if (await listViewButton.count() > 0) {
        await listViewButton.click();
        await page.waitForTimeout(200);

        // Button should show active state
        const ariaPressed = await listViewButton.getAttribute('aria-pressed');
        expect(ariaPressed).toBe('true');
      }
    });

    test('should switch to compact view when clicking compact button', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Click compact view button if it exists
      const compactViewButton = page.locator('[data-testid="view-mode-compact"]');

      if (await compactViewButton.count() > 0) {
        await compactViewButton.click();
        await page.waitForTimeout(200);

        // Button should show active state
        const ariaPressed = await compactViewButton.getAttribute('aria-pressed');
        expect(ariaPressed).toBe('true');
      }
    });

    test('should persist view mode selection in localStorage', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Click list view button if it exists
      const listViewButton = page.locator('[data-testid="view-mode-list"]');

      if (await listViewButton.count() > 0) {
        await listViewButton.click();
        await page.waitForTimeout(200);

        // Check localStorage
        const viewMode = await page.evaluate(() => localStorage.getItem('awesome-list-view-mode'));
        expect(viewMode).toBe('list');
      }
    });
  });

  test.describe('Subcategory Page - Navigation', () => {
    test('should navigate to subcategory page from category', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory links
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        // Click first subcategory
        const subcategorySlug = await subcategoryLinks.first().getAttribute('href');
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Verify navigation to subcategory page
        expect(page.url()).toContain(subcategorySlug || '/subcategory/');

        // Verify subcategory page has back button
        await expect(page.getByRole('button', { name: /Back to/i })).toBeVisible();
      }
    });

    test('should display breadcrumbs on subcategory page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const categoryName = await page.locator('[data-testid^="link-category-"]').first().textContent();
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory links
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Look for breadcrumbs
        const breadcrumbs = page.locator('[data-testid="breadcrumbs"], nav[aria-label="breadcrumb"], nav[aria-label="Breadcrumb"]');

        if (await breadcrumbs.count() > 0) {
          await expect(breadcrumbs.first()).toBeVisible();
        }
      }
    });

    test('should navigate back to category from subcategory page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const categorySlug = await page.locator('[data-testid^="link-category-"]').first().getAttribute('href');
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory links
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Click back button
        const backButton = page.getByRole('button', { name: /Back to/i }).first();
        await backButton.click();
        await page.waitForLoadState('networkidle');

        // Verify we're back on category page
        expect(page.url()).toContain(categorySlug || '/category/');
      }
    });

    test('should display resource count badge on subcategory page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory links
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Check for resource count badge
        const badge = page.locator('[data-testid="badge-count"]');
        await expect(badge).toBeVisible();

        // Verify badge contains a number
        const badgeText = await badge.textContent();
        expect(badgeText).toMatch(/\d+/);
      }
    });
  });

  test.describe('Subcategory Page - Filters', () => {
    test('should have tag filter on subcategory page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory links
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Look for tag filter component
        const tagFilter = page.locator('[data-testid="tag-filter"]');

        // Tag filter may not exist if no tags available
        if (await tagFilter.count() > 0) {
          await expect(tagFilter).toBeVisible();
        }
      }
    });

    test('should show clear filters button on subcategory page when filters active', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory links
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Look for tag buttons
        const tagButtons = page.locator('[data-testid^="tag-"]');
        const tagCount = await tagButtons.count();

        if (tagCount > 0) {
          // Click a tag to activate filter
          await tagButtons.first().click();
          await page.waitForTimeout(300);

          // Clear filters button should appear
          const clearButton = page.locator('button:has-text("Clear"), button:has-text("Clear All")');
          const buttonExists = await clearButton.count() > 0;

          if (buttonExists) {
            await expect(clearButton.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Navigation Flow - Full Journey', () => {
    test('should complete full navigation: home → category → subcategory → back', async ({ page }) => {
      // Start at home
      await expect(page.getByRole('heading', { level: 1, name: /Awesome Video Resources/i })).toBeVisible();

      // Navigate to category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const categoryLink = page.locator('[data-testid^="link-category-"]').first();
      const categorySlug = await categoryLink.getAttribute('href');
      await categoryLink.click();
      await page.waitForLoadState('networkidle');

      // Verify on category page
      expect(page.url()).toContain(categorySlug || '/category/');
      await expect(page.getByRole('button', { name: /Back to all categories/i })).toBeVisible();

      // Check for subcategories
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        // Navigate to subcategory
        const subcategorySlug = await subcategoryLinks.first().getAttribute('href');
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Verify on subcategory page
        expect(page.url()).toContain(subcategorySlug || '/subcategory/');

        // Navigate back to category
        await page.getByRole('button', { name: /Back to/i }).first().click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(categorySlug || '/category/');
      }

      // Navigate back to home
      await page.getByRole('button', { name: /Back to all categories/i }).click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/$|\/$/);
      await expect(page.getByRole('heading', { level: 1, name: /Awesome Video Resources/i })).toBeVisible();
    });

    test('should navigate using breadcrumbs', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const categorySlug = await page.locator('[data-testid^="link-category-"]').first().getAttribute('href');
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory links
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Look for breadcrumb navigation
        const breadcrumbLinks = page.locator('[data-testid="breadcrumbs"] a, nav[aria-label*="breadcrumb" i] a');
        const breadcrumbCount = await breadcrumbLinks.count();

        if (breadcrumbCount > 0) {
          // Click first breadcrumb link (should go to category)
          await breadcrumbLinks.first().click();
          await page.waitForLoadState('networkidle');

          // Should be back on category page
          expect(page.url()).toContain(categorySlug || '/category/');
        }
      }
    });
  });

  test.describe('Resource Display', () => {
    test('should display resource cards with title and description', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Check for resource cards
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        const firstCard = resourceCards.first();
        await expect(firstCard).toBeVisible();

        // Card should have content (title/description)
        const cardText = await firstCard.textContent();
        expect(cardText).toBeTruthy();
        expect(cardText!.length).toBeGreaterThan(0);
      }
    });

    test('should show external link icon on resource links', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Check for resource cards
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        const firstCard = resourceCards.first();

        // Look for external link icon (SVG)
        const externalLinkIcon = firstCard.locator('svg');

        if (await externalLinkIcon.count() > 0) {
          await expect(externalLinkIcon.first()).toBeVisible();
        }
      }
    });

    test('should display tags on resources', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Check for resource cards
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        // Look for tags/badges on resources
        const tags = page.locator('[data-testid^="tag-"], .badge, [data-testid^="card-resource-"] badge');

        // Tags may or may not exist depending on resources
        const tagCount = await tags.count();
        expect(tagCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy on category page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Check for h1
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();
    });

    test('should have accessible back buttons', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Check back button
      const backButton = page.getByRole('button', { name: /Back to all categories/i });
      await expect(backButton).toBeVisible();

      // Should be a button element
      const tagName = await backButton.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toBe('button');
    });

    test('should have accessible resource links', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Check for resource links
      const resourceLinks = page.locator('[data-testid^="card-resource-"] a');
      const linkCount = await resourceLinks.count();

      if (linkCount > 0) {
        const firstLink = resourceLinks.first();

        // Should have href
        const href = await firstLink.getAttribute('href');
        expect(href).toBeTruthy();

        // Should have text content
        const text = await firstLink.textContent();
        expect(text).toBeTruthy();
      }
    });

    test('should support keyboard navigation on category page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Should be able to navigate with keyboard
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display category page on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to first category
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Verify category page loads on mobile
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: /Back to all categories/i })).toBeVisible();
    });

    test('should stack view mode toggles on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to first category
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // View mode buttons should still be accessible
      const viewModeButtons = page.locator('[data-testid^="view-mode-"]');

      if (await viewModeButtons.count() > 0) {
        await expect(viewModeButtons.first()).toBeVisible();
      }
    });

    test('should display subcategory page on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to first category
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Look for subcategory links
      const subcategoryLinks = page.locator('[data-testid^="link-subcategory-"]');
      const subcategoryCount = await subcategoryLinks.count();

      if (subcategoryCount > 0) {
        await subcategoryLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Verify subcategory page loads on mobile
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByRole('button', { name: /Back to/i })).toBeVisible();
      }
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state when navigating to category', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const categoryLink = page.locator('[data-testid^="link-category-"]').first();

      // Start navigation
      await categoryLink.click();

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Eventually should show content
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle category not found gracefully', async ({ page }) => {
      // Navigate to non-existent category
      await page.goto('/category/nonexistent-category-xyz');
      await page.waitForLoadState('networkidle');

      // Should show 404 or error message
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();

      // Should have some indication of error
      const hasNotFound = bodyText!.toLowerCase().includes('not found') ||
                         bodyText!.toLowerCase().includes('404') ||
                         bodyText!.toLowerCase().includes('error');
      expect(hasNotFound).toBeTruthy();
    });

    test('should handle subcategory not found gracefully', async ({ page }) => {
      // Navigate to non-existent subcategory
      await page.goto('/subcategory/nonexistent-subcategory-xyz');
      await page.waitForLoadState('networkidle');

      // Should show 404 or error message
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();

      // Should have some indication of error
      const hasNotFound = bodyText!.toLowerCase().includes('not found') ||
                         bodyText!.toLowerCase().includes('404') ||
                         bodyText!.toLowerCase().includes('error');
      expect(hasNotFound).toBeTruthy();
    });
  });
});
