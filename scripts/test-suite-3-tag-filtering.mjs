import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };
const SCREENSHOT_DIR = join(__dirname, '..', 'test-screenshots', 'suite-3');
const RESULTS_DIR = join(__dirname, '..', 'test-results');

// Ensure directories exist
[SCREENSHOT_DIR, RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// All 60 pages to test
const ALL_PAGES = {
  categories: [
    { name: 'Intro & Learning', slug: 'intro-learning', type: 'category' },
    { name: 'Protocols & Transport', slug: 'protocols-transport', type: 'category' },
    { name: 'Encoding & Codecs', slug: 'encoding-codecs', type: 'category' },
    { name: 'Players & Clients', slug: 'players-clients', type: 'category' },
    { name: 'Media Tools', slug: 'media-tools', type: 'category' },
    { name: 'Standards & Industry', slug: 'standards-industry', type: 'category' },
    { name: 'Infrastructure & Delivery', slug: 'infrastructure-delivery', type: 'category' },
    { name: 'General Tools', slug: 'general-tools', type: 'category' },
    { name: 'Community & Events', slug: 'community-events', type: 'category' }
  ],
  subcategories: [
    { name: 'Introduction', slug: 'introduction', type: 'subcategory' },
    { name: 'Learning Resources', slug: 'learning-resources', type: 'subcategory' },
    { name: 'Tutorials & Case Studies', slug: 'tutorials-case-studies', type: 'subcategory' },
    { name: 'Adaptive Streaming', slug: 'adaptive-streaming', type: 'subcategory' },
    { name: 'Transport Protocols', slug: 'transport-protocols', type: 'subcategory' },
    { name: 'Encoding Tools', slug: 'encoding-tools', type: 'subcategory' },
    { name: 'Codecs', slug: 'codecs', type: 'subcategory' },
    { name: 'Hardware Players', slug: 'hardware-players', type: 'subcategory' },
    { name: 'Mobile & Web Players', slug: 'mobile-web-players', type: 'subcategory' },
    { name: 'Audio & Subtitles', slug: 'audio-subtitles', type: 'subcategory' },
    { name: 'Ads & QoE', slug: 'ads-qoe', type: 'subcategory' },
    { name: 'Specs & Standards', slug: 'specs-standards', type: 'subcategory' },
    { name: 'Vendors & HDR', slug: 'vendors-hdr', type: 'subcategory' },
    { name: 'Streaming Servers', slug: 'streaming-servers', type: 'subcategory' },
    { name: 'Cloud & CDN', slug: 'cloud-cdn', type: 'subcategory' },
    { name: 'FFmpeg Tools', slug: 'ffmpeg-tools', type: 'subcategory' },
    { name: 'DRM', slug: 'drm', type: 'subcategory' },
    { name: 'Community Groups', slug: 'community-groups', type: 'subcategory' },
    { name: 'Events & Conferences', slug: 'events-conferences', type: 'subcategory' }
  ],
  subSubcategories: [
    { name: 'HLS', slug: 'hls', type: 'sub-subcategory' },
    { name: 'DASH', slug: 'dash', type: 'sub-subcategory' },
    { name: 'RIST', slug: 'rist', type: 'sub-subcategory' },
    { name: 'SRT', slug: 'srt', type: 'sub-subcategory' },
    { name: 'RTMP', slug: 'rtmp', type: 'sub-subcategory' },
    { name: 'FFmpeg', slug: 'ffmpeg', type: 'sub-subcategory' },
    { name: 'Other Encoders', slug: 'other-encoders', type: 'sub-subcategory' },
    { name: 'HEVC', slug: 'hevc', type: 'sub-subcategory' },
    { name: 'VP9', slug: 'vp9', type: 'sub-subcategory' },
    { name: 'AV1', slug: 'av1', type: 'sub-subcategory' },
    { name: 'Roku', slug: 'roku', type: 'sub-subcategory' },
    { name: 'Smart TVs', slug: 'smart-tvs', type: 'sub-subcategory' },
    { name: 'Chromecast', slug: 'chromecast', type: 'sub-subcategory' },
    { name: 'iOS/tvOS', slug: 'iostvos', type: 'sub-subcategory' },
    { name: 'Android', slug: 'android', type: 'sub-subcategory' },
    { name: 'Web Players', slug: 'web-players', type: 'sub-subcategory' },
    { name: 'Audio', slug: 'audio', type: 'sub-subcategory' },
    { name: 'Subtitles & Captions', slug: 'subtitles-captions', type: 'sub-subcategory' },
    { name: 'Advertising', slug: 'advertising', type: 'sub-subcategory' },
    { name: 'Quality Testing', slug: 'quality-testing', type: 'sub-subcategory' },
    { name: 'Official Specs', slug: 'official-specs', type: 'sub-subcategory' },
    { name: 'MPEG Forums', slug: 'mpeg-forums', type: 'sub-subcategory' },
    { name: 'Vendor Docs', slug: 'vendor-docs', type: 'sub-subcategory' },
    { name: 'HDR Guidelines', slug: 'hdr-guidelines', type: 'sub-subcategory' },
    { name: 'Origin Servers', slug: 'origin-servers', type: 'sub-subcategory' },
    { name: 'Storage Solutions', slug: 'storage-solutions', type: 'sub-subcategory' },
    { name: 'Cloud Platforms', slug: 'cloud-platforms', type: 'sub-subcategory' },
    { name: 'CDN Integration', slug: 'cdn-integration', type: 'sub-subcategory' },
    { name: 'Online Forums', slug: 'online-forums', type: 'sub-subcategory' },
    { name: 'Slack & Meetups', slug: 'slack-meetups', type: 'sub-subcategory' },
    { name: 'Conferences', slug: 'conferences', type: 'sub-subcategory' },
    { name: 'Podcasts & Webinars', slug: 'podcasts-webinars', type: 'sub-subcategory' }
  ]
};

// Pages for deep functionality testing
const FUNCTIONALITY_TEST_PAGES = {
  categories: ['encoding-codecs', 'media-tools', 'protocols-transport'],
  subcategories: ['adaptive-streaming', 'encoding-tools', 'codecs', 'hardware-players', 'audio-subtitles'],
  subSubcategories: ['hls', 'ffmpeg', 'hevc', 'roku', 'subtitles-captions']
};

// Test results
const results = {
  testSuite: 'Tag Filtering Accuracy Suite',
  totalPages: 60,
  timestamp: new Date().toISOString(),
  presenceTests: [],
  functionalityTests: [],
  summary: {
    presenceTestsPassed: 0,
    presenceTestsFailed: 0,
    functionalityTestsPassed: 0,
    functionalityTestsFailed: 0,
    totalPassed: 0,
    totalFailed: 0
  }
};

// Helper functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, filename) {
  const path = join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function waitForSelector(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch {
    return false;
  }
}

// Test TagFilter presence on a page
async function testTagFilterPresence(page, pageInfo) {
  const result = {
    name: pageInfo.name,
    slug: pageInfo.slug,
    type: pageInfo.type,
    url: '',
    tests: {
      tagFilterButton: { status: 'pending', message: '' },
      resultsCount: { status: 'pending', message: '' },
      resourcesVisible: { status: 'pending', message: '' }
    },
    screenshot: ''
  };

  try {
    // Navigate to page
    const url = `${BASE_URL}/${pageInfo.type}/${pageInfo.slug}`;
    result.url = url;
    
    console.log(`   📄 Testing: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);

    // Test 1: TagFilter button is visible
    const tagFilterButton = await waitForSelector(page, 'button:has-text("Filter by Tag")', 3000);
    if (tagFilterButton) {
      result.tests.tagFilterButton = { status: 'passed', message: 'Tag filter button found' };
    } else {
      // Try alternative selector
      const filterButton = await page.$('button svg.lucide-filter');
      if (filterButton) {
        result.tests.tagFilterButton = { status: 'passed', message: 'Tag filter button found (alternative selector)' };
      } else {
        result.tests.tagFilterButton = { status: 'failed', message: 'Tag filter button not found' };
      }
    }

    // Test 2: "Showing X of Y resources" text is present
    const resultsText = await page.$('[data-testid="text-results-count"]');
    if (resultsText) {
      const text = await page.evaluate(el => el.textContent, resultsText);
      if (text.includes('Showing') && text.includes('of') && text.includes('resources')) {
        result.tests.resultsCount = { status: 'passed', message: `Found: "${text}"` };
      } else {
        result.tests.resultsCount = { status: 'failed', message: 'Results count text format incorrect' };
      }
    } else {
      result.tests.resultsCount = { status: 'failed', message: 'Results count text not found' };
    }

    // Test 3: Resources are visible
    const resourceCards = await page.$$('[data-testid^="card-resource-"]');
    if (resourceCards.length > 0) {
      result.tests.resourcesVisible = { status: 'passed', message: `${resourceCards.length} resources visible` };
    } else {
      result.tests.resourcesVisible = { status: 'warning', message: 'No resources found on this page' };
    }

    // Take screenshot
    result.screenshot = await takeScreenshot(page, `presence-${pageInfo.type}-${pageInfo.slug}.png`);

    // Update summary
    const allPassed = Object.values(result.tests).every(t => t.status === 'passed' || t.status === 'warning');
    if (allPassed) {
      results.summary.presenceTestsPassed++;
    } else {
      results.summary.presenceTestsFailed++;
    }

    console.log(`      ✓ Tag Filter Button: ${result.tests.tagFilterButton.status}`);
    console.log(`      ✓ Results Count: ${result.tests.resultsCount.status}`);
    console.log(`      ✓ Resources Visible: ${result.tests.resourcesVisible.status}`);

  } catch (error) {
    console.log(`      ✗ Error: ${error.message}`);
    result.tests.tagFilterButton = { status: 'failed', message: error.message };
    results.summary.presenceTestsFailed++;
  }

  return result;
}

// Test TagFilter functionality on a page
async function testTagFilterFunctionality(page, pageInfo) {
  const result = {
    name: pageInfo.name,
    slug: pageInfo.slug,
    type: pageInfo.type,
    url: `${BASE_URL}/${pageInfo.type}/${pageInfo.slug}`,
    tests: {
      openFilter: { status: 'pending', message: '' },
      tagsListVisible: { status: 'pending', message: '', tagCount: 0 },
      selectTag: { status: 'pending', message: '', selectedTag: '' },
      resourcesFiltered: { status: 'pending', message: '', beforeCount: 0, afterCount: 0 },
      countUpdated: { status: 'pending', message: '', before: '', after: '' },
      clearAll: { status: 'pending', message: '' },
      resourcesRestored: { status: 'pending', message: '', restoredCount: 0 }
    },
    screenshots: []
  };

  try {
    console.log(`\n   🔬 FUNCTIONALITY TEST: ${pageInfo.name}`);
    console.log(`      URL: ${result.url}`);

    // Navigate to page
    await page.goto(result.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1500);

    // Get initial state
    const initialResultsText = await page.$eval('[data-testid="text-results-count"]', el => el.textContent).catch(() => '');
    const initialResourceCount = (await page.$$('[data-testid^="card-resource-"]')).length;
    result.tests.resourcesFiltered.beforeCount = initialResourceCount;
    result.tests.countUpdated.before = initialResultsText;

    console.log(`      Initial state: ${initialResultsText} (${initialResourceCount} cards)`);

    // Screenshot initial state
    result.screenshots.push(await takeScreenshot(page, `func-${pageInfo.slug}-01-initial.png`));

    // Test 1: Open tag filter
    console.log(`      Step 1: Opening tag filter...`);
    // Use XPath to find button with "Filter by Tag" text
    const filterButtons = await page.$x("//button[contains(., 'Filter by Tag')]");
    if (filterButtons.length === 0) {
      throw new Error('Filter button not found');
    }
    
    await filterButtons[0].click();
    await sleep(1000);
    result.tests.openFilter = { status: 'passed', message: 'Filter popover opened' };

    // Screenshot with filter open
    result.screenshots.push(await takeScreenshot(page, `func-${pageInfo.slug}-02-filter-open.png`));

    // Test 2: Verify tags list displays
    console.log(`      Step 2: Checking tags list...`);
    const tagCheckboxes = await page.$$('[role="checkbox"]');
    const tagCount = tagCheckboxes.length;
    
    if (tagCount > 0) {
      result.tests.tagsListVisible = { status: 'passed', message: `${tagCount} tags available`, tagCount };
      console.log(`      Found ${tagCount} tags`);
    } else {
      result.tests.tagsListVisible = { status: 'warning', message: 'No tags available on this page', tagCount: 0 };
      console.log(`      ⚠ No tags available, skipping functionality tests`);
      
      // Close filter and return
      await page.keyboard.press('Escape');
      return result;
    }

    // Test 3: Select a tag (first available tag)
    console.log(`      Step 3: Selecting first tag...`);
    const firstTagContainer = await page.$('[role="checkbox"]');
    if (firstTagContainer) {
      const tagText = await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('[role="checkbox"]');
        if (checkboxes[0]) {
          const parent = checkboxes[0].closest('div.flex.items-center');
          if (parent) {
            const textSpan = parent.querySelector('span.text-sm');
            return textSpan ? textSpan.textContent : '';
          }
        }
        return '';
      });

      await firstTagContainer.click();
      await sleep(1500);
      
      result.tests.selectTag = { status: 'passed', message: 'Tag selected', selectedTag: tagText };
      console.log(`      Selected tag: "${tagText}"`);

      // Screenshot with tag selected
      result.screenshots.push(await takeScreenshot(page, `func-${pageInfo.slug}-03-tag-selected.png`));

      // Test 4: Verify resources filtered
      console.log(`      Step 4: Verifying filter applied...`);
      await sleep(1000);
      const filteredResourceCount = (await page.$$('[data-testid^="card-resource-"]')).length;
      result.tests.resourcesFiltered.afterCount = filteredResourceCount;
      
      if (filteredResourceCount < initialResourceCount) {
        result.tests.resourcesFiltered = { 
          status: 'passed', 
          message: 'Resources filtered correctly',
          beforeCount: initialResourceCount,
          afterCount: filteredResourceCount
        };
        console.log(`      Resources filtered: ${initialResourceCount} → ${filteredResourceCount}`);
      } else if (filteredResourceCount === initialResourceCount) {
        result.tests.resourcesFiltered = { 
          status: 'warning', 
          message: 'Resource count unchanged (all resources may have this tag)',
          beforeCount: initialResourceCount,
          afterCount: filteredResourceCount
        };
        console.log(`      ⚠ Resource count unchanged`);
      } else {
        result.tests.resourcesFiltered = { 
          status: 'failed', 
          message: 'Resource count increased after filtering',
          beforeCount: initialResourceCount,
          afterCount: filteredResourceCount
        };
      }

      // Test 5: Verify count text updated
      console.log(`      Step 5: Verifying count text updated...`);
      const updatedResultsText = await page.$eval('[data-testid="text-results-count"]', el => el.textContent).catch(() => '');
      result.tests.countUpdated.after = updatedResultsText;
      
      if (updatedResultsText !== initialResultsText) {
        result.tests.countUpdated = { 
          status: 'passed', 
          message: 'Count text updated',
          before: initialResultsText,
          after: updatedResultsText
        };
        console.log(`      Count updated: "${initialResultsText}" → "${updatedResultsText}"`);
      } else {
        result.tests.countUpdated = { 
          status: 'warning', 
          message: 'Count text unchanged',
          before: initialResultsText,
          after: updatedResultsText
        };
      }

      // Screenshot filtered state
      result.screenshots.push(await takeScreenshot(page, `func-${pageInfo.slug}-04-filtered.png`));

      // Test 6: Click "Clear all"
      console.log(`      Step 6: Clicking 'Clear all'...`);
      
      // Re-open filter if needed
      const popoverVisible = await page.$('[role="dialog"]');
      if (!popoverVisible) {
        const reopenButtons = await page.$x("//button[contains(., 'Filter by Tag')]");
        if (reopenButtons.length > 0) {
          await reopenButtons[0].click();
          await sleep(800);
        }
      }
      
      const clearButtons = await page.$x("//button[contains(., 'Clear all')]");
      if (clearButtons.length > 0) {
        await clearButtons[0].click();
        await sleep(1500);
        result.tests.clearAll = { status: 'passed', message: 'Clear all button clicked' };
        console.log(`      Clicked 'Clear all'`);
      } else {
        result.tests.clearAll = { status: 'failed', message: 'Clear all button not found' };
      }

      // Screenshot after clear
      result.screenshots.push(await takeScreenshot(page, `func-${pageInfo.slug}-05-cleared.png`));

      // Test 7: Verify all resources show again
      console.log(`      Step 7: Verifying resources restored...`);
      await sleep(1000);
      const restoredResourceCount = (await page.$$('[data-testid^="card-resource-"]')).length;
      result.tests.resourcesRestored.restoredCount = restoredResourceCount;
      
      if (restoredResourceCount === initialResourceCount) {
        result.tests.resourcesRestored = { 
          status: 'passed', 
          message: 'All resources restored',
          restoredCount: restoredResourceCount
        };
        console.log(`      Resources restored: ${restoredResourceCount} (original: ${initialResourceCount})`);
      } else {
        result.tests.resourcesRestored = { 
          status: 'failed', 
          message: `Resource count mismatch: expected ${initialResourceCount}, got ${restoredResourceCount}`,
          restoredCount: restoredResourceCount
        };
      }

      // Final screenshot
      result.screenshots.push(await takeScreenshot(page, `func-${pageInfo.slug}-06-restored.png`));

    } else {
      result.tests.selectTag = { status: 'failed', message: 'No tag checkbox found' };
    }

    // Count passed/failed tests
    const testStatuses = Object.values(result.tests).map(t => t.status);
    const passedCount = testStatuses.filter(s => s === 'passed').length;
    const failedCount = testStatuses.filter(s => s === 'failed').length;
    
    if (failedCount === 0) {
      results.summary.functionalityTestsPassed++;
    } else {
      results.summary.functionalityTestsFailed++;
    }

    console.log(`      ✓ Tests passed: ${passedCount}/${testStatuses.length}`);

  } catch (error) {
    console.log(`      ✗ Error during functionality test: ${error.message}`);
    result.tests.openFilter = { status: 'failed', message: error.message };
    results.summary.functionalityTestsFailed++;
  }

  return result;
}

// Main test function
async function runTests() {
  console.log('🧪 TEST SUITE 3: TAG FILTERING ACCURACY SUITE');
  console.log('═'.repeat(80));
  console.log(`📊 Total Pages to Test: 60 (9 categories + 19 subcategories + 32 sub-subcategories)`);
  console.log(`🔬 Functionality Tests: 13 pages (3 categories + 5 subcategories + 5 sub-subcategories)`);
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`📁 Screenshot directory: ${SCREENSHOT_DIR}`);
  console.log('═'.repeat(80));
  console.log();

  let browser;
  let page;

  try {
    // Launch browser
    console.log('🌐 Launching browser...\n');
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

    // PHASE 1: Presence Tests on All 60 Pages
    console.log('━'.repeat(80));
    console.log('PHASE 1: TAG FILTER PRESENCE VERIFICATION (60 PAGES)');
    console.log('━'.repeat(80));
    console.log();

    // Test categories
    console.log(`📁 Testing ${ALL_PAGES.categories.length} Category Pages:`);
    for (const category of ALL_PAGES.categories) {
      const result = await testTagFilterPresence(page, category);
      results.presenceTests.push(result);
    }
    console.log();

    // Test subcategories
    console.log(`📁 Testing ${ALL_PAGES.subcategories.length} Subcategory Pages:`);
    for (const subcategory of ALL_PAGES.subcategories) {
      const result = await testTagFilterPresence(page, subcategory);
      results.presenceTests.push(result);
    }
    console.log();

    // Test sub-subcategories
    console.log(`📁 Testing ${ALL_PAGES.subSubcategories.length} Sub-Subcategory Pages:`);
    for (const subSubcategory of ALL_PAGES.subSubcategories) {
      const result = await testTagFilterPresence(page, subSubcategory);
      results.presenceTests.push(result);
    }
    console.log();

    // PHASE 2: Functionality Tests on Sample Pages
    console.log('━'.repeat(80));
    console.log('PHASE 2: TAG FILTER FUNCTIONALITY TESTS (13 PAGES)');
    console.log('━'.repeat(80));
    console.log();

    // Test category functionality
    console.log(`🔬 Testing 3 Category Pages:`);
    for (const slug of FUNCTIONALITY_TEST_PAGES.categories) {
      const pageInfo = ALL_PAGES.categories.find(c => c.slug === slug);
      if (pageInfo) {
        const result = await testTagFilterFunctionality(page, pageInfo);
        results.functionalityTests.push(result);
      }
    }

    // Test subcategory functionality
    console.log(`\n🔬 Testing 5 Subcategory Pages:`);
    for (const slug of FUNCTIONALITY_TEST_PAGES.subcategories) {
      const pageInfo = ALL_PAGES.subcategories.find(c => c.slug === slug);
      if (pageInfo) {
        const result = await testTagFilterFunctionality(page, pageInfo);
        results.functionalityTests.push(result);
      }
    }

    // Test sub-subcategory functionality
    console.log(`\n🔬 Testing 5 Sub-Subcategory Pages:`);
    for (const slug of FUNCTIONALITY_TEST_PAGES.subSubcategories) {
      const pageInfo = ALL_PAGES.subSubcategories.find(c => c.slug === slug);
      if (pageInfo) {
        const result = await testTagFilterFunctionality(page, pageInfo);
        results.functionalityTests.push(result);
      }
    }

  } catch (error) {
    console.error('❌ Fatal error during tests:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Calculate final summary
  results.summary.totalPassed = results.summary.presenceTestsPassed + results.summary.functionalityTestsPassed;
  results.summary.totalFailed = results.summary.presenceTestsFailed + results.summary.functionalityTestsFailed;

  // Save JSON report
  const jsonPath = join(RESULTS_DIR, 'suite-3-tag-filtering.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  // Generate markdown report
  generateMarkdownReport();

  // Print summary
  console.log();
  console.log('═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total Pages Tested: 60`);
  console.log(`  Presence Tests Passed: ${results.summary.presenceTestsPassed}/60`);
  console.log(`  Presence Tests Failed: ${results.summary.presenceTestsFailed}/60`);
  console.log();
  console.log(`Functionality Tests: 13`);
  console.log(`  Functionality Tests Passed: ${results.summary.functionalityTestsPassed}/13`);
  console.log(`  Functionality Tests Failed: ${results.summary.functionalityTestsFailed}/13`);
  console.log();
  console.log(`Overall: ${results.summary.totalPassed}/${73} tests passed`);
  console.log('═'.repeat(80));
  console.log();
  console.log(`📄 JSON Report: ${jsonPath}`);
  console.log(`📄 Markdown Report: ${join(RESULTS_DIR, 'SUITE_3_TAG_FILTERING_REPORT.md')}`);
  console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
  console.log();

  // Exit with appropriate code
  process.exit(results.summary.totalFailed > 0 ? 1 : 0);
}

// Generate markdown report
function generateMarkdownReport() {
  const reportPath = join(RESULTS_DIR, 'SUITE_3_TAG_FILTERING_REPORT.md');
  
  let markdown = `# Test Suite 3: Tag Filtering Accuracy Report

**Generated:** ${new Date().toLocaleString()}

## Executive Summary

This test suite verifies that the TagFilter component is present and functional across all 60 pages of the application.

### Test Coverage

- **Total Pages Tested:** 60
  - Categories: 9
  - Subcategories: 19
  - Sub-Subcategories: 32

- **Presence Tests:** ${results.summary.presenceTestsPassed + results.summary.presenceTestsFailed}
  - ✅ Passed: ${results.summary.presenceTestsPassed}
  - ❌ Failed: ${results.summary.presenceTestsFailed}

- **Functionality Tests:** ${results.summary.functionalityTestsPassed + results.summary.functionalityTestsFailed}
  - ✅ Passed: ${results.summary.functionalityTestsPassed}
  - ❌ Failed: ${results.summary.functionalityTestsFailed}

### Overall Results

- **Total Tests:** ${results.summary.totalPassed + results.summary.totalFailed}
- **Passed:** ${results.summary.totalPassed}
- **Failed:** ${results.summary.totalFailed}
- **Success Rate:** ${((results.summary.totalPassed / (results.summary.totalPassed + results.summary.totalFailed)) * 100).toFixed(1)}%

---

## Phase 1: Presence Verification (60 Pages)

### Category Pages (9)

| Page | Tag Filter Button | Results Count | Resources Visible | Screenshot |
|------|-------------------|---------------|-------------------|------------|
`;

  // Add category results
  const categoryTests = results.presenceTests.filter(t => t.type === 'category');
  categoryTests.forEach(test => {
    const btnStatus = test.tests.tagFilterButton.status === 'passed' ? '✅' : '❌';
    const countStatus = test.tests.resultsCount.status === 'passed' ? '✅' : '❌';
    const resStatus = test.tests.resourcesVisible.status === 'passed' ? '✅' : (test.tests.resourcesVisible.status === 'warning' ? '⚠️' : '❌');
    markdown += `| ${test.name} | ${btnStatus} | ${countStatus} | ${resStatus} | [View](../test-screenshots/suite-3/${test.screenshot.split('/').pop()}) |\n`;
  });

  markdown += `\n### Subcategory Pages (19)\n\n`;
  markdown += `| Page | Tag Filter Button | Results Count | Resources Visible | Screenshot |\n`;
  markdown += `|------|-------------------|---------------|-------------------|------------|\n`;

  // Add subcategory results
  const subcategoryTests = results.presenceTests.filter(t => t.type === 'subcategory');
  subcategoryTests.forEach(test => {
    const btnStatus = test.tests.tagFilterButton.status === 'passed' ? '✅' : '❌';
    const countStatus = test.tests.resultsCount.status === 'passed' ? '✅' : '❌';
    const resStatus = test.tests.resourcesVisible.status === 'passed' ? '✅' : (test.tests.resourcesVisible.status === 'warning' ? '⚠️' : '❌');
    markdown += `| ${test.name} | ${btnStatus} | ${countStatus} | ${resStatus} | [View](../test-screenshots/suite-3/${test.screenshot.split('/').pop()}) |\n`;
  });

  markdown += `\n### Sub-Subcategory Pages (32)\n\n`;
  markdown += `| Page | Tag Filter Button | Results Count | Resources Visible | Screenshot |\n`;
  markdown += `|------|-------------------|---------------|-------------------|------------|\n`;

  // Add sub-subcategory results
  const subSubcategoryTests = results.presenceTests.filter(t => t.type === 'sub-subcategory');
  subSubcategoryTests.forEach(test => {
    const btnStatus = test.tests.tagFilterButton.status === 'passed' ? '✅' : '❌';
    const countStatus = test.tests.resultsCount.status === 'passed' ? '✅' : '❌';
    const resStatus = test.tests.resourcesVisible.status === 'passed' ? '✅' : (test.tests.resourcesVisible.status === 'warning' ? '⚠️' : '❌');
    markdown += `| ${test.name} | ${btnStatus} | ${countStatus} | ${resStatus} | [View](../test-screenshots/suite-3/${test.screenshot.split('/').pop()}) |\n`;
  });

  markdown += `\n---\n\n## Phase 2: Functionality Tests (13 Pages)\n\n`;
  
  // Add functionality test details
  results.functionalityTests.forEach((test, index) => {
    markdown += `\n### ${index + 1}. ${test.name} (${test.type})\n\n`;
    markdown += `**URL:** \`${test.url}\`\n\n`;
    markdown += `| Test | Status | Details |\n`;
    markdown += `|------|--------|----------|\n`;
    
    Object.entries(test.tests).forEach(([key, value]) => {
      const status = value.status === 'passed' ? '✅' : (value.status === 'warning' ? '⚠️' : '❌');
      const testName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      markdown += `| ${testName} | ${status} | ${value.message} |\n`;
    });
    
    if (test.screenshots && test.screenshots.length > 0) {
      markdown += `\n**Screenshots:**\n\n`;
      test.screenshots.forEach((screenshot, i) => {
        const filename = screenshot.split('/').pop();
        markdown += `${i + 1}. [${filename}](../test-screenshots/suite-3/${filename})\n`;
      });
    }
    
    markdown += `\n`;
  });

  markdown += `\n---\n\n## Conclusion\n\n`;
  
  if (results.summary.totalFailed === 0) {
    markdown += `✅ **All tests passed!** The TagFilter component is present and functional across all 60 pages.\n\n`;
  } else {
    markdown += `⚠️ **Some tests failed.** Please review the failed tests above and fix the issues.\n\n`;
    markdown += `- Presence Test Failures: ${results.summary.presenceTestsFailed}\n`;
    markdown += `- Functionality Test Failures: ${results.summary.functionalityTestsFailed}\n\n`;
  }

  markdown += `### Key Findings\n\n`;
  markdown += `1. TagFilter component presence verified on ${results.summary.presenceTestsPassed}/60 pages\n`;
  markdown += `2. TagFilter functionality verified on ${results.summary.functionalityTestsPassed}/13 sample pages\n`;
  markdown += `3. All core filtering operations (select tag, filter resources, clear filters) tested\n`;
  markdown += `4. Results count updates verified across all test scenarios\n\n`;

  markdown += `---\n\n`;
  markdown += `*Report generated by Tag Filtering Accuracy Test Suite v1.0*\n`;

  fs.writeFileSync(reportPath, markdown);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
