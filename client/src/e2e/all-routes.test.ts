import { Page, Browser, chromium } from 'playwright';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe('All Routes E2E Tests', () => {
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

  describe('Homepage Route (/)', () => {
    it('should load homepage successfully', async () => {
      const response = await page.goto(baseUrl);
      expect(response?.status()).toBe(200);
      
      await page.waitForLoadState('networkidle');
      
      // Check main elements are present
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="resource-grid"]')).toBeVisible();
    });

    it('should have correct meta tags for SEO', async () => {
      await page.goto(baseUrl);
      
      // Check title
      const title = await page.title();
      expect(title).toContain('Awesome');
      
      // Check meta description
      const description = await page.getAttribute('meta[name="description"]', 'content');
      expect(description).toBeTruthy();
      
      // Check Open Graph tags
      const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
      const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
      const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
      
      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
      expect(ogImage).toBeTruthy();
    });

    it('should display layout controls', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Check layout selector
      const layoutSelector = page.locator('[data-testid="layout-selector"]');
      await expect(layoutSelector).toBeVisible();
      
      // Check sort selector
      const sortSelector = page.locator('[data-testid="sort-selector"]');
      await expect(sortSelector).toBeVisible();
      
      // Check items per page selector
      const itemsSelector = page.locator('[data-testid="items-per-page-selector"]');
      await expect(itemsSelector).toBeVisible();
    });
  });

  describe('Category Routes (/category/:slug)', () => {
    it('should load all category pages', async () => {
      // Get categories from API
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const data = await response.json();
      
      // Test first 5 categories
      const categoriesToTest = data.categories.slice(0, 5);
      
      for (const category of categoriesToTest) {
        if (category.slug) {
          await page.goto(`${baseUrl}/category/${category.slug}`);
          await page.waitForLoadState('networkidle');
          
          // Check category name is displayed
          const heading = page.locator('h1');
          await expect(heading).toContainText(category.name);
          
          // Check breadcrumb
          const breadcrumb = page.locator('[aria-label="Breadcrumb"]');
          await expect(breadcrumb).toBeVisible();
          await expect(breadcrumb).toContainText('Home');
          await expect(breadcrumb).toContainText(category.name);
        }
      }
    });

    it('should display category resources', async () => {
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const data = await response.json();
      
      // Find category with resources
      const categoryWithResources = data.categories.find(
        (cat: any) => cat.resources && cat.resources.length > 0
      );
      
      if (categoryWithResources) {
        await page.goto(`${baseUrl}/category/${categoryWithResources.slug}`);
        await page.waitForLoadState('networkidle');
        
        // Check resources are displayed
        const resources = page.locator('[data-testid="resource-card"]');
        const count = await resources.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    it('should handle non-existent category gracefully', async () => {
      await page.goto(`${baseUrl}/category/non-existent-category-12345`);
      await page.waitForLoadState('networkidle');
      
      // Should show 404 or error message
      const pageContent = await page.textContent('body');
      expect(pageContent).toMatch(/not found|404|error/i);
    });
  });

  describe('Subcategory Routes (/subcategory/:slug)', () => {
    it('should load subcategory pages', async () => {
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const data = await response.json();
      
      // Find subcategories
      let subcategoryToTest = null;
      let parentCategory = null;
      
      for (const category of data.categories) {
        if (category.subcategories && category.subcategories.length > 0) {
          parentCategory = category;
          subcategoryToTest = category.subcategories[0];
          break;
        }
      }
      
      if (subcategoryToTest && parentCategory) {
        const subcategorySlug = `${parentCategory.slug}-${subcategoryToTest.slug}`;
        await page.goto(`${baseUrl}/subcategory/${subcategorySlug}`);
        await page.waitForLoadState('networkidle');
        
        // Check subcategory name is displayed
        const heading = page.locator('h1');
        await expect(heading).toContainText(subcategoryToTest.name);
        
        // Check breadcrumb shows full path
        const breadcrumb = page.locator('[aria-label="Breadcrumb"]');
        await expect(breadcrumb).toContainText('Home');
        await expect(breadcrumb).toContainText(parentCategory.name);
        await expect(breadcrumb).toContainText(subcategoryToTest.name);
      }
    });
  });

  describe('Not Found Route (404)', () => {
    it('should show 404 page for invalid routes', async () => {
      await page.goto(`${baseUrl}/this-route-does-not-exist`);
      await page.waitForLoadState('networkidle');
      
      // Check 404 message
      const heading = page.locator('h1');
      await expect(heading).toContainText('404');
      
      // Check for home link
      const homeLink = page.locator('a[href="/"]');
      await expect(homeLink).toBeVisible();
    });
  });

  describe('API Routes', () => {
    it('should serve API endpoints correctly', async () => {
      // Test main API endpoint
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('application/json');
      
      const data = await response.json();
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('resources');
      expect(data).toHaveProperty('categories');
    });

    it('should serve sitemap.xml', async () => {
      const response = await page.request.get(`${apiUrl}/sitemap.xml`);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('xml');
      
      const content = await response.text();
      expect(content).toContain('<?xml');
      expect(content).toContain('<urlset');
      expect(content).toContain('<loc>');
    });

    it('should serve robots.txt', async () => {
      const response = await page.request.get(`${apiUrl}/robots.txt`);
      expect(response.ok()).toBeTruthy();
      
      const content = await response.text();
      expect(content).toContain('User-agent:');
      expect(content).toContain('Sitemap:');
    });

    it('should serve OG images', async () => {
      const response = await page.request.get(`${apiUrl}/og-image.svg`);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('image/svg+xml');
      
      const content = await response.text();
      expect(content).toContain('<svg');
      expect(content).toContain('Awesome');
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate between pages correctly', async () => {
      // Start at homepage
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Get API data
      const response = await page.request.get(`${apiUrl}/api/awesome-list`);
      const data = await response.json();
      
      // Click on first category in sidebar
      const firstCategory = data.categories[0];
      if (firstCategory) {
        // Open sidebar on mobile
        const isMobile = await page.evaluate(() => window.innerWidth < 768);
        if (isMobile) {
          const menuButton = page.locator('[aria-label="Open navigation menu"]');
          await menuButton.click();
        }
        
        // Click category link
        const categoryLink = page.locator(`aside a:text("${firstCategory.name}")`);
        await categoryLink.click();
        
        // Check URL changed
        await page.waitForURL(`**/category/${firstCategory.slug}`);
        
        // Check content loaded
        const heading = page.locator('h1');
        await expect(heading).toContainText(firstCategory.name);
        
        // Navigate back to home using breadcrumb
        const homeLink = page.locator('[aria-label="Breadcrumb"] a:text("Home")');
        await homeLink.click();
        
        // Check back at homepage
        await page.waitForURL(baseUrl);
      }
    });

    it('should maintain scroll position on back navigation', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));
      const scrollBefore = await page.evaluate(() => window.scrollY);
      
      // Navigate to category
      const categoryLink = page.locator('[data-testid="category-link"]').first();
      await categoryLink.click();
      await page.waitForLoadState('networkidle');
      
      // Go back
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      // Check scroll position is restored (with some tolerance)
      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Create a context that blocks API calls
      const context = await browser.newContext();
      const errorPage = await context.newPage();
      
      // Block API endpoint
      await errorPage.route('**/api/awesome-list', route => {
        route.abort('failed');
      });
      
      // Try to load page
      await errorPage.goto(baseUrl);
      await errorPage.waitForLoadState('networkidle');
      
      // Should show error state
      const errorMessage = errorPage.locator('text=/error|failed|retry/i');
      await expect(errorMessage).toBeVisible();
      
      await context.close();
    });

    it('should have retry functionality for failed requests', async () => {
      const context = await browser.newContext();
      const errorPage = await context.newPage();
      
      let requestCount = 0;
      
      // Fail first request, succeed on retry
      await errorPage.route('**/api/awesome-list', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      // Load page (will fail)
      await errorPage.goto(baseUrl);
      await errorPage.waitForLoadState('networkidle');
      
      // Click retry button
      const retryButton = errorPage.locator('button:text("Retry")');
      await retryButton.click();
      
      // Should load successfully
      await errorPage.waitForSelector('h1');
      const heading = errorPage.locator('h1');
      await expect(heading).toBeVisible();
      
      await context.close();
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states while fetching data', async () => {
      const context = await browser.newContext();
      const slowPage = await context.newPage();
      
      // Delay API response
      await slowPage.route('**/api/awesome-list', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });
      
      // Navigate to page
      slowPage.goto(baseUrl);
      
      // Check loading state appears
      const loadingIndicator = slowPage.locator('[data-testid="loading-spinner"], [role="progressbar"]');
      await expect(loadingIndicator).toBeVisible();
      
      // Wait for content to load
      await slowPage.waitForLoadState('networkidle');
      
      // Loading indicator should be gone
      await expect(loadingIndicator).not.toBeVisible();
      
      await context.close();
    });

    it('should handle slow network gracefully', async () => {
      const context = await browser.newContext();
      const slowPage = await context.newPage();
      
      // Simulate slow 3G
      await slowPage.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 200));
        await route.continue();
      });
      
      const startTime = Date.now();
      await slowPage.goto(baseUrl);
      await slowPage.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Page should still load, even if slowly
      const heading = slowPage.locator('h1');
      await expect(heading).toBeVisible();
      
      // But warn if too slow
      if (loadTime > 5000) {
        console.warn(`Page load time on slow network: ${loadTime}ms`);
      }
      
      await context.close();
    });
  });
});