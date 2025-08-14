const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'theme-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function captureThemeScreenshots() {
  console.log('Starting comprehensive theme screenshot capture...\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote'
    ]
  });
  
  try {
    // Test both mobile and desktop views
    const viewports = [
      { name: 'mobile', width: 390, height: 844 }, // iPhone 14 Pro
      { name: 'desktop', width: 1920, height: 1080 } // Full HD Desktop
    ];
    
    for (const viewport of viewports) {
      console.log(`\n📱 Testing ${viewport.name} view (${viewport.width}x${viewport.height})`);
      
      const page = await browser.newPage();
      await page.setViewport(viewport);
      
      // Navigate to homepage
      console.log('  → Navigating to homepage...');
      await page.goto('http://localhost:5000', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      await page.waitForTimeout(2000);
      
      // 1. Default theme (dark)
      console.log('  → Capturing default dark theme...');
      await page.screenshot({ 
        path: path.join(screenshotsDir, `01-${viewport.name}-dark-theme-homepage.png`),
        fullPage: true 
      });
      
      // 2. Navigate to Color Palette page
      console.log('  → Navigating to Color Palette page...');
      const colorPaletteLink = await page.$('a[href="/color-palette"]');
      if (colorPaletteLink) {
        await colorPaletteLink.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: path.join(screenshotsDir, `02-${viewport.name}-color-palette-page.png`),
          fullPage: true 
        });
      }
      
      // 3. Open theme settings
      console.log('  → Opening theme settings...');
      const settingsButton = await page.$('button svg.lucide-settings');
      if (settingsButton) {
        const button = await settingsButton.evaluateHandle(el => el.closest('button'));
        await button.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: path.join(screenshotsDir, `03-${viewport.name}-theme-settings-open.png`),
          fullPage: false 
        });
      }
      
      // 4. Switch to light theme
      console.log('  → Switching to light theme...');
      const lightThemeButton = await page.$('button:has-text("Light")');
      if (lightThemeButton) {
        await lightThemeButton.click();
      } else {
        // Try alternative selector
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const lightButton = buttons.find(b => b.textContent?.includes('Light'));
          if (lightButton) lightButton.click();
        });
      }
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: path.join(screenshotsDir, `04-${viewport.name}-light-theme.png`),
        fullPage: true 
      });
      
      // 5. Close settings and go back to homepage
      console.log('  → Returning to homepage...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);
      
      // 6. Capture resource cards in light theme
      console.log('  → Capturing resource cards...');
      await page.screenshot({ 
        path: path.join(screenshotsDir, `05-${viewport.name}-light-theme-cards.png`),
        fullPage: false 
      });
      
      // 7. Test search functionality
      console.log('  → Testing search...');
      const searchInput = await page.$('input[type="search"], input[placeholder*="Search"]');
      if (searchInput) {
        await searchInput.type('ffmpeg');
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: path.join(screenshotsDir, `06-${viewport.name}-search-results.png`),
          fullPage: false 
        });
      }
      
      // 8. Test category filtering
      console.log('  → Testing category filter...');
      const categorySelect = await page.$('button[role="combobox"]');
      if (categorySelect) {
        await categorySelect.click();
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: path.join(screenshotsDir, `07-${viewport.name}-category-dropdown.png`),
          fullPage: false 
        });
        await page.keyboard.press('Escape');
      }
      
      // Close this viewport's page
      await page.close();
    }
    
    console.log('\n✅ Screenshot capture complete!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    
    // List all screenshots
    const screenshots = fs.readdirSync(screenshotsDir);
    console.log('\n📸 Generated screenshots:');
    screenshots.forEach(file => {
      const stats = fs.statSync(path.join(screenshotsDir, file));
      const size = (stats.size / 1024).toFixed(1);
      console.log(`   - ${file} (${size} KB)`);
    });
    
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureThemeScreenshots().catch(console.error);