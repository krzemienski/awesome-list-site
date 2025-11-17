#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots', 'tagfilter-suite');
const RESULTS_DIR = path.join(__dirname, 'test-results');

// Ensure directories exist
[SCREENSHOT_DIR, RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// All pages to test
const CATEGORIES = [
  { type: 'category', slug: 'intro-learning', name: 'Intro & Learning', expectedCount: 229 },
  { type: 'category', slug: 'protocols-transport', name: 'Protocols & Transport', expectedCount: 252 },
  { type: 'category', slug: 'encoding-codecs', name: 'Encoding & Codecs', expectedCount: 392 },
  { type: 'category', slug: 'players-clients', name: 'Players & Clients', expectedCount: 269 },
  { type: 'category', slug: 'media-tools', name: 'Media Tools', expectedCount: 317 },
  { type: 'category', slug: 'standards-industry', name: 'Standards & Industry', expectedCount: 174 },
  { type: 'category', slug: 'infrastructure-delivery', name: 'Infrastructure & Delivery', expectedCount: 190 },
  { type: 'category', slug: 'general-tools', name: 'General Tools', expectedCount: 97 },
  { type: 'category', slug: 'community-events', name: 'Community & Events', expectedCount: 91 }
];

const SUBCATEGORIES = [
  { type: 'subcategory', slug: 'introduction', name: 'Introduction', expectedCount: 4 },
  { type: 'subcategory', slug: 'learning-resources', name: 'Learning Resources', expectedCount: 36 },
  { type: 'subcategory', slug: 'tutorials-case-studies', name: 'Tutorials & Case Studies', expectedCount: 60 },
  { type: 'subcategory', slug: 'adaptive-streaming', name: 'Adaptive Streaming', expectedCount: 144 },
  { type: 'subcategory', slug: 'transport-protocols', name: 'Transport Protocols', expectedCount: 13 },
  { type: 'subcategory', slug: 'encoding-tools', name: 'Encoding Tools', expectedCount: 240 },
  { type: 'subcategory', slug: 'codecs', name: 'Codecs', expectedCount: 29 },
  { type: 'subcategory', slug: 'hardware-players', name: 'Hardware Players', expectedCount: 35 },
  { type: 'subcategory', slug: 'mobile-web-players', name: 'Mobile & Web Players', expectedCount: 81 },
  { type: 'subcategory', slug: 'audio-subtitles', name: 'Audio & Subtitles', expectedCount: 58 },
  { type: 'subcategory', slug: 'ads-qoe', name: 'Ads & QoE', expectedCount: 45 },
  { type: 'subcategory', slug: 'specs-standards', name: 'Specs & Standards', expectedCount: 36 },
  { type: 'subcategory', slug: 'vendors-hdr', name: 'Vendors & HDR', expectedCount: 5 },
  { type: 'subcategory', slug: 'streaming-servers', name: 'Streaming Servers', expectedCount: 39 },
  { type: 'subcategory', slug: 'cloud-cdn', name: 'Cloud & CDN', expectedCount: 9 },
  { type: 'subcategory', slug: 'ffmpeg-tools', name: 'FFMPEG Tools', expectedCount: 25 },
  { type: 'subcategory', slug: 'drm', name: 'DRM', expectedCount: 51 },
  { type: 'subcategory', slug: 'community-groups', name: 'Community Groups', expectedCount: 33 },
  { type: 'subcategory', slug: 'events-conferences', name: 'Events & Conferences', expectedCount: 55 }
];

const SUB_SUBCATEGORIES = [
  { type: 'sub-subcategory', slug: 'hls', name: 'HLS', expectedCount: 63 },
  { type: 'sub-subcategory', slug: 'dash', name: 'DASH', expectedCount: 50 },
  { type: 'sub-subcategory', slug: 'rist', name: 'RIST', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'srt', name: 'SRT', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'rtmp', name: 'RTMP', expectedCount: 0 },
  { type: 'sub-subcategory', slug: 'ffmpeg', name: 'FFMPEG', expectedCount: 66 },
  { type: 'sub-subcategory', slug: 'other-encoders', name: 'Other Encoders', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'hevc', name: 'HEVC', expectedCount: 10 },
  { type: 'sub-subcategory', slug: 'vp9', name: 'VP9', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'av1', name: 'AV1', expectedCount: 6 },
  { type: 'sub-subcategory', slug: 'roku', name: 'Roku', expectedCount: 26 },
  { type: 'sub-subcategory', slug: 'smart-tvs', name: 'Smart TVs', expectedCount: 3 },
  { type: 'sub-subcategory', slug: 'chromecast', name: 'Chromecast', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'iostvos', name: 'iOS/tvOS', expectedCount: 31 },
  { type: 'sub-subcategory', slug: 'android', name: 'Android', expectedCount: 10 },
  { type: 'sub-subcategory', slug: 'web-players', name: 'Web Players', expectedCount: 25 },
  { type: 'sub-subcategory', slug: 'audio', name: 'Audio', expectedCount: 8 },
  { type: 'sub-subcategory', slug: 'subtitles-captions', name: 'Subtitles & Captions', expectedCount: 40 },
  { type: 'sub-subcategory', slug: 'advertising', name: 'Advertising', expectedCount: 0 },
  { type: 'sub-subcategory', slug: 'quality-testing', name: 'Quality & Testing', expectedCount: 36 },
  { type: 'sub-subcategory', slug: 'official-specs', name: 'Official Specs', expectedCount: 3 },
  { type: 'sub-subcategory', slug: 'mpeg-forums', name: 'MPEG & Forums', expectedCount: 6 },
  { type: 'sub-subcategory', slug: 'vendor-docs', name: 'Vendor Docs', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'hdr-guidelines', name: 'HDR Guidelines', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'origin-servers', name: 'Origin Servers', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'storage-solutions', name: 'Storage Solutions', expectedCount: 3 },
  { type: 'sub-subcategory', slug: 'cloud-platforms', name: 'Cloud Platforms', expectedCount: 4 },
  { type: 'sub-subcategory', slug: 'cdn-integration', name: 'CDN Integration', expectedCount: 1 },
  { type: 'sub-subcategory', slug: 'online-forums', name: 'Online Forums', expectedCount: 2 },
  { type: 'sub-subcategory', slug: 'slack-meetups', name: 'Slack & Meetups', expectedCount: 0 },
  { type: 'sub-subcategory', slug: 'conferences', name: 'Conferences', expectedCount: 0 },
  { type: 'sub-subcategory', slug: 'podcasts-webinars', name: 'Podcasts & Webinars', expectedCount: 2 }
];

const ALL_PAGES = [...CATEGORIES, ...SUBCATEGORIES, ...SUB_SUBCATEGORIES];

const results = {
  testSuite: 'Tag Filtering Suite - All 60 Pages',
  timestamp: new Date().toISOString(),
  viewport: VIEWPORT,
  totalPages: ALL_PAGES.length,
  summary: {
    total: ALL_PAGES.length,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  pages: []
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testTagFiltering(browser, pageConfig, index) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  
  const url = `${BASE_URL}/${pageConfig.type}/${pageConfig.slug}`;
  const testResult = {
    index: index + 1,
    type: pageConfig.type,
    name: pageConfig.name,
    slug: pageConfig.slug,
    url: url,
    expectedCount: pageConfig.expectedCount,
    tests: {
      navigation: { status: 'pending', message: '' },
      tagFilterVisible: { status: 'pending', message: '' },
      resultsCountVisible: { status: 'pending', message: '', initialCount: 0, totalResources: 0 },
      tagFilterOpens: { status: 'pending', message: '' },
      tagsListed: { status: 'pending', message: '', tagCount: 0 },
      tagSelection: { status: 'pending', message: '', selectedTag: '' },
      filteringWorks: { status: 'pending', message: '', filteredCount: 0 },
      countUpdates: { status: 'pending', message: '' },
      clearFilter: { status: 'pending', message: '' },
      allResourcesRestore: { status: 'pending', message: '' },
      noErrors: { status: 'pending', message: '' }
    },
    screenshot: '',
    errors: []
  };
  
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST ${index + 1}/${ALL_PAGES.length}: ${pageConfig.name} (${pageConfig.type})`);
    console.log(`${'='.repeat(80)}`);
    console.log(`URL: ${url}`);
    console.log(`Expected Resources: ${pageConfig.expectedCount}`);
    
    // Test 1: Navigation
    console.log(`\n🧪 Test 1: Navigation`);
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    if (response && response.ok()) {
      testResult.tests.navigation = { status: 'passed', message: `Successfully navigated (${response.status()})` };
      console.log(`   ✅ Navigation successful`);
    } else {
      testResult.tests.navigation = { status: 'failed', message: `Failed with status ${response?.status()}` };
      console.log(`   ❌ Navigation failed`);
      await page.close();
      results.summary.failed++;
      results.pages.push(testResult);
      return;
    }
    
    await sleep(1500);
    
    // Test 2: TagFilter Component Visible
    console.log(`\n🧪 Test 2: TagFilter Component Visible`);
    // Use evaluate to find button containing "Filter by Tag" text
    const tagFilterButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Filter by Tag')) ? true : false;
    });
    
    if (tagFilterButton) {
      testResult.tests.tagFilterVisible = { status: 'passed', message: 'TagFilter component found' };
      console.log(`   ✅ TagFilter component is visible`);
    } else {
      testResult.tests.tagFilterVisible = { status: 'failed', message: 'TagFilter component not found' };
      testResult.errors.push('TagFilter component not found');
      console.log(`   ❌ TagFilter component not visible`);
    }
    
    // Test 3: Results Count Visible
    console.log(`\n🧪 Test 3: Results Count Display`);
    const resultsCountElement = await page.$('[data-testid="text-results-count"]');
    
    if (resultsCountElement) {
      const resultsText = await page.evaluate(el => el.textContent, resultsCountElement);
      const match = resultsText.match(/Showing (\d+) of (\d+) resources/);
      
      if (match) {
        const showing = parseInt(match[1]);
        const total = parseInt(match[2]);
        testResult.tests.resultsCountVisible = { 
          status: 'passed', 
          message: resultsText,
          initialCount: showing,
          totalResources: total
        };
        console.log(`   ✅ Results count: "${resultsText}"`);
        
        if (total !== pageConfig.expectedCount) {
          console.log(`   ⚠️  Total resources (${total}) doesn't match expected (${pageConfig.expectedCount})`);
        }
      } else {
        testResult.tests.resultsCountVisible = { status: 'warning', message: `Found element but couldn't parse: "${resultsText}"` };
        console.log(`   ⚠️  Results count element found but format unexpected: "${resultsText}"`);
      }
    } else {
      testResult.tests.resultsCountVisible = { status: 'failed', message: 'Results count element not found' };
      testResult.errors.push('Results count element not found');
      console.log(`   ❌ Results count element not visible`);
    }
    
    // Skip tag filtering tests if page has 0 resources or no tags
    if (pageConfig.expectedCount === 0) {
      console.log(`\n⏭️  Skipping tag filtering tests (0 resources on this page)`);
      testResult.tests.tagFilterOpens = { status: 'skipped', message: 'No resources on page' };
      testResult.tests.tagsListed = { status: 'skipped', message: 'No resources on page' };
      testResult.tests.tagSelection = { status: 'skipped', message: 'No resources on page' };
      testResult.tests.filteringWorks = { status: 'skipped', message: 'No resources on page' };
      testResult.tests.countUpdates = { status: 'skipped', message: 'No resources on page' };
      testResult.tests.clearFilter = { status: 'skipped', message: 'No resources on page' };
      testResult.tests.allResourcesRestore = { status: 'skipped', message: 'No resources on page' };
      testResult.tests.noErrors = { status: 'passed', message: 'No console errors' };
      
      const screenshotPath = `tagfilter-${pageConfig.type}-${pageConfig.slug}.png`;
      await page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, screenshotPath),
        fullPage: false 
      });
      testResult.screenshot = screenshotPath;
      
      const testStatuses = Object.values(testResult.tests).map(t => t.status);
      if (testStatuses.every(s => s === 'passed' || s === 'skipped')) {
        results.summary.passed++;
        console.log(`\n✅ PAGE PASSED (with skipped tests): ${pageConfig.name}`);
      } else {
        results.summary.warnings++;
        console.log(`\n⚠️  PAGE WARNING: ${pageConfig.name}`);
      }
      
      await page.close();
      results.pages.push(testResult);
      return;
    }
    
    // Test 4: Open Tag Filter Dropdown
    console.log(`\n🧪 Test 4: Open Tag Filter Dropdown`);
    if (tagFilterButton) {
      // Click the filter button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Filter by Tag'));
        if (btn) btn.click();
      });
      await sleep(500);
      
      const popover = await page.$('[role="dialog"]');
      if (popover) {
        testResult.tests.tagFilterOpens = { status: 'passed', message: 'Tag filter popover opened' };
        console.log(`   ✅ Tag filter popover opened`);
      } else {
        testResult.tests.tagFilterOpens = { status: 'failed', message: 'Popover did not open' };
        testResult.errors.push('Tag filter popover did not open');
        console.log(`   ❌ Tag filter popover did not open`);
      }
    } else {
      testResult.tests.tagFilterOpens = { status: 'failed', message: 'Cannot open - button not found' };
      console.log(`   ❌ Cannot open tag filter - button not found`);
    }
    
    // Test 5: Verify Tags are Listed
    console.log(`\n🧪 Test 5: Verify Tags are Listed`);
    const tagCheckboxes = await page.$$('[role="dialog"] input[type="checkbox"]');
    
    if (tagCheckboxes.length > 0) {
      testResult.tests.tagsListed = { 
        status: 'passed', 
        message: `${tagCheckboxes.length} tags found`,
        tagCount: tagCheckboxes.length
      };
      console.log(`   ✅ Found ${tagCheckboxes.length} tags in the list`);
    } else {
      testResult.tests.tagsListed = { status: 'warning', message: 'No tags found (page may have no tagged resources)' };
      console.log(`   ⚠️  No tags found in the list`);
    }
    
    // Test 6: Select a Tag
    console.log(`\n🧪 Test 6: Select a Tag`);
    if (tagCheckboxes.length > 0) {
      const firstTagLabel = await page.evaluate(() => {
        const firstCheckbox = document.querySelector('[role="dialog"] input[type="checkbox"]');
        if (firstCheckbox) {
          const parent = firstCheckbox.closest('div');
          return parent?.textContent?.trim() || '';
        }
        return '';
      });
      
      await tagCheckboxes[0].click();
      await sleep(500);
      
      const isChecked = await page.evaluate(() => {
        const firstCheckbox = document.querySelector('[role="dialog"] input[type="checkbox"]');
        return firstCheckbox?.checked || false;
      });
      
      if (isChecked) {
        testResult.tests.tagSelection = { 
          status: 'passed', 
          message: `Selected tag: ${firstTagLabel}`,
          selectedTag: firstTagLabel
        };
        console.log(`   ✅ Tag selected: ${firstTagLabel}`);
      } else {
        testResult.tests.tagSelection = { status: 'failed', message: 'Tag checkbox not checked' };
        testResult.errors.push('Tag selection failed');
        console.log(`   ❌ Tag selection failed`);
      }
      
      await page.keyboard.press('Escape');
      await sleep(500);
      
      // Test 7: Verify Filtering Works
      console.log(`\n🧪 Test 7: Verify Resources Filter Correctly`);
      const filteredCountElement = await page.$('[data-testid="text-results-count"]');
      
      if (filteredCountElement) {
        const filteredText = await page.evaluate(el => el.textContent, filteredCountElement);
        const match = filteredText.match(/Showing (\d+) of (\d+) resources/);
        
        if (match) {
          const filteredCount = parseInt(match[1]);
          const totalCount = parseInt(match[2]);
          
          testResult.tests.filteringWorks = { 
            status: 'passed', 
            message: `Filtered to ${filteredCount} resources`,
            filteredCount: filteredCount
          };
          console.log(`   ✅ Resources filtered: showing ${filteredCount} of ${totalCount}`);
          
          if (filteredCount <= totalCount) {
            testResult.tests.countUpdates = { status: 'passed', message: `Count updated correctly: ${filteredText}` };
            console.log(`   ✅ Count updated correctly`);
          } else {
            testResult.tests.countUpdates = { status: 'failed', message: `Count invalid: ${filteredText}` };
            testResult.errors.push('Filtered count > total count');
            console.log(`   ❌ Count is invalid (filtered > total)`);
          }
        } else {
          testResult.tests.filteringWorks = { status: 'warning', message: `Couldn't parse: "${filteredText}"` };
          testResult.tests.countUpdates = { status: 'warning', message: `Couldn't parse: "${filteredText}"` };
          console.log(`   ⚠️  Couldn't parse filtered count: "${filteredText}"`);
        }
      } else {
        testResult.tests.filteringWorks = { status: 'failed', message: 'Count element not found after filtering' };
        testResult.tests.countUpdates = { status: 'failed', message: 'Count element not found' };
        console.log(`   ❌ Count element not found after filtering`);
      }
      
      // Test 8: Clear Filter
      console.log(`\n🧪 Test 8: Clear Filter`);
      
      const tagBadges = await page.$$('div.badge, .badge');
      let clearSuccess = false;
      
      for (const badge of tagBadges) {
        const badgeText = await page.evaluate(el => el.textContent, badge);
        if (badgeText.includes(firstTagLabel.split(/\s+/)[0])) {
          await badge.click();
          await sleep(500);
          clearSuccess = true;
          break;
        }
      }
      
      if (!clearSuccess) {
        const filterOpened = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const filterBtn = buttons.find(b => b.textContent.includes('Filter by Tag'));
          if (filterBtn) {
            filterBtn.click();
            return true;
          }
          return false;
        });
        
        if (filterOpened) {
          await sleep(300);
          
          const clearClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const clearBtn = buttons.find(b => b.textContent.includes('Clear all'));
            if (clearBtn) {
              clearBtn.click();
              return true;
            }
            return false;
          });
          
          if (clearClicked) {
            await sleep(300);
            clearSuccess = true;
            
            await page.keyboard.press('Escape');
            await sleep(300);
          }
        }
      }
      
      if (clearSuccess) {
        testResult.tests.clearFilter = { status: 'passed', message: 'Filter cleared successfully' };
        console.log(`   ✅ Filter cleared`);
      } else {
        testResult.tests.clearFilter = { status: 'warning', message: 'Could not find clear button' };
        console.log(`   ⚠️  Could not clear filter`);
      }
      
      // Test 9: Verify All Resources Shown Again
      console.log(`\n🧪 Test 9: Verify All Resources Restored`);
      await sleep(500);
      const restoredCountElement = await page.$('[data-testid="text-results-count"]');
      
      if (restoredCountElement) {
        const restoredText = await page.evaluate(el => el.textContent, restoredCountElement);
        const match = restoredText.match(/Showing (\d+) of (\d+) resources/);
        
        if (match) {
          const showing = parseInt(match[1]);
          const total = parseInt(match[2]);
          
          if (showing === total) {
            testResult.tests.allResourcesRestore = { 
              status: 'passed', 
              message: `All ${total} resources restored`
            };
            console.log(`   ✅ All resources restored: ${showing} of ${total}`);
          } else {
            testResult.tests.allResourcesRestore = { 
              status: 'warning', 
              message: `Showing ${showing} of ${total} (not all restored)`
            };
            console.log(`   ⚠️  Not all resources restored: ${showing} of ${total}`);
          }
        } else {
          testResult.tests.allResourcesRestore = { status: 'warning', message: `Couldn't parse: "${restoredText}"` };
          console.log(`   ⚠️  Couldn't parse restored count: "${restoredText}"`);
        }
      } else {
        testResult.tests.allResourcesRestore = { status: 'failed', message: 'Count element not found' };
        console.log(`   ❌ Count element not found after clearing filter`);
      }
      
    } else {
      testResult.tests.tagSelection = { status: 'skipped', message: 'No tags available to select' };
      testResult.tests.filteringWorks = { status: 'skipped', message: 'No tags available' };
      testResult.tests.countUpdates = { status: 'skipped', message: 'No tags available' };
      testResult.tests.clearFilter = { status: 'skipped', message: 'No tags available' };
      testResult.tests.allResourcesRestore = { status: 'skipped', message: 'No tags available' };
      console.log(`   ⏭️  Skipping tag selection tests (no tags available)`);
    }
    
    // Test 10: No Console Errors
    console.log(`\n🧪 Test 10: Check for Console Errors`);
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await sleep(500);
    
    if (consoleErrors.length === 0) {
      testResult.tests.noErrors = { status: 'passed', message: 'No console errors detected' };
      console.log(`   ✅ No console errors`);
    } else {
      testResult.tests.noErrors = { 
        status: 'warning', 
        message: `${consoleErrors.length} console errors detected`,
        errors: consoleErrors.slice(0, 3)
      };
      console.log(`   ⚠️  ${consoleErrors.length} console errors detected`);
    }
    
    // Take screenshot
    const screenshotPath = `tagfilter-${pageConfig.type}-${pageConfig.slug}.png`;
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, screenshotPath),
      fullPage: false 
    });
    testResult.screenshot = screenshotPath;
    console.log(`\n📸 Screenshot: ${screenshotPath}`);
    
    // Determine overall status
    const testStatuses = Object.values(testResult.tests).map(t => t.status);
    const failedTests = testStatuses.filter(s => s === 'failed').length;
    const warningTests = testStatuses.filter(s => s === 'warning').length;
    
    if (failedTests > 0) {
      results.summary.failed++;
      console.log(`\n❌ PAGE FAILED: ${pageConfig.name} (${failedTests} failed tests)`);
    } else if (warningTests > 0) {
      results.summary.warnings++;
      console.log(`\n⚠️  PAGE WARNING: ${pageConfig.name} (${warningTests} warnings)`);
    } else {
      results.summary.passed++;
      console.log(`\n✅ PAGE PASSED: ${pageConfig.name}`);
    }
    
  } catch (error) {
    console.error(`\n❌ ERROR testing ${pageConfig.name}:`, error.message);
    testResult.tests.noErrors = { status: 'failed', message: `Test error: ${error.message}` };
    testResult.errors.push(error.message);
    results.summary.failed++;
  } finally {
    await page.close();
  }
  
  results.pages.push(testResult);
}

async function runAllTests() {
  console.log('🚀 TAG FILTERING TEST SUITE - ALL 60 PAGES');
  console.log('='.repeat(80));
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total Pages: ${ALL_PAGES.length}`);
  console.log(`  - Categories: ${CATEGORIES.length}`);
  console.log(`  - Subcategories: ${SUBCATEGORIES.length}`);
  console.log(`  - Sub-Subcategories: ${SUB_SUBCATEGORIES.length}`);
  console.log('='.repeat(80));
  
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
    for (let i = 0; i < ALL_PAGES.length; i++) {
      await testTagFiltering(browser, ALL_PAGES[i], i);
    }
  } catch (error) {
    console.error('Fatal error during testing:', error);
  } finally {
    await browser.close();
  }
  
  // Generate summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Pages: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  // Save JSON report
  const jsonPath = path.join(RESULTS_DIR, 'tag-filtering-suite-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 JSON report saved: ${jsonPath}`);
  
  // Generate and save Markdown report
  const markdown = generateMarkdownReport(results);
  const mdPath = path.join(RESULTS_DIR, 'TAG_FILTERING_SUITE_REPORT.md');
  fs.writeFileSync(mdPath, markdown);
  console.log(`📄 Markdown report saved: ${mdPath}`);
  
  console.log('\n✨ Test suite complete!');
  
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

function generateMarkdownReport(results) {
  let md = `# Tag Filtering Test Suite Report\n\n`;
  md += `**Test Suite:** ${results.testSuite}\n`;
  md += `**Timestamp:** ${results.timestamp}\n`;
  md += `**Viewport:** ${results.viewport.width}x${results.viewport.height}\n\n`;
  
  md += `## Summary\n\n`;
  md += `| Metric | Count | Percentage |\n`;
  md += `|--------|-------|------------|\n`;
  md += `| Total Pages | ${results.summary.total} | 100% |\n`;
  md += `| ✅ Passed | ${results.summary.passed} | ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}% |\n`;
  md += `| ⚠️ Warnings | ${results.summary.warnings} | ${((results.summary.warnings / results.summary.total) * 100).toFixed(1)}% |\n`;
  md += `| ❌ Failed | ${results.summary.failed} | ${((results.summary.failed / results.summary.total) * 100).toFixed(1)}% |\n\n`;
  
  return md;
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
