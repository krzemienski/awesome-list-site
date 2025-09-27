import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

// Expected counts
const EXPECTED_COUNTS = {
  total: 2011,
  categories: {
    'Intro & Learning': 229,
    'Protocols & Transport': 252,
    'Encoding & Codecs': 392,
    'Players & Clients': 269,
    'Media Tools': 317,
    'Standards & Industry': 174,
    'Infrastructure & Delivery': 190,
    'General Tools': 97,
    'Community & Events': 91
  }
};

class ComprehensiveUITester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async init() {
    console.log('🚀 Starting Comprehensive UI Tests...\n');
    
    // Create screenshot directory
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: DESKTOP_VIEWPORT
    });
    this.page = await this.browser.newPage();
    
    // Set up console log capture
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      }
    });
    
    // Handle page errors
    this.page.on('pageerror', error => {
      console.log('Page Error:', error.message);
    });
  }

  async addResult(testName, status, details = {}) {
    const result = {
      test: testName,
      status,
      ...details,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    this.results.summary.total++;
    
    if (status === 'passed') {
      this.results.summary.passed++;
      console.log(`✅ ${testName}`);
    } else if (status === 'failed') {
      this.results.summary.failed++;
      console.log(`❌ ${testName}:`, details.error || '');
    } else if (status === 'warning') {
      this.results.summary.warnings++;
      console.log(`⚠️  ${testName}:`, details.message || '');
    }
    
    if (details.details) {
      console.log(`   Details: ${JSON.stringify(details.details, null, 2)}`);
    }
  }

  async testHomepage() {
    console.log('\n📄 Testing Homepage...\n');
    
    try {
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(2000);
      
      // Test 1: Verify title
      const title = await this.page.$eval('h1', el => el.textContent.trim());
      if (title === 'Awesome Video Resources') {
        await this.addResult('Homepage Title', 'passed');
      } else {
        await this.addResult('Homepage Title', 'failed', { 
          error: `Expected "Awesome Video Resources", got "${title}"` 
        });
      }
      
      // Test 2: Verify resource count in subtitle
      const subtitle = await this.page.$eval('p.text-muted-foreground', el => el.textContent.trim());
      if (subtitle.includes('2,011') || subtitle.includes('2011')) {
        await this.addResult('Homepage Resource Count', 'passed', { 
          details: { subtitle } 
        });
      } else {
        await this.addResult('Homepage Resource Count', 'failed', { 
          error: `Count not found in subtitle: "${subtitle}"` 
        });
      }
      
      // Take desktop screenshot
      await this.page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, 'desktop-homepage.png'),
        fullPage: true 
      });
      await this.addResult('Desktop Homepage Screenshot', 'passed');
      
    } catch (error) {
      await this.addResult('Homepage Tests', 'failed', { 
        error: error.message 
      });
    }
  }

  async testSidebar() {
    console.log('\n📊 Testing Sidebar Categories...\n');
    
    try {
      // Check if sidebar exists
      const sidebar = await this.page.$('[data-sidebar="sidebar"]');
      if (!sidebar) {
        await this.addResult('Sidebar Exists', 'failed', { 
          error: 'Sidebar not found' 
        });
        return;
      }
      
      // Test category counts
      for (const [category, expectedCount] of Object.entries(EXPECTED_COUNTS.categories)) {
        const selector = `[data-sidebar="sidebar"] a[href^="/category/"]:has-text("${category}")`;
        
        try {
          // Find category link with count
          const categoryElement = await this.page.evaluateHandle((cat) => {
            const links = Array.from(document.querySelectorAll('[data-sidebar="sidebar"] a[href^="/category/"]'));
            return links.find(link => link.textContent.includes(cat));
          }, category);
          
          if (categoryElement && categoryElement.asElement()) {
            const text = await this.page.evaluate(el => el.textContent, categoryElement);
            
            // Check if count is present
            if (text.includes(expectedCount.toString())) {
              await this.addResult(`Sidebar Category: ${category}`, 'passed', {
                details: { text, expectedCount }
              });
            } else {
              await this.addResult(`Sidebar Category: ${category}`, 'failed', {
                error: `Expected count ${expectedCount}, got text: "${text}"`
              });
            }
          } else {
            await this.addResult(`Sidebar Category: ${category}`, 'failed', {
              error: 'Category not found in sidebar'
            });
          }
        } catch (error) {
          await this.addResult(`Sidebar Category: ${category}`, 'failed', {
            error: error.message
          });
        }
      }
      
    } catch (error) {
      await this.addResult('Sidebar Tests', 'failed', { 
        error: error.message 
      });
    }
  }

  async testCategoryExpansion() {
    console.log('\n🔽 Testing Category Expansion...\n');
    
    try {
      // Test expanding "Encoding & Codecs"
      const encodingLink = await this.page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('[data-sidebar="sidebar"] a'));
        return links.find(link => link.textContent.includes('Encoding & Codecs'));
      });
      
      if (encodingLink && encodingLink.asElement()) {
        // Find and click the expand button
        const expandButton = await this.page.evaluateHandle((el) => {
          const chevron = el.querySelector('[class*="chevron"], [class*="toggle"], svg');
          return chevron || el;
        }, encodingLink);
        
        await expandButton.click();
        await this.page.waitForTimeout(500);
        
        // Check for subcategories
        const subcategories = await this.page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('[data-sidebar="sidebar"] a[href^="/subcategory/"]'));
          return items.map(item => item.textContent.trim());
        });
        
        const hasEncodingTools = subcategories.some(s => s.includes('Encoding Tools'));
        const hasCodecs = subcategories.some(s => s.includes('Codecs'));
        
        if (hasEncodingTools && hasCodecs) {
          await this.addResult('Encoding & Codecs Expansion', 'passed', {
            details: { subcategories: subcategories.slice(0, 5) }
          });
          
          // Test expanding "Codecs"
          const codecsLink = await this.page.evaluateHandle(() => {
            const links = Array.from(document.querySelectorAll('[data-sidebar="sidebar"] a'));
            return links.find(link => link.textContent.match(/^Codecs\s+\d+$/));
          });
          
          if (codecsLink && codecsLink.asElement()) {
            const codecsExpandButton = await this.page.evaluateHandle((el) => {
              const chevron = el.querySelector('[class*="chevron"], [class*="toggle"], svg');
              return chevron || el;
            }, codecsLink);
            
            await codecsExpandButton.click();
            await this.page.waitForTimeout(500);
            
            // Check for codec types
            const codecTypes = await this.page.evaluate(() => {
              const items = Array.from(document.querySelectorAll('[data-sidebar="sidebar"] a[href^="/sub-subcategory/"]'));
              return items.map(item => item.textContent.trim());
            });
            
            const hasAV1 = codecTypes.some(c => c.includes('AV1'));
            const hasHEVC = codecTypes.some(c => c.includes('HEVC'));
            const hasVP9 = codecTypes.some(c => c.includes('VP9'));
            
            if (hasAV1 && hasHEVC && hasVP9) {
              await this.addResult('Codecs Sub-expansion', 'passed', {
                details: { codecTypes }
              });
            } else {
              await this.addResult('Codecs Sub-expansion', 'failed', {
                error: 'Missing codec types',
                details: { codecTypes, hasAV1, hasHEVC, hasVP9 }
              });
            }
          }
        } else {
          await this.addResult('Encoding & Codecs Expansion', 'failed', {
            error: 'Missing expected subcategories',
            details: { subcategories, hasEncodingTools, hasCodecs }
          });
        }
      } else {
        await this.addResult('Encoding & Codecs Expansion', 'failed', {
          error: 'Encoding & Codecs category not found'
        });
      }
      
    } catch (error) {
      await this.addResult('Category Expansion Tests', 'failed', { 
        error: error.message 
      });
    }
  }

  async testSearch() {
    console.log('\n🔍 Testing Search Functionality...\n');
    
    try {
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(1000);
      
      // Open search dialog (CMD+K or button)
      await this.page.keyboard.down('Meta');
      await this.page.keyboard.press('KeyK');
      await this.page.keyboard.up('Meta');
      await this.page.waitForTimeout(1000);
      
      // Check if dialog opened
      const searchDialog = await this.page.$('[role="dialog"]');
      if (searchDialog) {
        await this.addResult('Search Dialog Opens', 'passed');
        
        // Test search for "video"
        await this.page.type('input[type="text"]', 'video');
        await this.page.waitForTimeout(1000);
        
        const videoResults = await this.page.$$('[role="dialog"] [class*="hover:bg-accent"]');
        await this.addResult('Search: "video"', 'passed', {
          details: { resultCount: videoResults.length }
        });
        
        // Clear and search for "ffmpeg"
        await this.page.click('input[type="text"]', { clickCount: 3 });
        await this.page.keyboard.press('Backspace');
        await this.page.type('input[type="text"]', 'ffmpeg');
        await this.page.waitForTimeout(1000);
        
        const ffmpegResults = await this.page.$$('[role="dialog"] [class*="hover:bg-accent"]');
        const ffmpegCount = ffmpegResults.length;
        
        // Note: Results shown in dialog are limited, actual count might be higher
        await this.addResult('Search: "ffmpeg"', ffmpegCount > 0 ? 'passed' : 'failed', {
          details: { 
            shownResults: ffmpegCount,
            note: 'Dialog shows limited results'
          }
        });
        
        // Clear and search for "codec"
        await this.page.click('input[type="text"]', { clickCount: 3 });
        await this.page.keyboard.press('Backspace');
        await this.page.type('input[type="text"]', 'codec');
        await this.page.waitForTimeout(1000);
        
        const codecResults = await this.page.$$('[role="dialog"] [class*="hover:bg-accent"]');
        await this.addResult('Search: "codec"', 'passed', {
          details: { resultCount: codecResults.length }
        });
        
        // Close dialog
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
        
        const dialogClosed = await this.page.$('[role="dialog"]');
        await this.addResult('Search Dialog Closes', dialogClosed ? 'failed' : 'passed');
        
      } else {
        await this.addResult('Search Dialog Opens', 'failed', {
          error: 'Search dialog not found'
        });
      }
      
    } catch (error) {
      await this.addResult('Search Tests', 'failed', { 
        error: error.message 
      });
    }
  }

  async testCategoryPages() {
    console.log('\n📁 Testing Category Pages...\n');
    
    const categoryPaths = [
      { path: '/category/intro-learning', name: 'Intro & Learning', expectedCount: 229 },
      { path: '/category/protocols-transport', name: 'Protocols & Transport', expectedCount: 252 },
      { path: '/category/encoding-codecs', name: 'Encoding & Codecs', expectedCount: 392 },
      { path: '/category/players-clients', name: 'Players & Clients', expectedCount: 269 },
      { path: '/category/media-tools', name: 'Media Tools', expectedCount: 317 },
      { path: '/category/standards-industry', name: 'Standards & Industry', expectedCount: 174 },
      { path: '/category/infrastructure-delivery', name: 'Infrastructure & Delivery', expectedCount: 190 },
      { path: '/category/general-tools', name: 'General Tools', expectedCount: 97 },
      { path: '/category/community-events', name: 'Community & Events', expectedCount: 91 }
    ];
    
    for (const { path, name, expectedCount } of categoryPaths) {
      try {
        await this.page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle0' });
        await this.page.waitForTimeout(1000);
        
        // Check page title
        const pageTitle = await this.page.$eval('h1', el => el.textContent.trim()).catch(() => '');
        
        // Check resource count
        const subtitle = await this.page.$eval('.text-muted-foreground', el => el.textContent.trim()).catch(() => '');
        const hasExpectedCount = subtitle.includes(expectedCount.toString());
        
        // Count actual resource cards
        const resourceCards = await this.page.$$('[data-testid*="card"], .resource-card, article');
        
        if (hasExpectedCount) {
          await this.addResult(`Category Page: ${name}`, 'passed', {
            details: { 
              path, 
              title: pageTitle,
              expectedCount,
              visibleCards: resourceCards.length 
            }
          });
        } else {
          await this.addResult(`Category Page: ${name}`, 'failed', {
            error: `Expected count ${expectedCount} not found`,
            details: { 
              path, 
              subtitle,
              visibleCards: resourceCards.length
            }
          });
        }
        
      } catch (error) {
        await this.addResult(`Category Page: ${name}`, 'failed', {
          error: error.message
        });
      }
    }
  }

  async testVisualAnalysis() {
    console.log('\n📸 Performing Visual Analysis...\n');
    
    try {
      // Desktop Analysis
      await this.page.setViewport(DESKTOP_VIEWPORT);
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(2000);
      
      await this.page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, 'desktop-full.png'),
        fullPage: true 
      });
      
      // Check for text truncation
      const truncatedElements = await this.page.evaluate(() => {
        const elements = [];
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(el => {
          if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) {
            const styles = window.getComputedStyle(el);
            if (!styles.overflow || styles.overflow === 'visible') {
              elements.push({
                tag: el.tagName,
                class: el.className,
                text: el.textContent?.substring(0, 50)
              });
            }
          }
        });
        
        return elements.slice(0, 10); // Limit to first 10
      });
      
      if (truncatedElements.length > 0) {
        await this.addResult('Desktop Text Truncation', 'warning', {
          message: 'Some elements may have text overflow',
          details: { truncatedElements: truncatedElements.slice(0, 3) }
        });
      } else {
        await this.addResult('Desktop Text Truncation', 'passed');
      }
      
      // Check font sizes
      const fontSizes = await this.page.evaluate(() => {
        const texts = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
        const sizes = [];
        
        texts.forEach(el => {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          if (fontSize < 16 && el.textContent?.trim()) {
            sizes.push({
              tag: el.tagName,
              size: fontSize,
              text: el.textContent.substring(0, 30)
            });
          }
        });
        
        return sizes.slice(0, 10);
      });
      
      if (fontSizes.length > 0) {
        await this.addResult('Desktop Font Sizes', 'warning', {
          message: 'Some text is below 16px',
          details: { smallFonts: fontSizes.slice(0, 3) }
        });
      } else {
        await this.addResult('Desktop Font Sizes', 'passed');
      }
      
      // Mobile Analysis
      await this.page.setViewport(MOBILE_VIEWPORT);
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(2000);
      
      await this.page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, 'mobile-homepage.png'),
        fullPage: false 
      });
      
      // Check mobile font sizes
      const mobileFontSizes = await this.page.evaluate(() => {
        const texts = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
        const sizes = [];
        
        texts.forEach(el => {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          if (fontSize < 14 && el.textContent?.trim()) {
            sizes.push({
              tag: el.tagName,
              size: fontSize,
              text: el.textContent.substring(0, 30)
            });
          }
        });
        
        return sizes.slice(0, 10);
      });
      
      if (mobileFontSizes.length > 0) {
        await this.addResult('Mobile Font Sizes', 'warning', {
          message: 'Some text is below 14px',
          details: { smallFonts: mobileFontSizes.slice(0, 3) }
        });
      } else {
        await this.addResult('Mobile Font Sizes', 'passed');
      }
      
      await this.addResult('Visual Analysis Complete', 'passed');
      
    } catch (error) {
      await this.addResult('Visual Analysis', 'failed', {
        error: error.message
      });
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...\n');
    
    const report = {
      ...this.results,
      completedAt: new Date().toISOString(),
      duration: Date.now() - new Date(this.results.timestamp).getTime()
    };
    
    // Save JSON report
    await fs.writeFile(
      path.join(SCREENSHOT_DIR, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate markdown report
    const markdown = `# Comprehensive UI Test Report

## Summary
- **Total Tests:** ${report.summary.total}
- **Passed:** ${report.summary.passed} ✅
- **Failed:** ${report.summary.failed} ❌
- **Warnings:** ${report.summary.warnings} ⚠️
- **Success Rate:** ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%

## Test Results

${report.tests.map(test => {
  let icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
  let details = test.details ? `\n  - Details: ${JSON.stringify(test.details, null, 2).replace(/\n/g, '\n    ')}` : '';
  let error = test.error ? `\n  - Error: ${test.error}` : '';
  let message = test.message ? `\n  - Message: ${test.message}` : '';
  
  return `### ${icon} ${test.test}
  - Status: ${test.status}${details}${error}${message}`;
}).join('\n\n')}

## Screenshots
- Desktop Homepage: [desktop-homepage.png](desktop-homepage.png)
- Desktop Full Page: [desktop-full.png](desktop-full.png)
- Mobile Homepage: [mobile-homepage.png](mobile-homepage.png)

## Timestamp
- Started: ${report.timestamp}
- Completed: ${report.completedAt}
- Duration: ${(report.duration / 1000).toFixed(2)}s
`;
    
    await fs.writeFile(
      path.join(SCREENSHOT_DIR, 'TEST_REPORT.md'),
      markdown
    );
    
    console.log('\n📁 Report saved to test-screenshots/TEST_REPORT.md');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      
      // Run all test suites
      await this.testHomepage();
      await this.testSidebar();
      await this.testCategoryExpansion();
      await this.testSearch();
      await this.testCategoryPages();
      await this.testVisualAnalysis();
      
      // Generate report
      await this.generateReport();
      
      // Print summary
      console.log('\n' + '='.repeat(50));
      console.log('TEST SUMMARY');
      console.log('='.repeat(50));
      console.log(`Total Tests: ${this.results.summary.total}`);
      console.log(`✅ Passed: ${this.results.summary.passed}`);
      console.log(`❌ Failed: ${this.results.summary.failed}`);
      console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
      console.log(`Success Rate: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%`);
      console.log('='.repeat(50));
      
    } catch (error) {
      console.error('Fatal error:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests
async function main() {
  const tester = new ComprehensiveUITester();
  await tester.run();
}

main().catch(console.error);