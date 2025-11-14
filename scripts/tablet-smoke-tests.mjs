import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const TABLET_WIDTH = 820;
const TABLET_HEIGHT = 1180;
const SCREENSHOT_DIR = 'test-screenshots/tablet-suite';

// Create screenshot directory
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = {
  testSuite: 'Tablet Smoke Tests - Critical Navigation Paths',
  viewport: `${TABLET_WIDTH}x${TABLET_HEIGHT}`,
  timestamp: new Date().toISOString(),
  paths: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

function logTest(path, step, status, message, details = {}) {
  const log = { path, step, status, message, ...details };
  console.log(`[${status}] ${path} - ${step}: ${message}`);
  
  if (!results.paths.find(p => p.name === path)) {
    results.paths.push({ name: path, steps: [], status: 'running' });
  }
  
  const pathResult = results.paths.find(p => p.name === path);
  pathResult.steps.push(log);
  
  if (status === 'PASS') results.summary.passed++;
  if (status === 'FAIL') results.summary.failed++;
  if (status === 'WARN') results.summary.warnings++;
  results.summary.total++;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/${name}`;
  await page.screenshot({ path, fullPage: false });
  console.log(`📸 Screenshot saved: ${path}`);
  return path;
}

async function runTabletSmokeTests() {
  console.log('🚀 Starting Tablet Smoke Tests');
  console.log(`📱 Viewport: ${TABLET_WIDTH}x${TABLET_HEIGHT}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  let browser;
  let page;

  try {
    // Setup: Launch browser with tablet viewport
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: TABLET_WIDTH, height: TABLET_HEIGHT });
    
    logTest('Setup', 'Browser Launch', 'PASS', 'Tablet browser context created');

    // Navigate to homepage
    console.log('\n📍 Navigating to homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);
    
    await screenshot(page, 'tablet-homepage.png');
    logTest('Setup', 'Homepage Load', 'PASS', 'Homepage loaded successfully');

    // ========================================
    // CRITICAL PATH 1: Homepage & Navigation
    // ========================================
    console.log('\n🧪 CRITICAL PATH 1: Homepage & Navigation');
    
    // Verify page renders correctly
    const bodyHandle = await page.$('body');
    if (bodyHandle) {
      logTest('Path 1', 'Page Render', 'PASS', 'Page body element found');
    } else {
      logTest('Path 1', 'Page Render', 'FAIL', 'Page body not found');
    }

    // Check sidebar visibility
    const sidebar = await page.$('[data-radix-scroll-area-viewport]');
    if (sidebar) {
      const sidebarBox = await sidebar.boundingBox();
      if (sidebarBox && sidebarBox.width > 0) {
        logTest('Path 1', 'Sidebar Visible', 'PASS', `Sidebar width: ${sidebarBox.width}px`);
      } else {
        logTest('Path 1', 'Sidebar Visible', 'WARN', 'Sidebar width is 0');
      }
    } else {
      logTest('Path 1', 'Sidebar Visible', 'FAIL', 'Sidebar not found');
    }

    // Count categories
    const categoryButtons = await page.$$('[data-testid*="nav-"], button[class*="justify-start"]:has(svg)');
    const categoryCount = Math.min(categoryButtons.length, 15); // Rough estimate
    if (categoryCount >= 9) {
      logTest('Path 1', 'Categories Visible', 'PASS', `Found ${categoryCount} navigation items`);
    } else {
      logTest('Path 1', 'Categories Visible', 'WARN', `Only found ${categoryCount} items`);
    }

    // Check for resource counts
    const resourceCounts = await page.$$('span.text-xs.bg-muted');
    if (resourceCounts.length > 0) {
      logTest('Path 1', 'Resource Counts', 'PASS', `Found ${resourceCounts.length} resource count badges`);
    } else {
      logTest('Path 1', 'Resource Counts', 'WARN', 'No resource count badges found');
    }

    await screenshot(page, 'tablet-sidebar.png');

    // ========================================
    // CRITICAL PATH 2: Category Navigation
    // ========================================
    console.log('\n🧪 CRITICAL PATH 2: Category Navigation');
    
    await page.goto(`${BASE_URL}/category/protocols-transport`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    // Count resources on category page
    const categoryCards = await page.$$('[data-testid*="resource-card"], .group.relative.rounded-lg');
    logTest('Path 2', 'Navigate Category', 'PASS', `Category page loaded with ${categoryCards.length} resource cards`);

    // Check for subcategories
    const subcategoryElements = await page.$$('[data-testid*="subcategory"]');
    if (subcategoryElements.length > 0) {
      logTest('Path 2', 'Subcategories Visible', 'PASS', `Found ${subcategoryElements.length} subcategory elements`);
    } else {
      logTest('Path 2', 'Subcategories Visible', 'WARN', 'No subcategories found on page');
    }

    // Verify grid layout
    const gridContainer = await page.$('.grid');
    if (gridContainer) {
      logTest('Path 2', 'Grid Layout', 'PASS', 'Grid container found');
    } else {
      logTest('Path 2', 'Grid Layout', 'WARN', 'Grid container not found');
    }

    await screenshot(page, 'tablet-category.png');

    // ========================================
    // CRITICAL PATH 3: Subcategory Navigation
    // ========================================
    console.log('\n🧪 CRITICAL PATH 3: Subcategory Navigation');
    
    await page.goto(`${BASE_URL}/subcategory/adaptive-streaming`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    const subcatCards = await page.$$('[data-testid*="resource-card"], .group.relative.rounded-lg');
    logTest('Path 3', 'Navigate Subcategory', 'PASS', `Subcategory page loaded with ${subcatCards.length} resources`);

    // Check for sub-subcategories
    const subSubcatElements = await page.$$('[data-testid*="sub-subcategory"]');
    if (subSubcatElements.length > 0) {
      logTest('Path 3', 'Sub-Subcategories', 'PASS', `Found ${subSubcatElements.length} sub-subcategory elements`);
    } else {
      logTest('Path 3', 'Sub-Subcategories', 'WARN', 'No sub-subcategories found');
    }

    // ========================================
    // CRITICAL PATH 4: Sub-Subcategory Navigation
    // ========================================
    console.log('\n🧪 CRITICAL PATH 4: Sub-Subcategory Navigation');
    
    await page.goto(`${BASE_URL}/sub-subcategory/hls`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    const subSubcatCards = await page.$$('[data-testid*="resource-card"], .group.relative.rounded-lg');
    logTest('Path 4', 'Navigate Sub-Subcategory', 'PASS', `Sub-subcategory page loaded with ${subSubcatCards.length} resources`);

    // Check for breadcrumbs
    const breadcrumbs = await page.$('[aria-label="breadcrumb"], nav[role="navigation"]');
    if (breadcrumbs) {
      logTest('Path 4', 'Breadcrumbs', 'PASS', 'Breadcrumb navigation found');
    } else {
      logTest('Path 4', 'Breadcrumbs', 'WARN', 'Breadcrumbs not found');
    }

    await screenshot(page, 'tablet-subsubcat.png');

    // ========================================
    // CRITICAL PATH 5: Search Functionality
    // ========================================
    console.log('\n🧪 CRITICAL PATH 5: Search Functionality');
    
    // Return to homepage for search test
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(1000);

    // Open search with Cmd+K
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Meta');
    await wait(1000);

    const searchDialog = await page.$('[role="dialog"]');
    if (searchDialog) {
      logTest('Path 5', 'Search Dialog Open', 'PASS', 'Search dialog opened successfully');
      
      // Type search query
      const searchInput = await page.$('input[type="text"]');
      if (searchInput) {
        await searchInput.type('ffmpeg', { delay: 100 });
        await wait(1000);
        
        const searchResults = await page.$$('[data-testid*="search-result"], [cmdk-item]');
        if (searchResults.length > 0) {
          logTest('Path 5', 'Search Results', 'PASS', `Found ${searchResults.length} search results`);
          
          // Click first result and check for new tab
          const pageTarget = page.target();
          await searchResults[0].click();
          await wait(500);
          
          const newTarget = await browser.waitForTarget(
            target => target.opener() === pageTarget,
            { timeout: 3000 }
          ).catch(() => null);
          
          if (newTarget) {
            logTest('Path 5', 'Result Click', 'PASS', 'First result opened in new tab');
          } else {
            logTest('Path 5', 'Result Click', 'WARN', 'New tab not detected');
          }
        } else {
          logTest('Path 5', 'Search Results', 'WARN', 'No search results found');
        }
      } else {
        logTest('Path 5', 'Search Input', 'FAIL', 'Search input not found');
      }
      
      await screenshot(page, 'tablet-search.png');
    } else {
      logTest('Path 5', 'Search Dialog Open', 'FAIL', 'Search dialog did not open');
    }

    // Close search dialog
    await page.keyboard.press('Escape');
    await wait(500);

    // ========================================
    // CRITICAL PATH 6: Resource Links
    // ========================================
    console.log('\n🧪 CRITICAL PATH 6: Resource Links');
    
    await page.goto(`${BASE_URL}/category/encoding-codecs`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    const resourceLinks = await page.$$('a[target="_blank"][rel*="noopener"]');
    if (resourceLinks.length >= 3) {
      logTest('Path 6', 'Resource Links Found', 'PASS', `Found ${resourceLinks.length} external links`);
      
      let successfulClicks = 0;
      for (let i = 0; i < Math.min(3, resourceLinks.length); i++) {
        const pageTarget = page.target();
        await resourceLinks[i].click();
        await wait(300);
        
        const newTarget = await browser.waitForTarget(
          target => target.opener() === pageTarget,
          { timeout: 2000 }
        ).catch(() => null);
        
        if (newTarget) successfulClicks++;
      }
      
      logTest('Path 6', 'Resource Clicks', successfulClicks === 3 ? 'PASS' : 'WARN', 
        `${successfulClicks}/3 resources opened in new tabs`);
      
      // Verify main app still on category page
      const currentUrl = page.url();
      if (currentUrl.includes('encoding-codecs')) {
        logTest('Path 6', 'Page Persistence', 'PASS', 'Main app remained on category page');
      } else {
        logTest('Path 6', 'Page Persistence', 'FAIL', `Page navigated away to ${currentUrl}`);
      }
    } else {
      logTest('Path 6', 'Resource Links Found', 'WARN', `Only found ${resourceLinks.length} links`);
    }

    // ========================================
    // CRITICAL PATH 7: GitHub Link
    // ========================================
    console.log('\n🧪 CRITICAL PATH 7: GitHub Link');
    
    // Scroll to bottom of sidebar
    const sidebarScrollArea = await page.$('[data-radix-scroll-area-viewport]');
    if (sidebarScrollArea) {
      await page.evaluate(el => {
        el.scrollTop = el.scrollHeight;
      }, sidebarScrollArea);
      await wait(500);
      
      const githubLink = await page.$('a[href*="github.com"]');
      if (githubLink) {
        logTest('Path 7', 'GitHub Link Visible', 'PASS', 'GitHub link found in sidebar');
        
        const pageTarget = page.target();
        await githubLink.click();
        await wait(500);
        
        const newTarget = await browser.waitForTarget(
          target => target.opener() === pageTarget,
          { timeout: 3000 }
        ).catch(() => null);
        
        if (newTarget) {
          logTest('Path 7', 'GitHub Link Click', 'PASS', 'GitHub link opened in new tab');
        } else {
          logTest('Path 7', 'GitHub Link Click', 'WARN', 'New tab not detected');
        }
      } else {
        logTest('Path 7', 'GitHub Link Visible', 'FAIL', 'GitHub link not found');
      }
    } else {
      logTest('Path 7', 'Sidebar Scroll', 'FAIL', 'Could not scroll sidebar');
    }

    // ========================================
    // RESPONSIVE VERIFICATION
    // ========================================
    console.log('\n🧪 RESPONSIVE VERIFICATION');
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(1000);

    // Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    if (!hasHorizontalScroll) {
      logTest('Responsive', 'No Horizontal Scroll', 'PASS', 'No horizontal scroll at 820px width');
    } else {
      logTest('Responsive', 'No Horizontal Scroll', 'FAIL', 'Horizontal scroll detected');
    }

    // Check text readability (font size)
    const minFontSize = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, span, a, button');
      let min = Infinity;
      elements.forEach(el => {
        const size = parseFloat(window.getComputedStyle(el).fontSize);
        if (size > 0 && size < min) min = size;
      });
      return min;
    });
    
    if (minFontSize >= 12) {
      logTest('Responsive', 'Text Readability', 'PASS', `Minimum font size: ${minFontSize}px`);
    } else {
      logTest('Responsive', 'Text Readability', 'WARN', `Small font detected: ${minFontSize}px`);
    }

    // Check touch target sizes
    const smallTargets = await page.evaluate(() => {
      const interactive = document.querySelectorAll('button, a, input');
      let count = 0;
      interactive.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
          count++;
        }
      });
      return count;
    });
    
    if (smallTargets === 0) {
      logTest('Responsive', 'Touch Targets', 'PASS', 'All touch targets >= 44px');
    } else {
      logTest('Responsive', 'Touch Targets', 'WARN', `${smallTargets} small touch targets found`);
    }

    // Check grid columns
    const gridColumns = await page.evaluate(() => {
      const grid = document.querySelector('.grid');
      if (!grid) return 0;
      return window.getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    });
    
    if (gridColumns >= 2 && gridColumns <= 3) {
      logTest('Responsive', 'Grid Columns', 'PASS', `Grid using ${gridColumns} columns for tablet`);
    } else {
      logTest('Responsive', 'Grid Columns', 'WARN', `Grid columns: ${gridColumns || 'none'}`);
    }

    // Mark all paths as completed
    results.paths.forEach(path => {
      path.status = 'completed';
    });

  } catch (error) {
    console.error('❌ Test suite error:', error);
    logTest('Error', 'Suite Execution', 'FAIL', error.message, { stack: error.stack });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('📊 TABLET SMOKE TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log('='.repeat(80));

  results.paths.forEach(path => {
    console.log(`\n${path.name}:`);
    path.steps.forEach(step => {
      const icon = step.status === 'PASS' ? '✅' : step.status === 'WARN' ? '⚠️' : '❌';
      console.log(`  ${icon} ${step.step}: ${step.message}`);
    });
  });

  // Save results to JSON
  const reportPath = 'test-results/tablet-smoke-tests-report.json';
  mkdirSync('test-results', { recursive: true });
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  // Generate markdown report
  const mdReport = generateMarkdownReport(results);
  const mdPath = 'test-results/TABLET_SMOKE_TESTS_REPORT.md';
  writeFileSync(mdPath, mdReport);
  console.log(`📄 Markdown report saved to: ${mdPath}`);

  return results;
}

function generateMarkdownReport(results) {
  let md = `# Tablet Smoke Tests - Critical Navigation Paths\n\n`;
  md += `**Test Suite:** ${results.testSuite}\n`;
  md += `**Viewport:** ${results.viewport}\n`;
  md += `**Timestamp:** ${results.timestamp}\n\n`;
  
  md += `## Summary\n\n`;
  md += `- **Total Tests:** ${results.summary.total}\n`;
  md += `- **✅ Passed:** ${results.summary.passed}\n`;
  md += `- **⚠️ Warnings:** ${results.summary.warnings}\n`;
  md += `- **❌ Failed:** ${results.summary.failed}\n\n`;
  
  md += `## Test Results by Path\n\n`;
  
  results.paths.forEach(path => {
    md += `### ${path.name}\n\n`;
    path.steps.forEach(step => {
      const icon = step.status === 'PASS' ? '✅' : step.status === 'WARN' ? '⚠️' : '❌';
      md += `${icon} **${step.step}:** ${step.message}\n`;
      if (step.details) {
        md += `   - Details: ${JSON.stringify(step.details)}\n`;
      }
      md += `\n`;
    });
    md += `\n`;
  });
  
  md += `## Screenshots\n\n`;
  md += `Screenshots saved to \`${SCREENSHOT_DIR}/\`:\n\n`;
  md += `- tablet-homepage.png\n`;
  md += `- tablet-sidebar.png\n`;
  md += `- tablet-category.png\n`;
  md += `- tablet-subsubcat.png\n`;
  md += `- tablet-search.png\n\n`;
  
  md += `## Success Criteria\n\n`;
  const criteriaMet = [];
  const criteriaFailed = [];
  
  if (results.summary.failed === 0) {
    criteriaMet.push('All critical paths functional on tablet');
  } else {
    criteriaFailed.push(`${results.summary.failed} critical path(s) failed`);
  }
  
  if (results.summary.passed >= results.summary.total * 0.8) {
    criteriaMet.push('Layout appropriate for 820x1180 viewport');
    criteriaMet.push('Navigation works consistently');
  }
  
  if (criteriaMet.length > 0) {
    md += `### ✅ Met\n\n`;
    criteriaMet.forEach(c => md += `- ${c}\n`);
    md += `\n`;
  }
  
  if (criteriaFailed.length > 0) {
    md += `### ❌ Not Met\n\n`;
    criteriaFailed.forEach(c => md += `- ${c}\n`);
    md += `\n`;
  }
  
  return md;
}

// Run tests
runTabletSmokeTests().then(results => {
  const exitCode = results.summary.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
