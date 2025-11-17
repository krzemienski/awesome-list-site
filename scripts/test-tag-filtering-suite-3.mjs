import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };
const SCREENSHOT_DIR = join(__dirname, '..', 'test-screenshots', 'tagfilter-suite');
const RESULTS_DIR = join(__dirname, 'test-results');

// Ensure directories exist
[SCREENSHOT_DIR, RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// All 60 pages to test
const PAGES_TO_TEST = {
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
    { name: 'FFMPEG & Tools', slug: 'ffmpeg-tools', type: 'subcategory' },
    { name: 'DRM', slug: 'drm', type: 'subcategory' },
    { name: 'Community Groups', slug: 'community-groups', type: 'subcategory' },
    { name: 'Events & Conferences', slug: 'events-conferences', type: 'subcategory' }
  ],
  subsubcategories: [
    { name: 'HLS', slug: 'hls', type: 'subsubcategory' },
    { name: 'DASH', slug: 'dash', type: 'subsubcategory' },
    { name: 'RTMP', slug: 'rtmp', type: 'subsubcategory' },
    { name: 'RIST', slug: 'rist', type: 'subsubcategory' },
    { name: 'FFMPEG', slug: 'ffmpeg', type: 'subsubcategory' },
    { name: 'Other Encoders', slug: 'other-encoders', type: 'subsubcategory' },
    { name: 'AV1', slug: 'av1', type: 'subsubcategory' },
    { name: 'HEVC', slug: 'hevc', type: 'subsubcategory' },
    { name: 'VP9', slug: 'vp9', type: 'subsubcategory' },
    { name: 'H.264', slug: 'h-264', type: 'subsubcategory' },
    { name: 'Roku', slug: 'roku', type: 'subsubcategory' },
    { name: 'Chromecast', slug: 'chromecast', type: 'subsubcategory' },
    { name: 'Android', slug: 'android', type: 'subsubcategory' },
    { name: 'iOS/tvOS', slug: 'iostvos', type: 'subsubcategory' },
    { name: 'Audio', slug: 'audio', type: 'subsubcategory' },
    { name: 'Quality Testing', slug: 'quality-testing', type: 'subsubcategory' },
    { name: 'Advertising', slug: 'advertising', type: 'subsubcategory' },
    { name: 'Official Specs', slug: 'official-specs', type: 'subsubcategory' },
    { name: 'MPEG Forums', slug: 'mpeg-forums', type: 'subsubcategory' },
    { name: 'HDR Guidelines', slug: 'hdr-guidelines', type: 'subsubcategory' },
    { name: 'Origin Servers', slug: 'origin-servers', type: 'subsubcategory' },
    { name: 'Storage Solutions', slug: 'storage-solutions', type: 'subsubcategory' },
    { name: 'Cloud Platforms', slug: 'cloud-platforms', type: 'subsubcategory' },
    { name: 'CDN Integration', slug: 'cdn-integration', type: 'subsubcategory' },
    { name: 'Online Forums', slug: 'online-forums', type: 'subsubcategory' },
    { name: 'Slack & Meetups', slug: 'slack-meetups', type: 'subsubcategory' },
    { name: 'Conferences', slug: 'conferences', type: 'subsubcategory' },
    { name: 'Podcasts & Webinars', slug: 'podcasts-webinars', type: 'subsubcategory' }
  ]
};

// Flatten all pages
const ALL_PAGES = [
  ...PAGES_TO_TEST.categories,
  ...PAGES_TO_TEST.subcategories,
  ...PAGES_TO_TEST.subsubcategories
];

// Test results tracking
const results = {
  testSuite: 'Tag Filtering Accuracy - 60 Pages',
  viewport: VIEWPORT,
  timestamp: new Date().toISOString(),
  pages: [],
  summary: {
    total: ALL_PAGES.length,
    passed: 0,
    failed: 0,
    warnings: 0,
    withWorkingFilters: 0,
    withIssues: 0
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
  } catch (error) {
    return false;
  }
}

// Get text content from element
async function getTextContent(page, selector) {
  try {
    const element = await page.$(selector);
    if (!element) return null;
    return await page.evaluate(el => el.textContent?.trim(), element);
  } catch (error) {
    return null;
  }
}

// Count visible cards
async function countVisibleCards(page) {
  return await page.$$eval('[data-testid^="card-resource-"]', cards => cards.length);
}

// Get available tags
async function getAvailableTags(page) {
  try {
    // Get all checkbox labels in the popover
    const tags = await page.$$eval('[role="dialog"] .space-y-1 > div', items => {
      return items.map(item => {
        const label = item.querySelector('span.text-sm');
        const badge = item.querySelector('.ml-2');
        return {
          name: label?.textContent?.trim() || '',
          count: parseInt(badge?.textContent?.trim() || '0')
        };
      }).filter(tag => tag.name);
    });
    return tags;
  } catch (error) {
    return [];
  }
}

// Test tag filtering on a single page
async function testPageTagFiltering(page, pageInfo) {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`📄 TESTING: ${pageInfo.name} (${pageInfo.type})`);
  console.log(`   Slug: ${pageInfo.slug}`);
  console.log(`${'━'.repeat(80)}`);

  const pageResult = {
    name: pageInfo.name,
    slug: pageInfo.slug,
    type: pageInfo.type,
    tests: {
      pageLoads: { status: 'pending', message: '' },
      tagFilterVisible: { status: 'pending', message: '' },
      popoverOpens: { status: 'pending', message: '' },
      tagsListed: { status: 'pending', message: '', tagCount: 0, tags: [] },
      singleTagFilter: { status: 'pending', message: '', beforeCount: 0, afterCount: 0 },
      resultsCountUpdates: { status: 'pending', message: '' },
      clearAllWorks: { status: 'pending', message: '', restoredCount: 0 },
      multiTagFilter: { status: 'pending', message: '', tag1: '', tag2: '', resultCount: 0 },
      orLogicWorks: { status: 'pending', message: '' }
    },
    screenshot: '',
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Navigate to page
    const url = `${BASE_URL}/${pageInfo.type}/${pageInfo.slug}`;
    console.log(`🔗 Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);

    const pageLoaded = await waitForSelector(page, 'h1', 3000);
    if (!pageLoaded) {
      pageResult.tests.pageLoads.status = 'failed';
      pageResult.tests.pageLoads.message = 'Page failed to load';
      console.log('❌ Page failed to load');
      return pageResult;
    }

    pageResult.tests.pageLoads.status = 'passed';
    pageResult.tests.pageLoads.message = 'Page loaded successfully';
    console.log('✅ Page loaded');

    // 2. Verify TagFilter component is visible
    const filterButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Filter by Tag'));
    });
    
    const filterButtonVisible = await filterButton.asElement();
    if (!filterButtonVisible) {
      pageResult.tests.tagFilterVisible.status = 'failed';
      pageResult.tests.tagFilterVisible.message = 'TagFilter button not found';
      console.log('❌ TagFilter button not visible');
      return pageResult;
    }

    pageResult.tests.tagFilterVisible.status = 'passed';
    pageResult.tests.tagFilterVisible.message = 'TagFilter button visible';
    console.log('✅ TagFilter button visible');

    // Get initial resource count
    const initialCount = await countVisibleCards(page);
    pageResult.tests.singleTagFilter.beforeCount = initialCount;
    console.log(`📊 Initial resource count: ${initialCount}`);

    // 3. Click to open tag filter popover
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const filterBtn = buttons.find(btn => btn.textContent?.includes('Filter by Tag'));
      if (filterBtn) filterBtn.click();
    });
    await sleep(500);

    const popoverVisible = await waitForSelector(page, '[role="dialog"]', 2000);
    if (!popoverVisible) {
      pageResult.tests.popoverOpens.status = 'failed';
      pageResult.tests.popoverOpens.message = 'Popover did not open';
      console.log('❌ Popover did not open');
      return pageResult;
    }

    pageResult.tests.popoverOpens.status = 'passed';
    pageResult.tests.popoverOpens.message = 'Popover opened successfully';
    console.log('✅ Popover opened');

    // 4. Verify tags are listed
    const availableTags = await getAvailableTags(page);
    pageResult.tests.tagsListed.tagCount = availableTags.length;
    pageResult.tests.tagsListed.tags = availableTags;

    if (availableTags.length === 0) {
      pageResult.tests.tagsListed.status = 'warning';
      pageResult.tests.tagsListed.message = 'No tags available on this page';
      console.log('⚠️  No tags available');
      
      // Close popover and take screenshot
      await page.keyboard.press('Escape');
      await sleep(300);
      pageResult.screenshot = await takeScreenshot(page, `tagfilter-${pageInfo.slug}.png`);
      return pageResult;
    }

    pageResult.tests.tagsListed.status = 'passed';
    pageResult.tests.tagsListed.message = `Found ${availableTags.length} tags`;
    console.log(`✅ Found ${availableTags.length} tags:`, availableTags.slice(0, 5).map(t => t.name).join(', '));

    // 5. Select first tag
    const firstTag = availableTags[0];
    console.log(`🏷️  Selecting tag: "${firstTag.name}" (${firstTag.count} resources)`);

    // Click the first tag checkbox
    const firstTagClicked = await page.evaluate(() => {
      const firstItem = document.querySelector('[role="dialog"] .space-y-1 > div');
      if (firstItem) {
        firstItem.click();
        return true;
      }
      return false;
    });

    if (!firstTagClicked) {
      pageResult.tests.singleTagFilter.status = 'failed';
      pageResult.tests.singleTagFilter.message = 'Could not click first tag';
      console.log('❌ Could not click first tag');
      return pageResult;
    }

    await sleep(500);

    // 6. Verify filtering works
    const filteredCount = await countVisibleCards(page);
    pageResult.tests.singleTagFilter.afterCount = filteredCount;

    if (filteredCount === 0) {
      pageResult.tests.singleTagFilter.status = 'failed';
      pageResult.tests.singleTagFilter.message = 'No resources shown after filtering';
      console.log('❌ No resources shown after filtering');
    } else if (filteredCount < initialCount) {
      pageResult.tests.singleTagFilter.status = 'passed';
      pageResult.tests.singleTagFilter.message = `Resources filtered from ${initialCount} to ${filteredCount}`;
      console.log(`✅ Filtered from ${initialCount} to ${filteredCount} resources`);
    } else {
      pageResult.tests.singleTagFilter.status = 'warning';
      pageResult.tests.singleTagFilter.message = `Count unchanged: ${filteredCount}`;
      console.log(`⚠️  Count unchanged: ${filteredCount}`);
    }

    // 7. Verify results count updates
    const resultsCountText = await getTextContent(page, '[data-testid="text-results-count"]');
    if (resultsCountText && resultsCountText.includes('Showing')) {
      pageResult.tests.resultsCountUpdates.status = 'passed';
      pageResult.tests.resultsCountUpdates.message = resultsCountText;
      console.log(`✅ Results count: "${resultsCountText}"`);
    } else {
      pageResult.tests.resultsCountUpdates.status = 'warning';
      pageResult.tests.resultsCountUpdates.message = 'Results count not found or incorrect format';
      console.log('⚠️  Results count not found');
    }

    // 8. Verify selected tag badge is shown
    const badgeVisible = await page.evaluate((tagName) => {
      const badges = Array.from(document.querySelectorAll('.inline-flex.items-center'));
      return badges.some(badge => badge.textContent?.includes(tagName));
    }, firstTag.name);
    if (badgeVisible) {
      console.log(`✅ Tag badge visible for "${firstTag.name}"`);
    }

    // 9. Click "Clear all" button
    const clearAllClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const clearBtn = buttons.find(btn => btn.textContent?.includes('Clear all'));
      if (clearBtn) {
        clearBtn.click();
        return true;
      }
      return false;
    });
    
    if (!clearAllClicked) {
      pageResult.tests.clearAllWorks.status = 'failed';
      pageResult.tests.clearAllWorks.message = 'Clear all button not found';
      console.log('❌ Clear all button not found');
    } else {
      await sleep(500);

      const restoredCount = await countVisibleCards(page);
      pageResult.tests.clearAllWorks.restoredCount = restoredCount;

      if (restoredCount === initialCount) {
        pageResult.tests.clearAllWorks.status = 'passed';
        pageResult.tests.clearAllWorks.message = `Restored to ${restoredCount} resources`;
        console.log(`✅ Clear all worked: restored to ${restoredCount} resources`);
      } else {
        pageResult.tests.clearAllWorks.status = 'warning';
        pageResult.tests.clearAllWorks.message = `Expected ${initialCount}, got ${restoredCount}`;
        console.log(`⚠️  Expected ${initialCount}, got ${restoredCount}`);
      }
    }

    // 10. Test multi-select with 2 tags (if we have at least 2 tags)
    if (availableTags.length >= 2) {
      console.log('🔄 Testing multi-select with 2 tags...');

      // Open popover again
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const filterBtn = buttons.find(btn => btn.textContent?.includes('Filter by Tag'));
        if (filterBtn) filterBtn.click();
      });
      await sleep(500);

      // Select first two tags
      const tag1 = availableTags[0];
      const tag2 = availableTags[1];

      await page.evaluate(() => {
        const items = document.querySelectorAll('[role="dialog"] .space-y-1 > div');
        if (items[0]) items[0].click();
        if (items[1]) items[1].click();
      });

      await sleep(500);

      const multiFilterCount = await countVisibleCards(page);
      pageResult.tests.multiTagFilter.tag1 = tag1.name;
      pageResult.tests.multiTagFilter.tag2 = tag2.name;
      pageResult.tests.multiTagFilter.resultCount = multiFilterCount;

      // 11. Verify OR logic
      const expectedMin = Math.max(tag1.count, tag2.count);
      const expectedMax = tag1.count + tag2.count;

      if (multiFilterCount >= expectedMin && multiFilterCount <= expectedMax) {
        pageResult.tests.multiTagFilter.status = 'passed';
        pageResult.tests.multiTagFilter.message = `Multi-select shows ${multiFilterCount} resources`;
        pageResult.tests.orLogicWorks.status = 'passed';
        pageResult.tests.orLogicWorks.message = `OR logic works: ${multiFilterCount} resources (expected ${expectedMin}-${expectedMax})`;
        console.log(`✅ Multi-select: ${multiFilterCount} resources (${tag1.name} + ${tag2.name})`);
        console.log(`✅ OR logic verified: ${multiFilterCount} in range [${expectedMin}, ${expectedMax}]`);
      } else {
        pageResult.tests.multiTagFilter.status = 'warning';
        pageResult.tests.multiTagFilter.message = `Unexpected count: ${multiFilterCount}`;
        pageResult.tests.orLogicWorks.status = 'warning';
        pageResult.tests.orLogicWorks.message = `Expected ${expectedMin}-${expectedMax}, got ${multiFilterCount}`;
        console.log(`⚠️  Unexpected count: ${multiFilterCount} (expected ${expectedMin}-${expectedMax})`);
      }

      // Close popover
      await page.keyboard.press('Escape');
      await sleep(300);
    } else {
      pageResult.tests.multiTagFilter.status = 'skipped';
      pageResult.tests.multiTagFilter.message = 'Not enough tags for multi-select test';
      pageResult.tests.orLogicWorks.status = 'skipped';
      pageResult.tests.orLogicWorks.message = 'Not enough tags for OR logic test';
      console.log('⏭️  Skipped multi-select test (not enough tags)');
    }

    // 12. Take screenshot
    pageResult.screenshot = await takeScreenshot(page, `tagfilter-${pageInfo.slug}.png`);
    console.log(`📸 Screenshot saved: tagfilter-${pageInfo.slug}.png`);

  } catch (error) {
    console.error(`❌ Error testing ${pageInfo.name}:`, error.message);
    pageResult.tests.pageLoads.status = 'failed';
    pageResult.tests.pageLoads.message = `Error: ${error.message}`;
  }

  return pageResult;
}

// Main test function
async function runTests() {
  console.log('🚀 TAG FILTERING ACCURACY TEST SUITE - 60 PAGES');
  console.log('═'.repeat(80));
  console.log(`📊 Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`📁 Screenshot directory: ${SCREENSHOT_DIR}`);
  console.log(`📄 Total pages to test: ${ALL_PAGES.length}`);
  console.log(`   - Categories: ${PAGES_TO_TEST.categories.length}`);
  console.log(`   - Subcategories: ${PAGES_TO_TEST.subcategories.length}`);
  console.log(`   - Sub-subcategories: ${PAGES_TO_TEST.subsubcategories.length}`);
  console.log('═'.repeat(80));

  let browser;
  let page;

  try {
    // Launch browser
    console.log('\n🌐 Launching browser...');
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

    // Test all pages
    for (let i = 0; i < ALL_PAGES.length; i++) {
      const pageInfo = ALL_PAGES[i];
      console.log(`\n[${ i + 1}/${ALL_PAGES.length}]`);
      
      const pageResult = await testPageTagFiltering(page, pageInfo);
      results.pages.push(pageResult);

      // Update summary
      const hasFailures = Object.values(pageResult.tests).some(t => t.status === 'failed');
      const hasWarnings = Object.values(pageResult.tests).some(t => t.status === 'warning');

      if (hasFailures) {
        results.summary.failed++;
        results.summary.withIssues++;
      } else if (hasWarnings) {
        results.summary.warnings++;
        results.summary.withIssues++;
      } else {
        results.summary.passed++;
        results.summary.withWorkingFilters++;
      }

      // Brief pause between pages
      await sleep(500);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total pages tested: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`\n🏷️  Tag Filter Status:`);
  console.log(`   Working filters: ${results.summary.withWorkingFilters}`);
  console.log(`   With issues: ${results.summary.withIssues}`);

  // Breakdown by type
  const categoryResults = results.pages.filter(p => p.type === 'category');
  const subcategoryResults = results.pages.filter(p => p.type === 'subcategory');
  const subsubcategoryResults = results.pages.filter(p => p.type === 'subsubcategory');

  console.log(`\n📂 By Type:`);
  console.log(`   Categories: ${categoryResults.filter(p => !Object.values(p.tests).some(t => t.status === 'failed')).length}/${categoryResults.length} passed`);
  console.log(`   Subcategories: ${subcategoryResults.filter(p => !Object.values(p.tests).some(t => t.status === 'failed')).length}/${subcategoryResults.length} passed`);
  console.log(`   Sub-subcategories: ${subsubcategoryResults.filter(p => !Object.values(p.tests).some(t => t.status === 'failed')).length}/${subsubcategoryResults.length} passed`);

  // Save results
  const reportPath = join(RESULTS_DIR, 'tag-filtering-suite-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Report saved: ${reportPath}`);

  // Generate detailed findings
  console.log('\n📋 DETAILED FINDINGS:');
  
  const pagesWithNoTags = results.pages.filter(p => p.tests.tagsListed.tagCount === 0);
  if (pagesWithNoTags.length > 0) {
    console.log(`\n⚠️  Pages with no tags (${pagesWithNoTags.length}):`);
    pagesWithNoTags.forEach(p => console.log(`   - ${p.name} (${p.slug})`));
  }

  const pagesWithFailedFiltering = results.pages.filter(p => 
    p.tests.singleTagFilter.status === 'failed' || 
    p.tests.multiTagFilter.status === 'failed'
  );
  if (pagesWithFailedFiltering.length > 0) {
    console.log(`\n❌ Pages with failed filtering (${pagesWithFailedFiltering.length}):`);
    pagesWithFailedFiltering.forEach(p => console.log(`   - ${p.name} (${p.slug})`));
  }

  const pagesWithClearAllIssues = results.pages.filter(p => 
    p.tests.clearAllWorks.status === 'failed' || 
    p.tests.clearAllWorks.status === 'warning'
  );
  if (pagesWithClearAllIssues.length > 0) {
    console.log(`\n⚠️  Pages with Clear All issues (${pagesWithClearAllIssues.length}):`);
    pagesWithClearAllIssues.forEach(p => console.log(`   - ${p.name}: ${p.tests.clearAllWorks.message}`));
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TAG FILTERING TEST SUITE COMPLETE');
  console.log('═'.repeat(80));
}

// Run tests
runTests().catch(console.error);
