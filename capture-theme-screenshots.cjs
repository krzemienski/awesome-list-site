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

// 5 Different theme configurations to capture
const themes = [
  { name: 'Violet', value: 'violet', mode: 'dark', color: '#8b5cf6' },
  { name: 'Blue', value: 'blue', mode: 'light', color: '#3b82f6' },
  { name: 'Rose', value: 'rose', mode: 'dark', color: '#f43f5e' },
  { name: 'Green', value: 'green', mode: 'light', color: '#22c55e' },
  { name: 'Orange', value: 'orange', mode: 'dark', color: '#f97316' }
];

async function applyTheme(page, theme) {
  // Apply theme via localStorage and DOM manipulation
  await page.evaluate((themeConfig) => {
    // Set theme mode (light/dark)
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeConfig.mode);
    localStorage.setItem('ui-theme', themeConfig.mode);
    
    // Set theme variant
    localStorage.setItem('theme-variant', themeConfig.value);
    localStorage.setItem('theme-preferences', JSON.stringify({
      theme: themeConfig.value,
      mode: themeConfig.mode
    }));
    
    // Trigger theme change event if needed
    window.dispatchEvent(new Event('storage'));
  }, theme);
  
  await wait(1000);
}

async function captureThemeScreenshots() {
  console.log('🎨 CAPTURING 5 DIFFERENT THEME VARIATIONS\n');
  console.log('=' .repeat(60) + '\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  let screenshotCount = 0;
  const screenshots = [];
  
  try {
    // ========================================
    // DESKTOP SCREENSHOTS (1920x1080)
    // ========================================
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1920, height: 1080 });
    
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      console.log(`\n🎨 THEME ${i + 1}: ${theme.name.toUpperCase()} (${theme.mode} mode)\n`);
      
      // Homepage with theme
      console.log(`  ✓ Homepage - ${theme.name} ${theme.mode} theme`);
      await desktopPage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
      await wait(2000);
      await applyTheme(desktopPage, theme);
      await desktopPage.reload({ waitUntil: 'networkidle0' });
      await wait(3000);
      
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-${theme.value}-${theme.mode}-homepage.png`),
        fullPage: true 
      });
      screenshots.push(`Desktop ${theme.name} ${theme.mode}: Homepage`);
      
      // Resource Cards Section
      console.log(`  ✓ Resource cards - ${theme.name} theme`);
      await desktopPage.evaluate(() => window.scrollTo(0, 400));
      await wait(1000);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-${theme.value}-${theme.mode}-resources.png`),
        fullPage: false 
      });
      screenshots.push(`Desktop ${theme.name} ${theme.mode}: Resources`);
      
      // Search with theme
      console.log(`  ✓ Search dialog - ${theme.name} theme`);
      await desktopPage.keyboard.press('/');
      await wait(1000);
      await desktopPage.keyboard.type('streaming');
      await wait(2000);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-${theme.value}-${theme.mode}-search.png`),
        fullPage: false 
      });
      screenshots.push(`Desktop ${theme.name} ${theme.mode}: Search`);
      await desktopPage.keyboard.press('Escape');
      
      // Category Dropdown
      console.log(`  ✓ Category filter - ${theme.name} theme`);
      await desktopPage.evaluate(() => window.scrollTo(0, 0));
      await wait(500);
      const categoryBtn = await desktopPage.$('button[role="combobox"]');
      if (categoryBtn) {
        await categoryBtn.click();
        await wait(1500);
        await desktopPage.screenshot({ 
          path: path.join(screenshotsDir, `${++screenshotCount}-desktop-${theme.value}-${theme.mode}-categories.png`),
          fullPage: false 
        });
        screenshots.push(`Desktop ${theme.name} ${theme.mode}: Categories`);
        await desktopPage.keyboard.press('Escape');
      }
      
      // Color Palette Page
      console.log(`  ✓ Color Palette Generator - ${theme.name} theme`);
      await desktopPage.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
      await wait(2000);
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-desktop-${theme.value}-${theme.mode}-palette.png`),
        fullPage: true 
      });
      screenshots.push(`Desktop ${theme.name} ${theme.mode}: Color Palette`);
      
      // Theme Selector Panel Open (showing current theme selected)
      console.log(`  ✓ Theme selector panel - ${theme.name} selected`);
      await desktopPage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
      await wait(2000);
      
      // Click the theme selector button
      const themeButton = await desktopPage.$('button svg.lucide-palette');
      if (themeButton) {
        await themeButton.evaluateHandle(el => el.closest('button')?.click());
        await wait(1500);
        await desktopPage.screenshot({ 
          path: path.join(screenshotsDir, `${++screenshotCount}-desktop-${theme.value}-${theme.mode}-theme-panel.png`),
          fullPage: false 
        });
        screenshots.push(`Desktop ${theme.name} ${theme.mode}: Theme Panel`);
        await desktopPage.keyboard.press('Escape');
      }
    }
    
    await desktopPage.close();
    
    // ========================================
    // MOBILE SCREENSHOTS (390x844)
    // ========================================
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      console.log(`\n📱 MOBILE THEME ${i + 1}: ${theme.name.toUpperCase()} (${theme.mode} mode)\n`);
      
      // Mobile Homepage with theme
      console.log(`  ✓ Mobile Homepage - ${theme.name} ${theme.mode} theme`);
      await mobilePage.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
      await wait(2000);
      await applyTheme(mobilePage, theme);
      await mobilePage.reload({ waitUntil: 'networkidle0' });
      await wait(3000);
      
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-mobile-${theme.value}-${theme.mode}-homepage.png`),
        fullPage: true 
      });
      screenshots.push(`Mobile ${theme.name} ${theme.mode}: Homepage`);
      
      // Mobile Resources
      console.log(`  ✓ Mobile Resources - ${theme.name} theme`);
      await mobilePage.evaluate(() => window.scrollTo(0, 400));
      await wait(1000);
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-mobile-${theme.value}-${theme.mode}-resources.png`),
        fullPage: false 
      });
      screenshots.push(`Mobile ${theme.name} ${theme.mode}: Resources`);
      
      // Mobile Search
      console.log(`  ✓ Mobile Search - ${theme.name} theme`);
      await mobilePage.evaluate(() => window.scrollTo(0, 0));
      await wait(500);
      const mobileSearchBtn = await mobilePage.$('svg.lucide-search');
      if (mobileSearchBtn) {
        await mobileSearchBtn.evaluateHandle(el => el.closest('button')?.click());
        await wait(1500);
        await mobilePage.keyboard.type('codec');
        await wait(1500);
        await mobilePage.screenshot({ 
          path: path.join(screenshotsDir, `${++screenshotCount}-mobile-${theme.value}-${theme.mode}-search.png`),
          fullPage: false 
        });
        screenshots.push(`Mobile ${theme.name} ${theme.mode}: Search`);
        await mobilePage.keyboard.press('Escape');
      }
      
      // Mobile Color Palette
      console.log(`  ✓ Mobile Color Palette - ${theme.name} theme`);
      await mobilePage.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
      await wait(2000);
      await mobilePage.screenshot({ 
        path: path.join(screenshotsDir, `${++screenshotCount}-mobile-${theme.value}-${theme.mode}-palette.png`),
        fullPage: true 
      });
      screenshots.push(`Mobile ${theme.name} ${theme.mode}: Color Palette`);
    }
    
    await mobilePage.close();
    
    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ THEME SCREENSHOTS CAPTURE COMPLETE!\n');
    console.log('📁 Screenshots Generated by Theme:\n');
    
    // Group screenshots by theme
    for (const theme of themes) {
      console.log(`\n🎨 ${theme.name} (${theme.mode} mode):`);
      const themeScreens = screenshots.filter(s => s.includes(theme.name));
      themeScreens.forEach((screen, idx) => {
        console.log(`   ${idx + 1}. ${screen}`);
      });
    }
    
    console.log(`\n📍 Total: ${screenshotCount} screenshots`);
    console.log(`🎨 Themes: ${themes.map(t => `${t.name} (${t.mode})`).join(', ')}`);
    console.log(`📂 Location: ${screenshotsDir}\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run
captureThemeScreenshots().catch(console.error);