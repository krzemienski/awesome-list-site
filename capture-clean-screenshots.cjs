const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Utility function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'final-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function captureAllScreenshots() {
  console.log('📸 COMPREHENSIVE SCREENSHOT CAPTURE - ALL COMPONENTS & THEMES\n');
  console.log('=' .repeat(60) + '\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  let count = 0;
  const screenshots = [];
  
  try {
    // ========================================
    // DESKTOP DARK THEME (1920x1080)
    // ========================================
    console.log('🖥️  DESKTOP - DARK THEME (1920x1080)\n');
    const desktop = await browser.newPage();
    await desktop.setViewport({ width: 1920, height: 1080 });
    
    // Homepage Full
    console.log('  ✓ Homepage - Full page with all resources');
    await desktop.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(3000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-dark-homepage-full.png`),
      fullPage: true 
    });
    screenshots.push('Desktop Dark: Homepage Full');
    
    // Resource Cards Section
    console.log('  ✓ Resource cards section');
    await desktop.evaluate(() => window.scrollTo(0, 300));
    await wait(1000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-dark-resources.png`),
      fullPage: false 
    });
    screenshots.push('Desktop Dark: Resource Cards');
    
    // Search Feature
    console.log('  ✓ Search dialog with results');
    await desktop.keyboard.press('/');
    await wait(1000);
    await desktop.keyboard.type('codec');
    await wait(2000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-dark-search.png`),
      fullPage: false 
    });
    screenshots.push('Desktop Dark: Search Results');
    await desktop.keyboard.press('Escape');
    
    // Category Dropdown
    console.log('  ✓ Category filter dropdown');
    await desktop.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
    const categoryBtn = await desktop.$('button[role="combobox"]');
    if (categoryBtn) {
      await categoryBtn.click();
      await wait(1500);
      await desktop.screenshot({ 
        path: path.join(screenshotsDir, `${++count}-desktop-dark-categories.png`),
        fullPage: false 
      });
      screenshots.push('Desktop Dark: Category Dropdown');
      await desktop.keyboard.press('Escape');
    }
    
    // Color Palette Page
    console.log('  ✓ Color Palette Generator page');
    await desktop.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-dark-color-palette.png`),
      fullPage: true 
    });
    screenshots.push('Desktop Dark: Color Palette Generator');
    
    // Category Page
    console.log('  ✓ Category page with subcategories');
    await desktop.goto('http://localhost:5000/category/codecs', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-dark-category-page.png`),
      fullPage: true 
    });
    screenshots.push('Desktop Dark: Category Page');
    
    // ========================================
    // DESKTOP LIGHT THEME (1920x1080)
    // ========================================
    console.log('\n🖥️  DESKTOP - LIGHT THEME (1920x1080)\n');
    
    // Switch to Light Theme
    await desktop.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktop.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('ui-theme', 'light');
    });
    await wait(1000);
    
    // Homepage Light
    console.log('  ✓ Homepage - Light theme full page');
    await desktop.reload({ waitUntil: 'networkidle0' });
    await wait(2000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-light-homepage-full.png`),
      fullPage: true 
    });
    screenshots.push('Desktop Light: Homepage Full');
    
    // Resource Cards Light
    console.log('  ✓ Resource cards - Light theme');
    await desktop.evaluate(() => window.scrollTo(0, 400));
    await wait(1000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-light-resources.png`),
      fullPage: false 
    });
    screenshots.push('Desktop Light: Resource Cards');
    
    // Search Light Theme
    console.log('  ✓ Search - Light theme');
    await desktop.keyboard.press('/');
    await wait(1000);
    await desktop.keyboard.type('streaming');
    await wait(2000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-light-search.png`),
      fullPage: false 
    });
    screenshots.push('Desktop Light: Search');
    await desktop.keyboard.press('Escape');
    
    // Color Palette Light
    console.log('  ✓ Color Palette - Light theme');
    await desktop.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
    await wait(2000);
    await desktop.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-desktop-light-color-palette.png`),
      fullPage: true 
    });
    screenshots.push('Desktop Light: Color Palette');
    
    await desktop.close();
    
    // ========================================
    // MOBILE DARK THEME (390x844)
    // ========================================
    console.log('\n📱 MOBILE - DARK THEME (390x844 - iPhone 14 Pro)\n');
    const mobile = await browser.newPage();
    await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    
    // Mobile Homepage Dark
    console.log('  ✓ Homepage - Mobile dark theme');
    await mobile.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobile.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('ui-theme', 'dark');
    });
    await wait(1000);
    await mobile.reload({ waitUntil: 'networkidle0' });
    await wait(2000);
    await mobile.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-mobile-dark-homepage.png`),
      fullPage: true 
    });
    screenshots.push('Mobile Dark: Homepage');
    
    // Mobile Resource Cards
    console.log('  ✓ Resource cards - Mobile view');
    await mobile.evaluate(() => window.scrollTo(0, 400));
    await wait(1000);
    await mobile.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-mobile-dark-resources.png`),
      fullPage: false 
    });
    screenshots.push('Mobile Dark: Resources');
    
    // Mobile Search
    console.log('  ✓ Search - Mobile interface');
    await mobile.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
    const mobileSearchBtn = await mobile.$('svg.lucide-search');
    if (mobileSearchBtn) {
      await mobileSearchBtn.evaluateHandle(el => el.closest('button')?.click());
      await wait(1500);
      await mobile.keyboard.type('ffmpeg');
      await wait(1500);
      await mobile.screenshot({ 
        path: path.join(screenshotsDir, `${++count}-mobile-dark-search.png`),
        fullPage: false 
      });
      screenshots.push('Mobile Dark: Search');
      await mobile.keyboard.press('Escape');
    }
    
    // Mobile Category Filter
    console.log('  ✓ Category filter - Mobile');
    const mobileCategoryBtn = await mobile.$('button[role="combobox"]');
    if (mobileCategoryBtn) {
      await mobileCategoryBtn.click();
      await wait(1500);
      await mobile.screenshot({ 
        path: path.join(screenshotsDir, `${++count}-mobile-dark-categories.png`),
        fullPage: false 
      });
      screenshots.push('Mobile Dark: Categories');
      await mobile.keyboard.press('Escape');
    }
    
    // Mobile Color Palette
    console.log('  ✓ Color Palette - Mobile');
    await mobile.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobile.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-mobile-dark-color-palette.png`),
      fullPage: true 
    });
    screenshots.push('Mobile Dark: Color Palette');
    
    // ========================================
    // MOBILE LIGHT THEME (390x844)
    // ========================================
    console.log('\n📱 MOBILE - LIGHT THEME (390x844)\n');
    
    // Switch to Light Theme
    console.log('  ✓ Homepage - Mobile light theme');
    await mobile.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobile.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('ui-theme', 'light');
    });
    await wait(1000);
    await mobile.reload({ waitUntil: 'networkidle0' });
    await wait(2000);
    await mobile.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-mobile-light-homepage.png`),
      fullPage: true 
    });
    screenshots.push('Mobile Light: Homepage');
    
    // Mobile Resources Light
    console.log('  ✓ Resource cards - Mobile light');
    await mobile.evaluate(() => window.scrollTo(0, 400));
    await wait(1000);
    await mobile.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-mobile-light-resources.png`),
      fullPage: false 
    });
    screenshots.push('Mobile Light: Resources');
    
    // Mobile Category Page Light
    console.log('  ✓ Category page - Mobile light');
    await mobile.goto('http://localhost:5000/category/streaming', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobile.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-mobile-light-category.png`),
      fullPage: true 
    });
    screenshots.push('Mobile Light: Category Page');
    
    // Mobile Color Palette Light
    console.log('  ✓ Color Palette - Mobile light');
    await mobile.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle0' });
    await wait(2000);
    await mobile.screenshot({ 
      path: path.join(screenshotsDir, `${++count}-mobile-light-color-palette.png`),
      fullPage: true 
    });
    screenshots.push('Mobile Light: Color Palette');
    
    await mobile.close();
    
    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ SCREENSHOT CAPTURE COMPLETE!\n');
    console.log('📁 Screenshots Generated:\n');
    
    screenshots.forEach((name, idx) => {
      const file = `${idx + 1}-${name.toLowerCase().replace(/[:\s]+/g, '-')}.png`;
      const filePath = path.join(screenshotsDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(1);
        console.log(`   ${idx + 1}. ${name} (${size} KB)`);
      }
    });
    
    console.log(`\n📍 Total: ${count} screenshots`);
    console.log(`📂 Location: ${screenshotsDir}\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run
captureAllScreenshots().catch(console.error);