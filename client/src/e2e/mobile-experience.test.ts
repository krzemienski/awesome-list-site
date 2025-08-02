import { Page, Browser, chromium } from 'playwright';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe('Mobile Experience Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:5173';
  
  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  describe('Mobile Navigation', () => {
    it('should display mobile menu button on small screens', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      const menuButton = page.locator('[aria-label="Open navigation menu"]');
      await expect(menuButton).toBeVisible();
    });

    it('should toggle sidebar on mobile when menu button is clicked', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Sidebar should be hidden initially on mobile
      const sidebar = page.locator('aside[role="navigation"]');
      await expect(sidebar).toHaveAttribute('data-state', 'closed');
      
      // Click menu button
      const menuButton = page.locator('[aria-label="Open navigation menu"]');
      await menuButton.click();
      
      // Sidebar should be visible
      await expect(sidebar).toHaveAttribute('data-state', 'open');
      
      // Click menu button again to close
      await menuButton.click();
      await expect(sidebar).toHaveAttribute('data-state', 'closed');
    });

    it('should display overlay when sidebar is open on mobile', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Open sidebar
      const menuButton = page.locator('[aria-label="Open navigation menu"]');
      await menuButton.click();
      
      // Check for overlay
      const overlay = page.locator('[data-testid="sidebar-overlay"]');
      await expect(overlay).toBeVisible();
      
      // Click overlay should close sidebar
      await overlay.click();
      const sidebar = page.locator('aside[role="navigation"]');
      await expect(sidebar).toHaveAttribute('data-state', 'closed');
    });

    it('should close sidebar when navigating to a new page on mobile', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Open sidebar
      const menuButton = page.locator('[aria-label="Open navigation menu"]');
      await menuButton.click();
      
      // Click on a category
      const categoryLink = page.locator('aside a').first();
      await categoryLink.click();
      
      // Sidebar should close after navigation
      const sidebar = page.locator('aside[role="navigation"]');
      await expect(sidebar).toHaveAttribute('data-state', 'closed');
    });
  });

  describe('Mobile Content Layout', () => {
    it('should display content in single column on mobile', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check that resource cards are stacked vertically
      const resourceGrid = page.locator('[data-testid="resource-grid"]');
      const gridStyle = await resourceGrid.evaluate(el => window.getComputedStyle(el));
      expect(gridStyle.gridTemplateColumns).toContain('1fr');
    });

    it('should have appropriate touch targets on mobile', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check button sizes
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44); // Minimum touch target height
          expect(box.width).toBeGreaterThanOrEqual(44); // Minimum touch target width
        }
      }
    });

    it('should handle horizontal scrolling properly', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check that content doesn't overflow horizontally
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
    });
  });

  describe('Mobile Search Experience', () => {
    it('should open search dialog on mobile', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Click search button
      const searchButton = page.locator('[aria-label="Search resources"]');
      await searchButton.click();
      
      // Search dialog should be visible
      const searchDialog = page.locator('[role="dialog"]');
      await expect(searchDialog).toBeVisible();
      
      // Search input should be focused
      const searchInput = page.locator('[role="dialog"] input[type="search"]');
      await expect(searchInput).toBeFocused();
    });

    it('should display search results appropriately on mobile', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Open search
      const searchButton = page.locator('[aria-label="Search resources"]');
      await searchButton.click();
      
      // Type search query
      const searchInput = page.locator('[role="dialog"] input[type="search"]');
      await searchInput.fill('video');
      await searchInput.press('Enter');
      
      // Check that results are displayed
      const results = page.locator('[data-testid="search-results"]');
      await expect(results).toBeVisible();
      
      // Results should be scrollable
      const resultsHeight = await results.evaluate(el => el.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      expect(resultsHeight).toBeLessThanOrEqual(viewportHeight * 0.8); // Results shouldn't exceed 80% of viewport
    });
  });

  describe('Mobile Performance', () => {
    it('should load within acceptable time on mobile network', async () => {
      // Simulate slow 3G network
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 }
      });
      const mobilePage = await context.newPage();
      
      // Simulate slow 3G
      await mobilePage.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      const startTime = Date.now();
      await mobilePage.goto(baseUrl);
      await mobilePage.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds on slow network
      
      await context.close();
    });

    it('should lazy load images on mobile', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check that images have loading="lazy" attribute
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const loading = await img.getAttribute('loading');
        expect(loading).toBe('lazy');
      }
    });
  });

  describe('Mobile Accessibility', () => {
    it('should have proper focus management on mobile', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
      
      // Continue tabbing and ensure focus is visible
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const hasFocusVisible = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;
          const styles = window.getComputedStyle(el);
          return styles.outline !== 'none' || styles.boxShadow !== 'none';
        });
        expect(hasFocusVisible).toBeTruthy();
      }
    });

    it('should announce page changes to screen readers', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check for aria-live region
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toHaveCount(1);
      
      // Navigate to a category
      const menuButton = page.locator('[aria-label="Open navigation menu"]');
      await menuButton.click();
      
      const categoryLink = page.locator('aside a').first();
      const categoryName = await categoryLink.textContent();
      await categoryLink.click();
      
      // Check that page change is announced
      await expect(liveRegion).toContainText(categoryName || '');
    });
  });
});