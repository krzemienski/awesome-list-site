import puppeteer, { Browser, Page } from 'puppeteer';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const SCREENSHOTS_DIR = join(__dirname, '../../screenshots');
const BASELINE_DIR = join(SCREENSHOTS_DIR, 'baseline');
const CURRENT_DIR = join(SCREENSHOTS_DIR, 'current');
const DIFF_DIR = join(SCREENSHOTS_DIR, 'diff');

// Create directories if they don't exist
[SCREENSHOTS_DIR, BASELINE_DIR, CURRENT_DIR, DIFF_DIR].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

describe('Visual Regression Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:5173';
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  async function compareScreenshots(name: string, threshold = 0.1): Promise<number> {
    const baselinePath = join(BASELINE_DIR, `${name}.png`);
    const currentPath = join(CURRENT_DIR, `${name}.png`);
    const diffPath = join(DIFF_DIR, `${name}.png`);

    // If no baseline exists, create it
    if (!existsSync(baselinePath)) {
      const currentBuffer = readFileSync(currentPath);
      require('fs').writeFileSync(baselinePath, currentBuffer);
      console.log(`Created baseline for ${name}`);
      return 0;
    }

    // Compare images
    const baseline = PNG.sync.read(readFileSync(baselinePath));
    const current = PNG.sync.read(readFileSync(currentPath));
    const { width, height } = baseline;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      { threshold }
    );

    // Save diff image
    require('fs').writeFileSync(diffPath, PNG.sync.write(diff));

    const diffPercentage = (numDiffPixels / (width * height)) * 100;
    return diffPercentage;
  }

  describe('Desktop Views', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 1920, height: 1080 });
    });

    it('should match homepage visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Wait for animations to complete
      await page.waitForTimeout(1000);
      
      // Hide dynamic content that changes
      await page.evaluate(() => {
        // Hide timestamps or dates
        document.querySelectorAll('[data-testid*="date"], [data-testid*="time"]').forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });
      
      const screenshotPath = join(CURRENT_DIR, 'homepage-desktop.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      const diffPercentage = await compareScreenshots('homepage-desktop');
      expect(diffPercentage).toBeLessThan(1); // Less than 1% difference
    });

    it('should match category page visual baseline', async () => {
      // Get first category
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      const firstCategoryLink = await page.$eval(
        'aside a[href^="/category/"]',
        el => el.getAttribute('href')
      );
      
      if (firstCategoryLink) {
        await page.goto(`${baseUrl}${firstCategoryLink}`, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(1000);
        
        const screenshotPath = join(CURRENT_DIR, 'category-desktop.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        const diffPercentage = await compareScreenshots('category-desktop');
        expect(diffPercentage).toBeLessThan(1);
      }
    });

    it('should match search dialog visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Open search dialog
      await page.click('[aria-label="Search resources"]');
      await page.waitForSelector('[role="dialog"]', { visible: true });
      await page.waitForTimeout(500); // Wait for animation
      
      const screenshotPath = join(CURRENT_DIR, 'search-dialog-desktop.png');
      await page.screenshot({ path: screenshotPath });
      
      const diffPercentage = await compareScreenshots('search-dialog-desktop');
      expect(diffPercentage).toBeLessThan(1);
    });

    it('should match dark mode visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Toggle dark mode
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(500); // Wait for theme transition
      
      const screenshotPath = join(CURRENT_DIR, 'homepage-desktop-dark.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      const diffPercentage = await compareScreenshots('homepage-desktop-dark');
      expect(diffPercentage).toBeLessThan(1);
    });
  });

  describe('Mobile Views', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 375, height: 667 });
    });

    it('should match mobile homepage visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      const screenshotPath = join(CURRENT_DIR, 'homepage-mobile.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      const diffPercentage = await compareScreenshots('homepage-mobile');
      expect(diffPercentage).toBeLessThan(1);
    });

    it('should match mobile menu visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Open mobile menu
      await page.click('[aria-label="Open navigation menu"]');
      await page.waitForSelector('aside[data-state="open"]', { visible: true });
      await page.waitForTimeout(500); // Wait for animation
      
      const screenshotPath = join(CURRENT_DIR, 'mobile-menu.png');
      await page.screenshot({ path: screenshotPath });
      
      const diffPercentage = await compareScreenshots('mobile-menu');
      expect(diffPercentage).toBeLessThan(1);
    });

    it('should match mobile search visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Open search
      await page.click('[aria-label="Search resources"]');
      await page.waitForSelector('[role="dialog"]', { visible: true });
      await page.waitForTimeout(500);
      
      const screenshotPath = join(CURRENT_DIR, 'search-mobile.png');
      await page.screenshot({ path: screenshotPath });
      
      const diffPercentage = await compareScreenshots('search-mobile');
      expect(diffPercentage).toBeLessThan(1);
    });
  });

  describe('Tablet Views', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 768, height: 1024 });
    });

    it('should match tablet homepage visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      const screenshotPath = join(CURRENT_DIR, 'homepage-tablet.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      const diffPercentage = await compareScreenshots('homepage-tablet');
      expect(diffPercentage).toBeLessThan(1);
    });
  });

  describe('Component States', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 1920, height: 1080 });
    });

    it('should match hover states visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Hover over first resource card
      const firstCard = await page.$('[data-testid="resource-card"]');
      if (firstCard) {
        const box = await firstCard.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(300); // Wait for hover animation
          
          const screenshotPath = join(CURRENT_DIR, 'resource-card-hover.png');
          await page.screenshot({ 
            path: screenshotPath,
            clip: {
              x: box.x - 10,
              y: box.y - 10,
              width: box.width + 20,
              height: box.height + 20
            }
          });
          
          const diffPercentage = await compareScreenshots('resource-card-hover');
          expect(diffPercentage).toBeLessThan(1);
        }
      }
    });

    it('should match focus states visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Tab to first interactive element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      const screenshotPath = join(CURRENT_DIR, 'focus-state.png');
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const box = await focusedElement.asElement()?.boundingBox();
      
      if (box) {
        await page.screenshot({ 
          path: screenshotPath,
          clip: {
            x: Math.max(0, box.x - 20),
            y: Math.max(0, box.y - 20),
            width: box.width + 40,
            height: box.height + 40
          }
        });
        
        const diffPercentage = await compareScreenshots('focus-state');
        expect(diffPercentage).toBeLessThan(1);
      }
    });

    it('should match loading states visual baseline', async () => {
      // Create a new page with delayed response
      const slowPage = await browser.newPage();
      await slowPage.setViewport({ width: 1920, height: 1080 });
      
      // Intercept and delay API calls
      await slowPage.setRequestInterception(true);
      slowPage.on('request', request => {
        if (request.url().includes('/api/awesome-list')) {
          setTimeout(() => request.continue(), 2000);
        } else {
          request.continue();
        }
      });
      
      // Navigate and capture loading state
      slowPage.goto(baseUrl);
      await slowPage.waitForTimeout(500); // Wait for loading state to appear
      
      const screenshotPath = join(CURRENT_DIR, 'loading-state.png');
      await slowPage.screenshot({ path: screenshotPath });
      
      const diffPercentage = await compareScreenshots('loading-state');
      expect(diffPercentage).toBeLessThan(1);
      
      await slowPage.close();
    });
  });

  describe('Layout Variations', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 1920, height: 1080 });
    });

    it('should match list layout visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Switch to list layout
      await page.click('[data-testid="layout-selector"] [value="list"]');
      await page.waitForTimeout(500);
      
      const screenshotPath = join(CURRENT_DIR, 'layout-list.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      const diffPercentage = await compareScreenshots('layout-list');
      expect(diffPercentage).toBeLessThan(1);
    });

    it('should match compact layout visual baseline', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Switch to compact layout
      await page.click('[data-testid="layout-selector"] [value="compact"]');
      await page.waitForTimeout(500);
      
      const screenshotPath = join(CURRENT_DIR, 'layout-compact.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      const diffPercentage = await compareScreenshots('layout-compact');
      expect(diffPercentage).toBeLessThan(1);
    });
  });

  describe('Accessibility Visual Tests', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 1920, height: 1080 });
    });

    it('should maintain visual consistency with high contrast mode', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Enable high contrast mode via CSS
      await page.addStyleTag({
        content: `
          * {
            filter: contrast(2) !important;
          }
        `
      });
      
      await page.waitForTimeout(500);
      
      const screenshotPath = join(CURRENT_DIR, 'high-contrast.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      const diffPercentage = await compareScreenshots('high-contrast', 0.2); // Higher threshold for contrast
      expect(diffPercentage).toBeLessThan(2);
    });

    it('should maintain layout with larger text sizes', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Increase text size
      await page.addStyleTag({
        content: `
          html {
            font-size: 150% !important;
          }
        `
      });
      
      await page.waitForTimeout(500);
      
      const screenshotPath = join(CURRENT_DIR, 'large-text.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      const diffPercentage = await compareScreenshots('large-text');
      expect(diffPercentage).toBeLessThan(2);
    });
  });
});