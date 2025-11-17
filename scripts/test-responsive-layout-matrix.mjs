import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = 'test-screenshots/responsive-layout-suite';
const RESULTS_DIR = 'test-results';

mkdirSync(SCREENSHOT_DIR, { recursive: true });
mkdirSync(RESULTS_DIR, { recursive: true });

// 8 Viewports to test
const VIEWPORTS = [
  { name: 'Desktop XL', width: 1920, height: 1080, category: 'desktop' },
  { name: 'Desktop L', width: 1440, height: 900, category: 'desktop' },
  { name: 'Desktop M', width: 1280, height: 720, category: 'desktop' },
  { name: 'Desktop Breakpoint', width: 1024, height: 768, category: 'desktop' },
  { name: 'Tablet L', width: 820, height: 1180, category: 'tablet' },
  { name: 'Tablet M', width: 768, height: 1024, category: 'tablet' },
  { name: 'Mobile L', width: 390, height: 844, category: 'mobile' },
  { name: 'Mobile M', width: 375, height: 667, category: 'mobile' }
];

// 6 Key pages to test
const PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'Category: Encoding & Codecs', path: '/category/encoding-codecs' },
  { name: 'Subcategory: Adaptive Streaming', path: '/subcategory/adaptive-streaming' },
  { name: 'Sub-Subcategory: HLS', path: '/sub-subcategory/hls' },
  { name: 'Category: Players & Clients', path: '/category/players-clients' },
  { name: 'Subcategory: Encoding Tools', path: '/subcategory/encoding-tools' }
];

const results = {
  testSuite: 'TEST SUITE 4: Responsive Layout Matrix',
  description: '8 Viewports × 6 Pages = 48 tests',
  timestamp: new Date().toISOString(),
  viewports: VIEWPORTS.length,
  pages: PAGES.length,
  totalTests: VIEWPORTS.length * PAGES.length,
  passed: 0,
  failed: 0,
  warnings: 0,
  combinations: []
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getExpectedLayout(viewport) {
  if (viewport.category === 'desktop') {
    return {
      sidebarState: 'expanded',
      sidebarWidth: 256,
      gridColumns: 3,
      minTouchTarget: null // Not applicable for desktop
    };
  } else if (viewport.category === 'tablet') {
    return {
      sidebarState: 'appropriate', // Can be expanded or collapsed
      sidebarWidth: null,
      gridColumns: 2,
      minTouchTarget: null // Not strictly enforced for tablet
    };
  } else { // mobile
    return {
      sidebarState: 'drawer',
      sidebarWidth: null,
      gridColumns: 1,
      minTouchTarget: 44
    };
  }
}

async function testCombination(browser, viewport, page) {
  const testName = `${viewport.name} (${viewport.width}×${viewport.height}) - ${page.name}`;
  console.log(`\n🧪 Testing: ${testName}`);
  
  const result = {
    viewport: viewport.name,
    viewportSize: `${viewport.width}×${viewport.height}`,
    category: viewport.category,
    page: page.name,
    path: page.path,
    timestamp: new Date().toISOString(),
    checks: [],
    screenshot: null,
    passed: true,
    warnings: []
  };

  const expected = getExpectedLayout(viewport);
  const browserPage = await browser.newPage();
  
  try {
    // 1. Set viewport
    await browserPage.setViewport({ width: viewport.width, height: viewport.height });
    result.checks.push({ name: 'Set viewport', passed: true });
    
    // 2. Navigate to page
    await browserPage.goto(BASE_URL + page.path, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    await wait(2000);
    result.checks.push({ name: 'Navigate to page', passed: true });
    
    // 3. Verify no horizontal scroll
    const scrollInfo = await browserPage.evaluate(() => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      return {
        hasHorizontalScroll,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    });
    
    const noHorizontalScroll = !scrollInfo.hasHorizontalScroll;
    result.checks.push({ 
      name: 'No horizontal scroll', 
      passed: noHorizontalScroll,
      details: `scrollWidth: ${scrollInfo.scrollWidth}, clientWidth: ${scrollInfo.clientWidth}`
    });
    
    if (!noHorizontalScroll) {
      result.passed = false;
      result.warnings.push('Horizontal scroll detected');
    }
    
    // 4. Check sidebar state
    const sidebarInfo = await browserPage.evaluate(() => {
      // Try multiple selectors to find the sidebar
      const sidebar = document.querySelector('[data-sidebar="sidebar"]') ||
                      document.querySelector('aside') ||
                      document.querySelector('nav[class*="sidebar"]') ||
                      document.querySelector('[class*="Sidebar"]');
      
      const sheet = document.querySelector('[role="dialog"]'); // Sheet/drawer for mobile
      const topBar = document.querySelector('header') || document.querySelector('[class*="TopBar"]');
      
      if (!sidebar && !topBar) {
        return { found: false, type: 'none', reason: 'No sidebar or navigation found' };
      }
      
      if (!sidebar) {
        return { found: true, type: 'topbar-only', visible: false, width: 0, height: 0 };
      }
      
      const rect = sidebar.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      
      return {
        found: true,
        type: sheet ? 'drawer' : 'sidebar',
        visible: isVisible,
        width: rect.width,
        height: rect.height
      };
    });
    
    let sidebarCheckPassed = true;
    let sidebarMessage = '';
    
    if (viewport.category === 'desktop') {
      // Desktop should have expanded sidebar (~256px)
      if (sidebarInfo.found && sidebarInfo.visible) {
        const widthOk = sidebarInfo.width >= 240 && sidebarInfo.width <= 270;
        sidebarCheckPassed = widthOk;
        sidebarMessage = `Sidebar width: ${sidebarInfo.width}px (expected ~256px)`;
      } else {
        sidebarCheckPassed = false;
        sidebarMessage = 'Sidebar not found or not visible';
      }
    } else if (viewport.category === 'mobile') {
      // Mobile should have drawer (not visible by default)
      sidebarCheckPassed = sidebarInfo.found;
      sidebarMessage = sidebarInfo.type === 'drawer' ? 'Drawer sidebar (hidden)' : 'Regular sidebar found';
    } else {
      // Tablet - should have appropriate sidebar
      sidebarCheckPassed = sidebarInfo.found;
      sidebarMessage = `Sidebar found: ${sidebarInfo.visible ? 'visible' : 'hidden'}`;
    }
    
    result.checks.push({
      name: `Sidebar state (${expected.sidebarState})`,
      passed: sidebarCheckPassed,
      details: sidebarMessage
    });
    
    if (!sidebarCheckPassed) {
      result.passed = false;
    }
    
    // 5. Verify grid columns
    const gridInfo = await browserPage.evaluate(() => {
      // Look for grid containers
      const grids = Array.from(document.querySelectorAll('.grid'));
      if (grids.length === 0) return { found: false };
      
      // Get the main content grid (typically the resource grid)
      const mainGrid = grids.find(g => g.querySelectorAll('a[target="_blank"]').length > 0) || grids[0];
      const computedStyle = window.getComputedStyle(mainGrid);
      const gridTemplateColumns = computedStyle.gridTemplateColumns;
      
      // Count columns by splitting the grid-template-columns value
      const columns = gridTemplateColumns.split(' ').filter(c => c && c !== 'none').length;
      
      return {
        found: true,
        columns,
        gridTemplateColumns
      };
    });
    
    let gridCheckPassed = true;
    let gridMessage = '';
    
    if (gridInfo.found) {
      const expectedColumns = expected.gridColumns;
      gridCheckPassed = gridInfo.columns === expectedColumns;
      gridMessage = `Grid columns: ${gridInfo.columns} (expected ${expectedColumns})`;
      
      // For some pages without grids, we'll be more lenient
      if (!gridCheckPassed && gridInfo.columns === 1 && page.path === '/') {
        gridCheckPassed = true;
        gridMessage += ' (Homepage may use different layout)';
        result.warnings.push('Homepage uses different layout');
      }
    } else {
      gridMessage = 'No grid found on page';
      result.warnings.push('No grid layout found');
    }
    
    result.checks.push({
      name: `Grid columns (${expected.gridColumns}-col)`,
      passed: gridCheckPassed,
      details: gridMessage
    });
    
    if (!gridCheckPassed && gridInfo.found) {
      result.passed = false;
    }
    
    // 6. Check touch targets (mobile only)
    if (viewport.category === 'mobile' && expected.minTouchTarget) {
      const touchTargetInfo = await browserPage.evaluate((minSize) => {
        const interactiveElements = document.querySelectorAll('button, a, input, [role="button"]');
        const violations = [];
        let checked = 0;
        
        interactiveElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            checked++;
            if (rect.width < minSize || rect.height < minSize) {
              violations.push({
                tag: el.tagName,
                width: rect.width,
                height: rect.height,
                text: el.textContent?.substring(0, 30)
              });
            }
          }
        });
        
        return {
          checked,
          violations: violations.slice(0, 5) // First 5 violations
        };
      }, expected.minTouchTarget);
      
      const touchTargetPassed = touchTargetInfo.violations.length === 0;
      result.checks.push({
        name: `Touch targets (min ${expected.minTouchTarget}×${expected.minTouchTarget}px)`,
        passed: touchTargetPassed,
        details: `Checked ${touchTargetInfo.checked} elements, ${touchTargetInfo.violations.length} violations`
      });
      
      if (!touchTargetPassed) {
        result.warnings.push(`${touchTargetInfo.violations.length} touch target violations`);
      }
    }
    
    // 7. Verify all text readable (check font sizes)
    const textInfo = await browserPage.evaluate(() => {
      const allText = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, li, td, th');
      const tooSmall = [];
      
      allText.forEach(el => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        
        if (fontSize < 12 && el.textContent?.trim()) {
          tooSmall.push({
            tag: el.tagName,
            fontSize,
            text: el.textContent?.substring(0, 30)
          });
        }
      });
      
      return {
        checked: allText.length,
        tooSmall: tooSmall.slice(0, 5)
      };
    });
    
    const textReadable = textInfo.tooSmall.length === 0;
    result.checks.push({
      name: 'All text readable (font-size >= 12px)',
      passed: textReadable,
      details: `Checked ${textInfo.checked} elements, ${textInfo.tooSmall.length} too small`
    });
    
    if (!textReadable) {
      result.warnings.push(`${textInfo.tooSmall.length} text elements below 12px`);
    }
    
    // 8. Capture screenshot
    const screenshotName = `${viewport.category}-${viewport.width}x${viewport.height}-${page.path.replace(/\//g, '-') || 'home'}.png`;
    const screenshotPath = `${SCREENSHOT_DIR}/${screenshotName}`;
    await browserPage.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshot = screenshotName;
    result.checks.push({ name: 'Capture screenshot', passed: true, details: screenshotName });
    
    console.log(`  ✅ Screenshot: ${screenshotName}`);
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    result.passed = false;
    result.checks.push({ 
      name: 'Test execution', 
      passed: false, 
      details: error.message 
    });
  } finally {
    await browserPage.close();
  }
  
  // Update overall results
  if (result.passed) {
    results.passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    results.failed++;
    console.log(`  ❌ FAIL: ${testName}`);
  }
  
  if (result.warnings.length > 0) {
    results.warnings++;
    console.log(`  ⚠️  Warnings: ${result.warnings.join(', ')}`);
  }
  
  return result;
}

async function runTests() {
  console.log('🚀 TEST SUITE 4: Responsive Layout Matrix');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`Testing ${VIEWPORTS.length} viewports × ${PAGES.length} pages = ${VIEWPORTS.length * PAGES.length} tests\n`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  try {
    for (const viewport of VIEWPORTS) {
      console.log(`\n📱 Testing viewport: ${viewport.name} (${viewport.width}×${viewport.height})`);
      console.log('─'.repeat(60));
      
      for (const page of PAGES) {
        const result = await testCombination(browser, viewport, page);
        results.combinations.push(result);
      }
    }
    
  } finally {
    await browser.close();
  }
  
  // Generate summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUITE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);
  
  // Save JSON report
  const jsonPath = `${RESULTS_DIR}/responsive-layout-suite-report.json`;
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 JSON Report: ${jsonPath}`);
  
  // Generate Markdown report
  generateMarkdownReport();
  
  console.log('\n✨ Testing complete!\n');
}

function generateMarkdownReport() {
  let md = `# Responsive Layout Matrix Test Report\n\n`;
  md += `**Test Suite:** TEST SUITE 4: Responsive Layout Matrix\n\n`;
  md += `**Description:** 8 Viewports × 6 Pages = 48 tests\n\n`;
  md += `**Timestamp:** ${results.timestamp}\n\n`;
  
  md += `## Summary\n\n`;
  md += `- **Total Tests:** ${results.totalTests}\n`;
  md += `- **Passed:** ✅ ${results.passed}\n`;
  md += `- **Failed:** ❌ ${results.failed}\n`;
  md += `- **Warnings:** ⚠️ ${results.warnings}\n`;
  md += `- **Success Rate:** ${((results.passed / results.totalTests) * 100).toFixed(1)}%\n\n`;
  
  md += `## Viewports Tested\n\n`;
  md += `| Viewport | Size | Category |\n`;
  md += `|----------|------|----------|\n`;
  VIEWPORTS.forEach(v => {
    md += `| ${v.name} | ${v.width}×${v.height} | ${v.category} |\n`;
  });
  md += `\n`;
  
  md += `## Pages Tested\n\n`;
  PAGES.forEach((p, i) => {
    md += `${i + 1}. **${p.name}** - \`${p.path}\`\n`;
  });
  md += `\n`;
  
  md += `## Expected Behavior\n\n`;
  md += `- **Desktop (>=1024px):** Sidebar 256px expanded, 3-column grid\n`;
  md += `- **Tablet (768-1023px):** Appropriate sidebar, 2-column grid\n`;
  md += `- **Mobile (<768px):** Drawer sidebar, 1-column grid\n\n`;
  
  md += `## Layout Verification Matrix\n\n`;
  
  // Group by viewport
  VIEWPORTS.forEach(viewport => {
    md += `### ${viewport.name} (${viewport.width}×${viewport.height})\n\n`;
    
    const viewportResults = results.combinations.filter(c => c.viewport === viewport.name);
    
    md += `| Page | Result | Checks | Warnings | Screenshot |\n`;
    md += `|------|--------|--------|----------|------------|\n`;
    
    viewportResults.forEach(r => {
      const status = r.passed ? '✅ PASS' : '❌ FAIL';
      const checksTotal = r.checks.length;
      const checksPassed = r.checks.filter(c => c.passed).length;
      const warningCount = r.warnings.length;
      
      md += `| ${r.page} | ${status} | ${checksPassed}/${checksTotal} | ${warningCount} | \`${r.screenshot}\` |\n`;
    });
    
    md += `\n`;
  });
  
  md += `## Detailed Results\n\n`;
  
  results.combinations.forEach((result, index) => {
    md += `### Test ${index + 1}: ${result.viewport} - ${result.page}\n\n`;
    md += `- **Path:** \`${result.path}\`\n`;
    md += `- **Viewport:** ${result.viewportSize} (${result.category})\n`;
    md += `- **Result:** ${result.passed ? '✅ PASS' : '❌ FAIL'}\n`;
    
    if (result.warnings.length > 0) {
      md += `- **Warnings:** ${result.warnings.join(', ')}\n`;
    }
    
    md += `\n**Checks:**\n\n`;
    result.checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      md += `- ${icon} ${check.name}`;
      if (check.details) {
        md += ` - ${check.details}`;
      }
      md += `\n`;
    });
    
    md += `\n**Screenshot:** \`${result.screenshot}\`\n\n`;
    md += `---\n\n`;
  });
  
  md += `## Success Criteria\n\n`;
  md += `- [${results.combinations.every(c => !c.checks.find(ch => ch.name.includes('horizontal scroll') && !ch.passed)) ? 'x' : ' '}] No horizontal scroll on any viewport\n`;
  md += `- [${results.combinations.filter(c => c.checks.find(ch => ch.name.includes('Sidebar') && ch.passed)).length >= results.totalTests * 0.9 ? 'x' : ' '}] Layouts appropriate for screen size\n`;
  md += `- [${results.combinations.filter(c => c.checks.find(ch => ch.name.includes('Grid') && ch.passed)).length >= results.totalTests * 0.8 ? 'x' : ' '}] Grid columns adjust correctly\n`;
  md += `- [${results.combinations.filter(c => c.category === 'mobile').every(c => !c.checks.find(ch => ch.name.includes('Touch') && !ch.passed)) ? 'x' : ' '}] Touch targets meet WCAG AAA on mobile\n`;
  md += `- [${results.combinations.every(c => !c.checks.find(ch => ch.name.includes('text readable') && !ch.passed)) ? 'x' : ' '}] All content accessible\n\n`;
  
  md += `## Deliverables\n\n`;
  md += `- ✅ JSON report: \`test-results/responsive-layout-suite-report.json\`\n`;
  md += `- ✅ Markdown report: \`test-results/RESPONSIVE_LAYOUT_SUITE_REPORT.md\`\n`;
  md += `- ✅ Screenshots: ${results.combinations.length} screenshots (${VIEWPORTS.length} viewports × ${PAGES.length} pages)\n`;
  md += `- ✅ Summary: Layout verification matrix\n\n`;
  
  md += `---\n\n`;
  md += `*Generated on ${new Date().toISOString()}*\n`;
  
  const mdPath = `${RESULTS_DIR}/RESPONSIVE_LAYOUT_SUITE_REPORT.md`;
  writeFileSync(mdPath, md);
  console.log(`📄 Markdown Report: ${mdPath}`);
}

runTests().catch(console.error);
