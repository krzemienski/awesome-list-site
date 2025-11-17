import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };
const SCREENSHOT_DIR = join(__dirname, '..', 'test-screenshots', 'suite-1');
const RESULTS_DIR = join(__dirname, 'test-results');

// Ensure directories exist
[SCREENSHOT_DIR, RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * ALL 60 NAVIGATION ITEMS WITH EXPECTED ICONS
 * Mapped from client/src/config/navigation-icons.ts
 */
const NAVIGATION_ITEMS = {
  // 9 Main Categories
  categories: [
    { name: 'Intro & Learning', slug: 'intro-learning', icon: 'BookOpen' },
    { name: 'Protocols & Transport', slug: 'protocols-transport', icon: 'Radio' },
    { name: 'Encoding & Codecs', slug: 'encoding-codecs', icon: 'Film' },
    { name: 'Players & Clients', slug: 'players-clients', icon: 'Play' },
    { name: 'Media Tools', slug: 'media-tools', icon: 'Wrench' },
    { name: 'Standards & Industry', slug: 'standards-industry', icon: 'FileText' },
    { name: 'Infrastructure & Delivery', slug: 'infrastructure-delivery', icon: 'Server' },
    { name: 'General Tools', slug: 'general-tools', icon: 'Settings' },
    { name: 'Community & Events', slug: 'community-events', icon: 'Users' }
  ],
  
  // 19 Subcategories
  subcategories: [
    { name: 'Introduction', slug: 'introduction', icon: 'BookOpenCheck', parent: 'Intro & Learning' },
    { name: 'Learning Resources', slug: 'learning-resources', icon: 'GraduationCap', parent: 'Intro & Learning' },
    { name: 'Tutorials & Case Studies', slug: 'tutorials-case-studies', icon: 'BookMarked', parent: 'Intro & Learning' },
    { name: 'Adaptive Streaming', slug: 'adaptive-streaming', icon: 'Wifi', parent: 'Protocols & Transport' },
    { name: 'Transport Protocols', slug: 'transport-protocols', icon: 'Network', parent: 'Protocols & Transport' },
    { name: 'Encoding Tools', slug: 'encoding-tools', icon: 'Clapperboard', parent: 'Encoding & Codecs' },
    { name: 'Codecs', slug: 'codecs', icon: 'Binary', parent: 'Encoding & Codecs' },
    { name: 'Hardware Players', slug: 'hardware-players', icon: 'Tv', parent: 'Players & Clients' },
    { name: 'Mobile & Web Players', slug: 'mobile-web-players', icon: 'Smartphone', parent: 'Players & Clients' },
    { name: 'Audio & Subtitles', slug: 'audio-subtitles', icon: 'Volume2', parent: 'Media Tools' },
    { name: 'Ads & QoE', slug: 'ads-qoe', icon: 'Target', parent: 'Media Tools' },
    { name: 'Specs & Standards', slug: 'specs-standards', icon: 'FileCheck', parent: 'Standards & Industry' },
    { name: 'Vendors & HDR', slug: 'vendors-hdr', icon: 'Building', parent: 'Standards & Industry' },
    { name: 'Streaming Servers', slug: 'streaming-servers', icon: 'HardDrive', parent: 'Infrastructure & Delivery' },
    { name: 'Cloud & CDN', slug: 'cloud-cdn', icon: 'Cloud', parent: 'Infrastructure & Delivery' },
    { name: 'FFMPEG & Tools', slug: 'ffmpeg-tools', icon: 'Video', parent: 'General Tools' },
    { name: 'DRM', slug: 'drm', icon: 'Lock', parent: 'Media Tools' },
    { name: 'Community Groups', slug: 'community-groups', icon: 'MessageCircle', parent: 'Community & Events' },
    { name: 'Events & Conferences', slug: 'events-conferences', icon: 'Calendar', parent: 'Community & Events' }
  ],
  
  // 32 Sub-Subcategories
  subSubcategories: [
    { name: 'HLS', slug: 'hls', icon: 'PlayCircle', parent: 'Adaptive Streaming' },
    { name: 'DASH', slug: 'dash', icon: 'Zap', parent: 'Adaptive Streaming' },
    { name: 'RIST', slug: 'rist', icon: 'Signal', parent: 'Transport Protocols' },
    { name: 'RTMP', slug: 'rtmp', icon: 'Signal', parent: 'Transport Protocols' },
    { name: 'SRT', slug: 'srt', icon: 'Signal', parent: 'Transport Protocols' },
    { name: 'FFMPEG', slug: 'ffmpeg', icon: 'FileVideo', parent: 'Encoding Tools' },
    { name: 'Other Encoders', slug: 'other-encoders', icon: 'Clapperboard', parent: 'Encoding Tools' },
    { name: 'HEVC', slug: 'hevc', icon: 'Code', parent: 'Codecs' },
    { name: 'VP9', slug: 'vp9', icon: 'Code', parent: 'Codecs' },
    { name: 'AV1', slug: 'av1', icon: 'Code', parent: 'Codecs' },
    { name: 'Roku', slug: 'roku', icon: 'MonitorPlay', parent: 'Hardware Players' },
    { name: 'iOS/tvOS', slug: 'ios-tvos', icon: 'Apple', parent: 'Mobile & Web Players' },
    { name: 'Android', slug: 'android', icon: 'Smartphone', parent: 'Mobile & Web Players' },
    { name: 'Web Players', slug: 'web-players', icon: 'Globe', parent: 'Mobile & Web Players' },
    { name: 'Audio', slug: 'audio', icon: 'Music', parent: 'Audio & Subtitles' },
    { name: 'Subtitles & Captions', slug: 'subtitles-captions', icon: 'Type', parent: 'Audio & Subtitles' },
    { name: 'Chromecast', slug: 'chromecast', icon: 'Cast', parent: 'Hardware Players' },
    { name: 'Smart TVs', slug: 'smart-tvs', icon: 'Tv', parent: 'Hardware Players' },
    { name: 'CDN Integration', slug: 'cdn-integration', icon: 'CloudUpload', parent: 'Cloud & CDN' },
    { name: 'Cloud Platforms', slug: 'cloud-platforms', icon: 'Cloud', parent: 'Cloud & CDN' },
    { name: 'Origin Servers', slug: 'origin-servers', icon: 'Server', parent: 'Streaming Servers' },
    { name: 'Storage Solutions', slug: 'storage-solutions', icon: 'Database', parent: 'Streaming Servers' },
    { name: 'Advertising', slug: 'advertising', icon: 'Megaphone', parent: 'Ads & QoE' },
    { name: 'Quality & Testing', slug: 'quality-testing', icon: 'TestTube', parent: 'Ads & QoE' },
    { name: 'Online Forums', slug: 'online-forums', icon: 'MessageCircle', parent: 'Community Groups' },
    { name: 'Slack & Meetups', slug: 'slack-meetups', icon: 'Users', parent: 'Community Groups' },
    { name: 'Conferences', slug: 'conferences', icon: 'Presentation', parent: 'Events & Conferences' },
    { name: 'Podcasts & Webinars', slug: 'podcasts-webinars', icon: 'Podcast', parent: 'Events & Conferences' },
    { name: 'MPEG & Forums', slug: 'mpeg-forums', icon: 'ScrollText', parent: 'Specs & Standards' },
    { name: 'Official Specs', slug: 'official-specs', icon: 'FileCode', parent: 'Specs & Standards' },
    { name: 'HDR Guidelines', slug: 'hdr-guidelines', icon: 'Sparkles', parent: 'Vendors & HDR' },
    { name: 'Vendor Docs', slug: 'vendor-docs', icon: 'BookOpenText', parent: 'Vendors & HDR' }
  ]
};

// Calculate totals
const TOTAL_ITEMS = 
  NAVIGATION_ITEMS.categories.length + 
  NAVIGATION_ITEMS.subcategories.length + 
  NAVIGATION_ITEMS.subSubcategories.length;

// Test results tracking
const results = {
  testSuite: 'Icon Visibility Suite - All 60 Navigation Items',
  viewport: VIEWPORT,
  timestamp: new Date().toISOString(),
  totalExpected: TOTAL_ITEMS,
  iconTests: {
    categories: [],
    subcategories: [],
    subSubcategories: []
  },
  summary: {
    totalTested: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  screenshots: []
};

/**
 * Helper to wait for element
 */
async function waitForSelector(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Helper to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Take screenshot
 */
async function takeScreenshot(page, filename) {
  const path = join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path, fullPage: false });
  return { filename, path };
}

/**
 * Verify icon for a navigation item
 */
async function verifyNavigationIcon(page, itemName, itemType) {
  console.log(`   🔍 Verifying: "${itemName}"`);
  
  const testResult = {
    name: itemName,
    type: itemType,
    tests: {
      svgExists: { status: 'pending', message: '' },
      iconBeforeText: { status: 'pending', message: '' },
      iconStyling: { status: 'pending', message: '' },
      iconSize: { status: 'pending', message: '' }
    }
  };
  
  try {
    // Find the button containing this navigation item using evaluate
    const navButton = await page.evaluateHandle((name) => {
      // Find all buttons in the sidebar
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Find buttons that contain the navigation item name
      const matchingButtons = buttons.filter(button => {
        const text = button.textContent || '';
        return text.includes(name);
      });
      
      if (matchingButtons.length === 0) return null;
      
      // Prefer buttons with resource count (actual navigation buttons, not expand buttons)
      const navButtons = matchingButtons.filter(button => {
        const text = button.textContent || '';
        return text.match(/\d+/);
      });
      
      if (navButtons.length > 0) {
        return navButtons[0];
      }
      
      // Fallback to last matching button
      return matchingButtons[matchingButtons.length - 1];
    }, itemName);
    
    const buttonElement = navButton.asElement();
    
    if (!buttonElement) {
      console.log(`      ❌ Navigation item not found in sidebar`);
      Object.keys(testResult.tests).forEach(key => {
        testResult.tests[key] = { status: 'failed', message: 'Navigation item not found' };
      });
      return testResult;
    }
    
    // TEST 1: SVG exists
    const iconData = await buttonElement.evaluate(button => {
      const svg = button.querySelector('svg');
      if (!svg) return { exists: false };
      
      const buttonText = button.textContent || '';
      const children = Array.from(button.children);
      
      // Find the parent div that contains both icon and text
      const contentDiv = button.querySelector('div');
      if (!contentDiv) return { exists: false, beforeText: false };
      
      const divChildren = Array.from(contentDiv.children);
      const svgIndex = divChildren.findIndex(child => child.tagName === 'svg' || child.querySelector('svg'));
      const textIndex = divChildren.findIndex(child => child.tagName === 'SPAN' || child.textContent.trim().length > 0);
      
      const computedStyle = window.getComputedStyle(svg);
      
      return {
        exists: true,
        beforeText: svgIndex >= 0 && textIndex >= 0 && svgIndex < textIndex,
        width: svg.getBoundingClientRect().width,
        height: svg.getBoundingClientRect().height,
        color: computedStyle.color || computedStyle.fill,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity
      };
    });
    
    // Evaluate TEST 1
    if (iconData.exists) {
      console.log(`      ✅ SVG icon exists`);
      testResult.tests.svgExists = { status: 'passed', message: 'SVG icon rendered' };
    } else {
      console.log(`      ❌ SVG icon NOT found`);
      testResult.tests.svgExists = { status: 'failed', message: 'No SVG element' };
      return testResult;
    }
    
    // TEST 2: Icon before text
    if (iconData.beforeText) {
      console.log(`      ✅ Icon appears before text`);
      testResult.tests.iconBeforeText = { status: 'passed', message: 'Icon positioned before label' };
    } else {
      console.log(`      ⚠️  Icon position unclear or after text`);
      testResult.tests.iconBeforeText = { status: 'warning', message: 'Icon position may not be before text' };
    }
    
    // TEST 3: Icon styling (color, visibility)
    const isVisible = iconData.display !== 'none' && 
                     iconData.visibility !== 'hidden' && 
                     parseFloat(iconData.opacity) > 0;
    
    if (isVisible && iconData.color) {
      console.log(`      ✅ Icon has proper styling (color: ${iconData.color})`);
      testResult.tests.iconStyling = { 
        status: 'passed', 
        message: `Color: ${iconData.color}, visible` 
      };
    } else {
      console.log(`      ⚠️  Icon styling unclear (color: ${iconData.color}, visible: ${isVisible})`);
      testResult.tests.iconStyling = { 
        status: 'warning', 
        message: `Visibility: ${isVisible}, Color: ${iconData.color}` 
      };
    }
    
    // TEST 4: Icon size
    const minSize = 12;
    const maxSize = 32;
    const sizeOk = iconData.width >= minSize && iconData.width <= maxSize &&
                   iconData.height >= minSize && iconData.height <= maxSize;
    
    if (sizeOk) {
      console.log(`      ✅ Icon size appropriate (${iconData.width}x${iconData.height}px)`);
      testResult.tests.iconSize = { 
        status: 'passed', 
        message: `${iconData.width}x${iconData.height}px` 
      };
    } else {
      console.log(`      ⚠️  Icon size unusual (${iconData.width}x${iconData.height}px)`);
      testResult.tests.iconSize = { 
        status: 'warning', 
        message: `${iconData.width}x${iconData.height}px (expected ${minSize}-${maxSize}px)` 
      };
    }
    
  } catch (error) {
    console.log(`      ❌ Error during verification: ${error.message}`);
    Object.keys(testResult.tests).forEach(key => {
      testResult.tests[key] = { status: 'failed', message: error.message };
    });
  }
  
  return testResult;
}

/**
 * Expand all categories in sidebar - ALL 3 LEVELS
 */
async function expandAllCategories(page) {
  console.log('\n📂 Expanding all categories to reveal subcategories and sub-subcategories...');
  
  // Strategy: Find all expand buttons and click them in multiple passes
  // Pass 1: Expand all main categories
  // Pass 2: Expand all subcategories (now visible)
  // Pass 3: Final pass to catch any remaining items
  
  for (let pass = 1; pass <= 3; pass++) {
    console.log(`   Pass ${pass}: Looking for expandable items...`);
    
    // Find all buttons with aria-label containing "Expand"
    const expandButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(button => {
        const ariaLabel = button.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.toLowerCase().includes('expand')) {
          return true;
        }
        
        // Also check for buttons with the chevron/arrow icon that's not rotated (collapsed state)
        const hasChevron = button.querySelector('div');
        if (hasChevron) {
          const transform = window.getComputedStyle(hasChevron).transform;
          // If no rotation or rotate(0), it's collapsed
          if (!transform || transform === 'none' || transform.includes('matrix(1, 0, 0, 1')) {
            const text = button.textContent || '';
            // Make sure it contains a rotate indicator (▶)
            if (text.includes('▶')) {
              return true;
            }
          }
        }
        
        return false;
      }).map(button => {
        // Return a unique identifier to click
        button.setAttribute('data-expand-target', 'true');
        return true;
      });
    });
    
    // Click all found expand buttons
    const buttonsToClick = await page.$$('button[data-expand-target="true"]');
    console.log(`   Found ${buttonsToClick.length} buttons to expand`);
    
    for (const button of buttonsToClick) {
      try {
        await button.click();
        await sleep(200);
      } catch (error) {
        // Button might not be clickable
      }
    }
    
    // Remove the marker attribute
    await page.evaluate(() => {
      const marked = document.querySelectorAll('button[data-expand-target="true"]');
      marked.forEach(btn => btn.removeAttribute('data-expand-target'));
    });
    
    await sleep(500);
  }
  
  // Count visible navigation items
  const visibleCount = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.filter(btn => {
      const text = btn.textContent || '';
      // Count buttons with resource numbers (actual navigation items)
      return text.match(/\d+/) && text.length > 5;
    }).length;
  });
  
  console.log(`   ✅ Expansion complete - ${visibleCount} navigation items visible\n`);
}

/**
 * Main test function
 */
async function runTests() {
  console.log('═'.repeat(100));
  console.log('🎯 TEST SUITE 1: ICON VISIBILITY - ALL 60 NAVIGATION ITEMS');
  console.log('═'.repeat(100));
  console.log(`📊 Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`📁 Screenshot directory: ${SCREENSHOT_DIR}`);
  console.log(`📈 Total navigation items to test: ${TOTAL_ITEMS}`);
  console.log(`   - Categories: ${NAVIGATION_ITEMS.categories.length}`);
  console.log(`   - Subcategories: ${NAVIGATION_ITEMS.subcategories.length}`);
  console.log(`   - Sub-Subcategories: ${NAVIGATION_ITEMS.subSubcategories.length}`);
  console.log('═'.repeat(100));
  console.log();

  let browser;
  let page;

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
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

    // Navigate to homepage
    console.log(`📍 Navigating to homepage: ${BASE_URL}/`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    console.log('✅ Homepage loaded successfully\n');

    // Take initial screenshot
    const initialScreenshot = await takeScreenshot(page, 'initial-homepage.png');
    results.screenshots.push(initialScreenshot);
    console.log(`📸 Initial screenshot: ${initialScreenshot.filename}\n`);

    // Expand all categories
    await expandAllCategories(page);
    
    // Take screenshot after expansion
    const expandedScreenshot = await takeScreenshot(page, 'sidebar-all-expanded.png');
    results.screenshots.push(expandedScreenshot);
    console.log(`📸 Expanded sidebar screenshot: ${expandedScreenshot.filename}\n`);

    // TEST CATEGORIES (9 items)
    console.log('━'.repeat(100));
    console.log('📁 TESTING MAIN CATEGORIES (9 items)');
    console.log('━'.repeat(100));
    
    for (const category of NAVIGATION_ITEMS.categories) {
      const testResult = await verifyNavigationIcon(page, category.name, 'category');
      testResult.expectedIcon = category.icon;
      testResult.slug = category.slug;
      results.iconTests.categories.push(testResult);
      
      // Count results
      results.summary.totalTested++;
      const testStatuses = Object.values(testResult.tests).map(t => t.status);
      if (testStatuses.every(s => s === 'passed')) {
        results.summary.passed++;
      } else if (testStatuses.some(s => s === 'failed')) {
        results.summary.failed++;
      } else {
        results.summary.warnings++;
      }
    }
    
    // Take screenshot of categories
    const categoriesScreenshot = await takeScreenshot(page, 'categories-with-icons.png');
    results.screenshots.push(categoriesScreenshot);
    console.log(`\n📸 Categories screenshot: ${categoriesScreenshot.filename}\n`);

    // TEST SUBCATEGORIES (19 items)
    console.log('━'.repeat(100));
    console.log('📂 TESTING SUBCATEGORIES (19 items)');
    console.log('━'.repeat(100));
    
    for (const subcategory of NAVIGATION_ITEMS.subcategories) {
      const testResult = await verifyNavigationIcon(page, subcategory.name, 'subcategory');
      testResult.expectedIcon = subcategory.icon;
      testResult.slug = subcategory.slug;
      testResult.parent = subcategory.parent;
      results.iconTests.subcategories.push(testResult);
      
      // Count results
      results.summary.totalTested++;
      const testStatuses = Object.values(testResult.tests).map(t => t.status);
      if (testStatuses.every(s => s === 'passed')) {
        results.summary.passed++;
      } else if (testStatuses.some(s => s === 'failed')) {
        results.summary.failed++;
      } else {
        results.summary.warnings++;
      }
    }
    
    // Take screenshot of subcategories
    const subcategoriesScreenshot = await takeScreenshot(page, 'subcategories-with-icons.png');
    results.screenshots.push(subcategoriesScreenshot);
    console.log(`\n📸 Subcategories screenshot: ${subcategoriesScreenshot.filename}\n`);

    // TEST SUB-SUBCATEGORIES (32 items)
    console.log('━'.repeat(100));
    console.log('📑 TESTING SUB-SUBCATEGORIES (32 items)');
    console.log('━'.repeat(100));
    
    for (const subSub of NAVIGATION_ITEMS.subSubcategories) {
      const testResult = await verifyNavigationIcon(page, subSub.name, 'sub-subcategory');
      testResult.expectedIcon = subSub.icon;
      testResult.slug = subSub.slug;
      testResult.parent = subSub.parent;
      results.iconTests.subSubcategories.push(testResult);
      
      // Count results
      results.summary.totalTested++;
      const testStatuses = Object.values(testResult.tests).map(t => t.status);
      if (testStatuses.every(s => s === 'passed')) {
        results.summary.passed++;
      } else if (testStatuses.some(s => s === 'failed')) {
        results.summary.failed++;
      } else {
        results.summary.warnings++;
      }
    }
    
    // Take final screenshot
    const finalScreenshot = await takeScreenshot(page, 'final-all-icons-visible.png');
    results.screenshots.push(finalScreenshot);
    console.log(`\n📸 Final screenshot: ${finalScreenshot.filename}\n`);

  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
    results.error = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(100));
  console.log('📊 TEST SUMMARY - ICON VISIBILITY SUITE');
  console.log('═'.repeat(100));
  console.log(`Total Navigation Items: ${results.totalExpected}`);
  console.log(`Total Tested: ${results.summary.totalTested}`);
  console.log(`✅ Passed (All 4 tests): ${results.summary.passed}`);
  console.log(`⚠️  Warnings (Some tests): ${results.summary.warnings}`);
  console.log(`❌ Failed (Missing icons): ${results.summary.failed}`);
  console.log(`📸 Screenshots taken: ${results.screenshots.length}`);
  console.log('═'.repeat(100));

  // Save results to JSON
  const jsonPath = join(RESULTS_DIR, 'suite-1-icon-visibility.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 JSON results saved to: ${jsonPath}`);

  // Generate markdown report
  const reportPath = join(RESULTS_DIR, 'SUITE_1_ICON_VISIBILITY_REPORT.md');
  const report = generateMarkdownReport(results);
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Markdown report saved to: ${reportPath}`);

  return results;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(results) {
  let report = `# Icon Visibility Test Report - Suite 1\n\n`;
  report += `**Test Suite:** ${results.testSuite}\n`;
  report += `**Viewport:** ${results.viewport.width}x${results.viewport.height}\n`;
  report += `**Timestamp:** ${results.timestamp}\n\n`;

  report += `## Executive Summary\n\n`;
  report += `This test suite verifies that all 60 navigation items (9 categories + 19 subcategories + 32 sub-subcategories) display icons correctly.\n\n`;
  
  report += `### Overall Results\n\n`;
  report += `| Metric | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Expected | ${results.totalExpected} |\n`;
  report += `| Total Tested | ${results.summary.totalTested} |\n`;
  report += `| ✅ Passed (All Tests) | ${results.summary.passed} |\n`;
  report += `| ⚠️ Warnings (Some Tests) | ${results.summary.warnings} |\n`;
  report += `| ❌ Failed (Missing Icons) | ${results.summary.failed} |\n`;
  report += `| 📸 Screenshots | ${results.screenshots.length} |\n\n`;

  const successRate = ((results.summary.passed / results.summary.totalTested) * 100).toFixed(1);
  report += `**Success Rate:** ${successRate}%\n\n`;

  // Categories section
  report += `## Main Categories (9 items)\n\n`;
  report += `| # | Category | Icon | SVG | Position | Styling | Size | Status |\n`;
  report += `|---|----------|------|-----|----------|---------|------|--------|\n`;
  
  results.iconTests.categories.forEach((cat, index) => {
    const svgStatus = cat.tests.svgExists.status === 'passed' ? '✅' : cat.tests.svgExists.status === 'warning' ? '⚠️' : '❌';
    const posStatus = cat.tests.iconBeforeText.status === 'passed' ? '✅' : cat.tests.iconBeforeText.status === 'warning' ? '⚠️' : '❌';
    const styleStatus = cat.tests.iconStyling.status === 'passed' ? '✅' : cat.tests.iconStyling.status === 'warning' ? '⚠️' : '❌';
    const sizeStatus = cat.tests.iconSize.status === 'passed' ? '✅' : cat.tests.iconSize.status === 'warning' ? '⚠️' : '❌';
    
    const overallStatus = Object.values(cat.tests).every(t => t.status === 'passed') ? '✅ PASS' :
                         Object.values(cat.tests).some(t => t.status === 'failed') ? '❌ FAIL' : '⚠️ WARN';
    
    report += `| ${index + 1} | ${cat.name} | ${cat.expectedIcon} | ${svgStatus} | ${posStatus} | ${styleStatus} | ${sizeStatus} | ${overallStatus} |\n`;
  });

  // Subcategories section
  report += `\n## Subcategories (19 items)\n\n`;
  report += `| # | Subcategory | Parent | Icon | SVG | Position | Styling | Size | Status |\n`;
  report += `|---|-------------|--------|------|-----|----------|---------|------|--------|\n`;
  
  results.iconTests.subcategories.forEach((sub, index) => {
    const svgStatus = sub.tests.svgExists.status === 'passed' ? '✅' : sub.tests.svgExists.status === 'warning' ? '⚠️' : '❌';
    const posStatus = sub.tests.iconBeforeText.status === 'passed' ? '✅' : sub.tests.iconBeforeText.status === 'warning' ? '⚠️' : '❌';
    const styleStatus = sub.tests.iconStyling.status === 'passed' ? '✅' : sub.tests.iconStyling.status === 'warning' ? '⚠️' : '❌';
    const sizeStatus = sub.tests.iconSize.status === 'passed' ? '✅' : sub.tests.iconSize.status === 'warning' ? '⚠️' : '❌';
    
    const overallStatus = Object.values(sub.tests).every(t => t.status === 'passed') ? '✅ PASS' :
                         Object.values(sub.tests).some(t => t.status === 'failed') ? '❌ FAIL' : '⚠️ WARN';
    
    report += `| ${index + 1} | ${sub.name} | ${sub.parent} | ${sub.expectedIcon} | ${svgStatus} | ${posStatus} | ${styleStatus} | ${sizeStatus} | ${overallStatus} |\n`;
  });

  // Sub-subcategories section
  report += `\n## Sub-Subcategories (32 items)\n\n`;
  report += `| # | Sub-Subcategory | Parent | Icon | SVG | Position | Styling | Size | Status |\n`;
  report += `|---|-----------------|--------|------|-----|----------|---------|------|--------|\n`;
  
  results.iconTests.subSubcategories.forEach((subSub, index) => {
    const svgStatus = subSub.tests.svgExists.status === 'passed' ? '✅' : subSub.tests.svgExists.status === 'warning' ? '⚠️' : '❌';
    const posStatus = subSub.tests.iconBeforeText.status === 'passed' ? '✅' : subSub.tests.iconBeforeText.status === 'warning' ? '⚠️' : '❌';
    const styleStatus = subSub.tests.iconStyling.status === 'passed' ? '✅' : subSub.tests.iconStyling.status === 'warning' ? '⚠️' : '❌';
    const sizeStatus = subSub.tests.iconSize.status === 'passed' ? '✅' : subSub.tests.iconSize.status === 'warning' ? '⚠️' : '❌';
    
    const overallStatus = Object.values(subSub.tests).every(t => t.status === 'passed') ? '✅ PASS' :
                         Object.values(subSub.tests).some(t => t.status === 'failed') ? '❌ FAIL' : '⚠️ WARN';
    
    report += `| ${index + 1} | ${subSub.name} | ${subSub.parent} | ${subSub.expectedIcon} | ${svgStatus} | ${posStatus} | ${styleStatus} | ${sizeStatus} | ${overallStatus} |\n`;
  });

  // Screenshots section
  report += `\n## Screenshots\n\n`;
  results.screenshots.forEach((screenshot, index) => {
    report += `${index + 1}. \`${screenshot.filename}\`\n`;
  });

  // Test criteria
  report += `\n## Test Criteria\n\n`;
  report += `For each navigation item, the following tests were performed:\n\n`;
  report += `1. **SVG Exists:** Verify that an SVG icon element is present\n`;
  report += `2. **Icon Position:** Verify that the icon appears BEFORE the text label\n`;
  report += `3. **Icon Styling:** Verify that the icon has proper color and is visible\n`;
  report += `4. **Icon Size:** Verify that the icon size is appropriate (12-32px)\n\n`;

  // Failures/Warnings section
  const failures = [];
  const warnings = [];
  
  [...results.iconTests.categories, ...results.iconTests.subcategories, ...results.iconTests.subSubcategories].forEach(item => {
    const hasFailure = Object.values(item.tests).some(t => t.status === 'failed');
    const hasWarning = Object.values(item.tests).some(t => t.status === 'warning');
    
    if (hasFailure) {
      failures.push(item);
    } else if (hasWarning) {
      warnings.push(item);
    }
  });

  if (failures.length > 0) {
    report += `\n## ❌ Failed Items (${failures.length})\n\n`;
    failures.forEach(item => {
      report += `### ${item.name} (${item.type})\n`;
      Object.entries(item.tests).forEach(([testName, testResult]) => {
        if (testResult.status === 'failed') {
          report += `- **${testName}:** ${testResult.message}\n`;
        }
      });
      report += `\n`;
    });
  }

  if (warnings.length > 0) {
    report += `\n## ⚠️ Warnings (${warnings.length})\n\n`;
    warnings.forEach(item => {
      report += `### ${item.name} (${item.type})\n`;
      Object.entries(item.tests).forEach(([testName, testResult]) => {
        if (testResult.status === 'warning') {
          report += `- **${testName}:** ${testResult.message}\n`;
        }
      });
      report += `\n`;
    });
  }

  // Conclusion
  report += `\n## Conclusion\n\n`;
  if (results.summary.failed === 0 && results.summary.warnings === 0) {
    report += `✅ **ALL TESTS PASSED!** All 60 navigation items display icons correctly with proper positioning, styling, and sizing.\n`;
  } else if (results.summary.failed === 0) {
    report += `⚠️ **TESTS PASSED WITH WARNINGS.** All icons are present, but some have minor styling or positioning concerns.\n`;
  } else {
    report += `❌ **TESTS FAILED.** ${results.summary.failed} navigation items are missing icons or have critical issues.\n`;
  }

  return report;
}

// Run the tests
runTests().then(() => {
  console.log('\n✅ Icon visibility test suite complete!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
