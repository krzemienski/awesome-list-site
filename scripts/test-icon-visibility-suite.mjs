import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };

const testResults = {
  timestamp: new Date().toISOString(),
  viewport: VIEWPORT,
  summary: {
    totalItems: 60,
    categoriesTested: 0,
    subcategoriesTested: 0,
    subSubcategoriesTested: 0,
    iconsFound: 0,
    iconsMissing: 0,
    passed: 0,
    failed: 0,
  },
  categories: [],
  subcategories: [],
  subSubcategories: [],
  failures: []
};

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findAndVerifyIcon(page, itemName, itemType) {
  console.log(`\n🔍 Verifying icon for ${itemType}: "${itemName}"`);
  
  try {
    const iconData = await page.evaluate((name) => {
      // Find all buttons in the sidebar
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Find button that contains this exact text
      const targetButton = buttons.find(btn => {
        const text = btn.textContent || '';
        // Match the full name or partial name (sidebar truncates text)
        return text.includes(name) || name.includes(text.split(/\s+\d+$/)[0].trim());
      });
      
      if (!targetButton) {
        return { found: false, error: `Button not found for "${name}"` };
      }
      
      // Look for SVG icon within the button
      const svg = targetButton.querySelector('svg');
      if (!svg) {
        return { 
          found: false, 
          error: `No SVG icon found in button for "${name}"`,
          buttonHTML: targetButton.outerHTML.substring(0, 500)
        };
      }
      
      // Get button and SVG positions
      const buttonRect = targetButton.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      
      // Check if SVG is visible and comes before text
      const iconBeforeText = svgRect.left < (buttonRect.left + buttonRect.width / 2);
      const isVisible = svgRect.width > 0 && svgRect.height > 0;
      
      // Get text content excluding numbers
      const buttonText = targetButton.textContent.trim();
      
      // Check if button is in viewport
      const inViewport = buttonRect.top >= 0 && 
                        buttonRect.bottom <= window.innerHeight &&
                        buttonRect.left >= 0 &&
                        buttonRect.right <= window.innerWidth;
      
      return {
        found: true,
        isSVG: svg.tagName === 'svg',
        isVisible,
        iconBeforeText,
        buttonText,
        svgWidth: svgRect.width,
        svgHeight: svgRect.height,
        inViewport,
        svgClass: svg.getAttribute('class') || '',
      };
    }, itemName);
    
    if (!iconData.found) {
      console.log(`❌ ${iconData.error}`);
      return {
        itemName,
        itemType,
        iconFound: false,
        isSVG: false,
        iconBeforeText: false,
        error: iconData.error,
        passed: false
      };
    }
    
    console.log(`✅ Icon found for "${itemName}"`);
    console.log(`   - SVG: ${iconData.isSVG}`);
    console.log(`   - Visible: ${iconData.isVisible} (${iconData.svgWidth}x${iconData.svgHeight})`);
    console.log(`   - Icon before text: ${iconData.iconBeforeText}`);
    console.log(`   - In viewport: ${iconData.inViewport}`);
    console.log(`   - Button text: ${iconData.buttonText}`);
    
    const passed = iconData.found && 
                   iconData.isSVG && 
                   iconData.isVisible && 
                   iconData.iconBeforeText;
    
    return {
      itemName,
      itemType,
      iconFound: true,
      isSVG: iconData.isSVG,
      isVisible: iconData.isVisible,
      iconBeforeText: iconData.iconBeforeText,
      buttonText: iconData.buttonText,
      inViewport: iconData.inViewport,
      svgDimensions: `${iconData.svgWidth}x${iconData.svgHeight}`,
      passed
    };
    
  } catch (error) {
    console.log(`❌ Error verifying icon for "${itemName}": ${error.message}`);
    return {
      itemName,
      itemType,
      iconFound: false,
      isSVG: false,
      iconBeforeText: false,
      error: error.message,
      passed: false
    };
  }
}

async function scrollToElement(page, itemName) {
  try {
    await page.evaluate((name) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const targetButton = buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes(name) || name.includes(text.split(/\s+\d+$/)[0].trim());
      });
      
      if (targetButton) {
        targetButton.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }, itemName);
    
    await wait(400);
  } catch (error) {
    console.log(`   ⚠️  Could not scroll to "${itemName}": ${error.message}`);
  }
}

async function expandCategory(page, categoryName) {
  console.log(`   Attempting to expand: "${categoryName}"`);
  
  try {
    const expanded = await page.evaluate((catName) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Find the category button
      const categoryButton = buttons.find(btn => 
        btn.textContent.includes(catName)
      );
      
      if (!categoryButton) {
        return { success: false, error: 'Category button not found' };
      }
      
      // Check if already expanded by looking for rotated arrow
      const arrow = categoryButton.parentElement?.querySelector('[class*="rotate"]');
      const isExpanded = arrow && (
        arrow.classList.contains('rotate-90') ||
        arrow.style.transform.includes('rotate')
      );
      
      if (isExpanded) {
        return { success: true, alreadyExpanded: true };
      }
      
      // Find the expand button (the arrow button before the category name)
      const expandButton = categoryButton.parentElement?.querySelector('button[aria-label*="Expand"]');
      
      if (expandButton) {
        expandButton.click();
        return { success: true, clicked: true };
      }
      
      // Alternative: find button with arrow icon
      const container = categoryButton.closest('div');
      if (container) {
        const arrowButtons = container.querySelectorAll('button');
        for (const btn of arrowButtons) {
          if (btn.textContent.includes('▶')) {
            btn.click();
            return { success: true, clicked: true };
          }
        }
      }
      
      return { success: false, error: 'Expand button not found' };
    }, categoryName);
    
    if (expanded.success) {
      if (expanded.alreadyExpanded) {
        console.log(`   ✓ Already expanded`);
      } else {
        console.log(`   ✓ Expanded successfully`);
        await wait(800); // Wait for expansion animation and DOM updates
      }
      return true;
    } else {
      console.log(`   ⚠️  Could not expand: ${expanded.error}`);
      return false;
    }
  } catch (error) {
    console.log(`   ⚠️  Error during expansion: ${error.message}`);
    return false;
  }
}

async function testCategories(page) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🏷️  TESTING CATEGORIES (9 items)');
  console.log('═══════════════════════════════════════════════════════');
  
  const categories = [
    "Intro & Learning",
    "Protocols & Transport",
    "Encoding & Codecs",
    "Players & Clients",
    "Media Tools",
    "Standards & Industry",
    "Infrastructure & Delivery",
    "General Tools",
    "Community & Events",
  ];
  
  for (const categoryName of categories) {
    console.log(`\n📁 Testing category: "${categoryName}"`);
    
    // Scroll to element
    await scrollToElement(page, categoryName);
    
    // Verify icon
    const result = await findAndVerifyIcon(page, categoryName, 'category');
    
    // Take screenshot
    const screenshotPath = join(__dirname, '..', 'test-screenshots', 'icon-suite', `category-${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`);
    try {
      mkdirSync(dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath });
      result.screenshot = screenshotPath;
      console.log(`📸 Screenshot saved`);
    } catch (err) {
      console.log(`⚠️  Failed to save screenshot: ${err.message}`);
    }
    
    testResults.categories.push(result);
    testResults.summary.categoriesTested++;
    
    if (result.passed) {
      testResults.summary.passed++;
      testResults.summary.iconsFound++;
    } else {
      testResults.summary.failed++;
      testResults.summary.iconsMissing++;
      testResults.failures.push({
        item: categoryName,
        type: 'category',
        reason: result.error || 'Icon validation failed'
      });
    }
    
    await wait(200);
  }
}

async function testSubcategories(page) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🗂️  TESTING SUBCATEGORIES (19 items)');
  console.log('═══════════════════════════════════════════════════════');
  
  const subcategoryParents = {
    "Introduction": "Intro & Learning",
    "Learning Resources": "Intro & Learning",
    "Tutorials & Case Studies": "Intro & Learning",
    "Adaptive Streaming": "Protocols & Transport",
    "Transport Protocols": "Protocols & Transport",
    "Encoding Tools": "Encoding & Codecs",
    "Codecs": "Encoding & Codecs",
    "Hardware Players": "Players & Clients",
    "Mobile & Web Players": "Players & Clients",
    "Audio & Subtitles": "Media Tools",
    "Ads & QoE": "Media Tools",
    "Specs & Standards": "Standards & Industry",
    "Vendors & HDR": "Standards & Industry",
    "Streaming Servers": "Infrastructure & Delivery",
    "Cloud & CDN": "Infrastructure & Delivery",
    "FFMPEG & Tools": "General Tools",
    "DRM": "General Tools",
    "Community Groups": "Community & Events",
    "Events & Conferences": "Community & Events",
  };
  
  for (const [subcategoryName, parentCategory] of Object.entries(subcategoryParents)) {
    console.log(`\n📂 Testing subcategory: "${subcategoryName}"`);
    console.log(`   Parent: "${parentCategory}"`);
    
    // Expand parent category
    await expandCategory(page, parentCategory);
    
    // Scroll to subcategory
    await scrollToElement(page, subcategoryName);
    
    // Verify icon
    const result = await findAndVerifyIcon(page, subcategoryName, 'subcategory');
    
    // Take screenshot
    const screenshotPath = join(__dirname, '..', 'test-screenshots', 'icon-suite', `subcategory-${subcategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`);
    try {
      await page.screenshot({ path: screenshotPath });
      result.screenshot = screenshotPath;
      console.log(`📸 Screenshot saved`);
    } catch (err) {
      console.log(`⚠️  Failed to save screenshot: ${err.message}`);
    }
    
    testResults.subcategories.push(result);
    testResults.summary.subcategoriesTested++;
    
    if (result.passed) {
      testResults.summary.passed++;
      testResults.summary.iconsFound++;
    } else {
      testResults.summary.failed++;
      testResults.summary.iconsMissing++;
      testResults.failures.push({
        item: subcategoryName,
        type: 'subcategory',
        reason: result.error || 'Icon validation failed'
      });
    }
    
    await wait(200);
  }
}

async function testSubSubcategories(page) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📑 TESTING SUB-SUBCATEGORIES (32 items)');
  console.log('═══════════════════════════════════════════════════════');
  
  const subSubcategoryParents = {
    "HLS": { subcategory: "Adaptive Streaming", category: "Protocols & Transport" },
    "DASH": { subcategory: "Adaptive Streaming", category: "Protocols & Transport" },
    "RIST": { subcategory: "Transport Protocols", category: "Protocols & Transport" },
    "SRT": { subcategory: "Transport Protocols", category: "Protocols & Transport" },
    "RTMP": { subcategory: "Transport Protocols", category: "Protocols & Transport" },
    "FFMPEG": { subcategory: "Encoding Tools", category: "Encoding & Codecs" },
    "Other Encoders": { subcategory: "Encoding Tools", category: "Encoding & Codecs" },
    "HEVC": { subcategory: "Codecs", category: "Encoding & Codecs" },
    "VP9": { subcategory: "Codecs", category: "Encoding & Codecs" },
    "AV1": { subcategory: "Codecs", category: "Encoding & Codecs" },
    "Roku": { subcategory: "Hardware Players", category: "Players & Clients" },
    "Smart TVs": { subcategory: "Hardware Players", category: "Players & Clients" },
    "Chromecast": { subcategory: "Hardware Players", category: "Players & Clients" },
    "iOS/tvOS": { subcategory: "Mobile & Web Players", category: "Players & Clients" },
    "Android": { subcategory: "Mobile & Web Players", category: "Players & Clients" },
    "Web Players": { subcategory: "Mobile & Web Players", category: "Players & Clients" },
    "Audio": { subcategory: "Audio & Subtitles", category: "Media Tools" },
    "Subtitles & Captions": { subcategory: "Audio & Subtitles", category: "Media Tools" },
    "Advertising": { subcategory: "Ads & QoE", category: "Media Tools" },
    "Quality & Testing": { subcategory: "Ads & QoE", category: "Media Tools" },
    "Official Specs": { subcategory: "Specs & Standards", category: "Standards & Industry" },
    "MPEG & Forums": { subcategory: "Specs & Standards", category: "Standards & Industry" },
    "Vendor Docs": { subcategory: "Vendors & HDR", category: "Standards & Industry" },
    "HDR Guidelines": { subcategory: "Vendors & HDR", category: "Standards & Industry" },
    "Origin Servers": { subcategory: "Streaming Servers", category: "Infrastructure & Delivery" },
    "Storage Solutions": { subcategory: "Streaming Servers", category: "Infrastructure & Delivery" },
    "Cloud Platforms": { subcategory: "Cloud & CDN", category: "Infrastructure & Delivery" },
    "CDN Integration": { subcategory: "Cloud & CDN", category: "Infrastructure & Delivery" },
    "Online Forums": { subcategory: "Community Groups", category: "Community & Events" },
    "Slack & Meetups": { subcategory: "Community Groups", category: "Community & Events" },
    "Conferences": { subcategory: "Events & Conferences", category: "Community & Events" },
    "Podcasts & Webinars": { subcategory: "Events & Conferences", category: "Community & Events" },
  };
  
  for (const [subSubcategoryName, parents] of Object.entries(subSubcategoryParents)) {
    console.log(`\n📄 Testing sub-subcategory: "${subSubcategoryName}"`);
    console.log(`   Parent subcategory: "${parents.subcategory}"`);
    console.log(`   Parent category: "${parents.category}"`);
    
    // Expand category
    await expandCategory(page, parents.category);
    
    // Expand subcategory
    await expandCategory(page, parents.subcategory);
    
    // Scroll to sub-subcategory
    await scrollToElement(page, subSubcategoryName);
    
    // Verify icon
    const result = await findAndVerifyIcon(page, subSubcategoryName, 'sub-subcategory');
    
    // Take screenshot
    const screenshotPath = join(__dirname, '..', 'test-screenshots', 'icon-suite', `sub-subcategory-${subSubcategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`);
    try {
      await page.screenshot({ path: screenshotPath });
      result.screenshot = screenshotPath;
      console.log(`📸 Screenshot saved`);
    } catch (err) {
      console.log(`⚠️  Failed to save screenshot: ${err.message}`);
    }
    
    testResults.subSubcategories.push(result);
    testResults.summary.subSubcategoriesTested++;
    
    if (result.passed) {
      testResults.summary.passed++;
      testResults.summary.iconsFound++;
    } else {
      testResults.summary.failed++;
      testResults.summary.iconsMissing++;
      testResults.failures.push({
        item: subSubcategoryName,
        type: 'sub-subcategory',
        reason: result.error || 'Icon validation failed'
      });
    }
    
    await wait(200);
  }
}

async function main() {
  console.log('🚀 Starting Icon Visibility Test Suite');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📐 Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  
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
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    
    // Disable navigation to prevent page reloads
    await page.setRequestInterception(true);
    let initialUrl = null;
    page.on('request', request => {
      if (initialUrl && request.url() !== initialUrl && request.isNavigationRequest()) {
        console.log(`   ⚠️  Blocking navigation to: ${request.url()}`);
        request.abort();
      } else {
        request.continue();
      }
    });
    
    console.log('\n🌐 Navigating to homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    initialUrl = page.url();
    await wait(2000);
    
    // Take initial screenshot
    const initialScreenshotPath = join(__dirname, '..', 'test-screenshots', 'icon-suite', '00-homepage-initial.png');
    mkdirSync(dirname(initialScreenshotPath), { recursive: true });
    await page.screenshot({ path: initialScreenshotPath, fullPage: true });
    console.log(`📸 Initial screenshot saved`);
    
    // Run tests
    await testCategories(page);
    await testSubcategories(page);
    await testSubSubcategories(page);
    
    // Generate summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Items: ${testResults.summary.totalItems}`);
    console.log(`Categories Tested: ${testResults.summary.categoriesTested}/9`);
    console.log(`Subcategories Tested: ${testResults.summary.subcategoriesTested}/19`);
    console.log(`Sub-Subcategories Tested: ${testResults.summary.subSubcategoriesTested}/32`);
    console.log(`Icons Found: ${testResults.summary.iconsFound}`);
    console.log(`Icons Missing: ${testResults.summary.iconsMissing}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    
    if (testResults.failures.length > 0) {
      console.log('\n❌ FAILURES:');
      testResults.failures.forEach(failure => {
        console.log(`   - ${failure.type}: ${failure.item} - ${failure.reason}`);
      });
    }
    
    // Calculate final result
    const totalTested = testResults.summary.categoriesTested + 
                        testResults.summary.subcategoriesTested + 
                        testResults.summary.subSubcategoriesTested;
    
    testResults.summary.overallPass = testResults.summary.passed === totalTested && 
                                      testResults.summary.iconsMissing === 0;
    
    console.log(`\n${testResults.summary.overallPass ? '✅' : '❌'} Overall Result: ${testResults.summary.overallPass ? 'PASS' : 'FAIL'}`);
    console.log(`Success Rate: ${testResults.summary.passed}/${totalTested} (${((testResults.summary.passed/totalTested)*100).toFixed(1)}%)`);
    
    // Save JSON report
    const reportPath = join(__dirname, '..', 'test-results', 'icon-visibility-suite-report.json');
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n💾 Report saved: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    testResults.error = error.message;
    
    // Save error report
    const reportPath = join(__dirname, '..', 'test-results', 'icon-visibility-suite-report.json');
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
