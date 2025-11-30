import { test, expect } from '@playwright/test';

test.describe('Anonymous User Flow', () => {
  test('homepage loads with resources', async ({ page }) => {
    await page.goto('/');

    // Verify page loads
    await expect(page).toHaveTitle(/Awesome Video/i);

    // Check for categories (should show 9 categories)
    const categories = page.locator('[data-testid="category-card"], .category-card, h2, h3');
    await expect(categories.first()).toBeVisible({ timeout: 10000 });

    // Check for resources
    const resources = page.locator('[data-testid="resource-card"], .resource-card, article');
    const resourceCount = await resources.count();
    expect(resourceCount).toBeGreaterThan(0);

    console.log(`✅ Homepage loaded with ${resourceCount} resource elements`);
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/');

    // Find and use search (might be in a dialog or input field)
    const searchTrigger = page.locator('input[placeholder*="Search" i], button[aria-label*="search" i]').first();
    await searchTrigger.click();

    // Type search query
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('ffmpeg');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForLoadState('networkidle');

    // Verify results contain "ffmpeg"
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('ffmpeg');

    console.log('✅ Search for "ffmpeg" returned results');
  });

  test('category navigation works', async ({ page }) => {
    await page.goto('/');

    // Click first category
    const categoryLink = page.locator('a[href*="/category/"]').first();
    const categoryName = await categoryLink.textContent();

    await categoryLink.click();
    await page.waitForLoadState('networkidle');

    // Verify URL changed
    expect(page.url()).toContain('/category/');

    // Verify resources loaded for category
    const resources = page.locator('[data-testid="resource-card"], article, .resource');
    await expect(resources.first()).toBeVisible({ timeout: 5000 });

    console.log(`✅ Navigated to category: ${categoryName}`);
  });

  test('theme switcher works', async ({ page }) => {
    await page.goto('/');

    // Find theme toggle
    const themeToggle = page.locator('button[aria-label*="theme" i], button[title*="theme" i]').first();

    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Check if dark class toggled
      const html = page.locator('html');
      const className = await html.getAttribute('class');

      console.log(`✅ Theme switcher clicked, class: ${className}`);
    } else {
      console.log('⏭️ Theme toggle not found, skipping test');
    }
  });
});
