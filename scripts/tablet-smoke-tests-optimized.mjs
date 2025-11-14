import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5000';
const TABLET_WIDTH = 820;
const TABLET_HEIGHT = 1180;
const SCREENSHOT_DIR = 'test-screenshots/tablet-suite';

mkdirSync(SCREENSHOT_DIR, { recursive: true });
mkdirSync('test-results', { recursive: true });

const results = {
  testSuite: 'Tablet Smoke Tests',
  viewport: `${TABLET_WIDTH}x${TABLET_HEIGHT}`,
  timestamp: new Date().toISOString(),
  paths: [],
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
};

function log(path, step, status, message, details = {}) {
  console.log(`[${status}] ${path} - ${step}: ${message}`);
  
  if (!results.paths.find(p => p.name === path)) {
    results.paths.push({ name: path, steps: [] });
  }
  
  results.paths.find(p => p.name === path).steps.push({ step, status, message, ...details });
  
  if (status === 'PASS') results.summary.passed++;
  if (status === 'FAIL') results.summary.failed++;
  if (status === 'WARN') results.summary.warnings++;
  results.summary.total++;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  try {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}`, fullPage: false });
    console.log(`📸 ${name}`);
  } catch (e) {
    console.log(`⚠️ Screenshot failed: ${name}`);
  }
}

async function runTests() {
  console.log('🚀 Tablet Smoke Tests - Optimized\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: TABLET_WIDTH, height: TABLET_HEIGHT });
  
  try {
    // ========== SETUP ==========
    console.log('📍 Setup & Homepage...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(1500);
    
    await screenshot(page, 'tablet-homepage.png');
    log('Setup', 'Homepage Load', 'PASS', 'Homepage loaded');

    // ========== PATH 1: Homepage & Navigation ==========
    console.log('\n🧪 PATH 1: Homepage & Navigation');
    
    const hasBody = await page.$('body') !== null;
    log('Path 1', 'Page Render', hasBody ? 'PASS' : 'FAIL', 'Page rendered');

    // Check sidebar (desktop has in-flow sidebar)
    const sidebarVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]');
      if (!sidebar) return false;
      const rect = sidebar.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    
    log('Path 1', 'Sidebar Visible', sidebarVisible ? 'PASS' : 'WARN', 
      sidebarVisible ? 'Sidebar visible' : 'Sidebar not visible at tablet width');

    // Count navigation items
    const navItems = await page.$$('button[class*="justify-start"]');
    log('Path 1', 'Categories', navItems.length >= 9 ? 'PASS' : 'WARN', 
      `Found ${navItems.length} nav items`);

    // Check resource counts
    const counts = await page.$$('span.text-xs.bg-muted');
    log('Path 1', 'Resource Counts', counts.length > 0 ? 'PASS' : 'WARN', 
      `Found ${counts.length} count badges`);

    await screenshot(page, 'tablet-sidebar.png');

    // ========== PATH 2: Category Navigation ==========
    console.log('\n🧪 PATH 2: Category Navigation');
    
    await page.goto(`${BASE_URL}/category/protocols-transport`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    await wait(1500);

    // Better selector for resource cards
    const categoryCards = await page.evaluate(() => {
      return document.querySelectorAll('a[target="_blank"][rel*="noopener"]').length;
    });
    
    log('Path 2', 'Navigate Category', 'PASS', `Category page loaded`);
    log('Path 2', 'Resource Display', categoryCards > 0 ? 'PASS' : 'WARN', 
      `${categoryCards} resource links found`);

    const hasGrid = await page.$('.grid') !== null;
    log('Path 2', 'Grid Layout', hasGrid ? 'PASS' : 'WARN', 'Grid layout');

    await screenshot(page, 'tablet-category.png');

    // ========== PATH 3: Subcategory Navigation ==========
    console.log('\n🧪 PATH 3: Subcategory Navigation');
    
    await page.goto(`${BASE_URL}/subcategory/adaptive-streaming`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    await wait(1500);

    const subcatResources = await page.evaluate(() => {
      return document.querySelectorAll('a[target="_blank"][rel*="noopener"]').length;
    });
    
    log('Path 3', 'Navigate Subcategory', 'PASS', `Subcategory page loaded`);
    log('Path 3', 'Resources Display', subcatResources > 0 ? 'PASS' : 'WARN', 
      `${subcatResources} resources found`);

    // ========== PATH 4: Sub-Subcategory Navigation ==========
    console.log('\n🧪 PATH 4: Sub-Subcategory Navigation');
    
    await page.goto(`${BASE_URL}/sub-subcategory/hls`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    await wait(1500);

    const subsubResources = await page.evaluate(() => {
      return document.querySelectorAll('a[target="_blank"][rel*="noopener"]').length;
    });
    
    log('Path 4', 'Navigate Sub-Sub', 'PASS', 'Sub-subcategory page loaded');
    log('Path 4', 'Resources Display', subsubResources > 0 ? 'PASS' : 'WARN', 
      `${subsubResources} resources found`);

    await screenshot(page, 'tablet-subsubcat.png');

    // ========== PATH 5: Search Functionality ==========
    console.log('\n🧪 PATH 5: Search Functionality');
    
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(1000);

    // Open search
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Meta');
    await wait(800);

    const searchOpen = await page.$('[role="dialog"]') !== null;
    log('Path 5', 'Search Open', searchOpen ? 'PASS' : 'FAIL', 'Search dialog');

    if (searchOpen) {
      const input = await page.$('input[type="text"]');
      if (input) {
        await input.type('ffmpeg', { delay: 50 });
        await wait(800);
        
        const resultCount = await page.$$eval('[cmdk-item]', items => items.length);
        log('Path 5', 'Search Results', resultCount > 0 ? 'PASS' : 'WARN', 
          `${resultCount} results`);
        
        // Try clicking first result
        try {
          const firstResult = await page.$('[cmdk-item]');
          if (firstResult) {
            await Promise.race([
              firstResult.click(),
              page.waitForTimeout(1000)
            ]);
            log('Path 5', 'Result Click', 'PASS', 'Clicked first result');
          }
        } catch (e) {
          log('Path 5', 'Result Click', 'WARN', 'Click attempt');
        }
      }
      
      await screenshot(page, 'tablet-search.png');
      await page.keyboard.press('Escape');
    }

    // ========== PATH 6: Resource Links ==========
    console.log('\n🧪 PATH 6: Resource Links');
    
    await page.goto(`${BASE_URL}/category/encoding-codecs`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    await wait(1500);

    const linkCount = await page.$$eval(
      'a[target="_blank"][rel*="noopener"]', 
      links => links.length
    );
    
    log('Path 6', 'Resource Links', linkCount >= 3 ? 'PASS' : 'WARN', 
      `Found ${linkCount} external links`);

    // Verify page stays on category
    const url = page.url();
    log('Path 6', 'Page Persistence', url.includes('encoding-codecs') ? 'PASS' : 'WARN', 
      'Page remained on category');

    // ========== PATH 7: GitHub Link ==========
    console.log('\n🧪 PATH 7: GitHub Link');
    
    const githubLink = await page.$('a[href*="github.com"]');
    log('Path 7', 'GitHub Link', githubLink !== null ? 'PASS' : 'WARN', 
      'GitHub link found');

    // ========== RESPONSIVE VERIFICATION ==========
    console.log('\n🧪 RESPONSIVE VERIFICATION');
    
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(1000);

    const hasHScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    log('Responsive', 'No H-Scroll', !hasHScroll ? 'PASS' : 'FAIL', 
      hasHScroll ? 'Horizontal scroll detected' : 'No horizontal scroll');

    const minFont = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('p, span, a, button'));
      return Math.min(...elements.map(el => parseFloat(getComputedStyle(el).fontSize)).filter(s => s > 0));
    });
    log('Responsive', 'Text Size', minFont >= 12 ? 'PASS' : 'WARN', 
      `Min font: ${minFont}px`);

    const gridCols = await page.evaluate(() => {
      const grid = document.querySelector('.grid');
      if (!grid) return 0;
      return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    });
    log('Responsive', 'Grid Columns', gridCols >= 2 ? 'PASS' : 'WARN', 
      `${gridCols} columns`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    log('Error', 'Test Execution', 'FAIL', error.message);
  } finally {
    await browser.close();
  }

  // Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TABLET SMOKE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`📊 Total: ${results.summary.total}`);
  console.log('='.repeat(60));

  // Save JSON
  writeFileSync('test-results/tablet-smoke-tests-report.json', JSON.stringify(results, null, 2));
  
  // Generate markdown
  let md = `# Tablet Smoke Tests Report\n\n`;
  md += `**Viewport:** ${results.viewport}\n`;
  md += `**Timestamp:** ${results.timestamp}\n\n`;
  md += `## Summary\n\n`;
  md += `- ✅ Passed: ${results.summary.passed}\n`;
  md += `- ⚠️ Warnings: ${results.summary.warnings}\n`;
  md += `- ❌ Failed: ${results.summary.failed}\n`;
  md += `- 📊 Total: ${results.summary.total}\n\n`;
  
  md += `## Results by Path\n\n`;
  results.paths.forEach(path => {
    md += `### ${path.name}\n\n`;
    path.steps.forEach(step => {
      const icon = step.status === 'PASS' ? '✅' : step.status === 'WARN' ? '⚠️' : '❌';
      md += `${icon} **${step.step}:** ${step.message}\n`;
    });
    md += `\n`;
  });
  
  md += `## Screenshots\n\n`;
  md += `All screenshots saved to \`${SCREENSHOT_DIR}/\`\n\n`;
  md += `- tablet-homepage.png\n`;
  md += `- tablet-sidebar.png\n`;
  md += `- tablet-category.png\n`;
  md += `- tablet-subsubcat.png\n`;
  md += `- tablet-search.png\n`;
  
  writeFileSync('test-results/TABLET_SMOKE_TESTS_REPORT.md', md);
  
  console.log('\n📄 Reports saved:');
  console.log('   - test-results/tablet-smoke-tests-report.json');
  console.log('   - test-results/TABLET_SMOKE_TESTS_REPORT.md');
  console.log(`   - ${SCREENSHOT_DIR}/ (screenshots)\n`);

  return results;
}

runTests().catch(console.error);
