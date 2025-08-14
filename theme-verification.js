// Simple theme verification script
const puppeteer = require('puppeteer');

async function verifyTheme() {
  try {
    const browser = await puppeteer.launch({ 
      headless: false,  // Show browser for visual verification
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('Navigating to application...');
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'test-screenshots/01-homepage.png', fullPage: true });
    console.log('Homepage screenshot saved');
    
    // Navigate to Color Palette page
    await page.click('a[href="/color-palette"]');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // Take screenshot of Color Palette page
    await page.screenshot({ path: 'test-screenshots/02-color-palette.png', fullPage: true });
    console.log('Color Palette page screenshot saved');
    
    // Check for Settings button and click it
    const settingsButton = await page.$('button svg[class*="lucide-settings"], button[aria-label*="Settings"]');
    if (settingsButton) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/03-theme-settings.png', fullPage: true });
      console.log('Theme settings screenshot saved');
    }
    
    console.log('Theme verification complete - check test-screenshots folder');
    await browser.close();
    
    return true;
  } catch (error) {
    console.error('Theme verification failed:', error.message);
    return false;
  }
}

// Run verification
verifyTheme().then(success => {
  process.exit(success ? 0 : 1);
});