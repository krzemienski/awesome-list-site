import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const baseUrl = 'http://localhost:5000';
    const screenshotDir = path.join(__dirname, 'evidence-screenshots');

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
      console.log(`Taking ${viewport.name} screenshots...`);
      await page.setViewport({ width: viewport.width, height: viewport.height });
      
      // Navigate to home page
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Take homepage screenshot
      await page.screenshot({
        path: path.join(screenshotDir, `home-${viewport.name}.png`),
        fullPage: true
      });

      // Test theme switching - just violet theme in both modes
      for (const mode of modes) {
        // Apply theme via JavaScript
        await page.evaluate((mode) => {
          // Apply theme
          const root = document.documentElement;
          root.setAttribute('data-theme', 'violet');
          root.classList.remove('light', 'dark');
          root.classList.add(mode);
          
          // Save to localStorage
          localStorage.setItem('theme-preferences', JSON.stringify({
            theme: 'violet',
            mode: mode
          }));
          localStorage.setItem('ui-theme', mode);
        }, mode);

        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for theme to apply

        await page.screenshot({
          path: path.join(screenshotDir, `theme-violet-${mode}-${viewport.name}.png`),
          fullPage: false
        });
      }

      // Test search functionality
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Clear any existing search
      const searchInput = await page.$('input[placeholder*="Search"]');
      if (searchInput) {
        await searchInput.click({ clickCount: 3 }); // Select all
        await page.keyboard.press('Backspace');
        await searchInput.type('streaming');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({
          path: path.join(screenshotDir, `search-results-${viewport.name}.png`),
          fullPage: false
        });
      }

      // Test browse page
      await page.goto(`${baseUrl}/browse`, { waitUntil: 'networkidle2' });
      await page.screenshot({
        path: path.join(screenshotDir, `browse-page-${viewport.name}.png`),
        fullPage: true
      });
    }

    console.log('Screenshots taken successfully!');
    console.log(`Screenshots saved to: ${screenshotDir}`);
  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();