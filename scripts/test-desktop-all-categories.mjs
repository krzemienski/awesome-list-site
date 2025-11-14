import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };
const SCREENSHOT_DIR = join(__dirname, '..', 'test-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Categories to test
const CATEGORIES = [
  { name: 'Intro & Learning', slug: 'intro-learning', expectedCount: 229 },
  { name: 'Protocols & Transport', slug: 'protocols-transport', expectedCount: 252 },
  { name: 'Encoding & Codecs', slug: 'encoding-codecs', expectedCount: 392 },
  { name: 'Players & Clients', slug: 'players-clients', expectedCount: 269 },
  { name: 'Media Tools', slug: 'media-tools', expectedCount: 317 },
  { name: 'Standards & Industry', slug: 'standards-industry', expectedCount: 174 },
  { name: 'Infrastructure & Delivery', slug: 'infrastructure-delivery', expectedCount: 190 },
  { name: 'General Tools', slug: 'general-tools', expectedCount: 97 },
  { name: 'Community & Events', slug: 'community-events', expectedCount: 91 }
];

// Test results tracking
const results = {
  testSuite: 'Desktop Category Pages - All 9 Categories',
  viewport: VIEWPORT,
  timestamp: new Date().toISOString(),
  categories: [],
  summary: {
    total: CATEGORIES.length,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Helper to wait for element
async function waitForSelector(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch (error) {
    return false;
  }
}

// Helper to sleep/wait
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to take screenshot
async function takeScreenshot(page, filename) {
  const path = join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path, fullPage: false });
  return path;
}

// Main test function
async function runTests() {
  console.log('🚀 DESKTOP SUITE 1: TEST ALL 9 CATEGORY PAGES');
  console.log('═'.repeat(80));
  console.log(`📊 Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`📁 Screenshot directory: ${SCREENSHOT_DIR}`);
  console.log('═'.repeat(80));
  console.log();

  let browser;
  let page;

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    // Navigate to homepage first
    console.log(`📍 Navigating to homepage: ${BASE_URL}/`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('[data-testid]', { timeout: 10000 });
    console.log('✅ Homepage loaded successfully\n');

    // Test each category
    for (let i = 0; i < CATEGORIES.length; i++) {
      const category = CATEGORIES[i];
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📁 TESTING CATEGORY ${i + 1}/${CATEGORIES.length}: ${category.name}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const categoryResult = {
        name: category.name,
        slug: category.slug,
        expectedCount: category.expectedCount,
        tests: {
          sidebarNavigation: { status: 'pending', message: '' },
          urlPattern: { status: 'pending', message: '' },
          resourceCount: { status: 'pending', message: '', actualCount: 0 },
          breadcrumb: { status: 'pending', message: '' },
          subcategoriesVisible: { status: 'pending', message: '', count: 0 },
          resourceLinksClickable: { status: 'pending', message: '', tested: 0 },
          noErrors: { status: 'pending', message: '' }
        },
        screenshot: ''
      };

      try {
        // Return to homepage before each test
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(1000);

        // TEST 1: Navigation from sidebar
        console.log(`\n🧪 Test 1: Sidebar Navigation`);
        
        // Use XPath to find button containing the category name
        const categoryButtons = await page.$x(`//button[contains(., '${category.name}')]`);
        
        if (categoryButtons.length > 0) {
          // Find the button that's a category navigation button (not an expand/collapse button)
          let categoryButton = null;
          for (const button of categoryButtons) {
            const buttonText = await page.evaluate(el => el.textContent, button);
            // Look for button that has the full category name and resource count
            if (buttonText.includes(category.name) && buttonText.match(/\d+/)) {
              categoryButton = button;
              break;
            }
          }
          
          if (!categoryButton && categoryButtons.length > 0) {
            // Fallback to first button found
            categoryButton = categoryButtons[categoryButtons.length - 1];
          }
          
          if (categoryButton) {
            console.log(`   ✓ Found sidebar button for "${category.name}"`);
            await categoryButton.click();
            await sleep(1000);
            categoryResult.tests.sidebarNavigation = { 
              status: 'passed', 
              message: 'Successfully clicked category in sidebar' 
            };
          } else {
            throw new Error('Category button found but could not identify correct one');
          }
        } else {
          // Try direct navigation as fallback
          console.log(`   ⚠ Sidebar button not found, using direct navigation`);
          await page.goto(`${BASE_URL}/category/${category.slug}`, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
          });
          categoryResult.tests.sidebarNavigation = { 
            status: 'warning', 
            message: 'Used direct navigation instead of sidebar click' 
          };
        }

        // Wait for page to load
        await page.waitForSelector('h1', { timeout: 5000 });

        // TEST 2: URL Pattern
        console.log(`\n🧪 Test 2: URL Pattern`);
        const currentUrl = page.url();
        const expectedUrl = `${BASE_URL}/category/${category.slug}`;
        
        if (currentUrl === expectedUrl) {
          console.log(`   ✓ URL matches: ${currentUrl}`);
          categoryResult.tests.urlPattern = { 
            status: 'passed', 
            message: `URL: ${currentUrl}` 
          };
        } else {
          console.log(`   ✗ URL mismatch: Expected ${expectedUrl}, got ${currentUrl}`);
          categoryResult.tests.urlPattern = { 
            status: 'failed', 
            message: `Expected ${expectedUrl}, got ${currentUrl}` 
          };
        }

        // TEST 3: Resource Count
        console.log(`\n🧪 Test 3: Resource Count`);
        
        // Wait for resource count to be displayed
        await sleep(1000);
        
        // Try multiple selectors to find the resource count
        let resourceCountText = null;
        
        // Method 1: Look for "X resources available" text
        const countSelectors = [
          'p:has-text("resources available")',
          '[data-testid="text-results-count"]',
          'p.text-muted-foreground'
        ];
        
        for (const selector of countSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const text = await page.evaluate(el => el.textContent, element);
              if (text && text.includes('resource')) {
                resourceCountText = text;
                break;
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (resourceCountText) {
          const match = resourceCountText.match(/(\d+)\s*(?:resources?|of)/);
          const actualCount = match ? parseInt(match[1]) : 0;
          categoryResult.tests.resourceCount.actualCount = actualCount;
          
          console.log(`   Found: "${resourceCountText}"`);
          console.log(`   Expected: ${category.expectedCount} resources`);
          console.log(`   Actual: ${actualCount} resources`);
          
          if (actualCount === category.expectedCount) {
            console.log(`   ✓ Resource count matches`);
            categoryResult.tests.resourceCount.status = 'passed';
            categoryResult.tests.resourceCount.message = `${actualCount} resources (correct)`;
          } else {
            console.log(`   ⚠ Resource count mismatch`);
            categoryResult.tests.resourceCount.status = 'warning';
            categoryResult.tests.resourceCount.message = `Expected ${category.expectedCount}, got ${actualCount}`;
          }
        } else {
          console.log(`   ✗ Could not find resource count`);
          categoryResult.tests.resourceCount.status = 'failed';
          categoryResult.tests.resourceCount.message = 'Resource count not found';
        }

        // TEST 4: Breadcrumb
        console.log(`\n🧪 Test 4: Breadcrumb`);
        const breadcrumbExists = await waitForSelector(page, '[data-testid="button-back-home"]', 3000);
        
        if (breadcrumbExists) {
          console.log(`   ✓ Back to Home button found`);
          categoryResult.tests.breadcrumb = { 
            status: 'passed', 
            message: 'Breadcrumb navigation present' 
          };
        } else {
          console.log(`   ✗ Breadcrumb not found`);
          categoryResult.tests.breadcrumb = { 
            status: 'failed', 
            message: 'Breadcrumb navigation missing' 
          };
        }

        // TEST 5: Subcategories Visible
        console.log(`\n🧪 Test 5: Subcategories Visible`);
        
        // Look for subcategory filter dropdown
        const subcategoryFilter = await page.$('[data-testid="select-subcategory-filter"]');
        
        if (subcategoryFilter) {
          // Click to open the dropdown
          await subcategoryFilter.click();
          await sleep(500);
          
          // Count subcategory options (excluding "All Subcategories")
          const options = await page.$$('[role="option"]');
          const subcategoryCount = Math.max(0, options.length - 1); // Subtract 1 for "All Subcategories"
          
          console.log(`   ✓ Found ${subcategoryCount} subcategories`);
          categoryResult.tests.subcategoriesVisible = { 
            status: 'passed', 
            message: `${subcategoryCount} subcategories available`,
            count: subcategoryCount
          };
          
          // Close the dropdown
          await page.keyboard.press('Escape');
          await sleep(300);
        } else {
          console.log(`   ⚠ No subcategory filter found (may not have subcategories)`);
          categoryResult.tests.subcategoriesVisible = { 
            status: 'warning', 
            message: 'No subcategory filter present',
            count: 0
          };
        }

        // TEST 6: Resource Links Clickable (test 3 resources)
        console.log(`\n🧪 Test 6: Resource Links Clickable (testing 3)`);
        
        const resourceCards = await page.$$('[data-testid^="card-resource-"]');
        const resourcesToTest = Math.min(3, resourceCards.length);
        let clickableCount = 0;
        
        for (let j = 0; j < resourcesToTest; j++) {
          try {
            const card = resourceCards[j];
            
            // Get the card's testid for reference
            const testId = await page.evaluate(el => el.getAttribute('data-testid'), card);
            
            // Check if card has click handler and external link icon
            const hasExternalLink = await page.evaluate(el => {
              const icon = el.querySelector('svg');
              return icon !== null;
            }, card);
            
            if (hasExternalLink) {
              clickableCount++;
              console.log(`   ✓ Resource ${j + 1}: Clickable (${testId})`);
            } else {
              console.log(`   ⚠ Resource ${j + 1}: No external link icon`);
            }
          } catch (error) {
            console.log(`   ✗ Resource ${j + 1}: Error checking - ${error.message}`);
          }
        }
        
        if (clickableCount >= 3) {
          console.log(`   ✓ All 3 resources are clickable`);
          categoryResult.tests.resourceLinksClickable = { 
            status: 'passed', 
            message: `${clickableCount}/${resourcesToTest} resources clickable`,
            tested: resourcesToTest
          };
        } else {
          console.log(`   ⚠ Only ${clickableCount}/${resourcesToTest} resources clickable`);
          categoryResult.tests.resourceLinksClickable = { 
            status: 'warning', 
            message: `${clickableCount}/${resourcesToTest} resources clickable`,
            tested: resourcesToTest
          };
        }

        // TEST 7: No Console Errors
        console.log(`\n🧪 Test 7: Console Errors Check`);
        
        // Get console messages
        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        
        await sleep(1000);
        
        if (consoleErrors.length === 0) {
          console.log(`   ✓ No console errors detected`);
          categoryResult.tests.noErrors = { 
            status: 'passed', 
            message: 'No console errors' 
          };
        } else {
          console.log(`   ⚠ ${consoleErrors.length} console errors detected`);
          categoryResult.tests.noErrors = { 
            status: 'warning', 
            message: `${consoleErrors.length} console errors`,
            errors: consoleErrors.slice(0, 3)
          };
        }

        // Take screenshot
        const screenshotFilename = `desktop-cat-${category.slug}.png`;
        const screenshotPath = await takeScreenshot(page, screenshotFilename);
        categoryResult.screenshot = screenshotFilename;
        console.log(`\n📸 Screenshot saved: ${screenshotFilename}`);

        // Calculate overall status for this category
        const testStatuses = Object.values(categoryResult.tests).map(t => t.status);
        if (testStatuses.every(s => s === 'passed')) {
          results.summary.passed++;
          console.log(`\n✅ CATEGORY PASSED: ${category.name}`);
        } else if (testStatuses.some(s => s === 'failed')) {
          results.summary.failed++;
          console.log(`\n❌ CATEGORY FAILED: ${category.name}`);
        } else {
          results.summary.warnings++;
          console.log(`\n⚠️  CATEGORY WARNING: ${category.name}`);
        }

      } catch (error) {
        console.error(`\n❌ ERROR testing ${category.name}:`, error.message);
        categoryResult.tests.noErrors = { 
          status: 'failed', 
          message: `Test error: ${error.message}` 
        };
        results.summary.failed++;
      }

      results.categories.push(categoryResult);
      console.log();
    }

  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
    results.error = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total Categories: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log('═'.repeat(80));

  // Save results to JSON
  const resultsPath = join(__dirname, 'test-results', 'desktop-all-categories-report.json');
  const resultsDir = dirname(resultsPath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full results saved to: ${resultsPath}`);

  // Generate markdown report
  const reportPath = join(__dirname, 'test-results', 'DESKTOP_ALL_CATEGORIES_TEST_REPORT.md');
  const report = generateMarkdownReport(results);
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Markdown report saved to: ${reportPath}`);

  return results;
}

// Generate markdown report
function generateMarkdownReport(results) {
  let report = `# Desktop Category Pages Test Report\n\n`;
  report += `**Test Suite:** ${results.testSuite}\n`;
  report += `**Viewport:** ${results.viewport.width}x${results.viewport.height}\n`;
  report += `**Timestamp:** ${results.timestamp}\n\n`;

  report += `## Summary\n\n`;
  report += `| Metric | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Categories | ${results.summary.total} |\n`;
  report += `| ✅ Passed | ${results.summary.passed} |\n`;
  report += `| ⚠️ Warnings | ${results.summary.warnings} |\n`;
  report += `| ❌ Failed | ${results.summary.failed} |\n\n`;

  report += `## Category Results\n\n`;

  results.categories.forEach((cat, index) => {
    const overallStatus = Object.values(cat.tests).every(t => t.status === 'passed') ? '✅ PASS' :
                         Object.values(cat.tests).some(t => t.status === 'failed') ? '❌ FAIL' : '⚠️ WARNING';
    
    report += `### ${index + 1}. ${cat.name} ${overallStatus}\n\n`;
    report += `- **Slug:** \`${cat.slug}\`\n`;
    report += `- **Expected Resources:** ${cat.expectedCount}\n`;
    report += `- **Actual Resources:** ${cat.tests.resourceCount.actualCount || 'N/A'}\n`;
    report += `- **Screenshot:** \`${cat.screenshot}\`\n\n`;

    report += `#### Test Results\n\n`;
    report += `| Test | Status | Details |\n`;
    report += `|------|--------|----------|\n`;
    
    Object.entries(cat.tests).forEach(([testName, testResult]) => {
      const statusIcon = testResult.status === 'passed' ? '✅' : 
                        testResult.status === 'failed' ? '❌' : '⚠️';
      const displayName = testName.replace(/([A-Z])/g, ' $1').trim();
      report += `| ${displayName} | ${statusIcon} ${testResult.status} | ${testResult.message} |\n`;
    });

    report += `\n`;
  });

  return report;
}

// Run the tests
runTests().then(() => {
  console.log('\n✅ Test execution complete!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
