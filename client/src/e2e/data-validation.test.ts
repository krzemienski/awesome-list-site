import { Page, Browser, chromium } from 'playwright';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe('Data Loading and Validation Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:5173';
  const apiUrl = 'http://localhost:5000';
  
  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  describe('API Data Structure', () => {
    it('should return valid awesome list data structure', async () => {
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Validate top-level structure
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('resources');
      expect(data).toHaveProperty('categories');
      
      // Validate data types
      expect(typeof data.title).toBe('string');
      expect(Array.isArray(data.resources)).toBeTruthy();
      expect(Array.isArray(data.categories)).toBeTruthy();
    });

    it('should have properly structured categories', async () => {
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const data = await response.json();
      
      expect(data.categories.length).toBeGreaterThan(0);
      
      // Check first category structure
      const firstCategory = data.categories[0];
      expect(firstCategory).toHaveProperty('name');
      expect(firstCategory).toHaveProperty('slug');
      expect(firstCategory).toHaveProperty('resources');
      expect(firstCategory).toHaveProperty('subcategories');
      
      // Validate category data
      expect(typeof firstCategory.name).toBe('string');
      expect(firstCategory.name).not.toBe('');
      expect(Array.isArray(firstCategory.resources)).toBeTruthy();
      expect(Array.isArray(firstCategory.subcategories)).toBeTruthy();
    });

    it('should have valid resource structure', async () => {
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const data = await response.json();
      
      expect(data.resources.length).toBeGreaterThan(0);
      
      // Check first resource
      const firstResource = data.resources[0];
      expect(firstResource).toHaveProperty('id');
      expect(firstResource).toHaveProperty('title');
      expect(firstResource).toHaveProperty('url');
      expect(firstResource).toHaveProperty('description');
      expect(firstResource).toHaveProperty('category');
      
      // Validate resource data
      expect(typeof firstResource.id).toBe('string');
      expect(typeof firstResource.title).toBe('string');
      expect(firstResource.url).toMatch(/^https?:\/\//);
    });
  });

  describe('Homepage Data Loading', () => {
    it('should display the correct title from API', async () => {
      // Get data from API
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const apiData = await response.json();
      
      // Load homepage
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check title is displayed
      const pageTitle = page.locator('h1').first();
      await expect(pageTitle).toContainText(apiData.title);
    });

    it('should display all categories in sidebar', async () => {
      // Get data from API
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const apiData = await response.json();
      
      // Load homepage
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Open sidebar on mobile/check it's visible on desktop
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      if (viewportWidth < 768) {
        const menuButton = page.locator('[aria-label="Open navigation menu"]');
        await menuButton.click();
      }
      
      // Check all categories are displayed
      for (const category of apiData.categories) {
        if (category.name) {
          const categoryLink = page.locator(`aside a:text("${category.name}")`);
          await expect(categoryLink).toBeVisible();
        }
      }
    });

    it('should display correct number of resources', async () => {
      // Get data from API
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const apiData = await response.json();
      
      // Load homepage
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check resource count is displayed
      const resourceCount = page.locator('text=/\\d+ Resources/');
      await expect(resourceCount).toBeVisible();
      await expect(resourceCount).toContainText(String(apiData.resources.length));
    });
  });

  describe('Category Page Data Loading', () => {
    it('should load and display category resources correctly', async () => {
      // Get data from API
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const apiData = await response.json();
      
      // Find a category with resources
      const categoryWithResources = apiData.categories.find(
        (cat: any) => cat.resources && cat.resources.length > 0
      );
      
      if (!categoryWithResources) {
        console.warn('No categories with resources found');
        return;
      }
      
      // Navigate to category page
      await page.goto(`${baseUrl}/category/${categoryWithResources.slug}`);
      await page.waitForLoadState('networkidle');
      
      // Check category name is displayed
      const categoryTitle = page.locator('h1');
      await expect(categoryTitle).toContainText(categoryWithResources.name);
      
      // Check resources are displayed
      const resourceCards = page.locator('[data-testid="resource-card"]');
      const displayedCount = await resourceCards.count();
      expect(displayedCount).toBeGreaterThan(0);
      
      // Verify first resource data
      const firstResourceCard = resourceCards.first();
      const firstResource = categoryWithResources.resources[0];
      
      await expect(firstResourceCard).toContainText(firstResource.title);
      await expect(firstResourceCard).toContainText(firstResource.description);
    });

    it('should display subcategories if they exist', async () => {
      // Get data from API
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const apiData = await response.json();
      
      // Find a category with subcategories
      const categoryWithSubcategories = apiData.categories.find(
        (cat: any) => cat.subcategories && cat.subcategories.length > 0
      );
      
      if (!categoryWithSubcategories) {
        console.warn('No categories with subcategories found');
        return;
      }
      
      // Navigate to category page
      await page.goto(`${baseUrl}/category/${categoryWithSubcategories.slug}`);
      await page.waitForLoadState('networkidle');
      
      // Check subcategories are displayed
      for (const subcategory of categoryWithSubcategories.subcategories) {
        if (subcategory.name) {
          const subcategoryElement = page.locator(`text="${subcategory.name}"`);
          await expect(subcategoryElement).toBeVisible();
        }
      }
    });
  });

  describe('Search Functionality', () => {
    it('should search through all resources', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Open search
      const searchButton = page.locator('[aria-label="Search resources"]');
      await searchButton.click();
      
      // Search for a common term
      const searchInput = page.locator('[role="dialog"] input[type="search"]');
      await searchInput.fill('video');
      await searchInput.press('Enter');
      
      // Wait for results
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Check that results are displayed
      const results = page.locator('[data-testid="search-result-item"]');
      const resultCount = await results.count();
      expect(resultCount).toBeGreaterThan(0);
      
      // Verify results contain search term
      const firstResult = results.first();
      const resultText = await firstResult.textContent();
      expect(resultText?.toLowerCase()).toContain('video');
    });

    it('should filter by category in search', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Get category data
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const apiData = await response.json();
      const firstCategory = apiData.categories[0];
      
      // Open search
      const searchButton = page.locator('[aria-label="Search resources"]');
      await searchButton.click();
      
      // Select category filter
      const categoryFilter = page.locator('[data-testid="category-filter"]');
      await categoryFilter.selectOption(firstCategory.slug);
      
      // Search
      const searchInput = page.locator('[role="dialog"] input[type="search"]');
      await searchInput.fill('');
      await searchInput.press('Enter');
      
      // Check results are from selected category
      const results = page.locator('[data-testid="search-result-item"]');
      const resultCount = await results.count();
      
      for (let i = 0; i < Math.min(resultCount, 5); i++) {
        const result = results.nth(i);
        const categoryBadge = result.locator('[data-testid="category-badge"]');
        await expect(categoryBadge).toContainText(firstCategory.name);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across navigation', async () => {
      // Get initial data
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const apiData = await response.json();
      
      // Load homepage
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Navigate to a category
      const firstCategory = apiData.categories[0];
      await page.goto(`${baseUrl}/category/${firstCategory.slug}`);
      await page.waitForLoadState('networkidle');
      
      // Navigate back to homepage
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check data is still correct
      const resourceCount = page.locator('text=/\\d+ Resources/');
      await expect(resourceCount).toContainText(String(apiData.resources.length));
    });

    it('should handle missing or invalid data gracefully', async () => {
      // Try to navigate to non-existent category
      await page.goto(`${baseUrl}/category/non-existent-category`);
      await page.waitForLoadState('networkidle');
      
      // Should show error or redirect
      const errorMessage = page.locator('text=/not found|404|error/i');
      const isError = await errorMessage.isVisible().catch(() => false);
      
      // Or check if redirected to homepage
      const currentUrl = page.url();
      const isRedirected = currentUrl === baseUrl || currentUrl === `${baseUrl}/`;
      
      expect(isError || isRedirected).toBeTruthy();
    });
  });

  describe('Resource Links and External Navigation', () => {
    it('should have valid external links for resources', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Get first resource link
      const resourceLink = page.locator('[data-testid="resource-link"]').first();
      const href = await resourceLink.getAttribute('href');
      
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
      
      // Check link opens in new tab
      const target = await resourceLink.getAttribute('target');
      expect(target).toBe('_blank');
      
      // Check security attributes
      const rel = await resourceLink.getAttribute('rel');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    });
  });
});