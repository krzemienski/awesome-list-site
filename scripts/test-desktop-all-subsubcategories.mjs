#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };
const SCREENSHOT_DIR = 'scripts/test-screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// All 32 sub-subcategories to test with expected resource counts
const SUB_SUBCATEGORIES = [
  // From Adaptive Streaming
  { slug: 'hls', name: 'HLS', expectedCount: 63, parentCategory: 'Protocols & Transport', parentSubcategory: 'Adaptive Streaming' },
  { slug: 'dash', name: 'DASH', expectedCount: 50, parentCategory: 'Protocols & Transport', parentSubcategory: 'Adaptive Streaming' },
  
  // From Transport Protocols
  { slug: 'rist', name: 'RIST', expectedCount: 1, parentCategory: 'Protocols & Transport', parentSubcategory: 'Transport Protocols' },
  { slug: 'srt', name: 'SRT', expectedCount: 1, parentCategory: 'Protocols & Transport', parentSubcategory: 'Transport Protocols' },
  { slug: 'rtmp', name: 'RTMP', expectedCount: 0, parentCategory: 'Protocols & Transport', parentSubcategory: 'Transport Protocols' },
  
  // From Encoding Tools
  { slug: 'ffmpeg', name: 'FFMPEG', expectedCount: 66, parentCategory: 'Encoding & Codecs', parentSubcategory: 'Encoding Tools' },
  { slug: 'other-encoders', name: 'Other Encoders', expectedCount: 1, parentCategory: 'Encoding & Codecs', parentSubcategory: 'Encoding Tools' },
  
  // From Codecs
  { slug: 'hevc', name: 'HEVC', expectedCount: 10, parentCategory: 'Encoding & Codecs', parentSubcategory: 'Codecs' },
  { slug: 'vp9', name: 'VP9', expectedCount: 1, parentCategory: 'Encoding & Codecs', parentSubcategory: 'Codecs' },
  { slug: 'av1', name: 'AV1', expectedCount: 6, parentCategory: 'Encoding & Codecs', parentSubcategory: 'Codecs' },
  
  // From Hardware Players
  { slug: 'roku', name: 'Roku', expectedCount: 26, parentCategory: 'Players & Clients', parentSubcategory: 'Hardware Players' },
  { slug: 'smart-tvs', name: 'Smart TVs', expectedCount: 3, parentCategory: 'Players & Clients', parentSubcategory: 'Hardware Players' },
  { slug: 'chromecast', name: 'Chromecast', expectedCount: 1, parentCategory: 'Players & Clients', parentSubcategory: 'Hardware Players' },
  
  // From Mobile & Web Players
  { slug: 'iostvos', name: 'iOS/tvOS', expectedCount: 31, parentCategory: 'Players & Clients', parentSubcategory: 'Mobile & Web Players' },
  { slug: 'android', name: 'Android', expectedCount: 10, parentCategory: 'Players & Clients', parentSubcategory: 'Mobile & Web Players' },
  { slug: 'web-players', name: 'Web Players', expectedCount: 25, parentCategory: 'Players & Clients', parentSubcategory: 'Mobile & Web Players' },
  
  // From Audio & Subtitles
  { slug: 'audio', name: 'Audio', expectedCount: 8, parentCategory: 'Media Tools', parentSubcategory: 'Audio & Subtitles' },
  { slug: 'subtitles-captions', name: 'Subtitles & Captions', expectedCount: 40, parentCategory: 'Media Tools', parentSubcategory: 'Audio & Subtitles' },
  
  // From Ads & QoE
  { slug: 'advertising', name: 'Advertising', expectedCount: 0, parentCategory: 'Media Tools', parentSubcategory: 'Ads & QoE' },
  { slug: 'quality-testing', name: 'Quality & Testing', expectedCount: 36, parentCategory: 'Media Tools', parentSubcategory: 'Ads & QoE' },
  
  // From Specs & Standards
  { slug: 'official-specs', name: 'Official Specs', expectedCount: 3, parentCategory: 'Standards & Industry', parentSubcategory: 'Specs & Standards' },
  { slug: 'mpeg-forums', name: 'MPEG & Forums', expectedCount: 6, parentCategory: 'Standards & Industry', parentSubcategory: 'Specs & Standards' },
  
  // From Vendors & HDR
  { slug: 'vendor-docs', name: 'Vendor Docs', expectedCount: 1, parentCategory: 'Standards & Industry', parentSubcategory: 'Vendors & HDR' },
  { slug: 'hdr-guidelines', name: 'HDR Guidelines', expectedCount: 1, parentCategory: 'Standards & Industry', parentSubcategory: 'Vendors & HDR' },
  
  // From Streaming Servers
  { slug: 'origin-servers', name: 'Origin Servers', expectedCount: 1, parentCategory: 'Infrastructure & Delivery', parentSubcategory: 'Streaming Servers' },
  { slug: 'storage-solutions', name: 'Storage Solutions', expectedCount: 3, parentCategory: 'Infrastructure & Delivery', parentSubcategory: 'Streaming Servers' },
  
  // From Cloud & CDN
  { slug: 'cloud-platforms', name: 'Cloud Platforms', expectedCount: 4, parentCategory: 'Infrastructure & Delivery', parentSubcategory: 'Cloud & CDN' },
  { slug: 'cdn-integration', name: 'CDN Integration', expectedCount: 1, parentCategory: 'Infrastructure & Delivery', parentSubcategory: 'Cloud & CDN' },
  
  // From Community Groups
  { slug: 'online-forums', name: 'Online Forums', expectedCount: 2, parentCategory: 'Community & Events', parentSubcategory: 'Community Groups' },
  { slug: 'slack-meetups', name: 'Slack & Meetups', expectedCount: 0, parentCategory: 'Community & Events', parentSubcategory: 'Community Groups' },
  
  // From Events & Conferences
  { slug: 'conferences', name: 'Conferences', expectedCount: 0, parentCategory: 'Community & Events', parentSubcategory: 'Events & Conferences' },
  { slug: 'podcasts-webinars', name: 'Podcasts & Webinars', expectedCount: 2, parentCategory: 'Community & Events', parentSubcategory: 'Events & Conferences' },
];

const results = {
  timestamp: new Date().toISOString(),
  viewport: VIEWPORT,
  totalTests: SUB_SUBCATEGORIES.length,
  passed: 0,
  failed: 0,
  details: []
};

async function testSubSubcategoryPage(browser, subSubcat) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  
  const url = `${BASE_URL}/sub-subcategory/${subSubcat.slug}`;
  const testResult = {
    name: subSubcat.name,
    slug: subSubcat.slug,
    url: url,
    expectedCount: subSubcat.expectedCount,
    parentCategory: subSubcat.parentCategory,
    parentSubcategory: subSubcat.parentSubcategory,
    tests: {
      navigation: false,
      resourceCount: false,
      breadcrumb: false,
      layout: false,
      emptyStateOrResources: false
    },
    actualCount: 0,
    breadcrumbText: '',
    errors: []
  };
  
  try {
    console.log(`\n📝 Testing: ${subSubcat.name} (${subSubcat.slug})`);
    console.log(`   Expected: ${subSubcat.expectedCount} resources`);
    console.log(`   URL: ${url}`);
    
    // Test 1: Navigation
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    if (response && response.ok()) {
      testResult.tests.navigation = true;
      console.log('   ✅ Navigation successful');
    } else {
      testResult.errors.push(`Navigation failed with status: ${response?.status()}`);
      console.log('   ❌ Navigation failed');
    }
    
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Test 2: Check for heading and breadcrumb
    const heading = await page.$('[data-testid="heading-subsubcategory"]');
    const breadcrumb = await page.$('[data-testid="text-breadcrumb"]');
    
    if (heading && breadcrumb) {
      const headingText = await page.evaluate(el => el.textContent, heading);
      const breadcrumbText = await page.evaluate(el => el.textContent, breadcrumb);
      testResult.breadcrumbText = breadcrumbText.trim();
      
      // Check if breadcrumb contains parent category and subcategory
      const breadcrumbValid = breadcrumbText.includes(subSubcat.parentCategory) && 
                             breadcrumbText.includes(subSubcat.parentSubcategory);
      
      if (breadcrumbValid) {
        testResult.tests.breadcrumb = true;
        console.log(`   ✅ Breadcrumb valid: "${breadcrumbText}"`);
      } else {
        testResult.errors.push(`Breadcrumb missing parent info: "${breadcrumbText}"`);
        console.log(`   ❌ Breadcrumb invalid: "${breadcrumbText}"`);
      }
    } else {
      testResult.errors.push('Heading or breadcrumb not found');
      console.log('   ❌ Heading or breadcrumb not found');
    }
    
    // Test 3: Resource count
    const countBadge = await page.$('[data-testid="badge-count"]');
    if (countBadge) {
      const countText = await page.evaluate(el => el.textContent, countBadge);
      testResult.actualCount = parseInt(countText.trim());
      
      if (testResult.actualCount === subSubcat.expectedCount) {
        testResult.tests.resourceCount = true;
        console.log(`   ✅ Resource count matches: ${testResult.actualCount}`);
      } else {
        testResult.errors.push(`Count mismatch: expected ${subSubcat.expectedCount}, got ${testResult.actualCount}`);
        console.log(`   ❌ Count mismatch: expected ${subSubcat.expectedCount}, got ${testResult.actualCount}`);
      }
    } else {
      testResult.errors.push('Count badge not found');
      console.log('   ❌ Count badge not found');
    }
    
    // Test 4: Empty state or resources display
    if (subSubcat.expectedCount === 0) {
      // Should show empty state
      const bodyText = await page.evaluate(() => document.body.textContent);
      if (bodyText.includes('No resources found') || bodyText.includes('no resources')) {
        testResult.tests.emptyStateOrResources = true;
        console.log('   ✅ Empty state displayed correctly');
      } else {
        testResult.errors.push('Empty state message not found');
        console.log('   ❌ Empty state not displayed');
      }
    } else {
      // Should show resource cards
      const resourceCards = await page.$$('[data-testid^="card-resource-"]');
      if (resourceCards.length > 0) {
        testResult.tests.emptyStateOrResources = true;
        console.log(`   ✅ Resources displayed: ${resourceCards.length} cards found`);
      } else {
        testResult.errors.push('No resource cards found');
        console.log('   ❌ No resource cards found');
      }
    }
    
    // Test 5: Layout renders properly
    const backButton = await page.$('[data-testid="button-back-subcategory"]');
    if (backButton) {
      testResult.tests.layout = true;
      console.log('   ✅ Layout rendered (back button found)');
    } else {
      testResult.errors.push('Back button not found');
      console.log('   ❌ Layout incomplete');
    }
    
    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `subsubcat-${subSubcat.slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    testResult.screenshot = screenshotPath;
    
    // Determine if all tests passed
    const allTestsPassed = Object.values(testResult.tests).every(t => t === true);
    if (allTestsPassed) {
      results.passed++;
      console.log(`   🎉 ALL TESTS PASSED for ${subSubcat.name}`);
    } else {
      results.failed++;
      console.log(`   ⚠️  SOME TESTS FAILED for ${subSubcat.name}`);
    }
    
  } catch (error) {
    testResult.errors.push(`Exception: ${error.message}`);
    results.failed++;
    console.log(`   ❌ ERROR: ${error.message}`);
  } finally {
    await page.close();
  }
  
  results.details.push(testResult);
}

async function runAllTests() {
  console.log('🚀 DESKTOP SUITE 3: TESTING ALL 32 SUB-SUBCATEGORY PAGES');
  console.log('=' .repeat(70));
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total sub-subcategories to test: ${SUB_SUBCATEGORIES.length}`);
  console.log('=' .repeat(70));
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Test each sub-subcategory sequentially
    for (const subSubcat of SUB_SUBCATEGORIES) {
      await testSubSubcategoryPage(browser, subSubcat);
    }
    
  } catch (error) {
    console.error('Fatal error during testing:', error);
  } finally {
    await browser.close();
  }
  
  // Generate summary report
  console.log('\n' + '=' .repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(70));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);
  
  // Show failures
  const failures = results.details.filter(d => !Object.values(d.tests).every(t => t === true));
  if (failures.length > 0) {
    console.log('\n⚠️  FAILED TESTS:');
    failures.forEach(f => {
      console.log(`\n  ${f.name} (${f.slug}):`);
      f.errors.forEach(e => console.log(`    - ${e}`));
    });
  }
  
  // Count empty state pages
  const emptyStatePages = results.details.filter(d => d.expectedCount === 0);
  console.log(`\n📋 Empty state pages tested: ${emptyStatePages.length}/5`);
  emptyStatePages.forEach(p => {
    const status = p.tests.emptyStateOrResources ? '✅' : '❌';
    console.log(`  ${status} ${p.name} (${p.slug})`);
  });
  
  // Save detailed report
  const reportPath = 'scripts/test-results/desktop-all-subsubcategories-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Generate markdown report
  const mdReport = generateMarkdownReport(results);
  const mdPath = 'scripts/test-results/DESKTOP_ALL_SUBSUBCATEGORIES_REPORT.md';
  fs.writeFileSync(mdPath, mdReport);
  console.log(`📄 Markdown report saved to: ${mdPath}`);
  
  console.log('\n✨ Testing complete!');
  
  // Exit with appropriate code
  process.exit(failures.length > 0 ? 1 : 0);
}

function generateMarkdownReport(results) {
  const timestamp = new Date(results.timestamp).toLocaleString();
  let md = `# Desktop Suite 3: All Sub-Subcategory Pages Test Report\n\n`;
  md += `**Generated:** ${timestamp}\n\n`;
  md += `**Viewport:** ${results.viewport.width}x${results.viewport.height}\n\n`;
  
  md += `## Summary\n\n`;
  md += `- **Total Tests:** ${results.totalTests}\n`;
  md += `- **Passed:** ${results.passed} ✅\n`;
  md += `- **Failed:** ${results.failed} ❌\n`;
  md += `- **Success Rate:** ${((results.passed / results.totalTests) * 100).toFixed(1)}%\n\n`;
  
  md += `## Test Criteria\n\n`;
  md += `For each sub-subcategory, we verified:\n`;
  md += `1. ✅ Direct navigation to URL works\n`;
  md += `2. ✅ Resource count matches expected\n`;
  md += `3. ✅ Breadcrumb shows: [Category] → [Subcategory] → [Sub-Subcategory]\n`;
  md += `4. ✅ Resources display correctly (or empty state for 0 resources)\n`;
  md += `5. ✅ Layout renders properly\n\n`;
  
  md += `## Detailed Results\n\n`;
  
  // Group by parent category
  const grouped = {};
  results.details.forEach(detail => {
    if (!grouped[detail.parentCategory]) {
      grouped[detail.parentCategory] = {};
    }
    if (!grouped[detail.parentCategory][detail.parentSubcategory]) {
      grouped[detail.parentCategory][detail.parentSubcategory] = [];
    }
    grouped[detail.parentCategory][detail.parentSubcategory].push(detail);
  });
  
  Object.keys(grouped).sort().forEach(category => {
    md += `### ${category}\n\n`;
    Object.keys(grouped[category]).sort().forEach(subcategory => {
      md += `#### ${subcategory}\n\n`;
      md += `| Sub-Subcategory | Expected | Actual | Status | Breadcrumb | Issues |\n`;
      md += `|----------------|----------|--------|--------|------------|--------|\n`;
      
      grouped[category][subcategory].forEach(detail => {
        const allPassed = Object.values(detail.tests).every(t => t === true);
        const status = allPassed ? '✅ PASS' : '❌ FAIL';
        const issues = detail.errors.length > 0 ? detail.errors.join('; ') : 'None';
        md += `| ${detail.name} | ${detail.expectedCount} | ${detail.actualCount} | ${status} | ${detail.breadcrumbText} | ${issues} |\n`;
      });
      
      md += `\n`;
    });
  });
  
  md += `## Empty State Pages\n\n`;
  const emptyStatePages = results.details.filter(d => d.expectedCount === 0);
  md += `Tested ${emptyStatePages.length} pages with 0 resources:\n\n`;
  emptyStatePages.forEach(p => {
    const status = p.tests.emptyStateOrResources ? '✅' : '❌';
    md += `- ${status} **${p.name}** (${p.slug})\n`;
  });
  
  md += `\n## Conclusion\n\n`;
  if (results.failed === 0) {
    md += `🎉 **All ${results.totalTests} sub-subcategory pages passed all tests!**\n\n`;
    md += `All pages are:\n`;
    md += `- Accessible via direct navigation\n`;
    md += `- Displaying correct resource counts\n`;
    md += `- Showing complete breadcrumb navigation\n`;
    md += `- Rendering proper layouts\n`;
    md += `- Handling empty states correctly\n`;
  } else {
    md += `⚠️ **${results.failed} out of ${results.totalTests} tests failed.**\n\n`;
    md += `See detailed results above for specific issues.\n`;
  }
  
  return md;
}

// Run the tests
runAllTests();
