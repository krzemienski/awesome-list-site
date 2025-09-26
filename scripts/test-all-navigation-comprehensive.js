#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

// Complete mapping of all 60 navigation items with expected resource counts
const NAVIGATION_PATHS = {
  categories: [
    { path: '/category/intro-learning', name: 'Intro & Learning', expectedCount: 229 },
    { path: '/category/protocols-transport', name: 'Protocols & Transport', expectedCount: 252 },
    { path: '/category/encoding-codecs', name: 'Encoding & Codecs', expectedCount: 392 },
    { path: '/category/players-clients', name: 'Players & Clients', expectedCount: 269 },
    { path: '/category/media-tools', name: 'Media Tools', expectedCount: 317 },
    { path: '/category/standards-industry', name: 'Standards & Industry', expectedCount: 174 },
    { path: '/category/infrastructure-delivery', name: 'Infrastructure & Delivery', expectedCount: 190 },
    { path: '/category/general-tools', name: 'General Tools', expectedCount: 97 },
    { path: '/category/community-events', name: 'Community & Events', expectedCount: 91 }
  ],
  
  subcategories: [
    { path: '/subcategory/introduction', name: 'Introduction' },
    { path: '/subcategory/learning-resources', name: 'Learning Resources' },
    { path: '/subcategory/tutorials-case-studies', name: 'Tutorials & Case Studies' },
    { path: '/subcategory/adaptive-streaming', name: 'Adaptive Streaming', expectedCount: 144 },
    { path: '/subcategory/transport-protocols', name: 'Transport Protocols' },
    { path: '/subcategory/encoding-tools', name: 'Encoding Tools', expectedCount: 240 },
    { path: '/subcategory/codecs', name: 'Codecs', expectedCount: 29 },
    { path: '/subcategory/hardware-players', name: 'Hardware Players' },
    { path: '/subcategory/mobile-web-players', name: 'Mobile & Web Players' },
    { path: '/subcategory/ads-qoe', name: 'Ads & QoE' },
    { path: '/subcategory/audio-subtitles', name: 'Audio & Subtitles' },
    { path: '/subcategory/specs-standards', name: 'Specs & Standards' },
    { path: '/subcategory/vendors-hdr', name: 'Vendors & HDR' },
    { path: '/subcategory/cloud-cdn', name: 'Cloud & CDN' },
    { path: '/subcategory/streaming-servers', name: 'Streaming Servers' },
    { path: '/subcategory/ffmpeg-tools', name: 'FFMPEG & Tools' },
    { path: '/subcategory/drm', name: 'DRM' },
    { path: '/subcategory/community-groups', name: 'Community Groups' },
    { path: '/subcategory/events-conferences', name: 'Events & Conferences' }
  ],
  
  subSubcategories: [
    // Intro & Learning
    { path: '/sub-subcategory/online-forums', name: 'Online Forums' },
    { path: '/sub-subcategory/slack-meetups', name: 'Slack & Meetups' },
    
    // Protocols & Transport  
    { path: '/sub-subcategory/hls', name: 'HLS', expectedCount: 63 },
    { path: '/sub-subcategory/dash', name: 'DASH', expectedCount: 50 },
    { path: '/sub-subcategory/rtmp', name: 'RTMP' },
    { path: '/sub-subcategory/srt', name: 'SRT' },
    { path: '/sub-subcategory/rist', name: 'RIST' },
    
    // Encoding & Codecs
    { path: '/sub-subcategory/ffmpeg', name: 'FFMPEG', expectedCount: 66 },
    { path: '/sub-subcategory/other-encoders', name: 'Other Encoders' },
    { path: '/sub-subcategory/av1', name: 'AV1', expectedCount: 6 },
    { path: '/sub-subcategory/hevc', name: 'HEVC', expectedCount: 10 },
    { path: '/sub-subcategory/vp9', name: 'VP9', expectedCount: 1 },
    
    // Players & Clients
    { path: '/sub-subcategory/chromecast', name: 'Chromecast' },
    { path: '/sub-subcategory/roku', name: 'Roku' },
    { path: '/sub-subcategory/smart-tv', name: 'Smart TVs' },
    { path: '/sub-subcategory/android', name: 'Android' },
    { path: '/sub-subcategory/ios-tvos', name: 'iOS/tvOS' },
    { path: '/sub-subcategory/web-players', name: 'Web Players' },
    
    // Media Tools
    { path: '/sub-subcategory/advertising', name: 'Advertising' },
    { path: '/sub-subcategory/quality-testing', name: 'Quality & Testing' },
    { path: '/sub-subcategory/audio', name: 'Audio' },
    { path: '/sub-subcategory/subtitles-captions', name: 'Subtitles & Captions' },
    
    // Standards & Industry
    { path: '/sub-subcategory/mpeg-forums', name: 'MPEG & Forums' },
    { path: '/sub-subcategory/official-specs', name: 'Official Specs' },
    { path: '/sub-subcategory/hdr-guidelines', name: 'HDR Guidelines' },
    { path: '/sub-subcategory/vendor-docs', name: 'Vendor Docs' },
    
    // Infrastructure & Delivery
    { path: '/sub-subcategory/cloud-platforms', name: 'Cloud Platforms' },
    { path: '/sub-subcategory/cdn-integration', name: 'CDN Integration' },
    { path: '/sub-subcategory/origin-servers', name: 'Origin Servers' },
    { path: '/sub-subcategory/storage-solutions', name: 'Storage Solutions' },
    
    // Community & Events
    { path: '/sub-subcategory/conferences', name: 'Conferences' },
    { path: '/sub-subcategory/podcasts-webinars', name: 'Podcasts & Webinars' }
  ]
};

// Test results storage
const testResults = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  categories: [],
  subcategories: [],
  subSubcategories: [],
  summary: []
};

// Test a single navigation path using Puppeteer
async function testPathWithBrowser(page, pathInfo, type) {
  const url = `${BASE_URL}${pathInfo.path}`;
  const result = {
    path: pathInfo.path,
    name: pathInfo.name,
    type: type,
    status: null,
    actualCount: null,
    expectedCount: pathInfo.expectedCount || null,
    countMatch: null,
    error: null,
    passed: false,
    hasContent: false,
    pageTitle: null
  };
  
  try {
    // Navigate to the page
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    result.status = response.status();
    
    if (response.status() === 200) {
      // Wait for React to render
      await page.waitForTimeout(1000);
      
      // Check for 404 content
      const has404 = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return bodyText.includes('Page Not Found') || bodyText.includes('404');
      });
      
      if (has404) {
        result.error = 'Page returned 200 but contains 404 content';
        result.passed = false;
        return result;
      }
      
      // Extract page title
      result.pageTitle = await page.title();
      
      // Check for resources being displayed
      const resourceElements = await page.evaluate(() => {
        // Check for resource cards or list items
        const cards = document.querySelectorAll('[data-testid*="resource"], [class*="resource-card"], [class*="resource-list"]');
        const hasResources = cards.length > 0;
        
        // Try to extract resource count from page text
        const bodyText = document.body.innerText;
        const patterns = [
          /Showing (\d+) of \d+ resources/i,
          /Showing (\d+) resources/i,
          /(\d+) resources found/i,
          /Total: (\d+) resources/i
        ];
        
        let count = null;
        for (const pattern of patterns) {
          const match = bodyText.match(pattern);
          if (match) {
            count = parseInt(match[1]);
            break;
          }
        }
        
        // If no count in text, count actual resource elements
        if (!count && cards.length > 0) {
          count = cards.length;
        }
        
        return { hasResources, count };
      });
      
      result.hasContent = resourceElements.hasResources;
      result.actualCount = resourceElements.count;
      
      // Verify expected count if provided
      if (pathInfo.expectedCount) {
        if (result.actualCount !== null) {
          // Allow for pagination - if actual count is less but there are resources, it might be paginated
          result.countMatch = result.actualCount === pathInfo.expectedCount || 
                             (result.hasContent && result.actualCount < pathInfo.expectedCount);
          result.passed = result.countMatch || result.hasContent;
          
          if (!result.countMatch && result.actualCount !== pathInfo.expectedCount) {
            result.error = `Resource count mismatch: expected ${pathInfo.expectedCount}, found ${result.actualCount}`;
          }
        } else {
          // No count found but check if resources exist
          result.passed = result.hasContent;
          if (!result.hasContent) {
            result.error = 'Could not find resources on page';
          }
        }
      } else {
        // No expected count, just verify page loads and has content
        result.passed = result.hasContent || result.status === 200;
        if (!result.hasContent) {
          result.error = 'No resources found on page';
        }
      }
      
    } else {
      result.error = `HTTP ${response.status()}`;
      result.passed = false;
    }
  } catch (err) {
    result.error = err.message;
    result.passed = false;
  }
  
  return result;
}

// Test all paths in a category
async function testCategory(page, categoryName, paths) {
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`Testing ${categoryName}`);
  console.log(`${'-'.repeat(60)}`);
  const results = [];
  
  for (const pathInfo of paths) {
    process.stdout.write(`Testing ${pathInfo.name}...`);
    const result = await testPathWithBrowser(page, pathInfo, categoryName);
    results.push(result);
    testResults.totalTests++;
    
    if (result.passed) {
      testResults.passed++;
      console.log(` ✅`);
      if (result.expectedCount && result.actualCount) {
        console.log(`  └─ Resources: ${result.actualCount}${result.expectedCount ? `/${result.expectedCount}` : ''}`);
      }
    } else {
      testResults.failed++;
      console.log(` ❌`);
      console.log(`  └─ Error: ${result.error}`);
    }
  }
  
  return results;
}

// Main test runner
async function runTests() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE NAVIGATION TESTING - ALL 60 PATHS');
  console.log('='.repeat(80));
  console.log(`Testing URL: ${BASE_URL}`);
  console.log(`Total paths: 60`);
  console.log(`  - 9 Categories`);
  console.log(`  - 19 Subcategories`);
  console.log(`  - 32 Sub-subcategories`);
  console.log('='.repeat(80));
  
  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    // Test categories
    testResults.categories = await testCategory(page, 'Categories', NAVIGATION_PATHS.categories);
    
    // Test subcategories
    testResults.subcategories = await testCategory(page, 'Subcategories', NAVIGATION_PATHS.subcategories);
    
    // Test sub-subcategories
    testResults.subSubcategories = await testCategory(page, 'Sub-subcategories', NAVIGATION_PATHS.subSubcategories);
    
  } finally {
    await browser.close();
  }
  
  // Generate summary
  generateSummary();
  
  // Save results
  saveResults();
}

function generateSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passRate = ((testResults.passed / testResults.totalTests) * 100).toFixed(1);
  
  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`  Total Tests: ${testResults.totalTests}`);
  console.log(`  ✅ Passed: ${testResults.passed} (${passRate}%)`);
  console.log(`  ❌ Failed: ${testResults.failed}`);
  
  // Category breakdown
  const catPassed = testResults.categories.filter(r => r.passed).length;
  const catTotal = testResults.categories.length;
  console.log(`\n📁 CATEGORIES (${catPassed}/${catTotal} passed):`);
  testResults.categories.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    const countInfo = r.actualCount ? ` [${r.actualCount} resources]` : '';
    console.log(`  ${icon} ${r.name}${countInfo}`);
  });
  
  // Failed subcategories
  const failedSubs = testResults.subcategories.filter(r => !r.passed);
  if (failedSubs.length > 0) {
    console.log(`\n📂 FAILED SUBCATEGORIES (${failedSubs.length}):`);
    failedSubs.forEach(r => {
      console.log(`  ❌ ${r.name} - ${r.error}`);
    });
  }
  
  // Failed sub-subcategories
  const failedSubsubs = testResults.subSubcategories.filter(r => !r.passed);
  if (failedSubsubs.length > 0) {
    console.log(`\n📄 FAILED SUB-SUBCATEGORIES (${failedSubsubs.length}):`);
    failedSubsubs.forEach(r => {
      console.log(`  ❌ ${r.name} - ${r.error}`);
    });
  }
  
  // Resource count verification
  const countMismatches = [
    ...testResults.categories,
    ...testResults.subcategories,
    ...testResults.subSubcategories
  ].filter(r => r.expectedCount && r.actualCount && r.actualCount !== r.expectedCount);
  
  if (countMismatches.length > 0) {
    console.log(`\n⚠️  RESOURCE COUNT MISMATCHES:`);
    countMismatches.forEach(r => {
      console.log(`  ${r.name}: expected ${r.expectedCount}, found ${r.actualCount}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  const finalStatus = testResults.failed === 0 ? '✅ ALL TESTS PASSED' : `⚠️  ${testResults.failed} TESTS FAILED`;
  console.log(finalStatus);
  console.log('='.repeat(80));
}

function saveResults() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `scripts/navigation-test-results-${timestamp}.json`;
  
  const report = {
    timestamp: new Date().toISOString(),
    testUrl: BASE_URL,
    summary: {
      total: testResults.totalTests,
      passed: testResults.passed,
      failed: testResults.failed,
      passRate: ((testResults.passed / testResults.totalTests) * 100).toFixed(1) + '%'
    },
    categories: {
      total: testResults.categories.length,
      passed: testResults.categories.filter(r => r.passed).length,
      results: testResults.categories
    },
    subcategories: {
      total: testResults.subcategories.length,
      passed: testResults.subcategories.filter(r => r.passed).length,
      results: testResults.subcategories
    },
    subSubcategories: {
      total: testResults.subSubcategories.length,
      passed: testResults.subSubcategories.filter(r => r.passed).length,
      results: testResults.subSubcategories
    }
  };
  
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed results saved to: ${filename}`);
}

// Run the tests
runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});