const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Utility function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'comprehensive-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function captureComprehensiveScreenshots() {
  console.log('📸 Starting COMPREHENSIVE screenshot capture of ALL components and themes...\n');
  
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
  
  let screenshotCount = 0;
  
  try {
    // ========================================
    // DESKTOP SCREENSHOTS (1920x1080)
    // ========================================
    console.log('💻 DESKTOP SCREENSHOTS (1920x1080)\n');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1920, height: 1080 });
    
    // 1. Homepage - Dark Theme (Default)
    console.log('  1. Homepage - Dark Theme with all resources loaded');
    await desktopPage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(3000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-desktop-dark-homepage-full.png`),
      fullPage: true 
    });
    
    // 2. Resource Cards Detail View
    console.log('  2. Resource Cards - Detailed view with hover states');
    await desktopPage.evaluate(() => window.scrollTo(0, 500));
    await wait(1000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-desktop-dark-resource-cards.png`),
      fullPage: false 
    });
    
    // 3. Category Dropdown Open
    console.log('  3. Category Filter Dropdown - All categories visible');
    await desktopPage.evaluate(() => window.scrollTo(0, 0));
    const categoryDropdown = await desktopPage.$('button[role="combobox"]');
    if (categoryDropdown) {
      await categoryDropdown.click();
      await wait(1500);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-dark-category-dropdown.png`),
        fullPage: false 
      });
      await desktopPage.keyboard.press('Escape');
    }
    
    // 4. Search Dialog with Results
    console.log('  4. Search Dialog - With live search results');
    await desktopPage.keyboard.press('/');
    await wait(1000);
    await desktopPage.keyboard.type('codec');
    await wait(2000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-desktop-dark-search-results.png`),
      fullPage: false 
    });
    await desktopPage.keyboard.press('Escape');
    
    // 5. Sidebar Customizer
    console.log('  5. Sidebar Customizer - Settings panel open');
    const sidebarSettings = await desktopPage.$('button svg.lucide-settings');
    if (sidebarSettings) {
      await sidebarSettings.evaluateHandle(el => el.closest('button').click());
      await wait(1500);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-dark-sidebar-customizer.png`),
        fullPage: false 
      });
      await desktopPage.keyboard.press('Escape');
    }
    
    // 6. Theme Selector Dialog
    console.log('  6. Theme Selector - Theme options panel');
    const themeButton = await desktopPage.$('button[aria-label*="theme"], button:has(svg.lucide-palette)');
    if (themeButton) {
      await themeButton.click();
      await wait(1500);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-dark-theme-selector.png`),
        fullPage: false 
      });
    }
    
    // 7. Switch to Light Theme
    console.log('  7. Switching to Light Theme');
    await desktopPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const lightBtn = buttons.find(b => b.textContent?.toLowerCase().includes('light'));
      if (lightBtn) lightBtn.click();
    });
    await wait(2000);
    await desktopPage.keyboard.press('Escape');
    
    // 8. Homepage - Light Theme
    console.log('  8. Homepage - Light Theme (full page)');
    await desktopPage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-desktop-light-homepage-full.png`),
      fullPage: true 
    });
    
    // 9. Resource Tooltip/Popover
    console.log('  9. Resource Tooltip - Hovering over resource');
    const firstResource = await desktopPage.$('[data-testid="resource-card"]');
    if (firstResource) {
      await firstResource.hover();
      await wait(1500);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-light-resource-tooltip.png`),
        fullPage: false 
      });
    }
    
    // 10. Color Palette Generator Page
    console.log('  10. Color Palette Generator - Full page');
    await desktopPage.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-desktop-light-color-palette.png`),
      fullPage: true 
    });
    
    // 11. AI Palette Generation Dialog
    console.log('  11. AI Palette Generation - Input dialog');
    const generateButton = await desktopPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent?.includes('Generate') || b.textContent?.includes('AI'));
      if (btn) btn.click();
      return !!btn;
    });
    if (generateButton) {
      await wait(1500);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-light-ai-palette-dialog.png`),
        fullPage: false 
      });
      await desktopPage.keyboard.press('Escape');
    }
    
    // 12. Category Page with Subcategories
    console.log('  12. Category Page - With subcategories expanded');
    await desktopPage.goto('http://localhost:5000/category/codecs', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktopPage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-desktop-light-category-page.png`),
      fullPage: true 
    });
    
    // 13. Analytics Dashboard
    console.log('  13. Analytics Dashboard - If available');
    const analyticsButton = await desktopPage.$('button:has-text("Analytics"), button:has(svg.lucide-bar-chart)');
    if (analyticsButton) {
      await analyticsButton.click();
      await wait(2000);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-light-analytics-dashboard.png`),
        fullPage: false 
      });
      await desktopPage.keyboard.press('Escape');
    }
    
    await desktopPage.close();
    
    // ========================================
    // MOBILE SCREENSHOTS (390x844 - iPhone 14 Pro)
    // ========================================
    console.log('\n📱 MOBILE SCREENSHOTS (390x844 - iPhone 14 Pro)\n');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    
    // 14. Mobile Homepage - Dark Theme
    console.log('  14. Mobile Homepage - Dark Theme');
    await mobilePage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    // Ensure dark theme
    await mobilePage.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await wait(1000);
    await mobilePage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-mobile-dark-homepage.png`),
      fullPage: true 
    });
    
    // 15. Mobile Menu/Hamburger Open
    console.log('  15. Mobile Menu - Navigation drawer');
    const mobileMenu = await mobilePage.$('button[aria-label*="menu"], button:has(svg.lucide-menu)');
    if (mobileMenu) {
      await mobileMenu.click();
      await wait(1500);
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-mobile-dark-menu-open.png`),
        fullPage: false 
      });
      // Close menu
      const closeButton = await mobilePage.$('button[aria-label*="close"], button:has(svg.lucide-x)');
      if (closeButton) await closeButton.click();
      await wait(500);
    }
    
    // 16. Mobile Search
    console.log('  16. Mobile Search - Search interface');
    const searchButton = await mobilePage.$('button:has(svg.lucide-search)');
    if (searchButton) {
      await searchButton.click();
      await wait(1000);
      await mobilePage.keyboard.type('streaming');
      await wait(1500);
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-mobile-dark-search.png`),
        fullPage: false 
      });
      await mobilePage.keyboard.press('Escape');
    }
    
    // 17. Mobile Category Filter
    console.log('  17. Mobile Category Filter');
    const mobileCategoryButton = await mobilePage.$('button[role="combobox"]');
    if (mobileCategoryButton) {
      await mobileCategoryButton.click();
      await wait(1500);
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-mobile-dark-category-filter.png`),
        fullPage: false 
      });
      await mobilePage.keyboard.press('Escape');
    }
    
    // 18. Mobile Resource Cards
    console.log('  18. Mobile Resource Cards - Scrolled view');
    await mobilePage.evaluate(() => window.scrollTo(0, 400));
    await wait(1000);
    await mobilePage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-mobile-dark-resource-cards.png`),
      fullPage: false 
    });
    
    // 19. Mobile Light Theme
    console.log('  19. Mobile Homepage - Light Theme');
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    await wait(2000);
    await mobilePage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobilePage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-mobile-light-homepage.png`),
      fullPage: true 
    });
    
    // 20. Mobile Color Palette Page
    console.log('  20. Mobile Color Palette Generator');
    await mobilePage.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobilePage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-mobile-light-color-palette.png`),
      fullPage: true 
    });
    
    // 21. Mobile Theme Settings
    console.log('  21. Mobile Theme Settings');
    const mobileThemeButton = await mobilePage.$('button[aria-label*="theme"], button:has(svg.lucide-palette)');
    if (mobileThemeButton) {
      await mobileThemeButton.click();
      await wait(1500);
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-mobile-light-theme-settings.png`),
        fullPage: false 
      });
      await mobilePage.keyboard.press('Escape');
    }
    
    // 22. Mobile Category Page
    console.log('  22. Mobile Category Page');
    await mobilePage.goto('http://localhost:5000/category/streaming', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobilePage.screenshot({ 
      path: path.join(screenshotsDir, `${++screenshotCount}-mobile-light-category-page.png`),
      fullPage: true 
    });
    
    await mobilePage.close();
    
    console.log('\n✅ COMPREHENSIVE SCREENSHOT CAPTURE COMPLETE!\n');
    
    // List all screenshots
    const screenshots = fs.readdirSync(screenshotsDir)
      .filter(f => f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/^\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/^\d+/)?.[0] || '0');
        return numA - numB;
      });
    
    console.log('📁 Generated Screenshots:\n');
    screenshots.forEach(file => {
      const stats = fs.statSync(path.join(screenshotsDir, file));
      const size = (stats.size / 1024).toFixed(1);
      const name = file.replace(/^\d+-/, '').replace('.png', '').replace(/-/g, ' ');
      console.log(`   ✓ ${name} (${size} KB)`);
    });
    
    console.log(`\n📍 Total: ${screenshots.length} comprehensive screenshots captured`);
    console.log(`📂 Location: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the capture
captureComprehensiveScreenshots().catch(console.error);