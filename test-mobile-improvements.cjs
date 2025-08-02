const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    console.log('Testing mobile improvements...');
    
    // Test mobile sidebar with overlay
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 667 });
    await mobilePage.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Check if menu button exists
    const menuButton = await mobilePage.$('[aria-label="Open navigation menu"]');
    if (menuButton) {
      console.log('✅ Mobile menu button found');
      
      // Click to open sidebar
      await menuButton.click();
      await mobilePage.waitForTimeout(500);
      
      // Check if overlay exists
      const overlay = await mobilePage.$('[data-testid="sidebar-overlay"]');
      if (overlay) {
        console.log('✅ Mobile overlay is displayed when sidebar is open');
        
        // Test clicking overlay closes sidebar
        await overlay.click();
        await mobilePage.waitForTimeout(300);
        
        const sidebarState = await mobilePage.$eval('aside[role="navigation"]', el => el.getAttribute('data-state'));
        console.log(`✅ Sidebar state after overlay click: ${sidebarState}`);
      } else {
        console.log('❌ Mobile overlay not found');
      }
    } else {
      console.log('❌ Mobile menu button not found');
    }
    
    // Test data loading
    console.log('\nTesting data loading...');
    const response = await mobilePage.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/awesome-list');
      return await res.json();
    });
    
    console.log(`✅ API returned ${response.resources.length} resources`);
    console.log(`✅ API returned ${response.categories.length} categories`);
    
    // Check category names
    const firstCategory = response.categories[0];
    if (firstCategory && firstCategory.name) {
      console.log(`✅ First category has name: "${firstCategory.name}"`);
    } else {
      console.log('❌ First category missing name');
    }
    
    // Test desktop view
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1920, height: 1080 });
    await desktopPage.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Check if resources are displayed
    const resourceCards = await desktopPage.$$('[data-testid="resource-card"]');
    console.log(`\n✅ Found ${resourceCards.length} resource cards on page`);
    
    // Save screenshots
    await mobilePage.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    await mobilePage.click('[aria-label="Open navigation menu"]');
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({ path: 'mobile-with-overlay.png' });
    console.log('\n✅ Mobile screenshot saved as mobile-with-overlay.png');
    
    await desktopPage.screenshot({ path: 'desktop-view.png' });
    console.log('✅ Desktop screenshot saved as desktop-view.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();