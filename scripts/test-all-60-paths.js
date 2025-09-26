#!/usr/bin/env node

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

// Helper function to extract resource count from HTML
function extractResourceCount(html) {
  // Try multiple patterns for finding resource counts
  const patterns = [
    /Showing (\d+) of \d+ resources/i,
    /(\d+) resources?\s*</i,
    /Showing (\d+) resources/i,
    />(\d+)\s*<\/.*resources/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

// Function to test a single path
async function testPath(pathInfo, type) {
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
    passed: false
  };
  
  try {
    const response = await fetch(url);
    result.status = response.status;
    
    if (response.status === 200) {
      const html = await response.text();
      
      // Check for 404 content in successful response
      if (html.includes('Page Not Found') || html.includes('404')) {
        result.error = 'Page returned 200 but contains 404 content';
        result.passed = false;
      } else {
        // Extract resource count if expected
        if (pathInfo.expectedCount) {
          result.actualCount = extractResourceCount(html);
          if (result.actualCount !== null) {
            result.countMatch = result.actualCount === pathInfo.expectedCount;
            result.passed = result.countMatch;
            if (!result.countMatch) {
              result.error = `Resource count mismatch: expected ${pathInfo.expectedCount}, got ${result.actualCount}`;
            }
          } else {
            result.error = 'Could not extract resource count from page';
            result.passed = false;
          }
        } else {
          // No count to verify, just check for successful load
          result.passed = true;
        }
      }
    } else {
      result.error = `HTTP ${response.status}`;
      result.passed = false;
    }
  } catch (err) {
    result.error = err.message;
    result.passed = false;
  }
  
  return result;
}

// Test all paths in a category
async function testCategory(categoryName, paths) {
  console.log(`\nTesting ${categoryName}...`);
  const results = [];
  
  for (const pathInfo of paths) {
    const result = await testPath(pathInfo, categoryName);
    results.push(result);
    testResults.totalTests++;
    
    if (result.passed) {
      testResults.passed++;
      console.log(`  ✅ ${result.name} - ${result.path}`);
      if (result.expectedCount) {
        console.log(`     Count: ${result.actualCount}/${result.expectedCount}`);
      }
    } else {
      testResults.failed++;
      console.log(`  ❌ ${result.name} - ${result.path}`);
      console.log(`     Error: ${result.error}`);
    }
  }
  
  return results;
}

// Main test runner
async function runTests() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE NAVIGATION TESTING - ALL 60 PATHS');
  console.log('='.repeat(80));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Total paths to test: 60`);
  console.log('  - 9 Categories');
  console.log('  - 19 Subcategories');
  console.log('  - 32 Sub-subcategories');
  console.log('='.repeat(80));
  
  // Test categories
  testResults.categories = await testCategory('Categories', NAVIGATION_PATHS.categories);
  
  // Test subcategories
  testResults.subcategories = await testCategory('Subcategories', NAVIGATION_PATHS.subcategories);
  
  // Test sub-subcategories
  testResults.subSubcategories = await testCategory('Sub-subcategories', NAVIGATION_PATHS.subSubcategories);
  
  // Generate summary
  generateSummary();
  
  // Save detailed results to file
  saveResults();
}

function generateSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passRate = ((testResults.passed / testResults.totalTests) * 100).toFixed(1);
  
  console.log(`\nOVERALL RESULTS:`);
  console.log(`  Total Tests: ${testResults.totalTests}`);
  console.log(`  Passed: ${testResults.passed} (${passRate}%)`);
  console.log(`  Failed: ${testResults.failed}`);
  
  // Category breakdown
  const catPassed = testResults.categories.filter(r => r.passed).length;
  const catTotal = testResults.categories.length;
  console.log(`\nCATEGORIES (${catPassed}/${catTotal} passed):`);
  testResults.categories.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    const countInfo = r.expectedCount ? ` [${r.actualCount}/${r.expectedCount} resources]` : '';
    console.log(`  ${icon} ${r.name}${countInfo}`);
    if (!r.passed && r.error) {
      console.log(`     └─ ${r.error}`);
    }
  });
  
  // Subcategory breakdown
  const subPassed = testResults.subcategories.filter(r => r.passed).length;
  const subTotal = testResults.subcategories.length;
  console.log(`\nSUBCATEGORIES (${subPassed}/${subTotal} passed):`);
  const failedSubs = testResults.subcategories.filter(r => !r.passed);
  if (failedSubs.length > 0) {
    failedSubs.forEach(r => {
      console.log(`  ❌ ${r.name} - ${r.error}`);
    });
  } else {
    console.log(`  All subcategories passed!`);
  }
  
  // Sub-subcategory breakdown
  const subsubPassed = testResults.subSubcategories.filter(r => r.passed).length;
  const subsubTotal = testResults.subSubcategories.length;
  console.log(`\nSUB-SUBCATEGORIES (${subsubPassed}/${subsubTotal} passed):`);
  const failedSubsubs = testResults.subSubcategories.filter(r => !r.passed);
  if (failedSubsubs.length > 0) {
    failedSubsubs.forEach(r => {
      const countInfo = r.expectedCount ? ` (expected: ${r.expectedCount})` : '';
      console.log(`  ❌ ${r.name}${countInfo} - ${r.error}`);
    });
  } else {
    console.log(`  All sub-subcategories passed!`);
  }
  
  // Critical issues
  console.log(`\nCRITICAL ISSUES:`);
  const countMismatches = [
    ...testResults.categories,
    ...testResults.subcategories, 
    ...testResults.subSubcategories
  ].filter(r => r.expectedCount && r.actualCount !== null && r.actualCount !== r.expectedCount);
  
  if (countMismatches.length > 0) {
    console.log(`  Resource count mismatches found:`);
    countMismatches.forEach(r => {
      console.log(`    - ${r.name}: expected ${r.expectedCount}, got ${r.actualCount}`);
    });
  } else {
    console.log(`  No critical issues found.`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`TEST ${testResults.failed === 0 ? 'PASSED' : 'FAILED'}`);
  console.log('='.repeat(80));
}

function saveResults() {
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `scripts/test-results-${timestamp}.json`;
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.totalTests,
      passed: testResults.passed,
      failed: testResults.failed,
      passRate: ((testResults.passed / testResults.totalTests) * 100).toFixed(1) + '%'
    },
    categories: testResults.categories,
    subcategories: testResults.subcategories,
    subSubcategories: testResults.subSubcategories
  };
  
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\nDetailed results saved to: ${filename}`);
}

// Run the tests
runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});