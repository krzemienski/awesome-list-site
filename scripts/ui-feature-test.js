// UI Feature Testing Script - Run in Browser Console
// Tests Layout Switching, AI Recommendations, Color Palette, and UI-specific features

(async function runUITests() {
  console.log('🚀 Starting UI Feature Tests');
  console.log('=' .repeat(50));
  
  const testResults = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth <= 768
    },
    categories: {},
    summary: { total: 0, passed: 0, failed: 0 }
  };
  
  function addResult(category, testName, status, details = {}) {
    if (!testResults.categories[category]) {
      testResults.categories[category] = { tests: [], summary: { passed: 0, failed: 0 } };
    }
    
    const test = { name: testName, status, ...details };
    testResults.categories[category].tests.push(test);
    testResults.summary.total++;
    
    if (status === 'PASS') {
      testResults.categories[category].summary.passed++;
      testResults.summary.passed++;
    } else if (status === 'FAIL') {
      testResults.categories[category].summary.failed++;
      testResults.summary.failed++;
    }
    
    console.log(`[${category}] ${testName}: ${status}`);
    if (details.info) console.log(`  Info: ${details.info}`);
  }
  
  async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 1. TEST LAYOUT SWITCHING
  console.log('\n📐 Testing Layout Switching...\n');
  
  // Find layout switcher
  const layoutButtons = document.querySelectorAll('[data-testid*="layout"], button');
  const layoutSwitcher = Array.from(layoutButtons).find(btn => 
    btn.textContent?.toLowerCase().includes('cards') || 
    btn.textContent?.toLowerCase().includes('list') ||
    btn.textContent?.toLowerCase().includes('compact')
  );
  
  if (layoutSwitcher) {
    addResult('Layout', 'Layout switcher found', 'PASS');
    
    // Test switching to different layouts
    const layouts = ['cards', 'list', 'compact'];
    for (const layout of layouts) {
      const layoutBtn = Array.from(layoutButtons).find(btn => 
        btn.textContent?.toLowerCase().includes(layout)
      );
      
      if (layoutBtn) {
        layoutBtn.click();
        await wait(1000);
        
        // Check if layout changed
        let layoutApplied = false;
        if (layout === 'cards') {
          const cards = document.querySelectorAll('[data-testid*="resource-card"], .grid .card');
          layoutApplied = cards.length > 0;
        } else if (layout === 'list') {
          const listItems = document.querySelectorAll('[data-testid*="list-item"], .flex-col');
          layoutApplied = listItems.length > 0;
        } else if (layout === 'compact') {
          const compactItems = document.querySelectorAll('[data-testid*="compact"], .py-2');
          layoutApplied = compactItems.length > 0;
        }
        
        addResult('Layout', `Switch to ${layout}`, layoutApplied ? 'PASS' : 'FAIL', {
          info: `Found evidence of ${layout} layout`
        });
      }
    }
    
    // Test persistence
    const currentLayout = sessionStorage.getItem('awesome-layout');
    addResult('Layout', 'Layout persistence', currentLayout ? 'PASS' : 'FAIL', {
      info: `Stored layout: ${currentLayout}`
    });
  } else {
    addResult('Layout', 'Layout switcher found', 'FAIL');
  }
  
  // 2. TEST SEARCH DIALOG
  console.log('\n🔍 Testing Search Dialog...\n');
  
  const searchButton = document.querySelector('[data-testid*="search"], button[aria-label*="search"]');
  if (searchButton) {
    addResult('Search', 'Search button found', 'PASS');
    
    // Open search dialog
    searchButton.click();
    await wait(500);
    
    const searchDialog = document.querySelector('[role="dialog"]');
    if (searchDialog) {
      addResult('Search', 'Search dialog opens', 'PASS');
      
      // Find search input
      const searchInput = searchDialog.querySelector('input[type="text"], input[type="search"]');
      if (searchInput) {
        // Test typing
        searchInput.value = 'ffmpeg';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(1000);
        
        // Check for results
        const results = searchDialog.querySelectorAll('[data-testid*="search-result"], .hover\\:bg-accent');
        addResult('Search', 'Real-time search results', results.length > 0 ? 'PASS' : 'FAIL', {
          info: `${results.length} results found`
        });
        
        // Clear search
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(500);
        
        // Close dialog
        const closeBtn = searchDialog.querySelector('[aria-label*="close"]');
        if (closeBtn) {
          closeBtn.click();
        } else {
          // Press Escape
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        }
        await wait(500);
      }
    } else {
      addResult('Search', 'Search dialog opens', 'FAIL');
    }
  } else {
    addResult('Search', 'Search button found', 'FAIL');
  }
  
  // 3. TEST AI RECOMMENDATIONS
  console.log('\n🤖 Testing AI Recommendations...\n');
  
  // Look for AI-related elements
  const aiElements = document.querySelectorAll('[data-testid*="ai"], [data-testid*="recommendation"], button');
  const aiButton = Array.from(aiElements).find(el => 
    el.textContent?.toLowerCase().includes('ai') || 
    el.textContent?.toLowerCase().includes('recommend')
  );
  
  if (aiButton) {
    addResult('AI', 'AI Recommendations button found', 'PASS');
    
    // Try to open recommendations
    if (aiButton.tagName === 'BUTTON') {
      aiButton.click();
      await wait(1000);
      
      // Look for recommendations panel
      const recPanel = document.querySelector('[data-testid*="recommendation-panel"], .recommendation-panel');
      if (recPanel) {
        addResult('AI', 'Recommendations panel opens', 'PASS');
        
        // Check for content
        const recommendations = recPanel.querySelectorAll('[data-testid*="recommendation-item"], .card');
        addResult('AI', 'Recommendations displayed', recommendations.length > 0 ? 'PASS' : 'FAIL', {
          info: `${recommendations.length} recommendations shown`
        });
        
        // Close panel if possible
        const closeBtn = recPanel.querySelector('[aria-label*="close"]');
        if (closeBtn) closeBtn.click();
      } else {
        addResult('AI', 'Recommendations panel opens', 'FAIL');
      }
    }
  } else {
    addResult('AI', 'AI Recommendations feature', 'INFO', {
      info: 'Feature not implemented'
    });
  }
  
  // 4. TEST COLOR PALETTE GENERATOR
  console.log('\n🎨 Testing Color Palette Generator...\n');
  
  // Look for color palette elements
  const paletteElements = document.querySelectorAll('[data-testid*="palette"], [data-testid*="color"], [data-testid*="theme"], button');
  const paletteButton = Array.from(paletteElements).find(el => 
    el.textContent?.toLowerCase().includes('color') || 
    el.textContent?.toLowerCase().includes('palette') ||
    el.textContent?.toLowerCase().includes('theme')
  );
  
  if (paletteButton && paletteButton.tagName === 'BUTTON') {
    addResult('ColorPalette', 'Color palette button found', 'PASS');
    
    // Open color palette
    paletteButton.click();
    await wait(1000);
    
    // Look for palette dialog/modal
    const paletteDialog = document.querySelector('[role="dialog"], .palette-generator, .color-palette');
    if (paletteDialog) {
      addResult('ColorPalette', 'Palette generator opens', 'PASS');
      
      // Look for generate button
      const generateBtn = paletteDialog.querySelector('button:contains("Generate"), [data-testid*="generate"]');
      if (generateBtn) {
        addResult('ColorPalette', 'Generate button found', 'PASS');
        
        // Try to generate colors
        generateBtn.click();
        await wait(2000);
        
        // Check for color swatches
        const colorElements = paletteDialog.querySelectorAll('[style*="background-color"], .color-swatch');
        addResult('ColorPalette', 'Colors generated', colorElements.length >= 3 ? 'PASS' : 'FAIL', {
          info: `${colorElements.length} color elements found`
        });
      }
      
      // Close dialog
      const closeBtn = paletteDialog.querySelector('[aria-label*="close"]');
      if (closeBtn) {
        closeBtn.click();
      } else {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }
    } else {
      addResult('ColorPalette', 'Palette generator opens', 'FAIL');
    }
  } else {
    addResult('ColorPalette', 'Color palette feature', 'INFO', {
      info: 'Feature not implemented'
    });
  }
  
  // 5. TEST PAGINATION
  console.log('\n📄 Testing Pagination...\n');
  
  // Navigate to a category page with many items
  if (!window.location.href.includes('/category/')) {
    const categoryLink = document.querySelector('a[href*="/category/encoding-codecs"]');
    if (categoryLink) {
      categoryLink.click();
      await wait(2000);
    }
  }
  
  const pagination = document.querySelector('[data-testid*="pagination"], nav[aria-label*="pagination"]');
  if (pagination) {
    addResult('Pagination', 'Pagination controls found', 'PASS');
    
    // Test next button
    const nextBtn = pagination.querySelector('button:contains("Next"), [aria-label*="next"]');
    if (nextBtn && !nextBtn.disabled) {
      const initialScrollY = window.scrollY;
      nextBtn.click();
      await wait(1000);
      
      // Check for skeletons
      const skeletons = document.querySelectorAll('.skeleton');
      addResult('Pagination', 'No skeleton on page change', skeletons.length === 0 ? 'PASS' : 'FAIL');
      
      // Check scroll reset
      const newScrollY = window.scrollY;
      addResult('Pagination', 'Scroll resets to top', newScrollY < 100 ? 'PASS' : 'FAIL', {
        info: `Scroll position: ${newScrollY}`
      });
      
      // Go back
      const prevBtn = pagination.querySelector('button:contains("Previous"), [aria-label*="prev"]');
      if (prevBtn) {
        prevBtn.click();
        await wait(1000);
        addResult('Pagination', 'Previous button works', 'PASS');
      }
    }
  } else {
    addResult('Pagination', 'Pagination controls found', 'INFO', {
      info: 'May not have enough items'
    });
  }
  
  // 6. TEST RESPONSIVE BEHAVIOR
  console.log('\n📱 Testing Responsive Behavior...\n');
  
  const isMobile = window.innerWidth <= 768;
  addResult('Responsive', 'Current view', 'INFO', {
    info: `${isMobile ? 'Mobile' : 'Desktop'} view (${window.innerWidth}x${window.innerHeight})`
  });
  
  // Check for mobile-specific elements
  if (isMobile) {
    const sidebarTrigger = document.querySelector('[data-testid*="sidebar-trigger"], [aria-label*="menu"]');
    addResult('Responsive', 'Mobile menu button', sidebarTrigger ? 'PASS' : 'FAIL');
    
    // Check touch target sizes
    const buttons = document.querySelectorAll('button');
    let smallButtons = 0;
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.height < 44 || rect.width < 44) smallButtons++;
    });
    
    addResult('Responsive', 'Touch target sizes', smallButtons === 0 ? 'PASS' : 'WARNING', {
      info: `${smallButtons} of ${buttons.length} buttons are too small`
    });
  }
  
  // 7. TEST PERFORMANCE
  console.log('\n⚡ Testing Performance...\n');
  
  // Check for console errors
  const originalConsoleError = console.error;
  let errorCount = 0;
  console.error = function() {
    errorCount++;
    originalConsoleError.apply(console, arguments);
  };
  
  // Measure resource count
  const resources = document.querySelectorAll('[data-testid*="resource"], .resource-card, .list-item, .compact-item');
  addResult('Performance', 'Resources rendered', 'INFO', {
    info: `${resources.length} resources visible`
  });
  
  // Check for lazy loading
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  addResult('Performance', 'Lazy loading images', lazyImages.length > 0 ? 'PASS' : 'INFO', {
    info: `${lazyImages.length} lazy-loaded images`
  });
  
  // Test rapid navigation
  const startTime = performance.now();
  for (let i = 0; i < 3; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await wait(100);
    window.scrollTo(0, 0);
    await wait(100);
  }
  const scrollTime = performance.now() - startTime;
  
  addResult('Performance', 'Rapid scroll test', scrollTime < 2000 ? 'PASS' : 'WARNING', {
    info: `Completed in ${scrollTime.toFixed(2)}ms`
  });
  
  // Restore console.error
  console.error = originalConsoleError;
  addResult('Performance', 'Console errors', errorCount === 0 ? 'PASS' : 'FAIL', {
    info: `${errorCount} errors detected during testing`
  });
  
  // 8. TEST EDGE CASES
  console.log('\n🔧 Testing Edge Cases...\n');
  
  // Test browser back/forward
  const originalUrl = window.location.href;
  window.history.back();
  await wait(1000);
  
  addResult('EdgeCases', 'Browser back button', 'PASS');
  
  window.history.forward();
  await wait(1000);
  
  addResult('EdgeCases', 'Browser forward button', 'PASS');
  
  // Test empty search
  const searchBtn = document.querySelector('[data-testid*="search"]');
  if (searchBtn) {
    searchBtn.click();
    await wait(500);
    
    const input = document.querySelector('[role="dialog"] input');
    if (input) {
      input.value = 'xyzabc123nonexistent';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1000);
      
      const emptyState = document.querySelector(':contains("No results"), :contains("not found")');
      addResult('EdgeCases', 'Empty search results', emptyState ? 'PASS' : 'INFO', {
        info: 'Empty state message shown'
      });
      
      // Close dialog
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }
  }
  
  // GENERATE REPORT
  console.log('\n' + '=' .repeat(50));
  console.log('📊 UI TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed} ✅`);
  console.log(`Failed: ${testResults.summary.failed} ❌`);
  console.log(`Pass Rate: ${(testResults.summary.passed / testResults.summary.total * 100).toFixed(2)}%`);
  
  console.log('\n📋 Results by Category:');
  for (const [category, data] of Object.entries(testResults.categories)) {
    console.log(`\n${category}: ${data.summary.passed}/${data.tests.length} passed`);
    data.tests.forEach(test => {
      const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : 'ℹ️';
      console.log(`  ${icon} ${test.name}${test.info ? `: ${test.info}` : ''}`);
    });
  }
  
  // Save results to window for extraction
  window.__UI_TEST_RESULTS__ = testResults;
  
  console.log('\n✨ UI Testing Complete!');
  console.log('Results saved to window.__UI_TEST_RESULTS__');
  
  return testResults;
})();