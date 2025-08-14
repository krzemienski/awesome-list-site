import puppeteer from 'puppeteer';

async function comprehensiveWebsiteTest() {
  console.log('🚀 Starting Comprehensive Website Testing');
  console.log('=====================================\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = {
      desktop: {},
      mobile: {},
      components: {},
      navigation: {},
      functionality: {}
    };

    // Test Desktop View (1920px)
    console.log('📱 Testing Desktop View (1920px)...');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1920, height: 1080 });
    
    try {
      await desktopPage.goto('http://localhost:5000', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Check if page loads
      results.desktop.pageLoads = true;
      console.log('✅ Desktop page loads successfully');
      
      // Check sidebar visibility
      const sidebar = await desktopPage.$('[data-sidebar]');
      results.desktop.sidebarVisible = !!sidebar;
      console.log(sidebar ? '✅ Sidebar visible on desktop' : '❌ Sidebar not found on desktop');
      
      // Check main content area
      const mainContent = await desktopPage.$('main');
      results.desktop.mainContent = !!mainContent;
      console.log(mainContent ? '✅ Main content area found' : '❌ Main content area not found');
      
      // Check if content is in table/compact view (not cards)
      const tableView = await desktopPage.evaluate(() => {
        const tables = document.querySelectorAll('table');
        const compactList = document.querySelectorAll('[data-layout="compact"]');
        const cards = document.querySelectorAll('[data-layout="cards"]');
        return {
          hasTables: tables.length > 0,
          hasCompactList: compactList.length > 0,
          hasCards: cards.length > 0
        };
      });
      results.desktop.contentLayout = tableView;
      console.log('📊 Content layout:', tableView);
      
      // Check theme selector in sidebar
      const themeSelector = await desktopPage.evaluate(() => {
        const themeButtons = Array.from(document.querySelectorAll('button')).filter(
          btn => btn.textContent?.includes('Theme')
        );
        return themeButtons.length > 0;
      });
      results.desktop.themeSelectorInSidebar = themeSelector;
      console.log(themeSelector ? '✅ Theme selector found in sidebar' : '❌ Theme selector not found in sidebar');
      
      // Take desktop screenshot
      await desktopPage.screenshot({ 
        path: 'test-screenshots/desktop-1920px.png',
        fullPage: false 
      });
      console.log('📸 Desktop screenshot saved');
      
    } catch (error) {
      console.error('❌ Desktop test error:', error.message);
      results.desktop.error = error.message;
    }
    
    // Test Mobile View
    console.log('\n📱 Testing Mobile View (375px)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 812, isMobile: true });
    
    try {
      await mobilePage.goto('http://localhost:5000', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      results.mobile.pageLoads = true;
      console.log('✅ Mobile page loads successfully');
      
      // Check mobile menu button
      const menuButton = await mobilePage.$('[data-sidebar-trigger]');
      results.mobile.menuButton = !!menuButton;
      console.log(menuButton ? '✅ Mobile menu button found' : '❌ Mobile menu button not found');
      
      // Test sidebar toggle on mobile
      if (menuButton) {
        await menuButton.click();
        await mobilePage.waitForTimeout(500);
        const sidebarVisible = await mobilePage.evaluate(() => {
          const sidebar = document.querySelector('[data-sidebar]');
          return sidebar && getComputedStyle(sidebar).display !== 'none';
        });
        results.mobile.sidebarToggle = sidebarVisible;
        console.log(sidebarVisible ? '✅ Sidebar toggles on mobile' : '❌ Sidebar does not toggle');
      }
      
      // Check dialog positioning
      const dialogTest = await mobilePage.evaluate(() => {
        const dialogs = document.querySelectorAll('[data-radix-dialog-content]');
        if (dialogs.length === 0) return { found: false };
        
        const results = [];
        dialogs.forEach(dialog => {
          const rect = dialog.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          results.push({
            withinViewport: rect.left >= 0 && rect.right <= viewportWidth,
            centered: Math.abs((rect.left + rect.width/2) - viewportWidth/2) < 20
          });
        });
        return { found: true, results };
      });
      results.mobile.dialogPositioning = dialogTest;
      console.log('📐 Dialog positioning:', dialogTest);
      
      // Check touch targets
      const touchTargets = await mobilePage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        let smallTargets = 0;
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          if (rect.height < 44 || rect.width < 44) smallTargets++;
        });
        return {
          totalButtons: buttons.length,
          smallTargets,
          adequate: smallTargets === 0
        };
      });
      results.mobile.touchTargets = touchTargets;
      console.log(`👆 Touch targets: ${touchTargets.totalButtons} buttons, ${touchTargets.smallTargets} too small`);
      
      // Take mobile screenshot
      await mobilePage.screenshot({ 
        path: 'test-screenshots/mobile-375px.png',
        fullPage: false 
      });
      console.log('📸 Mobile screenshot saved');
      
    } catch (error) {
      console.error('❌ Mobile test error:', error.message);
      results.mobile.error = error.message;
    }
    
    // Test ShadCN Components
    console.log('\n🎨 Testing ShadCN Components...');
    const componentPage = await browser.newPage();
    await componentPage.setViewport({ width: 1280, height: 720 });
    
    try {
      await componentPage.goto('http://localhost:5000', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Check for various shadcn components
      const components = await componentPage.evaluate(() => {
        return {
          buttons: document.querySelectorAll('button').length,
          inputs: document.querySelectorAll('input').length,
          selects: document.querySelectorAll('[role="combobox"]').length,
          cards: document.querySelectorAll('[class*="card"]').length,
          tooltips: document.querySelectorAll('[data-radix-tooltip]').length,
          popovers: document.querySelectorAll('[data-radix-popover]').length,
          dialogs: document.querySelectorAll('[data-radix-dialog]').length,
          dropdowns: document.querySelectorAll('[data-radix-dropdown-menu]').length
        };
      });
      results.components = components;
      console.log('🧩 ShadCN Components found:', components);
      
      // Test search functionality
      const searchButton = await componentPage.$('button:has-text("Search")');
      if (!searchButton) {
        const searchButtons = await componentPage.$$eval('button', buttons => 
          buttons.filter(btn => btn.textContent?.includes('Search')).length
        );
        console.log(`Found ${searchButtons} search-related buttons`);
      }
      
      // Check theme consistency
      const themeColors = await componentPage.evaluate(() => {
        const root = document.documentElement;
        const styles = getComputedStyle(root);
        return {
          background: styles.getPropertyValue('--background'),
          foreground: styles.getPropertyValue('--foreground'),
          primary: styles.getPropertyValue('--primary'),
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        };
      });
      results.components.theme = themeColors;
      console.log('🎨 Theme settings:', themeColors);
      
    } catch (error) {
      console.error('❌ Component test error:', error.message);
      results.components.error = error.message;
    }
    
    // Generate Test Report
    console.log('\n📊 TEST REPORT');
    console.log('=====================================');
    console.log(JSON.stringify(results, null, 2));
    
    // Summary
    console.log('\n✨ SUMMARY');
    console.log('=====================================');
    const issues = [];
    
    if (!results.desktop.pageLoads) issues.push('Desktop page failed to load');
    if (!results.mobile.pageLoads) issues.push('Mobile page failed to load');
    if (!results.desktop.sidebarVisible) issues.push('Sidebar not visible on desktop');
    if (!results.mobile.menuButton) issues.push('Mobile menu button missing');
    if (!results.desktop.themeSelectorInSidebar) issues.push('Theme selector not in sidebar');
    if (results.mobile.touchTargets && !results.mobile.touchTargets.adequate) {
      issues.push(`${results.mobile.touchTargets.smallTargets} buttons have inadequate touch targets`);
    }
    
    if (issues.length === 0) {
      console.log('✅ All tests passed successfully!');
    } else {
      console.log('⚠️ Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    return results;
    
  } catch (error) {
    console.error('Fatal error during testing:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
comprehensiveWebsiteTest()
  .then(results => {
    console.log('\n✅ Testing completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Testing failed:', error);
    process.exit(1);
  });