const puppeteer = require('puppeteer');

async function verifySiteReady() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('🔍 Testing application readiness...');
    
    // Navigate to the site
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    
    // Test 1: Check if the page loads
    const title = await page.title();
    console.log('✅ Page loads:', title);
    
    // Test 2: Check for theme system
    const themeSystem = await page.evaluate(() => {
      return {
        hasThemeProvider: !!document.querySelector('[class*="dark"]') || !!document.querySelector('[class*="light"]'),
        hasCSSVariables: !!getComputedStyle(document.documentElement).getPropertyValue('--background'),
        hasOKLCH: getComputedStyle(document.documentElement).getPropertyValue('--background').includes('oklch')
      };
    });
    
    console.log('🎨 Theme System:', themeSystem);
    
    // Test 3: Navigate to Color Palette page
    await page.click('a[href="/color-palette"]');
    await page.waitForSelector('[data-testid="theme-test"], .theme-test, h1', { timeout: 5000 });
    
    // Test 4: Check if components are rendered
    const componentsCount = await page.evaluate(() => {
      return {
        buttons: document.querySelectorAll('button').length,
        cards: document.querySelectorAll('[class*="card"]').length,
        inputs: document.querySelectorAll('input').length
      };
    });
    
    console.log('🧩 Components rendered:', componentsCount);
    
    // Test 5: Test theme switching (if Settings button exists)
    const settingsButton = await page.$('button[class*="Settings"], button[aria-label*="Settings"]');
    if (settingsButton) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
      console.log('⚙️  Theme settings accessible');
    }
    
    // Test 6: Check for 2,011 resources
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    const resourceCount = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/(\d+,?\d*)\s*(?:resources|video|items)/i);
      return match ? match[1].replace(',', '') : '0';
    });
    
    console.log('📚 Resources loaded:', resourceCount);
    
    // Final validation
    const isReady = themeSystem.hasThemeProvider && 
                   themeSystem.hasCSSVariables && 
                   parseInt(resourceCount) >= 2000;
    
    console.log('\n🎯 Site Readiness Report:');
    console.log('- Theme System:', themeSystem.hasThemeProvider ? '✅' : '❌');
    console.log('- OKLCH Colors:', themeSystem.hasOKLCH ? '✅' : '❌');
    console.log('- CSS Variables:', themeSystem.hasCSSVariables ? '✅' : '❌');
    console.log('- Resources:', parseInt(resourceCount) >= 2000 ? '✅' : '❌');
    console.log('- Components:', componentsCount.buttons > 0 ? '✅' : '❌');
    
    return {
      ready: isReady,
      details: {
        theme: themeSystem,
        components: componentsCount,
        resources: resourceCount
      }
    };
    
  } catch (error) {
    console.error('❌ Site verification failed:', error.message);
    return { ready: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  verifySiteReady().then(result => {
    console.log('\n📋 Final Result:', result.ready ? '✅ READY' : '❌ NOT READY');
    process.exit(result.ready ? 0 : 1);
  });
}

module.exports = { verifySiteReady };