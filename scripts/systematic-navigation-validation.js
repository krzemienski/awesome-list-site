/**
 * Systematic Navigation Validation - ES Module Compatible
 * Tests all navigation paths and validates against JSON data
 */

import https from 'https';
import fs from 'fs/promises';

const BASE_URL = 'http://localhost:5000';
const JSON_SOURCE = 'https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json';

// Complete navigation structure (28 items total)
const ALL_NAVIGATION_ITEMS = [
  // Home page (1 item)
  { type: 'home', path: '/', name: 'Home', expected: 2011 },
  
  // Categories (9 items)
  { type: 'category', path: '/category/community-events', name: 'Community & Events', expected: 91 },
  { type: 'category', path: '/category/encoding-codecs', name: 'Encoding & Codecs', expected: 392 },
  { type: 'category', path: '/category/general-tools', name: 'General Tools', expected: 97 },
  { type: 'category', path: '/category/infrastructure-delivery', name: 'Infrastructure & Delivery', expected: 134 },
  { type: 'category', path: '/category/intro-learning', name: 'Intro & Learning', expected: 229 },
  { type: 'category', path: '/category/media-tools', name: 'Media Tools', expected: 317 },
  { type: 'category', path: '/category/players-clients', name: 'Players & Clients', expected: 382 },
  { type: 'category', path: '/category/protocols-transport', name: 'Protocols & Transport', expected: 231 },
  { type: 'category', path: '/category/standards-industry', name: 'Standards & Industry', expected: 168 },
  
  // Subcategories (18 items)
  { type: 'subcategory', path: '/subcategory/events-conferences', name: 'Events & Conferences', expected: 6 },
  { type: 'subcategory', path: '/subcategory/community-groups', name: 'Community Groups', expected: 4 },
  { type: 'subcategory', path: '/subcategory/encoding-tools', name: 'Encoding Tools', expected: 240 },
  { type: 'subcategory', path: '/subcategory/codecs', name: 'Codecs', expected: 29 },
  { type: 'subcategory', path: '/subcategory/drm', name: 'DRM', expected: 17 },
  { type: 'subcategory', path: '/subcategory/streaming-servers', name: 'Streaming Servers', expected: 39 },
  { type: 'subcategory', path: '/subcategory/cloud-cdn', name: 'Cloud & CDN', expected: 9 },
  { type: 'subcategory', path: '/subcategory/tutorials-case-studies', name: 'Tutorials & Case Studies', expected: 60 },
  { type: 'subcategory', path: '/subcategory/learning-resources', name: 'Learning Resources', expected: 36 },
  { type: 'subcategory', path: '/subcategory/introduction', name: 'Introduction', expected: 4 },
  { type: 'subcategory', path: '/subcategory/audio-subtitles', name: 'Audio & Subtitles', expected: 58 },
  { type: 'subcategory', path: '/subcategory/ads-qoe', name: 'Ads & QoE', expected: 45 },
  { type: 'subcategory', path: '/subcategory/mobile-web-players', name: 'Mobile & Web Players', expected: 81 },
  { type: 'subcategory', path: '/subcategory/hardware-players', name: 'Hardware Players', expected: 35 },
  { type: 'subcategory', path: '/subcategory/adaptive-streaming', name: 'Adaptive Streaming', expected: 131 },
  { type: 'subcategory', path: '/subcategory/transport-protocols', name: 'Transport Protocols', expected: 13 },
  { type: 'subcategory', path: '/subcategory/specs-standards', name: 'Specs & Standards', expected: 35 },
  { type: 'subcategory', path: '/subcategory/vendors-hdr', name: 'Vendors & HDR', expected: 5 }
];

async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function testNavigation(item, index) {
  const result = {
    index: index + 1,
    ...item,
    status: 'UNKNOWN',
    accessible: false,
    dataMatch: false,
    errors: []
  };

  try {
    console.log(`🧪 [${index + 1}/28] Testing: ${item.name} (${item.path})`);
    
    // Test URL accessibility
    const response = await fetch(`${BASE_URL}${item.path}`);
    result.accessible = response.ok;
    
    if (!result.accessible) {
      result.errors.push(`URL not accessible: ${response.status}`);
      result.status = 'FAILED';
      return result;
    }
    
    // For detailed data validation, fetch API data for comparison
    if (item.type !== 'home') {
      const apiData = await fetchData(`${BASE_URL}/api/awesome-list`);
      
      if (item.type === 'category') {
        const category = apiData.categories.find(cat => 
          cat.slug === item.path.replace('/category/', '')
        );
        
        if (category) {
          const actualCount = category.resources.length;
          result.dataMatch = Math.abs(actualCount - item.expected) <= 2; // Allow small variance
          result.actualCount = actualCount;
          
          if (!result.dataMatch) {
            result.errors.push(`Count mismatch: expected ${item.expected}, got ${actualCount}`);
          }
        } else {
          result.errors.push('Category not found in API data');
        }
      } else if (item.type === 'subcategory') {
        // Find subcategory across all categories
        let foundSubcategory = null;
        const slug = item.path.replace('/subcategory/', '');
        
        for (const category of apiData.categories) {
          foundSubcategory = category.subcategories?.find(sub => sub.slug === slug);
          if (foundSubcategory) break;
        }
        
        if (foundSubcategory) {
          const actualCount = foundSubcategory.resources.length;
          result.dataMatch = Math.abs(actualCount - item.expected) <= 2;
          result.actualCount = actualCount;
          
          if (!result.dataMatch) {
            result.errors.push(`Count mismatch: expected ${item.expected}, got ${actualCount}`);
          }
        } else {
          result.errors.push('Subcategory not found in API data');
        }
      }
    } else {
      // Home page - check total resources
      const apiData = await fetchData(`${BASE_URL}/api/awesome-list`);
      result.actualCount = apiData.resources.length;
      result.dataMatch = result.actualCount === item.expected;
      
      if (!result.dataMatch) {
        result.errors.push(`Total count mismatch: expected ${item.expected}, got ${result.actualCount}`);
      }
    }
    
    result.status = result.accessible && result.dataMatch ? 'PASSED' : 'FAILED';
    
    if (result.status === 'PASSED') {
      console.log(`   ✅ PASSED: ${result.actualCount}/${item.expected} resources`);
    } else {
      console.log(`   ❌ FAILED: ${result.errors.join(', ')}`);
    }
    
  } catch (error) {
    result.errors.push(`Test error: ${error.message}`);
    result.status = 'ERROR';
    console.log(`   💥 ERROR: ${error.message}`);
  }
  
  return result;
}

async function runSystematicValidation() {
  console.log("🚀 SYSTEMATIC NAVIGATION VALIDATION");
  console.log("=====================================");
  console.log(`📊 Testing ${ALL_NAVIGATION_ITEMS.length} navigation items total`);
  console.log("🎯 Validating: Accessibility + Data Consistency + Resource Counts\n");
  
  const results = {
    timestamp: new Date().toISOString(),
    totalItems: ALL_NAVIGATION_ITEMS.length,
    passed: 0,
    failed: 0,
    errors: 0,
    tests: []
  };
  
  // Run all tests
  for (let i = 0; i < ALL_NAVIGATION_ITEMS.length; i++) {
    const result = await testNavigation(ALL_NAVIGATION_ITEMS[i], i);
    results.tests.push(result);
    
    if (result.status === 'PASSED') results.passed++;
    else if (result.status === 'FAILED') results.failed++;
    else results.errors++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate comprehensive report
  const summary = {
    overview: {
      total: results.totalItems,
      passed: results.passed,
      failed: results.failed,
      errors: results.errors,
      successRate: `${((results.passed / results.totalItems) * 100).toFixed(1)}%`
    },
    breakdown: {
      home: results.tests.filter(t => t.type === 'home').length,
      categories: results.tests.filter(t => t.type === 'category').length,
      subcategories: results.tests.filter(t => t.type === 'subcategory').length
    },
    failedTests: results.tests.filter(t => t.status !== 'PASSED').map(t => ({
      name: t.name,
      path: t.path,
      expected: t.expected,
      actual: t.actualCount,
      errors: t.errors
    }))
  };
  
  // Print final report
  console.log("\n📋 COMPREHENSIVE VALIDATION RESULTS");
  console.log("===================================");
  console.log(`✅ Passed: ${summary.overview.passed}/${summary.overview.total} (${summary.overview.successRate})`);
  console.log(`❌ Failed: ${summary.overview.failed}/${summary.overview.total}`);
  console.log(`💥 Errors: ${summary.overview.errors}/${summary.overview.total}`);
  console.log(`🏠 Home page: ${summary.breakdown.home} test`);
  console.log(`📁 Categories: ${summary.breakdown.categories} tests`);
  console.log(`📂 Subcategories: ${summary.breakdown.subcategories} tests`);
  
  if (summary.failedTests.length > 0) {
    console.log("\n❌ FAILED/ERROR TESTS:");
    summary.failedTests.forEach(test => {
      console.log(`  • ${test.name}: Expected ${test.expected}, Got ${test.actual || 'N/A'}`);
      if (test.errors.length > 0) {
        test.errors.forEach(error => console.log(`    - ${error}`));
      }
    });
  }
  
  // Save detailed results
  const fullResults = { ...results, summary };
  await fs.writeFile('./test-screenshots/systematic-navigation-results.json', JSON.stringify(fullResults, null, 2));
  console.log(`\n📄 Detailed results saved to: ./test-screenshots/systematic-navigation-results.json`);
  
  return summary;
}

// Run validation
runSystematicValidation()
  .then(summary => {
    console.log("\n🎉 Systematic navigation validation completed!");
    process.exit(summary.overview.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Validation framework error:", error);
    process.exit(1);
  });