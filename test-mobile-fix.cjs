const puppeteer = require('puppeteer');
const fs = require('fs');

async function testMobileFixes() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--font-render-hinting=none']
  });

  try {
    const page = await browser.newPage();
    
    // Set mobile viewport (iPhone 12 Pro)
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });
    
    console.log('Loading site...');
    await page.goto('http://localhost:5000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for resources to load
    await page.waitForSelector('[data-testid="resource-card"]', { timeout: 10000 });
    console.log('✅ Resources loaded');
    
    // Take mobile screenshot
    await page.screenshot({
      path: 'mobile-fix-test.png',
      fullPage: false
    });
    console.log('📸 Mobile screenshot saved');
    
    // Click category dropdown to test transparency issue
    const categoryDropdown = await page.$('[role="combobox"]');
    if (categoryDropdown) {
      await categoryDropdown.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({
        path: 'mobile-dropdown-test.png',
        fullPage: false
      });
      console.log('📸 Dropdown screenshot saved');
    }
    
    console.log('✅ Mobile testing complete');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testMobileFixes();
