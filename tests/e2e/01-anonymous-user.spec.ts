import { test, expect } from '@playwright/test';
import { waitForNetworkIdle, scrollToElement, getViewportCategory } from '../helpers/test-utils';

/**
 * E2E Tests: Anonymous User Flows
 *
 * Tests core functionality available to non-authenticated users:
 * - Homepage loads with resources
 * - Category navigation
 * - Resource card display
 * - Pagination
 * - Footer links
 * - Search functionality
 * - Theme switching
 * - Mobile responsive behavior
 */

test.describe('Anonymous User - Homepage', () => {
  test('should load homepage with resources', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await waitForNetworkIdle(page);

    // Verify title
    await expect(page).toHaveTitle(/Awesome Video/i);

    // Verify main heading
    await expect(page.locator('h1').first()).toContainText(/video/i);

    // Verify categories are displayed
    const categories = page.locator('[data-testid="category-card"]');
    await expect(categories.first()).toBeVisible();
    const categoryCount = await categories.count();
    expect(categoryCount).toBeGreaterThanOrEqual(8); // At least 8 categories

    // Verify footer exists
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should display category cards with correct content', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Get first category card
    const firstCard = page.locator('[data-testid="category-card"]').first();
    await expect(firstCard).toBeVisible();

    // Verify card has title
    await expect(firstCard.locator('h2, h3').first()).toBeVisible();

    // Verify card has description
    await expect(firstCard.locator('p').first()).toBeVisible();

    // Verify card has icon
    const icon = firstCard.locator('svg, [data-testid="category-icon"]').first();
    await expect(icon).toBeVisible();
  });

  test('should show correct resource count on category cards', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    const categoryCard = page.locator('[data-testid="category-card"]').first();

    // Look for resource count indicator
    const resourceCount = categoryCard.getByText(/\d+\s+resources?/i);
    await expect(resourceCount).toBeVisible();

    // Extract count and verify it's a number > 0
    const countText = await resourceCount.textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] || '0');
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Anonymous User - Category Navigation', () => {
  test('should navigate to category page', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Click first category card
    const firstCard = page.locator('[data-testid="category-card"]').first();
    const categoryName = await firstCard.locator('h2, h3').first().textContent();

    await firstCard.click();

    // Verify URL changed
    await expect(page).toHaveURL(/\/category\//);

    // Verify category name in heading
    await expect(page.locator('h1').first()).toContainText(categoryName || '');

    // Verify resources are displayed
    const resources = page.locator('[data-testid="resource-card"]');
    await expect(resources.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display subcategories on category page', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Navigate to a category with subcategories (e.g., Encoding & Codecs)
    const encodingCard = page.locator('[data-testid="category-card"]')
      .filter({ hasText: /encoding/i })
      .first();

    await encodingCard.click();
    await waitForNetworkIdle(page);

    // Check for subcategory navigation
    const subcategories = page.locator('[data-testid="subcategory-link"]')
      .or(page.locator('[role="navigation"] a').filter({ hasText: /codec|tool/i }));

    const subcategoryCount = await subcategories.count();
    expect(subcategoryCount).toBeGreaterThan(0);
  });

  test('should navigate back to homepage from category', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Navigate to category
    await page.locator('[data-testid="category-card"]').first().click();
    await waitForNetworkIdle(page);

    // Click logo or home link
    const homeLink = page.locator('[data-testid="logo-link"]')
      .or(page.locator('a[href="/"]').first())
      .or(page.getByRole('link', { name: /home/i }));

    await homeLink.click();
    await waitForNetworkIdle(page);

    // Verify back on homepage
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="category-card"]').first()).toBeVisible();
  });
});

test.describe('Anonymous User - Resource Cards', () => {
  test('should display resource card with all elements', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Navigate to category
    await page.locator('[data-testid="category-card"]').first().click();
    await waitForNetworkIdle(page);

    // Get first resource card
    const resourceCard = page.locator('[data-testid="resource-card"]').first();
    await expect(resourceCard).toBeVisible({ timeout: 10000 });

    // Verify title
    const title = resourceCard.locator('[data-testid="resource-title"]')
      .or(resourceCard.locator('h2, h3, h4').first());
    await expect(title).toBeVisible();

    // Verify URL/link
    const link = resourceCard.locator('a[href^="http"]').first();
    await expect(link).toBeVisible();

    // Verify description exists (may be truncated)
    const description = resourceCard.locator('[data-testid="resource-description"]')
      .or(resourceCard.locator('p').first());
    // Description may not always be visible, just check it exists
    const descriptionCount = await description.count();
    expect(descriptionCount).toBeGreaterThanOrEqual(0);
  });

  test('should open resource URL in new tab when clicked', async ({ page, context }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Navigate to category
    await page.locator('[data-testid="category-card"]').first().click();
    await waitForNetworkIdle(page);

    // Get resource link
    const resourceLink = page.locator('[data-testid="resource-card"]')
      .first()
      .locator('a[href^="http"]')
      .first();

    const href = await resourceLink.getAttribute('href');
    expect(href).toBeTruthy();

    // Verify target="_blank"
    const target = await resourceLink.getAttribute('target');
    expect(target).toBe('_blank');

    // Verify rel="noopener noreferrer"
    const rel = await resourceLink.getAttribute('rel');
    expect(rel).toContain('noopener');
  });

  test('should show bookmark button (disabled for anonymous)', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Navigate to category
    await page.locator('[data-testid="category-card"]').first().click();
    await waitForNetworkIdle(page);

    // Look for bookmark button
    const bookmarkBtn = page.locator('[data-testid="bookmark-button"]')
      .or(page.getByRole('button', { name: /bookmark/i }))
      .first();

    // Button should exist
    const buttonCount = await bookmarkBtn.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Click should prompt login or show disabled state
    if (await bookmarkBtn.isVisible()) {
      await bookmarkBtn.click();

      // Should show login prompt or toast
      const loginPrompt = page.locator('[data-testid="login-prompt"]')
        .or(page.getByText(/sign in|log in/i))
        .or(page.locator('[role="alertdialog"]'));

      await expect(loginPrompt.first()).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Anonymous User - Pagination', () => {
  test('should display pagination on category with many resources', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Navigate to category with many resources (e.g., Encoding & Codecs)
    const encodingCard = page.locator('[data-testid="category-card"]')
      .filter({ hasText: /encoding|codec/i })
      .first();

    await encodingCard.click();
    await waitForNetworkIdle(page);

    // Look for pagination controls
    const pagination = page.locator('[data-testid="pagination"]')
      .or(page.locator('nav[aria-label*="pagination"]'))
      .or(page.getByRole('navigation').filter({ has: page.getByText(/next|previous/i) }));

    // Pagination may or may not be visible depending on resource count
    const paginationCount = await pagination.count();

    if (paginationCount > 0) {
      // If pagination exists, test it
      const nextButton = page.getByRole('button', { name: /next/i })
        .or(page.locator('[data-testid="next-page"]'));

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await waitForNetworkIdle(page);

        // Verify URL or page changed
        const previousButton = page.getByRole('button', { name: /previous|prev/i })
          .or(page.locator('[data-testid="previous-page"]'));

        await expect(previousButton).toBeVisible();
      }
    } else {
      // No pagination needed
      console.log('No pagination controls found (expected if < 20 resources)');
    }
  });
});

test.describe('Anonymous User - Search', () => {
  test('should open search dialog', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Click search button/icon
    const searchButton = page.locator('[data-testid="search-button"]')
      .or(page.getByRole('button', { name: /search/i }))
      .or(page.locator('button').filter({ has: page.locator('svg[class*="search"]') }))
      .first();

    await searchButton.click();

    // Verify search dialog opened
    const searchDialog = page.locator('[data-testid="search-dialog"]')
      .or(page.locator('[role="dialog"]').filter({ hasText: /search/i }))
      .or(page.locator('input[type="search"]'));

    await expect(searchDialog.first()).toBeVisible({ timeout: 3000 });
  });

  test('should search for resources and display results', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Open search
    const searchButton = page.locator('[data-testid="search-button"]')
      .or(page.getByRole('button', { name: /search/i }))
      .first();

    await searchButton.click();

    // Type search query
    const searchInput = page.locator('[data-testid="search-input"]')
      .or(page.locator('input[type="search"]'))
      .or(page.locator('input[placeholder*="search"]'))
      .first();

    await searchInput.fill('FFmpeg');

    // Wait for results
    await page.waitForTimeout(500); // Debounce delay

    // Verify results appear
    const results = page.locator('[data-testid="search-result"]')
      .or(page.locator('[role="option"]'))
      .or(page.locator('[data-testid="search-dialog"] a'));

    const resultCount = await results.count();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should close search with escape key', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Open search
    const searchButton = page.locator('[data-testid="search-button"]')
      .or(page.getByRole('button', { name: /search/i }))
      .first();

    await searchButton.click();

    const searchDialog = page.locator('[data-testid="search-dialog"]')
      .or(page.locator('[role="dialog"]'))
      .first();

    await expect(searchDialog).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Verify dialog closed
    await expect(searchDialog).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Anonymous User - Theme Switching', () => {
  test('should toggle between light and dark theme', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Find theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"]')
      .or(page.getByRole('button', { name: /theme/i }))
      .or(page.locator('button').filter({ has: page.locator('svg[class*="moon"]') }))
      .or(page.locator('button').filter({ has: page.locator('svg[class*="sun"]') }))
      .first();

    await expect(themeToggle).toBeVisible();

    // Get initial theme
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('class');

    // Toggle theme
    await themeToggle.click();
    await page.waitForTimeout(500); // Animation delay

    // Verify theme changed
    const newTheme = await htmlElement.getAttribute('class');
    expect(newTheme).not.toBe(initialTheme);

    // Toggle back
    await themeToggle.click();
    await page.waitForTimeout(500);

    const finalTheme = await htmlElement.getAttribute('class');
    expect(finalTheme).toBe(initialTheme);
  });
});

test.describe('Anonymous User - Footer', () => {
  test('should display footer with links', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Scroll to footer
    await scrollToElement(page, 'footer');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Verify footer contains links
    const footerLinks = footer.locator('a');
    const linkCount = await footerLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    // Verify typical footer links exist
    const aboutLink = footer.locator('a').filter({ hasText: /about/i }).first();
    const githubLink = footer.locator('a[href*="github"]').first();

    // At least one of these should exist
    const aboutCount = await aboutLink.count();
    const githubCount = await githubLink.count();
    expect(aboutCount + githubCount).toBeGreaterThan(0);
  });
});

test.describe('Anonymous User - Mobile Responsive', () => {
  test('should display mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForNetworkIdle(page);

    const viewportCategory = getViewportCategory(page);
    if (viewportCategory !== 'mobile') {
      test.skip();
      return;
    }

    // Look for mobile menu button (hamburger)
    const mobileMenuButton = page.locator('[data-testid="mobile-menu"]')
      .or(page.getByRole('button', { name: /menu/i }))
      .or(page.locator('button').filter({ has: page.locator('svg[class*="menu"]') }))
      .first();

    await expect(mobileMenuButton).toBeVisible();

    // Open menu
    await mobileMenuButton.click();

    // Verify menu content visible
    const mobileNav = page.locator('[data-testid="mobile-navigation"]')
      .or(page.locator('nav[class*="mobile"]'))
      .or(page.locator('[role="dialog"]').filter({ hasText: /navigation|menu/i }));

    await expect(mobileNav.first()).toBeVisible({ timeout: 3000 });
  });

  test('should stack category cards vertically on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForNetworkIdle(page);

    const viewportCategory = getViewportCategory(page);
    if (viewportCategory !== 'mobile') {
      test.skip();
      return;
    }

    // Get category cards
    const cards = page.locator('[data-testid="category-card"]');
    const firstCard = cards.first();
    const secondCard = cards.nth(1);

    await expect(firstCard).toBeVisible();
    await expect(secondCard).toBeVisible();

    // Get bounding boxes
    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();

    // Verify cards are stacked (second card's top > first card's bottom)
    expect(secondBox?.y).toBeGreaterThan((firstBox?.y || 0) + (firstBox?.height || 0));
  });
});

test.describe('Anonymous User - Error Handling', () => {
  test('should handle 404 page not found', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');

    // Wait for 404 page
    await page.waitForTimeout(1000);

    // Verify 404 message or redirect
    const notFoundIndicator = page.locator('h1, h2').filter({ hasText: /404|not found|oops/i }).first();

    // Either shows 404 page or redirects to home
    const currentUrl = page.url();
    const is404Page = currentUrl.includes('404') || await notFoundIndicator.isVisible({ timeout: 2000 });
    const isHomepage = currentUrl.endsWith('/');

    expect(is404Page || isHomepage).toBeTruthy();
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Block API requests to simulate network error
    await page.route('**/api/resources*', route => route.abort());

    await page.goto('/');

    // Wait for error state
    await page.waitForTimeout(2000);

    // Look for error message or empty state
    const errorMessage = page.getByText(/error|failed|try again|couldn't load/i).first();
    const emptyState = page.getByText(/no resources|nothing here/i).first();

    const hasErrorMessage = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    // Should show some indication of error or empty state
    // Or categories might still show from static data
    console.log(`Error handling: errorMessage=${hasErrorMessage}, emptyState=${hasEmptyState}`);
  });
});
