import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };

const SUBCATEGORIES = [
  { slug: 'introduction', expectedCount: 4, category: 'Introduction & Learning' },
  { slug: 'learning-resources', expectedCount: 36, category: 'Introduction & Learning' },
  { slug: 'tutorials-case-studies', expectedCount: 60, category: 'Introduction & Learning' },
  { slug: 'adaptive-streaming', expectedCount: 144, category: 'Protocols & Transport' },
  { slug: 'transport-protocols', expectedCount: 13, category: 'Protocols & Transport' },
  { slug: 'encoding-tools', expectedCount: 240, category: 'Encoding & Codecs' },
  { slug: 'codecs', expectedCount: 29, category: 'Encoding & Codecs' },
  { slug: 'hardware-players', expectedCount: 35, category: 'Players & Clients' },
  { slug: 'mobile-web-players', expectedCount: 81, category: 'Players & Clients' },
  { slug: 'audio-subtitles', expectedCount: 58, category: 'Media Tools' },
  { slug: 'ads-qoe', expectedCount: 45, category: 'Media Tools' },
  { slug: 'specs-standards', expectedCount: 36, category: 'Standards & Industry' },
  { slug: 'vendors-hdr', expectedCount: 5, category: 'Standards & Industry' },
  { slug: 'streaming-servers', expectedCount: 39, category: 'Infrastructure & Delivery' },
  { slug: 'cloud-cdn', expectedCount: 9, category: 'Infrastructure & Delivery' },
  { slug: 'ffmpeg-tools', expectedCount: 25, category: 'General Tools' },
  { slug: 'drm', expectedCount: 51, category: 'General Tools' },
  { slug: 'community-groups', expectedCount: 33, category: 'Community & Events' },
  { slug: 'events-conferences', expectedCount: 55, category: 'Community & Events' }
];

async function testSubcategoryPage(browser, subcategory) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${subcategory.slug}`);
  console.log(`${'='.repeat(80)}`);
  
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  
  const results = {
    slug: subcategory.slug,
    expectedCount: subcategory.expectedCount,
    category: subcategory.category,
    tests: {},
    success: true,
    errors: []
  };
  
  try {
    // Test 1: Navigate to subcategory URL
    console.log(`📍 Navigating to /subcategory/${subcategory.slug}...`);
    const response = await page.goto(`${BASE_URL}/subcategory/${subcategory.slug}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    results.tests.navigation = {
      success: response.ok(),
      status: response.status()
    };
    
    if (!response.ok()) {
      results.success = false;
      results.errors.push(`Navigation failed with status ${response.status()}`);
      console.log(`❌ Navigation failed: ${response.status()}`);
      await page.close();
      return results;
    }
    
    console.log(`✅ Navigation successful (${response.status()})`);
    
    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Test 2: Verify page title/heading
    const heading = await page.$eval('h1', el => el.textContent.trim());
    console.log(`📋 Page heading: "${heading}"`);
    results.tests.heading = {
      success: heading.length > 0,
      value: heading
    };
    
    // Test 3: Check for breadcrumb/back button
    const backButton = await page.$('[data-testid="button-back-category"]');
    results.tests.backButton = {
      success: backButton !== null
    };
    
    if (backButton) {
      const backButtonText = await page.$eval('[data-testid="button-back-category"]', el => el.textContent.trim());
      console.log(`🔙 Back button found: "${backButtonText}"`);
      results.tests.backButton.text = backButtonText;
    } else {
      console.log(`⚠️  Back button not found`);
      results.errors.push('Back button not found');
    }
    
    // Test 4: Verify resource count badge
    const countBadge = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.badge, [class*="badge"]'));
      const countBadge = badges.find(badge => {
        const text = badge.textContent.trim();
        return /^\d+$/.test(text);
      });
      return countBadge ? parseInt(countBadge.textContent.trim()) : null;
    });
    
    results.tests.countBadge = {
      success: countBadge !== null,
      displayed: countBadge,
      expected: subcategory.expectedCount,
      matches: countBadge === subcategory.expectedCount
    };
    
    console.log(`🔢 Resource count - Expected: ${subcategory.expectedCount}, Found: ${countBadge}, Match: ${countBadge === subcategory.expectedCount ? '✅' : '❌'}`);
    
    if (countBadge !== subcategory.expectedCount) {
      results.errors.push(`Resource count mismatch: expected ${subcategory.expectedCount}, found ${countBadge}`);
    }
    
    // Test 5: Count actual resource cards
    const resourceCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid^="card-resource-"]');
      return cards.length;
    });
    
    results.tests.resourceCards = {
      success: resourceCards > 0,
      count: resourceCards,
      matches: resourceCards === subcategory.expectedCount
    };
    
    console.log(`📦 Resource cards displayed: ${resourceCards}`);
    
    if (resourceCards !== subcategory.expectedCount) {
      results.errors.push(`Resource card count mismatch: expected ${subcategory.expectedCount}, found ${resourceCards}`);
    }
    
    // Test 6: Check for sub-subcategories (if any exist, they should be visible)
    const subSubcategoryTags = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.badge, [class*="badge"]'));
      return badges.filter(badge => {
        const variant = badge.className;
        return variant.includes('outline') && !variant.includes('secondary');
      }).length;
    });
    
    results.tests.subSubcategories = {
      found: subSubcategoryTags > 0,
      count: subSubcategoryTags
    };
    
    if (subSubcategoryTags > 0) {
      console.log(`🏷️  Found ${subSubcategoryTags} sub-subcategory badges`);
    }
    
    // Test 7: Verify resource cards are clickable
    const firstCard = await page.$('[data-testid="card-resource-0"]');
    results.tests.resourceClickable = {
      success: firstCard !== null
    };
    
    if (firstCard) {
      console.log(`✅ Resource cards are present and should be clickable`);
    }
    
    // Test 8: Check page layout and styling
    const layoutCheck = await page.evaluate(() => {
      const header = document.querySelector('h1');
      const grid = document.querySelector('.grid');
      return {
        hasHeader: !!header,
        hasGrid: !!grid,
        gridClasses: grid?.className || ''
      };
    });
    
    results.tests.layout = layoutCheck;
    console.log(`🎨 Layout: Header=${layoutCheck.hasHeader}, Grid=${layoutCheck.hasGrid}`);
    
    // Take screenshot
    const screenshotPath = `test-screenshots/subcategory-${subcategory.slug}.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    results.screenshot = screenshotPath;
    
    // Summary
    if (results.errors.length === 0) {
      console.log(`\n✅ All tests passed for ${subcategory.slug}`);
    } else {
      console.log(`\n⚠️  ${results.errors.length} issue(s) found for ${subcategory.slug}`);
      results.success = false;
    }
    
  } catch (error) {
    console.error(`❌ Error testing ${subcategory.slug}:`, error.message);
    results.success = false;
    results.errors.push(error.message);
  }
  
  await page.close();
  return results;
}

async function main() {
  console.log('🚀 Starting Desktop Subcategory Test Suite');
  console.log(`📐 Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📊 Testing ${SUBCATEGORIES.length} subcategory pages\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  const allResults = [];
  let passCount = 0;
  let failCount = 0;
  
  for (const subcategory of SUBCATEGORIES) {
    const result = await testSubcategoryPage(browser, subcategory);
    allResults.push(result);
    
    if (result.success) {
      passCount++;
    } else {
      failCount++;
    }
  }
  
  await browser.close();
  
  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Subcategories Tested: ${SUBCATEGORIES.length}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / SUBCATEGORIES.length) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n' + '='.repeat(80));
  console.log('📋 DETAILED RESULTS');
  console.log('='.repeat(80));
  
  allResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const countMatch = result.tests.countBadge?.matches ? '✓' : '✗';
    const cardsMatch = result.tests.resourceCards?.matches ? '✓' : '✗';
    
    console.log(`${index + 1}. ${status} ${result.slug}`);
    console.log(`   Category: ${result.category}`);
    console.log(`   Count Badge: ${countMatch} (${result.tests.countBadge?.displayed}/${result.expectedCount})`);
    console.log(`   Cards: ${cardsMatch} (${result.tests.resourceCards?.count}/${result.expectedCount})`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
  });
  
  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    viewport: VIEWPORT,
    summary: {
      total: SUBCATEGORIES.length,
      passed: passCount,
      failed: failCount,
      successRate: ((passCount / SUBCATEGORIES.length) * 100).toFixed(1) + '%'
    },
    results: allResults
  };
  
  const reportPath = 'scripts/test-results/desktop-all-subcategories-report.json';
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${reportPath}`);
  
  // Generate markdown report
  let markdown = `# Desktop Subcategory Test Report\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
  markdown += `**Viewport:** ${VIEWPORT.width}x${VIEWPORT.height}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- **Total Tests:** ${SUBCATEGORIES.length}\n`;
  markdown += `- **Passed:** ✅ ${passCount}\n`;
  markdown += `- **Failed:** ❌ ${failCount}\n`;
  markdown += `- **Success Rate:** ${((passCount / SUBCATEGORIES.length) * 100).toFixed(1)}%\n\n`;
  
  markdown += `## Test Results\n\n`;
  markdown += `| # | Subcategory | Status | Count | Cards | Category |\n`;
  markdown += `|---|-------------|--------|-------|-------|----------|\n`;
  
  allResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const countMatch = result.tests.countBadge?.matches ? '✓' : '✗';
    const cardsMatch = result.tests.resourceCards?.matches ? '✓' : '✗';
    
    markdown += `| ${index + 1} | ${result.slug} | ${status} | ${countMatch} ${result.tests.countBadge?.displayed}/${result.expectedCount} | ${cardsMatch} ${result.tests.resourceCards?.count}/${result.expectedCount} | ${result.category} |\n`;
  });
  
  markdown += `\n## Detailed Results\n\n`;
  
  allResults.forEach((result, index) => {
    markdown += `### ${index + 1}. ${result.slug} ${result.success ? '✅' : '❌'}\n\n`;
    markdown += `- **Category:** ${result.category}\n`;
    markdown += `- **Expected Resources:** ${result.expectedCount}\n`;
    markdown += `- **Count Badge:** ${result.tests.countBadge?.displayed} ${result.tests.countBadge?.matches ? '✓' : '✗'}\n`;
    markdown += `- **Resource Cards:** ${result.tests.resourceCards?.count} ${result.tests.resourceCards?.matches ? '✓' : '✗'}\n`;
    markdown += `- **Navigation:** ${result.tests.navigation?.success ? '✅' : '❌'} (${result.tests.navigation?.status})\n`;
    markdown += `- **Back Button:** ${result.tests.backButton?.success ? '✅' : '❌'}\n`;
    markdown += `- **Sub-subcategories:** ${result.tests.subSubcategories?.found ? `${result.tests.subSubcategories.count} found` : 'None'}\n`;
    
    if (result.errors.length > 0) {
      markdown += `\n**Errors:**\n`;
      result.errors.forEach(error => {
        markdown += `- ${error}\n`;
      });
    }
    
    if (result.screenshot) {
      markdown += `\n**Screenshot:** [View](../${result.screenshot})\n`;
    }
    
    markdown += `\n`;
  });
  
  const markdownPath = 'scripts/test-results/DESKTOP_ALL_SUBCATEGORIES_REPORT.md';
  writeFileSync(markdownPath, markdown);
  console.log(`📝 Markdown report saved to: ${markdownPath}`);
  
  console.log('\n✨ Test suite completed!');
  
  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
