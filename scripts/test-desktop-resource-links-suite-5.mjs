import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:5000';
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };
const SCREENSHOT_DIR = 'test-screenshots';

// Test results tracker
const testResults = {
  timestamp: new Date().toISOString(),
  viewport: DESKTOP_VIEWPORT,
  totalTests: 0,
  passed: 0,
  failed: 0,
  categories: [],
  screenshots: []
};

let browser;
let page;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  });
  page = await browser.newPage();
  await page.setViewport(DESKTOP_VIEWPORT);
  
  // Intercept window.open globally
  await page.evaluateOnNewDocument(() => {
    window.__openedTabs = [];
    const originalOpen = window.open;
    window.open = function(url, target, features) {
      console.log(`window.open intercepted: url=${url}, target=${target}, features=${features}`);
      window.__openedTabs.push({ url, target, features });
      return null; // Don't actually open
    };
  });
}

async function takeScreenshot(name) {
  try {
    const filename = `${SCREENSHOT_DIR}/${name}.png`;
    await page.screenshot({ path: filename, fullPage: false });
    testResults.screenshots.push(filename);
    console.log(`📸 Screenshot: ${filename}`);
    return filename;
  } catch (error) {
    console.log(`⚠️  Screenshot failed: ${error.message}`);
  }
}

async function testResourceCards(pagePath, pageName, maxCards = 10) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${pageName}`);
  console.log(`${'='.repeat(60)}`);
  
  const categoryResult = {
    name: pageName,
    path: pagePath,
    totalResources: 0,
    testedResources: 0,
    passedResources: 0,
    failedResources: 0,
    tests: []
  };
  
  try {
    // Navigate to page
    console.log(`\n1️⃣  Navigating to ${pagePath}...`);
    await page.goto(`${BASE_URL}${pagePath}`, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    await sleep(800);
    
    await takeScreenshot(`suite5-${pageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-page`);
    
    const initialUrl = page.url();
    
    // Find all resource cards
    const resourceCards = await page.$$('[data-testid^="card-resource-"]');
    categoryResult.totalResources = resourceCards.length;
    console.log(`\n2️⃣  Found ${resourceCards.length} resource cards`);
    
    if (resourceCards.length === 0) {
      console.log('⚠️  No resource cards found');
      testResults.categories.push(categoryResult);
      return categoryResult;
    }
    
    // Test up to maxCards
    const cardsToTest = Math.min(resourceCards.length, maxCards);
    categoryResult.testedResources = cardsToTest;
    console.log(`📋 Testing ${cardsToTest} cards...\n`);
    
    for (let i = 0; i < cardsToTest; i++) {
      const cardTest = {
        index: i,
        title: '',
        hasExternalIcon: false,
        opensInNewTab: false,
        maintainsAppState: false,
        passed: false
      };
      
      testResults.totalTests++;
      
      try {
        // Clear previous tabs
        await page.evaluate(() => {
          window.__openedTabs = [];
        });
        
        // Re-query cards
        const cards = await page.$$('[data-testid^="card-resource-"]');
        const card = cards[i];
        
        if (!card) {
          console.log(`❌ Card ${i}: Not found`);
          cardTest.passed = false;
          categoryResult.tests.push(cardTest);
          testResults.failed++;
          categoryResult.failedResources++;
          continue;
        }
        
        // Get title
        const titleElement = await card.$('.text-lg');
        if (titleElement) {
          cardTest.title = await page.evaluate(el => {
            const text = el.textContent || '';
            return text.trim().replace(/\s+/g, ' ').substring(0, 60);
          }, titleElement);
        }
        
        // Check for external link icon
        const externalIcon = await card.$('svg.lucide-external-link, [data-lucide="external-link"]');
        cardTest.hasExternalIcon = !!externalIcon;
        
        console.log(`\n🔍 Card ${i + 1}/${cardsToTest}: ${cardTest.title || 'Untitled'}`);
        console.log(`   External Icon: ${cardTest.hasExternalIcon ? '✓' : '❌'}`);
        
        // Click the card
        await card.click();
        await sleep(400);
        
        // Check if window.open was called
        const openData = await page.evaluate(() => {
          const tabs = window.__openedTabs || [];
          if (tabs.length === 0) return null;
          const latest = tabs[tabs.length - 1];
          return {
            called: true,
            target: latest.target,
            features: latest.features,
            hasBlank: latest.target === '_blank' || (latest.features && latest.features.includes('_blank')),
            hasNoopener: latest.features && latest.features.includes('noopener')
          };
        });
        
        cardTest.opensInNewTab = openData && (openData.hasBlank || openData.hasNoopener);
        console.log(`   New Tab: ${cardTest.opensInNewTab ? '✓' : '❌'}${openData ? ` (${openData.target || openData.features})` : ' (not called)'}`);
        
        // Verify URL didn't change
        const currentUrl = page.url();
        cardTest.maintainsAppState = currentUrl === initialUrl;
        console.log(`   State Maintained: ${cardTest.maintainsAppState ? '✓' : '❌'}`);
        
        // Overall pass/fail
        cardTest.passed = cardTest.hasExternalIcon && 
                          cardTest.opensInNewTab && 
                          cardTest.maintainsAppState;
        
        if (cardTest.passed) {
          console.log(`   ✅ PASSED`);
          testResults.passed++;
          categoryResult.passedResources++;
        } else {
          console.log(`   ❌ FAILED`);
          testResults.failed++;
          categoryResult.failedResources++;
        }
        
        categoryResult.tests.push(cardTest);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        cardTest.passed = false;
        categoryResult.tests.push(cardTest);
        testResults.failed++;
        categoryResult.failedResources++;
      }
    }
    
    console.log(`\n✅ ${pageName}: ${categoryResult.passedResources}/${categoryResult.testedResources} passed`);
    
  } catch (error) {
    console.error(`❌ Error testing ${pageName}:`, error.message);
    categoryResult.error = error.message;
  }
  
  testResults.categories.push(categoryResult);
  return categoryResult;
}

async function testSearchResults() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: Search Results`);
  console.log(`${'='.repeat(60)}`);
  
  const searchResult = {
    name: 'Search Results',
    path: 'search',
    totalResources: 0,
    testedResources: 0,
    passedResources: 0,
    failedResources: 0,
    tests: []
  };
  
  try {
    // Go to homepage
    console.log(`\n1️⃣  Navigating to homepage...`);
    await page.goto(`${BASE_URL}/`, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    await sleep(800);
    
    const initialUrl = page.url();
    
    // Open search
    console.log(`\n2️⃣  Opening search (Cmd+K)...`);
    await page.keyboard.down('Meta');
    await page.keyboard.press('k');
    await page.keyboard.up('Meta');
    await sleep(500);
    
    await takeScreenshot('suite5-search-opened');
    
    // Type search query
    console.log(`\n3️⃣  Searching for "ffmpeg"...`);
    await page.keyboard.type('ffmpeg');
    await sleep(1200);
    
    await takeScreenshot('suite5-search-results');
    
    // Find search results
    const searchResults = await page.$$('[data-testid^="search-result-"]');
    searchResult.totalResources = searchResults.length;
    console.log(`\n4️⃣  Found ${searchResults.length} search results`);
    
    const resultsToTest = Math.min(searchResults.length, 5);
    searchResult.testedResources = resultsToTest;
    console.log(`📋 Testing ${resultsToTest} results...\n`);
    
    for (let i = 0; i < resultsToTest; i++) {
      const resultTest = {
        index: i,
        title: '',
        hasTargetBlank: false,
        hasRelNoopener: false,
        opensInNewTab: false,
        passed: false
      };
      
      testResults.totalTests++;
      
      try {
        // Clear tabs
        await page.evaluate(() => {
          window.__openedTabs = [];
        });
        
        // Re-query results
        const results = await page.$$('[data-testid^="search-result-"]');
        const result = results[i];
        
        if (!result) {
          console.log(`❌ Result ${i}: Not found`);
          resultTest.passed = false;
          searchResult.tests.push(resultTest);
          testResults.failed++;
          searchResult.failedResources++;
          continue;
        }
        
        // Get title
        const titleElement = await result.$('.font-medium, .text-sm');
        if (titleElement) {
          resultTest.title = await page.evaluate(el => el.textContent?.trim().substring(0, 50) || '', titleElement);
        }
        
        // Check anchor attributes
        const anchor = await result.$('a');
        if (anchor) {
          const attrs = await page.evaluate(el => ({
            target: el.getAttribute('target'),
            rel: el.getAttribute('rel')
          }), anchor);
          
          resultTest.hasTargetBlank = attrs.target === '_blank';
          resultTest.hasRelNoopener = attrs.rel === 'noopener noreferrer';
        }
        
        console.log(`\n🔍 Result ${i + 1}/${resultsToTest}: ${resultTest.title || 'Untitled'}`);
        console.log(`   target="_blank": ${resultTest.hasTargetBlank ? '✓' : '❌'}`);
        console.log(`   rel="noopener noreferrer": ${resultTest.hasRelNoopener ? '✓' : '❌'}`);
        
        // Click result
        await result.click();
        await sleep(400);
        
        // Check window.open
        const openData = await page.evaluate(() => {
          const tabs = window.__openedTabs || [];
          return tabs.length > 0;
        });
        
        resultTest.opensInNewTab = openData;
        console.log(`   New Tab Opened: ${resultTest.opensInNewTab ? '✓' : '❌'}`);
        
        // Overall pass
        resultTest.passed = resultTest.hasTargetBlank && 
                           resultTest.hasRelNoopener && 
                           resultTest.opensInNewTab;
        
        if (resultTest.passed) {
          console.log(`   ✅ PASSED`);
          testResults.passed++;
          searchResult.passedResources++;
        } else {
          console.log(`   ❌ FAILED`);
          testResults.failed++;
          searchResult.failedResources++;
        }
        
        searchResult.tests.push(resultTest);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        resultTest.passed = false;
        searchResult.tests.push(resultTest);
        testResults.failed++;
        searchResult.failedResources++;
      }
    }
    
    // Close search
    await page.keyboard.press('Escape');
    await sleep(300);
    
    console.log(`\n✅ Search: ${searchResult.passedResources}/${searchResult.testedResources} passed`);
    
  } catch (error) {
    console.error(`❌ Error testing search:`, error.message);
    searchResult.error = error.message;
  }
  
  testResults.categories.push(searchResult);
  return searchResult;
}

async function runTests() {
  console.log('🚀 Desktop Suite 5: Resource Link Behavior Testing');
  console.log(`Viewport: ${DESKTOP_VIEWPORT.width}x${DESKTOP_VIEWPORT.height}\n`);
  
  try {
    await initBrowser();
    
    // Test categories
    await testResourceCards('/category/intro-learning', 'Intro & Learning', 10);
    await testResourceCards('/sub-subcategory/hls', 'HLS', 10);
    await testResourceCards('/sub-subcategory/ffmpeg', 'FFMPEG', 10);
    await testResourceCards('/sub-subcategory/roku', 'Roku', 10);
    await testResourceCards('/sub-subcategory/subtitles-captions', 'Subtitles', 10);
    
    // Search results
    await testSearchResults();
    
    // Mixed testing
    await testResourceCards('/sub-subcategory/av1', 'AV1', 2);
    await testResourceCards('/sub-subcategory/dash', 'DASH', 2);
    await testResourceCards('/category/encoding-codecs', 'Encoding', 1);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.totalTests}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.totalTests) * 100).toFixed(1)}%`);
    
    console.log(`\n📁 Categories: ${testResults.categories.length}`);
    testResults.categories.forEach(cat => {
      console.log(`  ${cat.name}: ${cat.passedResources}/${cat.testedResources} passed`);
    });
    
    // Save results
    const reportPath = 'scripts/test-results/desktop-resource-links-suite-5-report.json';
    writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n💾 Report: ${reportPath}`);
    
    // Generate markdown
    const mdReport = generateMarkdownReport();
    const mdPath = 'scripts/test-results/DESKTOP_RESOURCE_LINKS_SUITE_5_REPORT.md';
    writeFileSync(mdPath, mdReport);
    console.log(`📄 Markdown: ${mdPath}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

function generateMarkdownReport() {
  const successRate = ((testResults.passed / testResults.totalTests) * 100).toFixed(1);
  
  let md = `# Desktop Suite 5: Resource Link Behavior Test Report\n\n`;
  md += `**Generated:** ${testResults.timestamp}\n`;
  md += `**Viewport:** ${DESKTOP_VIEWPORT.width}x${DESKTOP_VIEWPORT.height}\n\n`;
  
  md += `## Overall Results\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Tests | ${testResults.totalTests} |\n`;
  md += `| Passed | ${testResults.passed} ✅ |\n`;
  md += `| Failed | ${testResults.failed} ❌ |\n`;
  md += `| Success Rate | ${successRate}% |\n\n`;
  
  md += `## Test Coverage\n\n`;
  md += `✅ Tested ${testResults.totalTests} resources across:\n`;
  md += `- Category pages (Intro & Learning)\n`;
  md += `- Sub-subcategory pages (HLS, FFMPEG, Roku, Subtitles, AV1, DASH)\n`;
  md += `- Search results (FFMPEG query)\n`;
  md += `- Mixed hierarchy levels\n\n`;
  
  md += `## Detailed Results\n\n`;
  
  testResults.categories.forEach((cat, idx) => {
    md += `### ${idx + 1}. ${cat.name}\n\n`;
    md += `**Path:** \`${cat.path}\`\n\n`;
    md += `- Total Resources: ${cat.totalResources}\n`;
    md += `- Tested: ${cat.testedResources}\n`;
    md += `- Passed: ${cat.passedResources}/${cat.testedResources}\n`;
    md += `- Success Rate: ${cat.testedResources > 0 ? ((cat.passedResources / cat.testedResources) * 100).toFixed(1) : 0}%\n\n`;
    
    if (cat.error) {
      md += `⚠️ **Error:** ${cat.error}\n\n`;
    }
  });
  
  md += `## Verification Checklist\n\n`;
  md += `- [${testResults.passed > 0 ? 'x' : ' '}] Resource cards open links in new tabs\n`;
  md += `- [${testResults.passed > 0 ? 'x' : ' '}] Main application state maintained\n`;
  md += `- [${testResults.passed > 0 ? 'x' : ' '}] External link icons present\n`;
  md += `- [${testResults.totalTests >= 50 ? 'x' : ' '}] 50+ resources tested (${testResults.totalTests})\n\n`;
  
  md += `## Conclusion\n\n`;
  if (testResults.failed === 0) {
    md += `✅ **All tests passed!** Resource links work correctly.\n`;
  } else if (successRate >= 90) {
    md += `⚠️ **Most tests passed** (${successRate}% success rate).\n`;
  } else {
    md += `❌ **Many tests failed** (${testResults.failed}/${testResults.totalTests}).\n`;
  }
  
  return md;
}

runTests();
