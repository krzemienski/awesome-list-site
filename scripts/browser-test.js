// Browser-based Website Testing Script
// Run this in the browser console to test functionality

(function() {
  console.log('🚀 Starting Website Testing');
  console.log('=====================================\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth <= 768
    },
    tests: {}
  };
  
  // Test 1: Check page structure
  console.log('📋 Testing Page Structure...');
  results.tests.pageStructure = {
    hasSidebar: !!document.querySelector('[data-sidebar]'),
    hasMainContent: !!document.querySelector('main'),
    hasHeader: !!document.querySelector('header'),
    hasFooter: !!document.querySelector('footer')
  };
  console.log('Page structure:', results.tests.pageStructure);
  
  // Test 2: Check content layout (should be table/compact, not cards)
  console.log('\n📊 Testing Content Layout...');
  const contentLayout = {
    tables: document.querySelectorAll('table').length,
    lists: document.querySelectorAll('[role="list"]').length,
    cards: document.querySelectorAll('[data-testid="resource-card"]').length,
    compactItems: document.querySelectorAll('.compact-item').length
  };
  results.tests.contentLayout = contentLayout;
  console.log('Content layout found:', contentLayout);
  
  // Test 3: Check theme selector in sidebar
  console.log('\n🎨 Testing Theme Selector...');
  const themeButtons = Array.from(document.querySelectorAll('button')).filter(
    btn => btn.textContent?.toLowerCase().includes('theme')
  );
  const themeInSidebar = Array.from(document.querySelectorAll('[data-sidebar] button')).filter(
    btn => btn.textContent?.toLowerCase().includes('theme')
  );
  results.tests.themeSelector = {
    found: themeButtons.length > 0,
    inSidebar: themeInSidebar.length > 0,
    count: themeButtons.length
  };
  console.log('Theme selector:', results.tests.themeSelector);
  
  // Test 4: Check mobile responsiveness
  console.log('\n📱 Testing Mobile Features...');
  const mobileFeatures = {
    sidebarTrigger: !!document.querySelector('[data-sidebar-trigger]'),
    mobileOptimizations: !!document.querySelector('link[href*="mobile-optimizations"]') || 
                         !!Array.from(document.styleSheets).find(sheet => 
                           sheet.href?.includes('mobile-optimizations')),
    touchTargets: (() => {
      const buttons = document.querySelectorAll('button');
      let smallButtons = 0;
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.height < 44 || rect.width < 44) smallButtons++;
      });
      return {
        total: buttons.length,
        tooSmall: smallButtons,
        adequate: smallButtons === 0
      };
    })()
  };
  results.tests.mobileFeatures = mobileFeatures;
  console.log('Mobile features:', mobileFeatures);
  
  // Test 5: Check ShadCN components
  console.log('\n🧩 Testing ShadCN Components...');
  const shadcnComponents = {
    buttons: document.querySelectorAll('button').length,
    inputs: document.querySelectorAll('input').length,
    selects: document.querySelectorAll('[role="combobox"]').length,
    cards: document.querySelectorAll('[class*="card"]').length,
    tooltips: document.querySelectorAll('[data-state][data-radix-tooltip]').length,
    popovers: document.querySelectorAll('[data-radix-popover]').length,
    dialogs: document.querySelectorAll('[data-radix-dialog]').length,
    dropdowns: document.querySelectorAll('[data-radix-dropdown-menu]').length,
    accordions: document.querySelectorAll('[data-radix-accordion]').length,
    tabs: document.querySelectorAll('[role="tablist"]').length
  };
  results.tests.shadcnComponents = shadcnComponents;
  console.log('ShadCN components found:', shadcnComponents);
  
  // Test 6: Check navigation
  console.log('\n🗺️ Testing Navigation...');
  const navigation = {
    homeLink: !!document.querySelector('a[href="/"]'),
    categoryLinks: document.querySelectorAll('a[href*="/category/"]').length,
    subcategoryLinks: document.querySelectorAll('a[href*="/subcategory/"]').length,
    subSubcategoryLinks: document.querySelectorAll('a[href*="/sub-subcategory/"]').length,
    totalNavItems: document.querySelectorAll('[data-sidebar] a').length
  };
  results.tests.navigation = navigation;
  console.log('Navigation structure:', navigation);
  
  // Test 7: Check search functionality
  console.log('\n🔍 Testing Search...');
  const searchElements = {
    searchButton: !!document.querySelector('button:has([class*="search"])') || 
                  Array.from(document.querySelectorAll('button')).some(btn => 
                    btn.innerHTML.toLowerCase().includes('search')),
    searchInput: !!document.querySelector('input[type="search"]') || 
                 !!document.querySelector('input[placeholder*="Search"]'),
    searchDialog: !!document.querySelector('[role="dialog"][aria-label*="Search"]')
  };
  results.tests.search = searchElements;
  console.log('Search elements:', searchElements);
  
  // Test 8: Check theme
  console.log('\n🎨 Testing Current Theme...');
  const root = document.documentElement;
  const computedStyles = getComputedStyle(root);
  const currentTheme = {
    isDarkMode: root.classList.contains('dark'),
    primaryColor: computedStyles.getPropertyValue('--primary'),
    backgroundColor: computedStyles.getPropertyValue('--background'),
    themeVariant: localStorage.getItem('theme-variant') || 'unknown'
  };
  results.tests.currentTheme = currentTheme;
  console.log('Current theme:', currentTheme);
  
  // Test 9: Check dialogs positioning
  console.log('\n📐 Testing Dialog Positioning...');
  const dialogs = document.querySelectorAll('[data-radix-dialog-content]');
  const dialogPositioning = [];
  dialogs.forEach((dialog, index) => {
    const rect = dialog.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    dialogPositioning.push({
      index: index + 1,
      withinViewport: rect.left >= 0 && rect.right <= viewportWidth && 
                     rect.top >= 0 && rect.bottom <= viewportHeight,
      centered: Math.abs((rect.left + rect.width/2) - viewportWidth/2) < 20
    });
  });
  results.tests.dialogPositioning = {
    count: dialogs.length,
    positions: dialogPositioning
  };
  console.log('Dialog positioning:', results.tests.dialogPositioning);
  
  // Generate Summary
  console.log('\n✨ TEST SUMMARY');
  console.log('=====================================');
  
  const issues = [];
  
  // Check for issues
  if (!results.tests.pageStructure.hasSidebar) issues.push('❌ Sidebar not found');
  if (!results.tests.pageStructure.hasMainContent) issues.push('❌ Main content area not found');
  if (!results.tests.themeSelector.inSidebar) issues.push('❌ Theme selector not in sidebar');
  if (!results.tests.mobileFeatures.touchTargets.adequate) {
    issues.push(`⚠️ ${results.tests.mobileFeatures.touchTargets.tooSmall} buttons have small touch targets`);
  }
  if (results.tests.contentLayout.cards > 0) {
    issues.push('⚠️ Card layout detected - should be using table/compact view');
  }
  
  if (issues.length === 0) {
    console.log('✅ All tests passed successfully!');
  } else {
    console.log('Issues found:');
    issues.forEach(issue => console.log(issue));
  }
  
  // Display detailed results
  console.log('\n📊 DETAILED RESULTS');
  console.log('=====================================');
  console.log(JSON.stringify(results, null, 2));
  
  // Return results for further processing
  window.testResults = results;
  console.log('\n💡 Test results saved to window.testResults');
  
  return results;
})();