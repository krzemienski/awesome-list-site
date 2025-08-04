const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const baseUrl = 'http://localhost:5173';
    const screenshotDir = '/home/nick/awesome-list-site/evidence-screenshots';

    // Define themes and modes
    const themes = ['violet', 'red', 'rose', 'orange', 'green', 'blue', 'yellow', 'zinc'];
    const modes = ['light', 'dark'];
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 812 }
    ];

    // Take screenshots for each combination
    for (const viewport of viewports) {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      
      // Navigate to home page
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Take homepage screenshot
      await page.screenshot({
        path: path.join(screenshotDir, `home-${viewport.name}.png`),
        fullPage: true
      });

      // Test theme switching
      for (const theme of themes.slice(0, 3)) { // Just test first 3 themes for brevity
        for (const mode of modes) {
          // Apply theme via JavaScript
          await page.evaluate((theme, mode) => {
            // Apply theme
            const root = document.documentElement;
            root.setAttribute('data-theme', theme);
            root.classList.remove('light', 'dark');
            root.classList.add(mode);
            
            // Save to localStorage
            localStorage.setItem('theme-preferences', JSON.stringify({
              theme: theme,
              mode: mode === 'dark' ? 'dark' : 'light'
            }));
            localStorage.setItem('ui-theme', mode === 'dark' ? 'dark' : 'light');
          }, theme, mode);

          await page.waitForTimeout(500); // Wait for theme to apply

          await page.screenshot({
            path: path.join(screenshotDir, `theme-${theme}-${mode}-${viewport.name}.png`),
            fullPage: false
          });
        }
      }

      // Test search functionality
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      await page.type('input[placeholder*="Search"]', 'streaming');
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotDir, `search-results-${viewport.name}.png`),
        fullPage: false
      });

      // Test category page
      await page.goto(`${baseUrl}/browse`, { waitUntil: 'networkidle2' });
      await page.screenshot({
        path: path.join(screenshotDir, `browse-page-${viewport.name}.png`),
        fullPage: true
      });
    }

    console.log('Screenshots taken successfully!');
  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();