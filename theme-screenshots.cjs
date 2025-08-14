const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Utility function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'theme-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function captureScreenshots() {
  console.log('📸 Starting theme screenshot capture...\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  try {
    // Capture mobile view (iPhone 14 Pro)
    console.log('📱 Capturing MOBILE screenshots (390x844)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844 });
    
    // Mobile - Homepage dark theme
    console.log('  1. Mobile homepage (dark theme)');
    await mobilePage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobilePage.screenshot({ 
      path: path.join(screenshotsDir, '01-mobile-dark-homepage.png'),
      fullPage: true 
    });
    
    // Mobile - Search functionality
    console.log('  2. Mobile search');
    const searchInput = await mobilePage.$('input[placeholder*="Search"], input[type="search"]');
    if (searchInput) {
      await searchInput.type('codec');
      await wait(1500);
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, '02-mobile-search-results.png'),
        fullPage: false 
      });
      await searchInput.click({ clickCount: 3 });
      await mobilePage.keyboard.press('Delete');
    }
    
    // Mobile - Color Palette page
    console.log('  3. Mobile color palette page');
    await mobilePage.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobilePage.screenshot({ 
      path: path.join(screenshotsDir, '03-mobile-color-palette.png'),
      fullPage: true 
    });
    
    // Mobile - Theme settings
    console.log('  4. Mobile theme settings');
    const mobileSettings = await mobilePage.$('button svg.lucide-settings');
    if (mobileSettings) {
      await mobileSettings.evaluateHandle(el => el.closest('button').click());
      await wait(1500);
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, '04-mobile-theme-settings.png'),
        fullPage: false 
      });
    }
    
    await mobilePage.close();
    
    // Capture desktop view (1920x1080)
    console.log('\n💻 Capturing DESKTOP screenshots (1920x1080)...');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1920, height: 1080 });
    
    // Desktop - Homepage dark theme
    console.log('  1. Desktop homepage (dark theme)');
    await desktopPage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, '05-desktop-dark-homepage.png'),
      fullPage: true 
    });
    
    // Desktop - Category dropdown
    console.log('  2. Desktop category filter');
    const categoryButton = await desktopPage.$('button[role="combobox"]');
    if (categoryButton) {
      await categoryButton.click();
      await wait(1000);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, '06-desktop-category-dropdown.png'),
        fullPage: false 
      });
      await desktopPage.keyboard.press('Escape');
    }
    
    // Desktop - Resource cards detail
    console.log('  3. Desktop resource cards');
    await wait(1000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, '07-desktop-resource-cards.png'),
      fullPage: false,
      clip: { x: 0, y: 200, width: 1920, height: 800 }
    });
    
    // Desktop - Color Palette page
    console.log('  4. Desktop color palette page');
    await desktopPage.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, '08-desktop-color-palette.png'),
      fullPage: true 
    });
    
    // Desktop - Theme settings and switch to light
    console.log('  5. Desktop switching to light theme');
    const desktopSettings = await desktopPage.$('button svg.lucide-settings');
    if (desktopSettings) {
      await desktopSettings.evaluateHandle(el => el.closest('button').click());
      await wait(1000);
      
      // Try to click Light theme button
      await desktopPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const lightBtn = buttons.find(b => b.textContent?.includes('Light'));
        if (lightBtn) lightBtn.click();
      });
      await wait(2000);
      
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, '09-desktop-light-theme-settings.png'),
        fullPage: false 
      });
      
      // Close settings
      await desktopPage.keyboard.press('Escape');
    }
    
    // Desktop - Homepage in light theme
    console.log('  6. Desktop homepage (light theme)');
    await desktopPage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, '10-desktop-light-homepage.png'),
      fullPage: true 
    });
    
    // Desktop - Search in light theme
    console.log('  7. Desktop search (light theme)');
    const desktopSearch = await desktopPage.$('input[placeholder*="Search"], input[type="search"]');
    if (desktopSearch) {
      await desktopSearch.type('streaming');
      await wait(1500);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, '11-desktop-light-search.png'),
        fullPage: false 
      });
    }
    
    await desktopPage.close();
    
    console.log('\n✅ Screenshot capture complete!\n');
    
    // List all screenshots
    const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    console.log('📁 Generated screenshots:');
    screenshots.sort().forEach(file => {
      const stats = fs.statSync(path.join(screenshotsDir, file));
      const size = (stats.size / 1024).toFixed(1);
      console.log(`   ✓ ${file} (${size} KB)`);
    });
    
    console.log(`\n📍 Total: ${screenshots.length} screenshots captured`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the capture
captureScreenshots().catch(console.error);