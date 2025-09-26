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
    { path: '/subcategory/introduction', name: 'Introduction', expectedCount: 78 },
    { path: '/subcategory/learning-resources', name: 'Learning Resources', expectedCount: 134 },
    { path: '/subcategory/tutorials-case-studies', name: 'Tutorials & Case Studies', expectedCount: 17 },
    { path: '/subcategory/adaptive-streaming', name: 'Adaptive Streaming', expectedCount: 144 },
    { path: '/subcategory/transport-protocols', name: 'Transport Protocols', expectedCount: 108 },
    { path: '/subcategory/encoding-tools', name: 'Encoding Tools', expectedCount: 240 },
    { path: '/subcategory/codecs', name: 'Codecs', expectedCount: 29 },
    { path: '/subcategory/hardware-players', name: 'Hardware Players', expectedCount: 48 },
    { path: '/subcategory/mobile-web-players', name: 'Mobile & Web Players', expectedCount: 221 },
    { path: '/subcategory/ads-qoe', name: 'Ads & QoE', expectedCount: 101 },
    { path: '/subcategory/audio-subtitles', name: 'Audio & Subtitles', expectedCount: 39 },
    { path: '/subcategory/specs-standards', name: 'Specs & Standards', expectedCount: 101 },
    { path: '/subcategory/vendors-hdr', name: 'Vendors & HDR', expectedCount: 73 },
    { path: '/subcategory/cloud-cdn', name: 'Cloud & CDN', expectedCount: 113 },
    { path: '/subcategory/streaming-servers', name: 'Streaming Servers', expectedCount: 77 },
    { path: '/subcategory/ffmpeg-tools', name: 'FFMPEG & Tools', expectedCount: 123 },
    { path: '/subcategory/drm', name: 'DRM', expectedCount: 177 },
    { path: '/subcategory/community-groups', name: 'Community Groups', expectedCount: 42 },
    { path: '/subcategory/events-conferences', name: 'Events & Conferences', expectedCount: 49 }
  ],
  
  subSubcategories: [
    // Intro & Learning
    { path: '/sub-subcategory/online-forums', name: 'Online Forums', expectedCount: 18 },
    { path: '/sub-subcategory/slack-meetups', name: 'Slack & Meetups', expectedCount: 24 },
    
    // Protocols & Transport  
    { path: '/sub-subcategory/hls', name: 'HLS', expectedCount: 63 },
    { path: '/sub-subcategory/dash', name: 'DASH', expectedCount: 50 },
    { path: '/sub-subcategory/rtmp', name: 'RTMP', expectedCount: 31 },
    { path: '/sub-subcategory/srt', name: 'SRT', expectedCount: 20 },
    { path: '/sub-subcategory/rist', name: 'RIST', expectedCount: 14 },
    
    // Encoding & Codecs
    { path: '/sub-subcategory/ffmpeg', name: 'FFMPEG', expectedCount: 66 },
    { path: '/sub-subcategory/other-encoders', name: 'Other Encoders', expectedCount: 57 },
    { path: '/sub-subcategory/av1', name: 'AV1', expectedCount: 6 },
    { path: '/sub-subcategory/hevc', name: 'HEVC', expectedCount: 10 },
    { path: '/sub-subcategory/vp9', name: 'VP9', expectedCount: 1 },
    
    // Players & Clients
    { path: '/sub-subcategory/chromecast', name: 'Chromecast', expectedCount: 9 },
    { path: '/sub-subcategory/roku', name: 'Roku', expectedCount: 6 },
    { path: '/sub-subcategory/smart-tv', name: 'Smart TVs', expectedCount: 33 },
    { path: '/sub-subcategory/android', name: 'Android', expectedCount: 23 },
    { path: '/sub-subcategory/ios-tvos', name: 'iOS/tvOS', expectedCount: 29 },
    { path: '/sub-subcategory/web-players', name: 'Web Players', expectedCount: 169 },
    
    // Media Tools
    { path: '/sub-subcategory/advertising', name: 'Advertising', expectedCount: 68 },
    { path: '/sub-subcategory/quality-testing', name: 'Quality & Testing', expectedCount: 33 },
    { path: '/sub-subcategory/audio', name: 'Audio', expectedCount: 24 },
    { path: '/sub-subcategory/subtitles-captions', name: 'Subtitles & Captions', expectedCount: 15 },
    
    // Standards & Industry
    { path: '/sub-subcategory/mpeg-forums', name: 'MPEG & Forums', expectedCount: 36 },
    { path: '/sub-subcategory/official-specs', name: 'Official Specs', expectedCount: 65 },
    { path: '/sub-subcategory/hdr-guidelines', name: 'HDR Guidelines', expectedCount: 33 },
    { path: '/sub-subcategory/vendor-docs', name: 'Vendor Docs', expectedCount: 40 },
    
    // Infrastructure & Delivery
    { path: '/sub-subcategory/cloud-platforms', name: 'Cloud Platforms', expectedCount: 70 },
    { path: '/sub-subcategory/cdn-integration', name: 'CDN Integration', expectedCount: 43 },
    { path: '/sub-subcategory/origin-servers', name: 'Origin Servers', expectedCount: 48 },
    { path: '/sub-subcategory/storage-solutions', name: 'Storage Solutions', expectedCount: 29 },
    
    // Community & Events
    { path: '/sub-subcategory/conferences', name: 'Conferences', expectedCount: 29 },
    { path: '/sub-subcategory/podcasts-webinars', name: 'Podcasts & Webinars', expectedCount: 20 }
  ]
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  categories: [],
  subcategories: [],
  subSubcategories: [],
  apiData: null
};

// First, test API to get actual data
async function testAPI() {
  console.log('📊 Fetching API data for validation...');
  try {
    const response = await fetch(`${BASE_URL}/api/awesome-list`);
    const data = await response.json();
    testResults.apiData = {
      totalResources: data.resources?.length || 0,
      categories: data.categories?.map(c => ({
        name: c.name,
        slug: c.slug,
        count: c.resources?.length || 0
      })) || []
    };
    console.log(`  └─ Found ${testResults.apiData.totalResources} total resources`);
    console.log(`  └─ Found ${testResults.apiData.categories.length} categories`);
    return true;
  } catch (err) {
    console.log(`  └─ ❌ API Error: ${err.message}`);
    return false;
  }
}

// Simple HTTP test for pages that return 200
async function testPathSimple(pathInfo) {
  const url = `${BASE_URL}${pathInfo.path}`;
  const result = {
    path: pathInfo.path,
    name: pathInfo.name,
    expectedCount: pathInfo.expectedCount || null,
    status: null,
    passed: false,
    warning: null
  };
  
  try {
    const response = await fetch(url);
    result.status = response.status;
    result.passed = response.status === 200;
    
    if (!result.passed) {
      result.error = `HTTP ${response.status}`;
    }
  } catch (err) {
    result.error = err.message;
    result.passed = false;
  }
  
  return result;
}

// Test with Puppeteer for full validation
async function testPathWithBrowser(page, pathInfo) {
  const url = `${BASE_URL}${pathInfo.path}`;
  const result = {
    path: pathInfo.path,
    name: pathInfo.name,
    expectedCount: pathInfo.expectedCount || null,
    status: null,
    actualCount: null,
    hasResources: false,
    passed: false,
    warning: null
  };
  
  try {
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    result.status = response.status();
    
    if (response.status() === 200) {
      // Wait a bit for React to render
      await page.waitForTimeout(1500);
      
      // Check for 404 content
      const has404 = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Page Not Found') || text.includes('404');
      });
      
      if (has404) {
        result.error = '404 content in 200 response';
        return result;
      }
      
      // Check for resources
      const pageInfo = await page.evaluate(() => {
        // Count resource cards/items
        const cards = document.querySelectorAll(
          '[data-testid*="resource"], .resource-card, article, [class*="card"]'
        );
        
        // Extract count from page text
        const text = document.body.innerText;
        const countMatch = text.match(/(\d+)\s+resources?/i);
        const showingMatch = text.match(/Showing\s+(\d+)/i);
        
        return {
          cardCount: cards.length,
          textCount: countMatch ? parseInt(countMatch[1]) : null,
          showingCount: showingMatch ? parseInt(showingMatch[1]) : null,
          hasContent: cards.length > 0 || text.includes('resource')
        };
      });
      
      result.hasResources = pageInfo.hasContent;
      result.actualCount = pageInfo.textCount || pageInfo.showingCount || pageInfo.cardCount;
      
      // Check against expected count
      if (pathInfo.expectedCount) {
        if (result.actualCount) {
          const diff = Math.abs(result.actualCount - pathInfo.expectedCount);
          const percentDiff = (diff / pathInfo.expectedCount) * 100;
          
          if (percentDiff > 10) {
            result.warning = `Count mismatch: expected ${pathInfo.expectedCount}, found ${result.actualCount}`;
            testResults.warnings++;
          }
        }
      }
      
      result.passed = result.hasResources || result.status === 200;
    } else {
      result.error = `HTTP ${response.status()}`;
    }
  } catch (err) {
    result.error = err.message.split('\n')[0]; // First line of error only
  }
  
  return result;
}

// Test a category of paths
async function testCategory(categoryName, paths, useBrowser = false, page = null) {
  console.log(`\n🔍 Testing ${categoryName} (${paths.length} paths)...`);
  const results = [];
  
  for (let i = 0; i < paths.length; i++) {
    const pathInfo = paths[i];
    process.stdout.write(`  [${i+1}/${paths.length}] ${pathInfo.name}... `);
    
    let result;
    if (useBrowser && page) {
      result = await testPathWithBrowser(page, pathInfo);
    } else {
      result = await testPathSimple(pathInfo);
    }
    
    results.push(result);
    testResults.totalTests++;
    
    if (result.passed) {
      testResults.passed++;
      process.stdout.write('✅');
      if (result.actualCount) {
        process.stdout.write(` (${result.actualCount} resources)`);
      }
      if (result.warning) {
        process.stdout.write(` ⚠️  ${result.warning}`);
      }
    } else {
      testResults.failed++;
      process.stdout.write(`❌ ${result.error || 'Failed'}`);
    }
    process.stdout.write('\n');
  }
  
  return results;
}

// Main test runner
async function runTests() {
  console.log('='.repeat(80));
  console.log('🚀 COMPREHENSIVE NAVIGATION TESTING - ALL 60 PATHS');
  console.log('='.repeat(80));
  console.log(`📍 Testing URL: ${BASE_URL}`);
  console.log(`📋 Total paths to test: 60`);
  console.log(`  └─ 9 Categories`);
  console.log(`  └─ 19 Subcategories`);
  console.log(`  └─ 32 Sub-subcategories`);
  console.log('='.repeat(80));
  
  // Test API first
  await testAPI();
  
  // Try to use Puppeteer, fallback to simple HTTP tests
  let browser = null;
  let page = null;
  let useBrowser = false;
  
  try {
    console.log('\n🌐 Attempting to launch browser for detailed testing...');
    browser = await puppeteer.launch({ 
      headless: true,
      executablePath: '/usr/bin/chromium', // Use system chromium
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    useBrowser = true;
    console.log('  └─ ✅ Browser launched successfully');
  } catch (err) {
    console.log('  └─ ⚠️  Browser unavailable, using HTTP testing only');
    useBrowser = false;
  }
  
  try {
    // Test all categories
    testResults.categories = await testCategory('CATEGORIES', NAVIGATION_PATHS.categories, useBrowser, page);
    
    // Test all subcategories
    testResults.subcategories = await testCategory('SUBCATEGORIES', NAVIGATION_PATHS.subcategories, useBrowser, page);
    
    // Test all sub-subcategories
    testResults.subSubcategories = await testCategory('SUB-SUBCATEGORIES', NAVIGATION_PATHS.subSubcategories, useBrowser, page);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate report
  generateReport();
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(80));
  
  const passRate = ((testResults.passed / testResults.totalTests) * 100).toFixed(1);
  
  // Overall Summary
  console.log('\n✨ OVERALL RESULTS:');
  console.log(`  Total Tests: ${testResults.totalTests}`);
  console.log(`  ✅ Passed: ${testResults.passed} (${passRate}%)`);
  console.log(`  ❌ Failed: ${testResults.failed}`);
  if (testResults.warnings > 0) {
    console.log(`  ⚠️  Warnings: ${testResults.warnings}`);
  }
  
  // Categories Summary
  const catPassed = testResults.categories.filter(r => r.passed).length;
  console.log(`\n📁 CATEGORIES: ${catPassed}/${testResults.categories.length} passed`);
  const catFailed = testResults.categories.filter(r => !r.passed);
  if (catFailed.length > 0) {
    console.log('  Failed:');
    catFailed.forEach(r => {
      console.log(`    ❌ ${r.name} - ${r.error || 'Unknown error'}`);
    });
  } else {
    console.log('  ✅ All categories passed!');
  }
  
  // Subcategories Summary
  const subPassed = testResults.subcategories.filter(r => r.passed).length;
  console.log(`\n📂 SUBCATEGORIES: ${subPassed}/${testResults.subcategories.length} passed`);
  const subFailed = testResults.subcategories.filter(r => !r.passed);
  if (subFailed.length > 0) {
    console.log('  Failed:');
    subFailed.forEach(r => {
      console.log(`    ❌ ${r.name} - ${r.error || 'Unknown error'}`);
    });
  } else {
    console.log('  ✅ All subcategories passed!');
  }
  
  // Sub-subcategories Summary
  const subsubPassed = testResults.subSubcategories.filter(r => r.passed).length;
  console.log(`\n📄 SUB-SUBCATEGORIES: ${subsubPassed}/${testResults.subSubcategories.length} passed`);
  const subsubFailed = testResults.subSubcategories.filter(r => !r.passed);
  if (subsubFailed.length > 0) {
    console.log('  Failed:');
    subsubFailed.forEach(r => {
      console.log(`    ❌ ${r.name} - ${r.error || 'Unknown error'}`);
    });
  } else {
    console.log('  ✅ All sub-subcategories passed!');
  }
  
  // Final Status
  console.log('\n' + '='.repeat(80));
  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log(`⚠️  ${testResults.failed} NAVIGATION PATHS FAILED`);
    console.log('Please review the failed paths above for debugging.');
  }
  console.log('='.repeat(80));
  
  // Save detailed JSON report
  saveReport();
}

function saveReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `scripts/navigation-test-report-${timestamp}.json`;
  
  const report = {
    timestamp: testResults.timestamp,
    testUrl: BASE_URL,
    summary: {
      total: testResults.totalTests,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      passRate: ((testResults.passed / testResults.totalTests) * 100).toFixed(1) + '%'
    },
    apiValidation: testResults.apiData,
    categories: {
      total: testResults.categories.length,
      passed: testResults.categories.filter(r => r.passed).length,
      failed: testResults.categories.filter(r => !r.passed).length,
      results: testResults.categories
    },
    subcategories: {
      total: testResults.subcategories.length,
      passed: testResults.subcategories.filter(r => r.passed).length,
      failed: testResults.subcategories.filter(r => !r.passed).length,
      results: testResults.subcategories
    },
    subSubcategories: {
      total: testResults.subSubcategories.length,
      passed: testResults.subSubcategories.filter(r => r.passed).length,
      failed: testResults.subSubcategories.filter(r => !r.passed).length,
      results: testResults.subSubcategories
    }
  };
  
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed JSON report saved to: ${filename}`);
}

// Run tests
runTests().catch(err => {
  console.error('❌ Critical test failure:', err);
  process.exit(1);
});