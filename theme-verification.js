// Theme verification script
import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log('🚀 Starting theme verification...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    // Test 1: Homepage with default rose dark theme
    console.log('📸 Testing homepage with default rose dark theme...');
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Check theme attributes
    const themeData = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        hasDataTheme: html.getAttribute('data-theme'),
        hasDarkClass: html.classList.contains('dark'),
        primaryColor: getComputedStyle(document.body).getPropertyValue('--primary').trim(),
        backgroundColor: getComputedStyle(document.body).backgroundColor
      };
    });
    
    console.log('🎨 Theme data:', themeData);
    await page.screenshot({ path: '/tmp/homepage-rose-dark.png', fullPage: false });
    
    // Test 2: Color Palette page
    console.log('📸 Testing Color Palette page...');
    await page.goto('http://localhost:5000/color-palette', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: '/tmp/color-palette-rose-dark.png', fullPage: false });
    
    // Test 3: Try to find and click theme switcher (if available)
    console.log('🔄 Looking for theme switcher...');
    try {
      const settingsButton = await page.$('button[aria-label*="Settings"], button:has(svg[data-lucide="settings"])');
      if (settingsButton) {
        console.log('⚙️ Found settings button, clicking...');
        await settingsButton.click();
        await page.waitForTimeout(1000); // Wait for dropdown/modal
        await page.screenshot({ path: '/tmp/theme-settings-modal.png', fullPage: false });
      } else {
        console.log('⚠️ Settings button not found, checking for other theme controls...');
      }
    } catch (e) {
      console.log('⚠️ Theme switcher interaction failed:', e.message);
    }
    
    console.log('✅ Theme verification completed successfully');
    console.log('📁 Screenshots saved to /tmp/');
    
  } catch (error) {
    console.error('❌ Error during theme verification:', error.message);
  } finally {
    await browser.close();
  }
})();