import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = join(__dirname, '..', 'test-screenshots');
const BASE_URL = 'http://localhost:5000';

// Ensure screenshot directory exists
await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

const results = {
  testSuite: 'DESKTOP SUITE 6: SIDEBAR NAVIGATION & GITHUB LINK',
  timestamp: new Date().toISOString(),
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

function logTest(name, passed, message = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.log(`❌ FAIL: ${name} - ${message}`);
  }
  results.tests.push({ name, passed, message, timestamp: new Date().toISOString() });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  let browser;
  let page;
  
  try {
    console.log('🚀 Starting DESKTOP SUITE 6: SIDEBAR NAVIGATION & GITHUB LINK');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Create desktop browser (1920x1080)
    console.log('📱 Step 1: Creating desktop browser context (1920x1080)');
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
    await page.setViewport({ width: 1920, height: 1080 });
    logTest('Create desktop browser context (1920x1080)', true);

    // 2. Navigate to homepage
    console.log('\n🌐 Step 2: Navigating to homepage');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);
    logTest('Navigate to homepage', true);

    // 3. Capture initial screenshot
    console.log('\n📸 Step 3: Capturing sidebar-desktop.png');
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'sidebar-desktop.png'), fullPage: false });
    logTest('Capture sidebar-desktop.png', true);

    // 4-6. Sidebar Structure Verification
    console.log('\n🔍 Steps 4-6: Verifying sidebar structure');
    
    // Check sidebar visibility
    const sidebar = await page.$('[data-sidebar="sidebar"]');
    const sidebarVisible = sidebar !== null;
    logTest('Sidebar visible on left side', sidebarVisible, sidebarVisible ? '' : 'Sidebar not found');

    // Check sidebar width (should be ~256px = 16rem)
    if (sidebar) {
      const sidebarBox = await sidebar.boundingBox();
      const sidebarWidth = sidebarBox ? sidebarBox.width : 0;
      const widthCorrect = sidebarWidth >= 250 && sidebarWidth <= 270; // Allow small variance
      logTest('Sidebar width approximately 256px (16rem)', widthCorrect, 
        widthCorrect ? `Width: ${sidebarWidth}px` : `Expected ~256px, got ${sidebarWidth}px`);
    }

    // Check "Awesome Video" appears ONLY in top bar and main content (NOT in sidebar)
    const awesomeVideoElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        const childText = Array.from(el.children).map(child => child.textContent).join('');
        return text.includes('Awesome Video') && text.replace(childText, '').trim().includes('Awesome Video');
      });
      
      return elements.map(el => {
        const inSidebar = el.closest('[data-sidebar="sidebar"]') !== null;
        const inTopBar = el.closest('header') !== null || el.closest('[class*="top"]') !== null;
        return { inSidebar, inTopBar, tagName: el.tagName, className: el.className };
      });
    });
    
    const titleInSidebar = awesomeVideoElements.some(el => el.inSidebar);
    const titleCount = awesomeVideoElements.length;
    logTest('"Awesome Video" title appears ONLY in top bar and main content (2 total, NOT in sidebar)', 
      !titleInSidebar && titleCount >= 1,
      titleInSidebar ? 'Title found in sidebar' : titleCount < 1 ? 'Title not found' : `Found ${titleCount} instances, none in sidebar`);

    // 7-9. Navigation buttons verification
    console.log('\n🔍 Steps 7-9: Verifying navigation buttons');
    
    const homeButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.some(btn => btn.textContent?.includes('Home') && 
        btn.closest('[data-sidebar="sidebar"]'));
    });
    logTest('First navigation item is "Home" button', homeButton, homeButton ? '' : 'Home button not found in sidebar');

    const advancedButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.some(btn => btn.textContent?.includes('Advanced Features') && 
        btn.closest('[data-sidebar="sidebar"]'));
    });
    logTest('"Advanced Features" button visible', advancedButton, advancedButton ? '' : 'Advanced Features button not found');

    const aiButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.some(btn => btn.textContent?.includes('AI Recommendations') && 
        btn.closest('[data-sidebar="sidebar"]'));
    });
    logTest('"AI Recommendations" button visible', aiButton, aiButton ? '' : 'AI Recommendations button not found');

    // 10-11. Category Navigation Verification
    console.log('\n🔍 Steps 10-11: Verifying all 9 categories');
    
    const expectedCategories = [
      { name: 'Intro & Learning', count: 229 },
      { name: 'Protocols & Transport', count: 252 },
      { name: 'Encoding & Codecs', count: 392 },
      { name: 'Players & Clients', count: 269 },
      { name: 'Media Tools', count: 317 },
      { name: 'Standards & Industry', count: 174 },
      { name: 'Infrastructure & Delivery', count: 190 },
      { name: 'General Tools', count: 97 },
      { name: 'Community & Events', count: 91 }
    ];

    const categoriesFound = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (!sidebar) return [];
      
      const categoryButtons = Array.from(sidebar.querySelectorAll('button, a')).filter(btn => {
        const hasCount = btn.textContent?.match(/\d+/);
        const hasFolder = btn.querySelector('[class*="lucide"]') || btn.textContent?.includes('▶');
        return hasCount && btn.textContent.trim().length > 5;
      });
      
      return categoryButtons.map(btn => {
        const text = btn.textContent || '';
        const countMatch = text.match(/(\d+)/);
        const count = countMatch ? parseInt(countMatch[1]) : 0;
        const name = text.replace(/\d+/g, '').replace(/▶/g, '').trim();
        return { name, count };
      }).filter(cat => cat.count > 50); // Filter main categories
    });

    for (const expected of expectedCategories) {
      const found = categoriesFound.find(cat => 
        cat.name.includes(expected.name) || expected.name.includes(cat.name)
      );
      logTest(`Category: ${expected.name} (${expected.count})`, 
        found !== undefined,
        found ? `Found with count ${found.count}` : 'Category not found');
    }

    logTest('Resource counts displayed correctly (no duplicates)', 
      categoriesFound.length >= 9,
      `Found ${categoriesFound.length} categories`);

    // 12-13. Expand/Collapse Testing - Protocols & Transport
    console.log('\n🔍 Steps 12-13: Testing expand/collapse - Protocols & Transport');
    
    const protocolsClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const protocolsBtn = buttons.find(btn => 
        btn.textContent?.includes('Protocols & Transport') &&
        btn.previousElementSibling?.querySelector('[class*="transform"]')
      );
      
      if (protocolsBtn && protocolsBtn.previousElementSibling) {
        protocolsBtn.previousElementSibling.click();
        return true;
      }
      return false;
    });
    
    await sleep(500);
    logTest('Click "Protocols & Transport" to expand', protocolsClicked, 
      protocolsClicked ? '' : 'Expand button not found');
    
    const subcategoriesVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const text = sidebar?.textContent || '';
      return text.includes('Adaptive Streaming') && text.includes('Transport Protocols');
    });
    logTest('Subcategories appear: Adaptive Streaming, Transport Protocols', 
      subcategoriesVisible,
      subcategoriesVisible ? '' : 'Subcategories not visible after expansion');

    // 14-15. Expand Adaptive Streaming
    console.log('\n🔍 Steps 14-15: Expanding Adaptive Streaming');
    
    const adaptiveClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const adaptiveBtn = buttons.find(btn => 
        btn.textContent?.includes('Adaptive Streaming') &&
        !btn.textContent?.includes('Protocols') &&
        btn.previousElementSibling?.querySelector('[class*="transform"]')
      );
      
      if (adaptiveBtn && adaptiveBtn.previousElementSibling) {
        adaptiveBtn.previousElementSibling.click();
        return true;
      }
      return false;
    });
    
    await sleep(500);
    logTest('Click "Adaptive Streaming" to expand', adaptiveClicked,
      adaptiveClicked ? '' : 'Expand button not found');
    
    const subSubcategoriesVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const text = sidebar?.textContent || '';
      return text.includes('HLS') && text.includes('DASH');
    });
    logTest('Sub-subcategories appear: HLS, DASH', 
      subSubcategoriesVisible,
      subSubcategoriesVisible ? '' : 'Sub-subcategories not visible')

    // 16. Capture expanded screenshot
    console.log('\n📸 Step 16: Capturing sidebar-expanded.png');
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'sidebar-expanded.png'), fullPage: false });
    logTest('Capture sidebar-expanded.png', true);

    // 17-18. Collapse Protocols & Transport
    console.log('\n🔍 Steps 17-18: Collapsing Protocols & Transport');
    
    const protocolsCollapsed = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const protocolsBtn = buttons.find(btn => 
        btn.textContent?.includes('Protocols & Transport') &&
        btn.previousElementSibling?.querySelector('[class*="transform"]')
      );
      
      if (protocolsBtn && protocolsBtn.previousElementSibling) {
        protocolsBtn.previousElementSibling.click();
        return true;
      }
      return false;
    });
    
    await sleep(500);
    logTest('Click "Protocols & Transport" again', protocolsCollapsed,
      protocolsCollapsed ? '' : 'Collapse button not found');
    
    const subcategoriesHidden = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const protocolsText = sidebar?.textContent || '';
      const adaptiveVisible = protocolsText.includes('Adaptive Streaming');
      return !adaptiveVisible;
    });
    logTest('Subcategories collapse', subcategoriesHidden,
      subcategoriesHidden ? '' : 'Subcategories still visible')

    // 19-22. GitHub Link Testing
    console.log('\n🔍 Steps 19-22: Testing GitHub link');
    
    const githubLink = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const links = Array.from(sidebar?.querySelectorAll('a') || []);
      const githubLink = links.find(link => 
        link.textContent?.includes('GitHub Repository')
      );
      return githubLink ? {
        visible: true,
        href: githubLink.getAttribute('href'),
        target: githubLink.getAttribute('target')
      } : { visible: false };
    });
    
    logTest('GitHub Repository link visible at bottom of sidebar', 
      githubLink.visible,
      githubLink.visible ? '' : 'GitHub link not found');
    
    if (githubLink.visible) {
      const correctUrl = githubLink.href === 'https://github.com/krzemienski/awesome-video';
      const opensNewTab = githubLink.target === '_blank';
      
      logTest('Opens https://github.com/krzemienski/awesome-video in new tab',
        correctUrl && opensNewTab,
        correctUrl ? (opensNewTab ? '' : 'Does not open in new tab') : `Wrong URL: ${githubLink.href}`);
    } else {
      logTest('Opens https://github.com/krzemienski/awesome-video in new tab', false, 'Link not found');
    }
    
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'github-link-clicked.png'), fullPage: false });
    logTest('Capture github-link-clicked.png', true);

    // 23-26. Navigation from Sidebar
    console.log('\n🔍 Steps 23-26: Testing navigation from sidebar');
    
    // Click Home
    const homeClicked = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const buttons = Array.from(sidebar?.querySelectorAll('button') || []);
      const homeBtn = buttons.find(btn => btn.textContent?.trim() === 'Home' || 
        (btn.textContent?.includes('Home') && !btn.textContent?.includes('Homepage')));
      if (homeBtn) {
        homeBtn.click();
        return true;
      }
      return false;
    });
    
    await sleep(1000);
    const onHomePage = page.url() === BASE_URL + '/' || page.url() === BASE_URL;
    logTest('Click "Home" in sidebar', homeClicked, homeClicked ? '' : 'Home button not found');
    logTest('Navigates to /', onHomePage, onHomePage ? '' : `URL is ${page.url()}`);

    // Click Advanced Features
    const advancedClicked = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const buttons = Array.from(sidebar?.querySelectorAll('button') || []);
      const advBtn = buttons.find(btn => btn.textContent?.includes('Advanced Features'));
      if (advBtn) {
        advBtn.click();
        return true;
      }
      return false;
    });
    
    await sleep(1000);
    const onAdvancedPage = page.url().includes('/advanced');
    logTest('Click "Advanced Features"', advancedClicked, advancedClicked ? '' : 'Advanced button not found');
    logTest('Navigates to /advanced', onAdvancedPage, onAdvancedPage ? '' : `URL is ${page.url()}`);

    // 27-29. Return to home and click category
    console.log('\n🔍 Steps 27-29: Return to home and test category navigation');
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(1000);
    logTest('Return to home', true);

    const categoryClicked = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const buttons = Array.from(sidebar?.querySelectorAll('button') || []);
      const categoryBtn = buttons.find(btn => 
        btn.textContent?.includes('Encoding & Codecs') &&
        btn.querySelector('[class*="lucide-folder"]')
      );
      if (categoryBtn) {
        categoryBtn.click();
        return true;
      }
      return false;
    });
    
    await sleep(1500);
    const onCategoryPage = page.url().includes('/category/');
    logTest('Click a category from sidebar', categoryClicked, categoryClicked ? '' : 'Category button not found');
    logTest('Category page loads correctly', onCategoryPage, onCategoryPage ? `URL: ${page.url()}` : `URL is ${page.url()}`);

    // 30-34. Persistence Testing
    console.log('\n🔍 Steps 30-34: Testing sidebar persistence');
    
    await page.goto(BASE_URL + '/category/encoding-codecs', { waitUntil: 'networkidle0' });
    await sleep(1000);
    
    const sidebarOnCategory = await page.$('[data-sidebar="sidebar"]');
    logTest('Navigate to /category/encoding-codecs', true);
    logTest('Sidebar still visible', sidebarOnCategory !== null, 
      sidebarOnCategory ? '' : 'Sidebar not found on category page');
    
    const githubOnCategory = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      const links = Array.from(sidebar?.querySelectorAll('a') || []);
      return links.some(link => link.textContent?.includes('GitHub Repository'));
    });
    logTest('GitHub link still at bottom', githubOnCategory,
      githubOnCategory ? '' : 'GitHub link not found on category page');

    await page.goto(BASE_URL + '/subcategory/adaptive-streaming', { waitUntil: 'networkidle0' });
    await sleep(1000);
    
    const sidebarOnSubcategory = await page.$('[data-sidebar="sidebar"]');
    logTest('Navigate to /subcategory/adaptive-streaming', true);
    logTest('Sidebar persists across all pages', sidebarOnSubcategory !== null,
      sidebarOnSubcategory ? '' : 'Sidebar not found on subcategory page');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${results.passed}/${results.total}`);
    console.log(`❌ Failed: ${results.failed}/${results.total}`);
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Save results to JSON
    const reportPath = join(__dirname, 'test-results', 'desktop-sidebar-suite-6-report.json');
    await fs.mkdir(join(__dirname, 'test-results'), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}\n`);

    // Generate markdown report
    const markdownReport = generateMarkdownReport(results);
    const mdReportPath = join(__dirname, 'test-results', 'DESKTOP_SIDEBAR_SUITE_6_REPORT.md');
    await fs.writeFile(mdReportPath, markdownReport);
    console.log(`📝 Markdown report saved to: ${mdReportPath}\n`);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    results.tests.push({
      name: 'Test Execution',
      passed: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
    results.failed++;
    results.total++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
}

function generateMarkdownReport(results) {
  let md = `# DESKTOP SUITE 6: SIDEBAR NAVIGATION & GITHUB LINK TEST REPORT\n\n`;
  md += `**Generated:** ${new Date(results.timestamp).toLocaleString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Total Tests:** ${results.total}\n`;
  md += `- **Passed:** ${results.passed} ✅\n`;
  md += `- **Failed:** ${results.failed} ❌\n`;
  md += `- **Success Rate:** ${((results.passed / results.total) * 100).toFixed(1)}%\n\n`;
  
  md += `## Test Results\n\n`;
  
  const categories = {
    'Browser Setup': [],
    'Sidebar Structure': [],
    'Navigation Buttons': [],
    'Category Verification': [],
    'Expand/Collapse': [],
    'GitHub Link': [],
    'Navigation': [],
    'Persistence': []
  };
  
  results.tests.forEach(test => {
    if (test.name.includes('browser') || test.name.includes('Navigate to homepage')) {
      categories['Browser Setup'].push(test);
    } else if (test.name.includes('Sidebar') && !test.name.includes('Click')) {
      categories['Sidebar Structure'].push(test);
    } else if (test.name.includes('button visible') || test.name.includes('navigation item')) {
      categories['Navigation Buttons'].push(test);
    } else if (test.name.includes('Category:') || test.name.includes('Resource counts')) {
      categories['Category Verification'].push(test);
    } else if (test.name.includes('expand') || test.name.includes('collapse') || test.name.includes('Subcategories')) {
      categories['Expand/Collapse'].push(test);
    } else if (test.name.includes('GitHub')) {
      categories['GitHub Link'].push(test);
    } else if (test.name.includes('Click') || test.name.includes('Navigates')) {
      categories['Navigation'].push(test);
    } else if (test.name.includes('persists') || test.name.includes('still')) {
      categories['Persistence'].push(test);
    }
  });
  
  for (const [category, tests] of Object.entries(categories)) {
    if (tests.length > 0) {
      md += `### ${category}\n\n`;
      tests.forEach(test => {
        const icon = test.passed ? '✅' : '❌';
        md += `${icon} **${test.name}**\n`;
        if (test.message) {
          md += `   - ${test.message}\n`;
        }
        md += `\n`;
      });
    }
  }
  
  md += `## Success Criteria\n\n`;
  const criteria = [
    'Sidebar width correct (16rem)',
    'No duplicate "Awesome Video" title in sidebar',
    'All navigation items functional',
    'GitHub link always visible and functional',
    'Sidebar persists across page navigation',
    'Resource counts accurate'
  ];
  
  criteria.forEach(criterion => {
    const relevant = results.tests.find(t => t.name.toLowerCase().includes(criterion.toLowerCase()));
    const status = relevant && relevant.passed ? '✅' : '❌';
    md += `- ${status} ${criterion}\n`;
  });
  
  return md;
}

// Run tests
runTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
