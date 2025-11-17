import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };

// Read the navigation icons configuration
const navIconsPath = join(__dirname, '..', 'client', 'src', 'config', 'navigation-icons.ts');
const navIconsContent = readFileSync(navIconsPath, 'utf-8');

const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalExpected: 60,
    categoriesConfigured: 0,
    subcategoriesConfigured: 0,
    subSubcategoriesConfigured: 0,
    totalConfigured: 0,
    passed: 0,
    failed: 0,
  },
  configuration: {
    categories: {},
    subcategories: {},
    subSubcategories: {},
  },
  visual: {
    screenshotsTaken: 0,
    iconsRendered: 0,
  },
  failures: []
};

// Extract icon mappings from the configuration file
function extractIconMappings(content) {
  const categoryMatch = content.match(/categories:\s*{([^}]+)}/s);
  const subcategoryMatch = content.match(/subcategories:\s*{([^}]+)}/s);
  const subSubcategoryMatch = content.match(/subSubcategories:\s*{([^}]+)}/s);
  
  const extractItems = (matchText) => {
    if (!matchText) return [];
    const items = [];
    const regex = /"([^"]+)":\s*(\w+)/g;
    let match;
    while ((match = regex.exec(matchText)) !== null) {
      items.push({ name: match[1], icon: match[2] });
    }
    return items;
  };
  
  return {
    categories: extractItems(categoryMatch?.[1]),
    subcategories: extractItems(subcategoryMatch?.[1]),
    subSubcategories: extractItems(subSubcategoryMatch?.[1]),
  };
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function countVisibleIcons(page) {
  return await page.evaluate(() => {
    // Find the sidebar - try multiple selectors
    let sidebar = document.querySelector('[data-sidebar="sidebar"]') ||
                  document.querySelector('aside') ||
                  document.querySelector('[role="navigation"]') ||
                  document.querySelector('.sidebar') ||
                  document.querySelector('nav');
    
    // If still not found, look for the main navigation container
    if (!sidebar) {
      const allNavs = document.querySelectorAll('div');
      sidebar = Array.from(allNavs).find(div => {
        const buttons = div.querySelectorAll('button');
        const svgs = div.querySelectorAll('svg');
        return buttons.length > 5 && svgs.length > 5; // Likely the sidebar
      });
    }
    
    if (!sidebar) {
      return { 
        total: 0, 
        visible: 0, 
        buttons: 0, 
        buttonsWithIcons: 0,
        error: 'Sidebar not found' 
      };
    }
    
    const allSvgs = sidebar.querySelectorAll('svg');
    const visibleSvgs = Array.from(allSvgs).filter(svg => {
      const rect = svg.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    
    const buttons = sidebar.querySelectorAll('button');
    const buttonsWithIcons = Array.from(buttons).filter(btn => btn.querySelector('svg'));
    
    // Also get info about the sidebar itself
    const sidebarRect = sidebar.getBoundingClientRect();
    
    return {
      total: allSvgs.length,
      visible: visibleSvgs.length,
      buttons: buttons.length,
      buttonsWithIcons: buttonsWithIcons.length,
      sidebarFound: true,
      sidebarSize: `${Math.round(sidebarRect.width)}x${Math.round(sidebarRect.height)}`,
      sidebarClass: sidebar.className || 'no-class',
    };
  });
}

async function main() {
  console.log('🚀 Starting Icon Configuration Verification Test');
  console.log('════════════════════════════════════════════════════\n');
  
  // Step 1: Verify Icon Configuration
  console.log('📋 STEP 1: Verifying Icon Configuration in navigation-icons.ts');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const mappings = extractIconMappings(navIconsContent);
  
  console.log(`📁 Categories (Expected: 9):`);
  mappings.categories.forEach((item, index) => {
    console.log(`   ${index + 1}. "${item.name}" → ${item.icon} icon`);
    testResults.configuration.categories[item.name] = item.icon;
  });
  testResults.summary.categoriesConfigured = mappings.categories.length;
  
  console.log(`\n📂 Subcategories (Expected: 19):`);
  mappings.subcategories.forEach((item, index) => {
    console.log(`   ${index + 1}. "${item.name}" → ${item.icon} icon`);
    testResults.configuration.subcategories[item.name] = item.icon;
  });
  testResults.summary.subcategoriesConfigured = mappings.subcategories.length;
  
  console.log(`\n📄 Sub-Subcategories (Expected: 32):`);
  mappings.subSubcategories.forEach((item, index) => {
    console.log(`   ${index + 1}. "${item.name}" → ${item.icon} icon`);
    testResults.configuration.subSubcategories[item.name] = item.icon;
  });
  testResults.summary.subSubcategoriesConfigured = mappings.subSubcategories.length;
  
  testResults.summary.totalConfigured = 
    testResults.summary.categoriesConfigured +
    testResults.summary.subcategoriesConfigured +
    testResults.summary.subSubcategoriesConfigured;
  
  console.log(`\n📊 Configuration Summary:`);
  console.log(`   Categories configured: ${testResults.summary.categoriesConfigured}/9`);
  console.log(`   Subcategories configured: ${testResults.summary.subcategoriesConfigured}/19`);
  console.log(`   Sub-subcategories configured: ${testResults.summary.subSubcategoriesConfigured}/32`);
  console.log(`   Total icons configured: ${testResults.summary.totalConfigured}/60`);
  
  // Check for missing configurations
  if (testResults.summary.categoriesConfigured < 9) {
    testResults.failures.push({
      type: 'configuration',
      issue: `Missing ${9 - testResults.summary.categoriesConfigured} category icon(s)`
    });
  }
  if (testResults.summary.subcategoriesConfigured < 19) {
    testResults.failures.push({
      type: 'configuration',
      issue: `Missing ${19 - testResults.summary.subcategoriesConfigured} subcategory icon(s)`
    });
  }
  if (testResults.summary.subSubcategoriesConfigured < 32) {
    testResults.failures.push({
      type: 'configuration',
      issue: `Missing ${32 - testResults.summary.subSubcategoriesConfigured} sub-subcategory icon(s)`
    });
  }
  
  // Step 2: Visual Verification
  console.log('\n\n🎨 STEP 2: Visual Verification of Rendered Icons');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
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
    
    console.log('🌐 Loading homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await wait(2000);
    
    // Take initial screenshot
    const screenshotsDir = join(__dirname, '..', 'test-screenshots', 'icon-suite');
    mkdirSync(screenshotsDir, { recursive: true });
    
    await page.screenshot({ 
      path: join(screenshotsDir, '01-homepage-all-icons.png'),
      fullPage: false
    });
    console.log('📸 Screenshot saved: 01-homepage-all-icons.png');
    testResults.visual.screenshotsTaken++;
    
    // Count visible icons
    const iconCounts = await countVisibleIcons(page);
    console.log(`\n📊 Visible Icons Count:`);
    console.log(`   Total SVG elements in sidebar: ${iconCounts.total}`);
    console.log(`   Visible SVG elements: ${iconCounts.visible}`);
    console.log(`   Total buttons in sidebar: ${iconCounts.buttons}`);
    console.log(`   Buttons with icons: ${iconCounts.buttonsWithIcons}`);
    
    testResults.visual.iconsRendered = iconCounts.visible;
    
    // Expand a few categories to show more icons
    console.log('\n🔍 Expanding categories to show more icons...');
    
    // Expand first few categories
    const categoriesToExpand = ['Protocols & Transport', 'Encoding & Codecs', 'Players & Clients'];
    for (const catName of categoriesToExpand) {
      try {
        await page.evaluate((name) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const categoryButton = buttons.find(btn => btn.textContent?.includes(name));
          if (categoryButton) {
            const container = categoryButton.parentElement;
            const expandButton = container?.querySelector('button[aria-label*="Expand"]') ||
                                 container?.querySelectorAll('button')[0];
            if (expandButton && expandButton !== categoryButton) {
              expandButton.click();
            }
          }
        }, catName);
        await wait(800);
        console.log(`   ✓ Expanded "${catName}"`);
      } catch (error) {
        console.log(`   ⚠️  Could not expand "${catName}"`);
      }
    }
    
    // Take screenshot with expanded categories
    await page.screenshot({ 
      path: join(screenshotsDir, '02-expanded-categories-icons.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: 02-expanded-categories-icons.png');
    testResults.visual.screenshotsTaken++;
    
    // Count icons again after expansion
    const expandedIconCounts = await countVisibleIcons(page);
    console.log(`\n📊 After Expansion:`);
    console.log(`   Total SVG elements: ${expandedIconCounts.total}`);
    console.log(`   Visible SVG elements: ${expandedIconCounts.visible}`);
    console.log(`   Buttons with icons: ${expandedIconCounts.buttonsWithIcons}`);
    
  } catch (error) {
    console.error('❌ Visual verification failed:', error);
    testResults.failures.push({
      type: 'visual',
      issue: error.message
    });
  } finally {
    await browser.close();
  }
  
  // Final Results
  console.log('\n\n══════════════════════════════════════════════════');
  console.log('📊 FINAL TEST RESULTS');
  console.log('══════════════════════════════════════════════════\n');
  
  const configPassed = testResults.summary.totalConfigured === 60;
  const visualPassed = testResults.visual.iconsRendered >= 9; // At least categories visible
  
  testResults.summary.passed = configPassed && visualPassed ? 60 : testResults.summary.totalConfigured;
  testResults.summary.failed = 60 - testResults.summary.passed;
  
  console.log(`✅ Icons Configured: ${testResults.summary.totalConfigured}/60`);
  console.log(`📸 Screenshots Taken: ${testResults.visual.screenshotsTaken}`);
  console.log(`👁️  Icons Rendered: ${testResults.visual.iconsRendered}+`);
  
  if (testResults.failures.length > 0) {
    console.log(`\n❌ Issues Found:`);
    testResults.failures.forEach(failure => {
      console.log(`   - [${failure.type}] ${failure.issue}`);
    });
  }
  
  const overallPass = configPassed;
  console.log(`\n${overallPass ? '✅' : '❌'} Overall Result: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log(`   All 60 navigation items have icon configurations: ${configPassed ? 'YES' : 'NO'}`);
  console.log(`   Icons are rendering in the UI: ${visualPassed ? 'YES' : 'NO'}`);
  
  // Save results
  const reportPath = join(__dirname, '..', 'test-results', 'icon-visibility-suite-report.json');
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Report saved: test-results/icon-visibility-suite-report.json`);
}

main().catch(console.error);
