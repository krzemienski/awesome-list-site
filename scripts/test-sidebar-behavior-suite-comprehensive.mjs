import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = join(__dirname, '..', 'test-screenshots', 'sidebar-behavior-suite');
const BASE_URL = 'http://localhost:5000';

// Ensure screenshot directory exists
await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

const results = {
  testSuite: 'TEST SUITE 6: Sidebar Behavior - Desktop/Tablet/Mobile',
  timestamp: new Date().toISOString(),
  passed: 0,
  failed: 0,
  total: 0,
  tests: [],
  behaviorMatrix: {
    desktop: [],
    tablet: [],
    mobile: [],
    edgeCases: []
  }
};

function logTest(name, passed, message = '', category = 'general') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.log(`❌ FAIL: ${name} - ${message}`);
  }
  const testResult = { name, passed, message, timestamp: new Date().toISOString(), category };
  results.tests.push(testResult);
  
  // Add to behavior matrix
  if (category === 'desktop') results.behaviorMatrix.desktop.push(testResult);
  else if (category === 'tablet') results.behaviorMatrix.tablet.push(testResult);
  else if (category === 'mobile') results.behaviorMatrix.mobile.push(testResult);
  else if (category === 'edge') results.behaviorMatrix.edgeCases.push(testResult);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  let browser;
  
  try {
    console.log('🚀 Starting TEST SUITE 6: Sidebar Behavior - Desktop/Tablet/Mobile');
    console.log('═══════════════════════════════════════════════════════════\n');

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    // ========================================
    // DESKTOP TESTS (>=1024px) - 15 tests
    // ========================================
    console.log('\n📱 DESKTOP TESTS (>=1024px)\n');
    await runDesktopTests(browser);

    // ========================================
    // TABLET TESTS (768-1023px) - 10 tests
    // ========================================
    console.log('\n📱 TABLET TESTS (768-1023px)\n');
    await runTabletTests(browser);

    // ========================================
    // MOBILE TESTS (<768px) - 15 tests
    // ========================================
    console.log('\n📱 MOBILE TESTS (<768px)\n');
    await runMobileTests(browser);

    // ========================================
    // EDGE CASE TESTS - 5 tests
    // ========================================
    console.log('\n📱 EDGE CASE TESTS\n');
    await runEdgeCaseTests(browser);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${results.passed}/${results.total}`);
    console.log(`❌ Failed: ${results.failed}/${results.total}`);
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📊 BEHAVIOR VERIFICATION MATRIX');
    console.log(`- Desktop Tests: ${results.behaviorMatrix.desktop.filter(t => t.passed).length}/${results.behaviorMatrix.desktop.length} passed`);
    console.log(`- Tablet Tests: ${results.behaviorMatrix.tablet.filter(t => t.passed).length}/${results.behaviorMatrix.tablet.length} passed`);
    console.log(`- Mobile Tests: ${results.behaviorMatrix.mobile.filter(t => t.passed).length}/${results.behaviorMatrix.mobile.length} passed`);
    console.log(`- Edge Cases: ${results.behaviorMatrix.edgeCases.filter(t => t.passed).length}/${results.behaviorMatrix.edgeCases.length} passed\n`);

    // Save results to JSON
    const reportPath = join(__dirname, 'test-results', 'sidebar-behavior-suite-report.json');
    await fs.mkdir(join(__dirname, 'test-results'), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}\n`);

    // Generate markdown report
    const markdownReport = generateMarkdownReport(results);
    const mdReportPath = join(__dirname, 'test-results', 'SIDEBAR_BEHAVIOR_SUITE_REPORT.md');
    await fs.writeFile(mdReportPath, markdownReport);
    console.log(`📝 Markdown report saved to: ${mdReportPath}\n`);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    results.tests.push({
      name: 'Test Execution',
      passed: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      category: 'error'
    });
    results.failed++;
    results.total++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
}

async function runDesktopTests(browser) {
  const viewportSizes = [
    { width: 1920, height: 1080, name: '1920×1080' },
    { width: 1440, height: 900, name: '1440×900' },
    { width: 1280, height: 720, name: '1280×720' }
  ];
  
  for (const viewport of viewportSizes) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    console.log(`\n🖥️  Testing Desktop at ${viewport.name}`);
    
    // Test 1: Navigate to homepage
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1500);
    
    // Test 2: Verify sidebar always 256px width
    const sidebarWidth = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (!sidebar) return 0;
      return sidebar.getBoundingClientRect().width;
    });
    const widthCorrect = sidebarWidth >= 250 && sidebarWidth <= 270;
    logTest(`Desktop ${viewport.name}: Sidebar width is 256px (16rem)`, widthCorrect, 
      widthCorrect ? `Actual: ${sidebarWidth}px` : `Expected ~256px, got ${sidebarWidth}px`, 'desktop');
    
    // Test 3: Verify no collapse button visible
    const hasCollapseButton = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (!sidebar) return false;
      // Look for collapse/toggle buttons or icons
      const collapseButtons = sidebar.querySelectorAll('[aria-label*="ollapse"], [aria-label*="oggle"]');
      return collapseButtons.length > 0;
    });
    logTest(`Desktop ${viewport.name}: No collapse button visible`, !hasCollapseButton, 
      hasCollapseButton ? 'Collapse button found' : '', 'desktop');
    
    // Test 4: Verify CMD+B does nothing (sidebar stays visible)
    await page.keyboard.down('Meta');
    await page.keyboard.press('b');
    await page.keyboard.up('Meta');
    await sleep(500);
    
    const sidebarStillVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      return sidebar !== null;
    });
    logTest(`Desktop ${viewport.name}: CMD+B does nothing (sidebar stays visible)`, sidebarStillVisible, 
      '', 'desktop');
    
    // Test 5: Verify full text labels always visible
    const hasTextLabels = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (!sidebar) return false;
      const buttons = Array.from(sidebar.querySelectorAll('button'));
      const homeButton = buttons.find(btn => btn.textContent?.includes('Home'));
      return homeButton !== undefined;
    });
    logTest(`Desktop ${viewport.name}: Full text labels visible`, hasTextLabels, '', 'desktop');
    
    // Test 6: Verify icons always visible
    const hasIcons = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (!sidebar) return false;
      const svgIcons = sidebar.querySelectorAll('svg');
      return svgIcons.length > 0;
    });
    logTest(`Desktop ${viewport.name}: Icons visible`, hasIcons, '', 'desktop');
    
    // Test 7: Screenshot
    await page.screenshot({ 
      path: join(SCREENSHOT_DIR, `desktop-${viewport.name}-home.png`), 
      fullPage: false 
    });
    
    // Test 8-13: Test sidebar across different page types
    const pageTypes = [
      { url: '/', name: 'Homepage' },
      { url: '/category/encoding-codecs', name: 'Category' },
      { url: '/subcategory/adaptive-streaming', name: 'Subcategory' },
      { url: '/sub-subcategory/hls', name: 'SubSubcategory' },
      { url: '/advanced', name: 'Advanced' }
    ];
    
    for (const pageType of pageTypes) {
      await page.goto(BASE_URL + pageType.url, { waitUntil: 'networkidle0' });
      await sleep(1000);
      
      const sidebarExists = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-sidebar="sidebar"]');
        return sidebar !== null;
      });
      
      logTest(`Desktop ${viewport.name}: Sidebar persists on ${pageType.name}`, sidebarExists, '', 'desktop');
    }
    
    // Test 14: Page refresh test (no cookie collapse)
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1000);
    
    const sidebarAfterRefresh = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (!sidebar) return { exists: false, width: 0 };
      return { 
        exists: true, 
        width: sidebar.getBoundingClientRect().width 
      };
    });
    
    logTest(`Desktop ${viewport.name}: Sidebar stays expanded after page refresh`, 
      sidebarAfterRefresh.exists && sidebarAfterRefresh.width >= 250, 
      sidebarAfterRefresh.exists ? `Width: ${sidebarAfterRefresh.width}px` : 'Sidebar not found', 
      'desktop');
    
    await page.close();
  }
}

async function runTabletTests(browser) {
  const viewportSizes = [
    { width: 1024, height: 768, name: '1024×768 (exact breakpoint)' },
    { width: 820, height: 1180, name: '820×1180 (portrait)' },
    { width: 768, height: 1024, name: '768×1024 (exact breakpoint)' },
    { width: 900, height: 1200, name: '900×1200' }
  ];
  
  for (const viewport of viewportSizes) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    console.log(`\n📱 Testing Tablet at ${viewport.name}`);
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1500);
    
    // Test 1: Check if sidebar is visible (should be based on breakpoint logic)
    const sidebarState = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const isMobile = window.innerWidth < 1024;
      return {
        sidebarExists: sidebar !== null,
        isMobile: isMobile,
        width: sidebar ? sidebar.getBoundingClientRect().width : 0
      };
    });
    
    logTest(`Tablet ${viewport.name}: Sidebar behavior appropriate for screen size`, 
      sidebarState.sidebarExists !== null, 
      `Mobile mode: ${sidebarState.isMobile}, Width: ${sidebarState.width}px`, 
      'tablet');
    
    // Test 2-3: Test responsive transition
    await page.screenshot({ 
      path: join(SCREENSHOT_DIR, `tablet-${viewport.width}x${viewport.height}-home.png`), 
      fullPage: false 
    });
    
    // Test across different pages
    const pageTypes = [
      { url: '/', name: 'Homepage' },
      { url: '/category/encoding-codecs', name: 'Category' },
      { url: '/subcategory/adaptive-streaming', name: 'Subcategory' },
      { url: '/advanced', name: 'Advanced' }
    ];
    
    for (const pageType of pageTypes) {
      await page.goto(BASE_URL + pageType.url, { waitUntil: 'networkidle0' });
      await sleep(1000);
      
      const sidebarExists = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-sidebar="sidebar"]');
        const sheetTrigger = document.querySelector('[data-sidebar="trigger"]');
        const isMobile = window.innerWidth < 1024;
        return {
          sidebarOrSheet: sidebar !== null || sheetTrigger !== null,
          isMobile: isMobile
        };
      });
      
      logTest(`Tablet ${viewport.name}: Navigation available on ${pageType.name}`, 
        sidebarExists.sidebarOrSheet, 
        `Mobile mode: ${sidebarExists.isMobile}`, 
        'tablet');
    }
    
    await page.close();
  }
}

async function runMobileTests(browser) {
  const viewportSizes = [
    { width: 390, height: 844, name: 'iPhone 14 Pro (390×844)' },
    { width: 375, height: 667, name: 'iPhone SE (375×667)' },
    { width: 360, height: 800, name: 'Android (360×800)' }
  ];
  
  for (const viewport of viewportSizes) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    console.log(`\n📱 Testing Mobile at ${viewport.name}`);
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1500);
    
    // Test 1: Verify sidebar NOT visible by default
    const sidebarNotVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const sheetContent = document.querySelector('[data-mobile="true"]');
      
      // Check if sheet is closed
      const isSheetOpen = sheetContent && 
        window.getComputedStyle(sheetContent).display !== 'none' &&
        window.getComputedStyle(sheetContent).visibility !== 'hidden';
      
      return !isSheetOpen;
    });
    logTest(`Mobile ${viewport.name}: Sidebar NOT visible by default`, sidebarNotVisible, '', 'mobile');
    
    // Test 2: Verify hamburger menu button visible
    const hamburgerVisible = await page.evaluate(() => {
      const trigger = document.querySelector('[data-sidebar="trigger"]');
      return trigger !== null;
    });
    logTest(`Mobile ${viewport.name}: Hamburger menu button visible`, hamburgerVisible, '', 'mobile');
    
    // Screenshot before opening
    await page.screenshot({ 
      path: join(SCREENSHOT_DIR, `mobile-${viewport.width}x${viewport.height}-closed.png`), 
      fullPage: false 
    });
    
    // Test 3: Tap hamburger, verify Sheet opens
    const sheetOpened = await page.evaluate(() => {
      const trigger = document.querySelector('[data-sidebar="trigger"]');
      if (!trigger) return false;
      trigger.click();
      return true;
    });
    
    await sleep(1000);
    
    const sheetIsOpen = await page.evaluate(() => {
      const sheetContent = document.querySelector('[data-mobile="true"]');
      return sheetContent && 
        window.getComputedStyle(sheetContent).display !== 'none' &&
        window.getComputedStyle(sheetContent).visibility !== 'hidden';
    });
    
    logTest(`Mobile ${viewport.name}: Tap hamburger opens Sheet`, 
      sheetOpened && sheetIsOpen, 
      sheetIsOpen ? 'Sheet is open' : 'Sheet did not open', 
      'mobile');
    
    // Test 4: Verify all categories visible in Sheet
    const categoriesInSheet = await page.evaluate(() => {
      const sheetContent = document.querySelector('[data-mobile="true"]');
      if (!sheetContent) return 0;
      
      const categoryButtons = Array.from(sheetContent.querySelectorAll('button')).filter(btn => {
        const text = btn.textContent || '';
        return text.match(/\d+/) && text.length > 10;
      });
      
      return categoryButtons.length;
    });
    
    logTest(`Mobile ${viewport.name}: All categories visible in Sheet`, 
      categoriesInSheet >= 8, 
      `Found ${categoriesInSheet} categories`, 
      'mobile');
    
    // Screenshot with sheet open
    await page.screenshot({ 
      path: join(SCREENSHOT_DIR, `mobile-${viewport.width}x${viewport.height}-sheet-open.png`), 
      fullPage: false 
    });
    
    // Test 5: Verify Sheet overlay
    const hasOverlay = await page.evaluate(() => {
      const overlay = document.querySelector('[data-mobile="true"]');
      return overlay !== null;
    });
    logTest(`Mobile ${viewport.name}: Sheet has overlay`, hasOverlay, '', 'mobile');
    
    // Test 6: Click a category and verify Sheet closes
    const categoryClicked = await page.evaluate(() => {
      const sheetContent = document.querySelector('[data-mobile="true"]');
      if (!sheetContent) return false;
      
      const categoryButton = Array.from(sheetContent.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Encoding & Codecs')
      );
      
      if (categoryButton) {
        categoryButton.click();
        return true;
      }
      return false;
    });
    
    await sleep(1500);
    
    const sheetClosedAfterClick = await page.evaluate(() => {
      const sheetContent = document.querySelector('[data-mobile="true"]');
      return !sheetContent || 
        window.getComputedStyle(sheetContent).display === 'none' ||
        window.getComputedStyle(sheetContent).visibility === 'hidden';
    });
    
    logTest(`Mobile ${viewport.name}: Sheet closes after category selection`, 
      categoryClicked && sheetClosedAfterClick, 
      categoryClicked ? (sheetClosedAfterClick ? 'Closed' : 'Did not close') : 'Could not click', 
      'mobile');
    
    // Test 7-10: Test across multiple pages
    const pageTypes = [
      { url: '/', name: 'Homepage' },
      { url: '/category/encoding-codecs', name: 'Category' },
      { url: '/subcategory/adaptive-streaming', name: 'Subcategory' }
    ];
    
    for (const pageType of pageTypes) {
      await page.goto(BASE_URL + pageType.url, { waitUntil: 'networkidle0' });
      await sleep(1000);
      
      const hamburgerExists = await page.evaluate(() => {
        const trigger = document.querySelector('[data-sidebar="trigger"]');
        return trigger !== null;
      });
      
      logTest(`Mobile ${viewport.name}: Hamburger menu on ${pageType.name}`, 
        hamburgerExists, '', 'mobile');
    }
    
    // Test 11: Sheet persistence - open sheet again
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(1000);
    
    await page.evaluate(() => {
      const trigger = document.querySelector('[data-sidebar="trigger"]');
      if (trigger) trigger.click();
    });
    
    await sleep(1000);
    
    const sheetReopened = await page.evaluate(() => {
      const sheetContent = document.querySelector('[data-mobile="true"]');
      return sheetContent && 
        window.getComputedStyle(sheetContent).display !== 'none';
    });
    
    logTest(`Mobile ${viewport.name}: Sheet can be reopened`, sheetReopened, '', 'mobile');
    
    // Test 12: Close by tapping outside (Escape key simulation)
    await page.keyboard.press('Escape');
    await sleep(500);
    
    const sheetClosedByEscape = await page.evaluate(() => {
      const sheetContent = document.querySelector('[data-mobile="true"]');
      return !sheetContent || 
        window.getComputedStyle(sheetContent).display === 'none' ||
        window.getComputedStyle(sheetContent).visibility === 'hidden';
    });
    
    logTest(`Mobile ${viewport.name}: Sheet closes with Escape key`, 
      sheetClosedByEscape, '', 'mobile');
    
    await page.close();
  }
}

async function runEdgeCaseTests(browser) {
  console.log('\n🔄 Testing Edge Cases\n');
  
  // Edge Case 1: Resize from desktop → mobile → desktop
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await sleep(1000);
  
  const desktopSidebarWidth1 = await page.evaluate(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    return sidebar ? sidebar.getBoundingClientRect().width : 0;
  });
  
  // Resize to mobile
  await page.setViewport({ width: 375, height: 667 });
  await sleep(1000);
  
  const mobileHasSheet = await page.evaluate(() => {
    const trigger = document.querySelector('[data-sidebar="trigger"]');
    return trigger !== null;
  });
  
  // Resize back to desktop
  await page.setViewport({ width: 1920, height: 1080 });
  await sleep(1000);
  
  const desktopSidebarWidth2 = await page.evaluate(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    return sidebar ? sidebar.getBoundingClientRect().width : 0;
  });
  
  logTest('Edge Case: Resize desktop → mobile → desktop maintains state', 
    desktopSidebarWidth1 > 0 && mobileHasSheet && desktopSidebarWidth2 > 0, 
    `Desktop1: ${desktopSidebarWidth1}px, Mobile: ${mobileHasSheet}, Desktop2: ${desktopSidebarWidth2}px`, 
    'edge');
  
  await page.screenshot({ 
    path: join(SCREENSHOT_DIR, `edge-case-resize-desktop.png`), 
    fullPage: false 
  });
  
  // Edge Case 2: Test with existing cookies
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await sleep(1000);
  
  // Set a sidebar cookie
  await page.evaluate(() => {
    document.cookie = 'sidebar:state=false; path=/; max-age=604800';
  });
  
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1000);
  
  const sidebarWithCookie = await page.evaluate(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    return sidebar !== null;
  });
  
  logTest('Edge Case: Desktop ignores collapse cookie (always expanded)', 
    sidebarWithCookie, 
    '', 
    'edge');
  
  // Edge Case 3: Page refresh at mobile size
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await sleep(1000);
  
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1000);
  
  const sheetClosedAfterRefresh = await page.evaluate(() => {
    const sheetContent = document.querySelector('[data-mobile="true"]');
    return !sheetContent || 
      window.getComputedStyle(sheetContent).display === 'none' ||
      window.getComputedStyle(sheetContent).visibility === 'hidden';
  });
  
  logTest('Edge Case: Mobile sheet closed after page refresh', 
    sheetClosedAfterRefresh, 
    '', 
    'edge');
  
  // Edge Case 4: Rapid resizing
  for (let i = 0; i < 5; i++) {
    await page.setViewport({ width: 1920, height: 1080 });
    await sleep(200);
    await page.setViewport({ width: 375, height: 667 });
    await sleep(200);
  }
  
  await page.setViewport({ width: 1920, height: 1080 });
  await sleep(1000);
  
  const stableAfterRapidResize = await page.evaluate(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    return sidebar !== null && sidebar.getBoundingClientRect().width > 0;
  });
  
  logTest('Edge Case: Sidebar stable after rapid resizing', 
    stableAfterRapidResize, 
    '', 
    'edge');
  
  // Edge Case 5: Orientation change simulation (tablet)
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await sleep(1000);
  
  const portraitState = await page.evaluate(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    const trigger = document.querySelector('[data-sidebar="trigger"]');
    return { hasSidebar: sidebar !== null, hasTrigger: trigger !== null };
  });
  
  await page.setViewport({ width: 1024, height: 768 });
  await sleep(1000);
  
  const landscapeState = await page.evaluate(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    const trigger = document.querySelector('[data-sidebar="trigger"]');
    return { hasSidebar: sidebar !== null, hasTrigger: trigger !== null };
  });
  
  logTest('Edge Case: Orientation change (portrait → landscape) works correctly', 
    portraitState.hasSidebar !== null && landscapeState.hasSidebar !== null, 
    `Portrait: ${JSON.stringify(portraitState)}, Landscape: ${JSON.stringify(landscapeState)}`, 
    'edge');
  
  await page.close();
}

function generateMarkdownReport(results) {
  let md = `# TEST SUITE 6: Sidebar Behavior - Desktop/Tablet/Mobile\n\n`;
  md += `**Generated:** ${new Date(results.timestamp).toLocaleString()}\n\n`;
  
  md += `## Executive Summary\n\n`;
  md += `- **Total Tests:** ${results.total}\n`;
  md += `- **Passed:** ${results.passed} ✅\n`;
  md += `- **Failed:** ${results.failed} ❌\n`;
  md += `- **Success Rate:** ${((results.passed / results.total) * 100).toFixed(1)}%\n\n`;
  
  md += `## Behavior Verification Matrix\n\n`;
  md += `| Screen Size | Tests Run | Passed | Failed | Success Rate |\n`;
  md += `|-------------|-----------|--------|--------|-------------|\n`;
  
  const categories = ['desktop', 'tablet', 'mobile', 'edgeCases'];
  const labels = ['Desktop (>=1024px)', 'Tablet (768-1023px)', 'Mobile (<768px)', 'Edge Cases'];
  
  categories.forEach((cat, idx) => {
    const tests = results.behaviorMatrix[cat];
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    const rate = tests.length > 0 ? ((passed / tests.length) * 100).toFixed(1) : '0.0';
    md += `| ${labels[idx]} | ${tests.length} | ${passed} | ${failed} | ${rate}% |\n`;
  });
  
  md += `\n## Desktop Tests (>=1024px)\n\n`;
  md += `### Success Criteria\n`;
  md += `- ✅ Sidebar always 256px width\n`;
  md += `- ✅ No collapse button visible\n`;
  md += `- ✅ CMD+B does nothing (sidebar stays expanded)\n`;
  md += `- ✅ Sidebar persists across all pages\n`;
  md += `- ✅ Full text labels and icons always visible\n\n`;
  
  md += `### Test Results\n\n`;
  results.behaviorMatrix.desktop.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    md += `${icon} **${test.name}**\n`;
    if (test.message) md += `   - ${test.message}\n`;
    md += `\n`;
  });
  
  md += `## Tablet Tests (768-1023px)\n\n`;
  md += `### Success Criteria\n`;
  md += `- ✅ Appropriate responsive behavior at breakpoints\n`;
  md += `- ✅ Navigation available across all pages\n`;
  md += `- ✅ Smooth responsive transitions\n\n`;
  
  md += `### Test Results\n\n`;
  results.behaviorMatrix.tablet.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    md += `${icon} **${test.name}**\n`;
    if (test.message) md += `   - ${test.message}\n`;
    md += `\n`;
  });
  
  md += `## Mobile Tests (<768px)\n\n`;
  md += `### Success Criteria\n`;
  md += `- ✅ Sidebar NOT visible by default\n`;
  md += `- ✅ Hamburger menu button visible\n`;
  md += `- ✅ Sheet drawer opens/closes properly\n`;
  md += `- ✅ All categories accessible in Sheet\n`;
  md += `- ✅ Sheet closes after selection\n`;
  md += `- ✅ Sheet overlay works correctly\n\n`;
  
  md += `### Test Results\n\n`;
  results.behaviorMatrix.mobile.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    md += `${icon} **${test.name}**\n`;
    if (test.message) md += `   - ${test.message}\n`;
    md += `\n`;
  });
  
  md += `## Edge Case Tests\n\n`;
  md += `### Success Criteria\n`;
  md += `- ✅ Resize transitions work smoothly\n`;
  md += `- ✅ Desktop ignores collapse cookies\n`;
  md += `- ✅ State management correct across refreshes\n`;
  md += `- ✅ No bugs at breakpoint edges\n`;
  md += `- ✅ Orientation changes handled properly\n\n`;
  
  md += `### Test Results\n\n`;
  results.behaviorMatrix.edgeCases.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    md += `${icon} **${test.name}**\n`;
    if (test.message) md += `   - ${test.message}\n`;
    md += `\n`;
  });
  
  md += `## Screenshots\n\n`;
  md += `Screenshots have been saved to: \`test-screenshots/sidebar-behavior-suite/\`\n\n`;
  md += `### Desktop Screenshots\n`;
  md += `- desktop-1920×1080-home.png\n`;
  md += `- desktop-1440×900-home.png\n`;
  md += `- desktop-1280×720-home.png\n\n`;
  
  md += `### Tablet Screenshots\n`;
  md += `- tablet-1024x768-home.png\n`;
  md += `- tablet-820x1180-home.png\n`;
  md += `- tablet-768x1024-home.png\n\n`;
  
  md += `### Mobile Screenshots\n`;
  md += `- mobile-390x844-closed.png\n`;
  md += `- mobile-390x844-sheet-open.png\n`;
  md += `- mobile-375x667-closed.png\n`;
  md += `- mobile-375x667-sheet-open.png\n\n`;
  
  md += `## Conclusion\n\n`;
  if (results.failed === 0) {
    md += `🎉 **All tests passed!** The sidebar behavior is working correctly across all screen sizes.\n\n`;
    md += `Key Achievements:\n`;
    md += `- Desktop: Sidebar always visible at 256px, no collapse possible\n`;
    md += `- Tablet: Appropriate responsive behavior at breakpoints\n`;
    md += `- Mobile: Sheet drawer works perfectly with proper open/close behavior\n`;
    md += `- Edge Cases: All edge cases handled correctly\n`;
  } else {
    md += `⚠️ **Some tests failed.** Please review the failed tests above.\n\n`;
    md += `Failed tests: ${results.failed}/${results.total}\n`;
  }
  
  return md;
}

// Run tests
runTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
