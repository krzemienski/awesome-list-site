/**
 * Visual Navigation Testing with Screenshot Analysis
 * Captures and analyzes screenshots of all navigation paths
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = './test-screenshots/navigation-screenshots';

// Complete navigation structure for visual testing
const NAVIGATION_ITEMS = [
  { type: 'home', path: '/', name: 'Home', expected: 2011 },
  { type: 'category', path: '/category/community-events', name: 'Community & Events', expected: 91 },
  { type: 'category', path: '/category/encoding-codecs', name: 'Encoding & Codecs', expected: 392 },
  { type: 'category', path: '/category/general-tools', name: 'General Tools', expected: 97 },
  { type: 'category', path: '/category/infrastructure-delivery', name: 'Infrastructure & Delivery', expected: 134 },
  { type: 'category', path: '/category/intro-learning', name: 'Intro & Learning', expected: 229 },
  { type: 'category', path: '/category/media-tools', name: 'Media Tools', expected: 317 },
  { type: 'category', path: '/category/players-clients', name: 'Players & Clients', expected: 382 },
  { type: 'category', path: '/category/protocols-transport', name: 'Protocols & Transport', expected: 231 },
  { type: 'category', path: '/category/standards-industry', name: 'Standards & Industry', expected: 168 },
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

class VisualNavigationTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      totalItems: NAVIGATION_ITEMS.length,
      passed: 0,
      failed: 0,
      screenshots: [],
      visualAnalysis: []
    };
  }

  async init() {
    console.log("🚀 Visual Navigation Testing with Screenshot Analysis");
    console.log(`📊 Testing ${NAVIGATION_ITEMS.length} navigation items with visual verification`);
    
    // Create screenshots directory
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
    
    // Launch browser for visual testing
    this.browser = await puppeteer.launch({
      headless: false,
      slowMo: 200,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    console.log("🌐 Browser launched for visual testing");
  }

  async captureAndAnalyzeNavigation(item, index) {
    const testResult = {
      index: index + 1,
      type: item.type,
      path: item.path,
      name: item.name,
      expected: item.expected,
      screenshots: {
        desktop: null,
        mobile: null
      },
      visualElements: {
        sidebarVisible: false,
        contentLoaded: false,
        resourceCountDisplayed: false,
        navigationHighlighted: false,
        layoutWorking: false
      },
      analysis: {
        passed: false,
        issues: []
      }
    };

    try {
      console.log(`🖼️ [${index + 1}/28] Capturing: ${item.name} (${item.path})`);
      
      // Navigate to the page
      await this.page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(2000); // Allow content to fully load
      
      // Desktop screenshot
      const desktopFilename = `${String(index + 1).padStart(2, '0')}_${item.type}_${item.path.replace(/\//g, '_')}_desktop.png`;
      const desktopPath = path.join(SCREENSHOTS_DIR, desktopFilename);
      await this.page.screenshot({ 
        path: desktopPath, 
        fullPage: true,
        type: 'png'
      });
      testResult.screenshots.desktop = desktopFilename;
      
      // Visual analysis - desktop
      await this.analyzeVisualElements(testResult);
      
      // Mobile screenshot
      await this.page.setViewport({ width: 375, height: 667 });
      await this.page.waitForTimeout(1000);
      
      const mobileFilename = `${String(index + 1).padStart(2, '0')}_${item.type}_${item.path.replace(/\//g, '_')}_mobile.png`;
      const mobilePath = path.join(SCREENSHOTS_DIR, mobileFilename);
      await this.page.screenshot({ 
        path: mobilePath, 
        fullPage: true,
        type: 'png'
      });
      testResult.screenshots.mobile = mobileFilename;
      
      // Reset to desktop viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // Overall analysis
      const criticalElementsWorking = testResult.visualElements.sidebarVisible && 
                                    testResult.visualElements.contentLoaded;
      
      testResult.analysis.passed = criticalElementsWorking;
      
      if (testResult.analysis.passed) {
        this.results.passed++;
        console.log(`   ✅ VISUAL: Screenshots captured, elements verified`);
      } else {
        this.results.failed++;
        console.log(`   ❌ VISUAL: Issues detected - ${testResult.analysis.issues.join(', ')}`);
      }
      
    } catch (error) {
      testResult.analysis.issues.push(`Screenshot error: ${error.message}`);
      testResult.analysis.passed = false;
      this.results.failed++;
      console.log(`   💥 ERROR: ${error.message}`);
    }
    
    this.results.screenshots.push(testResult);
    return testResult;
  }

  async analyzeVisualElements(testResult) {
    try {
      // Check if sidebar is visible
      const sidebarExists = await this.page.$('.sidebar, nav, [role="navigation"]') !== null;
      testResult.visualElements.sidebarVisible = sidebarExists;
      
      if (!sidebarExists) {
        testResult.analysis.issues.push('Sidebar not visible');
      }

      // Check if main content loaded
      const contentElements = await this.page.$$('.resource-item, .grid, .list, h1, main');
      testResult.visualElements.contentLoaded = contentElements.length > 0;
      
      if (contentElements.length === 0) {
        testResult.analysis.issues.push('Main content not loaded');
      }

      // Check if resource count is displayed somewhere
      const pageText = await this.page.evaluate(() => document.body.textContent);
      const hasResourceCount = pageText.includes('resource') || pageText.includes('item') || pageText.includes(testResult.expected.toString());
      testResult.visualElements.resourceCountDisplayed = hasResourceCount;

      // Check for active navigation highlighting (looking for highlighted elements)
      const activeElements = await this.page.$$('.bg-accent, .active, [aria-current="page"]');
      testResult.visualElements.navigationHighlighted = activeElements.length > 0;

      // Check if layout controls are present
      const layoutControls = await this.page.$('button[title*="Grid"], button[title*="List"], .layout-toggle');
      testResult.visualElements.layoutWorking = layoutControls !== null;

      // Special checks for different page types
      if (testResult.type === 'home') {
        // Home page should show total resource count
        const hasTotalCount = pageText.includes('2011') || pageText.includes('2,011');
        if (!hasTotalCount) {
          testResult.analysis.issues.push('Total resource count not displayed on home page');
        }
      }

      // Check for hierarchical sidebar structure
      if (sidebarExists) {
        const expandableElements = await this.page.$$('button[aria-expanded], .expandable, .collapse');
        if (expandableElements.length > 0) {
          // Sidebar has hierarchical elements
          testResult.visualElements.sidebarVisible = true;
        }
      }

    } catch (error) {
      testResult.analysis.issues.push(`Visual analysis error: ${error.message}`);
    }
  }

  async testSidebarInteractions(sampleSize = 5) {
    console.log(`\n🖱️ Testing sidebar interactions (${sampleSize} samples)...`);
    
    const sidebarTests = [];
    
    for (let i = 0; i < Math.min(sampleSize, NAVIGATION_ITEMS.length); i++) {
      const item = NAVIGATION_ITEMS[i];
      
      try {
        await this.page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
        await this.page.waitForTimeout(1000);
        
        // Try to find and click the sidebar item
        const sidebarLink = await this.page.$(`a[href="${item.path}"]`);
        
        if (sidebarLink) {
          // Take a before screenshot
          const beforePath = path.join(SCREENSHOTS_DIR, `sidebar_interaction_${i+1}_before.png`);
          await this.page.screenshot({ path: beforePath, fullPage: false });
          
          // Click the sidebar link
          await sidebarLink.click();
          await this.page.waitForTimeout(2000);
          
          // Take an after screenshot
          const afterPath = path.join(SCREENSHOTS_DIR, `sidebar_interaction_${i+1}_after.png`);
          await this.page.screenshot({ path: afterPath, fullPage: false });
          
          // Verify navigation worked
          const currentUrl = this.page.url();
          const navigationWorked = currentUrl.includes(item.path);
          
          sidebarTests.push({
            item: item.name,
            path: item.path,
            navigationWorked,
            beforeScreenshot: `sidebar_interaction_${i+1}_before.png`,
            afterScreenshot: `sidebar_interaction_${i+1}_after.png`
          });
          
          console.log(`   ${navigationWorked ? '✅' : '❌'} Sidebar click: ${item.name}`);
        }
        
      } catch (error) {
        console.log(`   💥 Sidebar interaction error for ${item.name}: ${error.message}`);
        sidebarTests.push({
          item: item.name,
          path: item.path,
          navigationWorked: false,
          error: error.message
        });
      }
    }
    
    return sidebarTests;
  }

  async generateVisualReport() {
    console.log("\n📊 Generating comprehensive visual report...");
    
    const summary = {
      overview: {
        total: this.results.totalItems,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${((this.results.passed / this.results.totalItems) * 100).toFixed(1)}%`
      },
      screenshots: {
        desktop: this.results.screenshots.map(s => s.screenshots.desktop).filter(Boolean),
        mobile: this.results.screenshots.map(s => s.screenshots.mobile).filter(Boolean),
        total: this.results.screenshots.length * 2 // desktop + mobile
      },
      visualIssues: this.results.screenshots.filter(s => !s.analysis.passed),
      elementAnalysis: {
        sidebarVisible: this.results.screenshots.filter(s => s.visualElements.sidebarVisible).length,
        contentLoaded: this.results.screenshots.filter(s => s.visualElements.contentLoaded).length,
        resourceCountDisplayed: this.results.screenshots.filter(s => s.visualElements.resourceCountDisplayed).length,
        navigationHighlighted: this.results.screenshots.filter(s => s.visualElements.navigationHighlighted).length,
        layoutWorking: this.results.screenshots.filter(s => s.visualElements.layoutWorking).length
      }
    };

    // Generate HTML report
    const htmlReport = await this.generateHTMLReport(summary);
    await fs.writeFile('./test-screenshots/visual-navigation-report.html', htmlReport);
    
    console.log("\n📋 VISUAL NAVIGATION TEST RESULTS");
    console.log("=================================");
    console.log(`✅ Visual Tests Passed: ${summary.overview.passed}/${summary.overview.total} (${summary.overview.successRate})`);
    console.log(`❌ Visual Tests Failed: ${summary.overview.failed}/${summary.overview.total}`);
    console.log(`📸 Screenshots Captured: ${summary.screenshots.total} (${summary.screenshots.desktop.length} desktop + ${summary.screenshots.mobile.length} mobile)`);
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`🌐 Visual report: ./test-screenshots/visual-navigation-report.html`);
    
    if (summary.visualIssues.length > 0) {
      console.log("\n❌ VISUAL ISSUES DETECTED:");
      summary.visualIssues.forEach(issue => {
        console.log(`  • ${issue.name}: ${issue.analysis.issues.join(', ')}`);
      });
    }
    
    return summary;
  }

  async generateHTMLReport(summary) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Navigation Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .screenshot-item { border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .screenshot-item img { width: 100%; height: auto; border-radius: 4px; }
        .status-pass { color: #28a745; font-weight: bold; }
        .status-fail { color: #dc3545; font-weight: bold; }
        .navigation-item { margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖼️ Visual Navigation Test Report</h1>
            <p>Comprehensive screenshot analysis of all navigation paths</p>
            <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number ${summary.overview.passed === summary.overview.total ? 'status-pass' : 'status-fail'}">${summary.overview.successRate}</div>
                <div>Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.screenshots.total}</div>
                <div>Screenshots</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.elementAnalysis.sidebarVisible}</div>
                <div>Pages with Sidebar</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.elementAnalysis.contentLoaded}</div>
                <div>Pages with Content</div>
            </div>
        </div>

        <h2>📸 Navigation Screenshots</h2>
        <div class="screenshot-grid">
            ${this.results.screenshots.map(item => `
                <div class="screenshot-item">
                    <h3>${item.name}</h3>
                    <p><strong>Type:</strong> ${item.type} | <strong>Path:</strong> ${item.path}</p>
                    <p><strong>Status:</strong> <span class="${item.analysis.passed ? 'status-pass' : 'status-fail'}">${item.analysis.passed ? 'PASSED' : 'FAILED'}</span></p>
                    
                    <h4>Desktop View</h4>
                    <img src="navigation-screenshots/${item.screenshots.desktop}" alt="${item.name} Desktop" loading="lazy">
                    
                    <h4>Mobile View</h4>
                    <img src="navigation-screenshots/${item.screenshots.mobile}" alt="${item.name} Mobile" loading="lazy">
                    
                    <div class="navigation-item">
                        <strong>Visual Elements:</strong><br>
                        Sidebar: ${item.visualElements.sidebarVisible ? '✅' : '❌'}<br>
                        Content: ${item.visualElements.contentLoaded ? '✅' : '❌'}<br>
                        Count: ${item.visualElements.resourceCountDisplayed ? '✅' : '❌'}<br>
                        Navigation: ${item.visualElements.navigationHighlighted ? '✅' : '❌'}
                    </div>
                    
                    ${item.analysis.issues.length > 0 ? `
                        <div style="color: #dc3545; margin-top: 10px;">
                            <strong>Issues:</strong><br>
                            ${item.analysis.issues.map(issue => `• ${issue}`).join('<br>')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  async runVisualTest() {
    await this.init();
    
    console.log("\n🎯 Starting visual navigation testing with screenshots...");
    
    // Test all navigation items
    for (let i = 0; i < NAVIGATION_ITEMS.length; i++) {
      await this.captureAndAnalyzeNavigation(NAVIGATION_ITEMS[i], i);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    }
    
    // Test sidebar interactions
    const sidebarTests = await this.testSidebarInteractions(5);
    this.results.sidebarInteractions = sidebarTests;
    
    // Generate comprehensive report
    const summary = await this.generateVisualReport();
    
    // Save detailed results
    await fs.writeFile('./test-screenshots/visual-navigation-results.json', JSON.stringify(this.results, null, 2));
    
    await this.browser.close();
    
    return summary;
  }
}

// Run visual testing
const visualTester = new VisualNavigationTester();
visualTester.runVisualTest()
  .then(summary => {
    console.log("\n🎉 Visual navigation testing completed!");
    console.log(`📁 Check ./test-screenshots/visual-navigation-report.html for full report`);
    process.exit(summary.overview.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Visual testing error:", error);
    process.exit(1);
  });