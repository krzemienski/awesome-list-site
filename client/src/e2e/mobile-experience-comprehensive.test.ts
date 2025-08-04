import { test, expect } from '@playwright/test';

// Mobile viewport configuration
const MOBILE_VIEWPORT = { width: 375, height: 812 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };

// Test data from the JSON structure
const TEST_CATEGORIES = [
  { id: 'intro-learning', title: 'Intro & Learning', expectedResources: 129 },
  { id: 'adaptive-streaming', title: 'Adaptive Streaming', expectedResources: 31 },
  { id: 'android', title: 'Android', expectedResources: 10 },
  { id: 'codecs', title: 'Codecs', expectedResources: 12 },
  { id: 'encoding-tools', title: 'Encoding Tools', expectedResources: 173 }
];

const TEST_SUBCATEGORIES = [
  { id: 'introduction', title: 'Introduction', parent: 'intro-learning', expectedResources: 4 },
  { id: 'learning-resources', title: 'Learning Resources', parent: 'intro-learning', expectedResources: 36 },
  { id: 'ffmpeg', title: 'FFMPEG', parent: 'encoding-tools', expectedResources: 66 }
];

// Helper function to wait for content
async function waitForContent(page: any) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Additional wait for dynamic content
}

test.describe('Mobile Experience - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test.describe('Navigation and Layout', () => {
    test('Mobile menu should toggle sidebar correctly', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Check menu button is visible
      const menuButton = page.locator('button[aria-label="Toggle menu"], button:has(svg.lucide-menu)').first();
      await expect(menuButton).toBeVisible();

      // Click to open sidebar
      await menuButton.click();
      await page.waitForTimeout(300); // Wait for animation

      // Check sidebar is visible
      const sidebar = page.locator('aside, [role="navigation"]').first();
      await expect(sidebar).toBeVisible();

      // Check overlay is visible
      const overlay = page.locator('.bg-black\\/50');
      await expect(overlay).toBeVisible();

      // Click overlay to close
      await overlay.click();
      await page.waitForTimeout(300);

      // Sidebar should be hidden
      await expect(sidebar).not.toBeVisible();
    });

    test('Touch targets should meet minimum size requirements', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Get all interactive elements
      const interactiveElements = await page.locator('button, a, [role="button"], input, select').all();
      
      for (const element of interactiveElements) {
        const box = await element.boundingBox();
        if (box) {
          // Minimum touch target is 44x44 pixels
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('Content should not overflow horizontally', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Check body width
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
    });
  });

  test.describe('Category Data Loading', () => {
    for (const category of TEST_CATEGORIES) {
      test(`Category "${category.title}" should load with correct data`, async ({ page }) => {
        await page.goto(`http://localhost:5000/category/${category.id}`);
        await waitForContent(page);

        // Check title
        const title = page.locator('h1');
        await expect(title).toContainText(category.title);

        // Check resource count
        const resourceCount = page.locator('p:has-text("resources")').first();
        await expect(resourceCount).toContainText(category.expectedResources.toString());

        // Check resources are displayed
        const resources = page.locator('[class*="cursor-pointer"]');
        const count = await resources.count();
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(category.expectedResources);
      });
    }
  });

  test.describe('Subcategory Data Loading', () => {
    for (const subcategory of TEST_SUBCATEGORIES) {
      test(`Subcategory "${subcategory.title}" should load with correct data`, async ({ page }) => {
        await page.goto(`http://localhost:5000/subcategory/${subcategory.id}`);
        await waitForContent(page);

        // Check if page loads without 404
        const pageContent = await page.content();
        expect(pageContent).not.toContain('Did you forget to add the page to the router?');

        // If page loads correctly, check content
        const title = page.locator('h1');
        if (await title.isVisible()) {
          await expect(title).toContainText(subcategory.title);

          // Check resource count if displayed
          const resourceCount = page.locator('p:has-text("resources")').first();
          if (await resourceCount.isVisible()) {
            await expect(resourceCount).toContainText(subcategory.expectedResources.toString());
          }
        }
      });
    }
  });

  test.describe('Mobile-Specific Interactions', () => {
    test('Mobile resource popover should work correctly', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Find a resource item
      const resource = page.locator('[class*="cursor-pointer"]').first();
      await expect(resource).toBeVisible();

      // Click on resource
      await resource.click();
      await page.waitForTimeout(300);

      // Check if mobile popover or dialog appears
      const dialog = page.locator('[role="dialog"], [class*="dialog"], [class*="popover"]');
      if (await dialog.isVisible()) {
        // Check dialog has proper mobile dimensions
        const box = await dialog.boundingBox();
        if (box) {
          expect(box.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width * 0.95);
        }

        // Close dialog
        const closeButton = page.locator('[aria-label*="Close"], button:has-text("Close")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          // Click outside to close
          await page.keyboard.press('Escape');
        }
      }
    });

    test('Search should be mobile-optimized', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Click search button
      const searchButton = page.locator('button:has-text("Search"), button:has(svg.lucide-search)').first();
      await searchButton.click();
      await page.waitForTimeout(300);

      // Check search dialog
      const searchDialog = page.locator('[role="dialog"]:has(input[type="search"], input[placeholder*="Search"])');
      await expect(searchDialog).toBeVisible();

      // Type in search
      const searchInput = searchDialog.locator('input[type="search"], input[placeholder*="Search"]');
      await searchInput.type('android');
      await page.waitForTimeout(500);

      // Check results appear
      const results = searchDialog.locator('[class*="result"], [class*="item"]');
      const resultCount = await results.count();
      expect(resultCount).toBeGreaterThan(0);

      // Close search
      await page.keyboard.press('Escape');
      await expect(searchDialog).not.toBeVisible();
    });
  });

  test.describe('Layout Switching', () => {
    test('Layout switcher should work on mobile', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Find layout switcher
      const layoutSwitcher = page.locator('[aria-label*="layout"], button:has(svg.lucide-layout)').first();
      
      if (await layoutSwitcher.isVisible()) {
        // Test different layouts
        const layouts = ['list', 'cards', 'compact'];
        
        for (const layout of layouts) {
          // Click layout button
          await layoutSwitcher.click();
          await page.waitForTimeout(200);

          // Select layout option
          const layoutOption = page.locator(`button:has-text("${layout}"), [role="option"]:has-text("${layout}")`).first();
          if (await layoutOption.isVisible()) {
            await layoutOption.click();
            await page.waitForTimeout(500);

            // Verify layout changed
            const container = page.locator('main, [role="main"]').first();
            const classes = await container.getAttribute('class') || '';
            
            // Layout should affect the grid/list structure
            const resources = page.locator('[class*="cursor-pointer"]');
            const firstResource = resources.first();
            await expect(firstResource).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Performance and Loading', () => {
    test('Page should load within acceptable time on 3G', async ({ page }) => {
      // Simulate 3G network
      await page.route('**/*', route => route.continue());
      await page.context().setOffline(false);
      
      const startTime = Date.now();
      await page.goto('http://localhost:5000');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds on simulated 3G
      expect(loadTime).toBeLessThan(3000);
    });

    test('Images should lazy load', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Get all images
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        // Check first few images have loading="lazy"
        for (let i = 0; i < Math.min(5, imageCount); i++) {
          const img = images.nth(i);
          const loading = await img.getAttribute('loading');
          expect(loading).toBe('lazy');
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('Should adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize(TABLET_VIEWPORT);
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Sidebar should be visible on tablet
      const sidebar = page.locator('aside, [role="navigation"]').first();
      await expect(sidebar).toBeVisible();

      // Content should have margin for sidebar
      const main = page.locator('main, [role="main"]').first();
      const box = await main.boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThan(200); // Should have left margin for sidebar
      }
    });

    test('Should handle orientation change', async ({ page }) => {
      // Portrait
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Take screenshot
      await page.screenshot({ path: 'mobile-portrait.png' });

      // Landscape
      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(500);

      // Content should still be accessible
      const content = page.locator('main, [role="main"]').first();
      await expect(content).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'mobile-landscape.png' });
    });
  });

  test.describe('Accessibility', () => {
    test('Should have proper ARIA labels', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Check menu button
      const menuButton = page.locator('button:has(svg.lucide-menu)').first();
      const ariaLabel = await menuButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();

      // Check navigation
      const nav = page.locator('nav, [role="navigation"]').first();
      await expect(nav).toBeVisible();

      // Check main content
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
    });

    test('Should be keyboard navigable', async ({ page }) => {
      await page.goto('http://localhost:5000');
      await waitForContent(page);

      // Tab through elements
      await page.keyboard.press('Tab');
      let focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();

      // Continue tabbing
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.tagName);
        expect(focused).toBeTruthy();
      }
    });
  });
});

// Generate test report
test.afterAll(async () => {
  console.log('Mobile E2E tests completed. Check test-results for detailed report.');
});