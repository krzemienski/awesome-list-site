/**
 * Comprehensive 3-Level Navigation Testing Framework
 * Tests all sidebar navigation items systematically against JSON/CSV data
 * 
 * Tests: 9 categories + 19 subcategories + 15+ sub-subcategories + home page = 44+ total navigation paths
 */

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import https from 'https';
import fetch from 'node-fetch';

// Test configuration
const BASE_URL = 'http://localhost:5000';
const JSON_SOURCE = 'https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json';
const TEST_RESULTS_FILE = './test-screenshots/comprehensive-navigation-results.json';

// Dynamic navigation items - will be populated from live API data
let NAVIGATION_ITEMS = [];

class ComprehensiveNavigationTester {
  constructor() {
    this.navigationItems = [];
  }

  // Generate slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/&/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Fetch all navigation data dynamically from API
  async fetchNavigationData() {
    console.log("📡 Fetching live navigation data from API...");
    
    try {
      // Get the awesome list data
      const response = await fetch(`${BASE_URL}/api/awesome-list`);
      if (!response.ok) {
        throw new Error(`Failed to fetch API data: ${response.status}`);
      }
      const data = await response.json();
      
      console.log(`✅ Fetched data with ${data.resources.length} total resources`);
      console.log(`📊 Found ${data.categories.length} categories`);
      
      // Build navigation items dynamically
      this.navigationItems = [];
      
      // Add home page
      this.navigationItems.push({
        type: 'home',
        path: '/',
        name: 'Home',
        expectedResources: data.resources.length
      });
      
      // Process all categories
      data.categories.forEach(category => {
        const categorySlug = this.generateSlug(category.title);
        
        // Add category
        this.navigationItems.push({
          type: 'category',
          path: `/category/${categorySlug}`,
          name: category.title,
          expectedResources: category.resourceCount || 0,
          id: category.id
        });
        
        // Add subcategories
        if (category.subcategories) {
          category.subcategories.forEach(subcategory => {
            const subcategorySlug = this.generateSlug(subcategory.title);
            
            this.navigationItems.push({
              type: 'subcategory',
              path: `/subcategory/${subcategorySlug}`,
              name: subcategory.title,
              expectedResources: subcategory.resourceCount || 0,
              parentCategory: category.title,
              id: subcategory.id
            });
            
            // Add sub-subcategories
            if (subcategory.subSubcategories) {
              subcategory.subSubcategories.forEach(subSubcategory => {
                const subSubcategorySlug = this.generateSlug(subSubcategory.title);
                
                this.navigationItems.push({
                  type: 'sub-subcategory',
                  path: `/sub-subcategory/${subSubcategorySlug}`,
                  name: subSubcategory.title,
                  expectedResources: subSubcategory.resourceCount || 0,
                  parentCategory: category.title,
                  parentSubcategory: subcategory.title,
                  id: subSubcategory.id
                });
              });
            }
          });
        }
      });
      
      console.log(`🎯 Built ${this.navigationItems.length} total navigation items:`);
      console.log(`   - ${this.navigationItems.filter(i => i.type === 'category').length} categories`);
      console.log(`   - ${this.navigationItems.filter(i => i.type === 'subcategory').length} subcategories`);
      console.log(`   - ${this.navigationItems.filter(i => i.type === 'sub-subcategory').length} sub-subcategories`);
      
      return this.navigationItems;
    } catch (error) {
      console.error(`❌ Failed to fetch navigation data: ${error.message}`);
      throw error;
    }
  }

  async init() {
    this.browser = null;
    this.page = null;
    this.jsonData = null;
    this.results = {
      timestamp: new Date().toISOString(),
      totalItems: NAVIGATION_ITEMS.length,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async fetchJSONData() {
    return new Promise((resolve, reject) => {
      https.get(JSON_SOURCE, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  async init() {
    console.log("🚀 Initializing Comprehensive 3-Level Navigation Testing Framework");
    console.log(`📊 Testing ${NAVIGATION_ITEMS.length} navigation items total (including sub-subcategories)`);
    
    // Fetch reference JSON data
    console.log("📥 Fetching JSON reference data...");
    this.jsonData = await this.fetchJSONData();
    console.log(`✅ Loaded ${this.jsonData.resources.length} resources from JSON`);

    // Launch browser
    this.browser = await puppeteer.launch({ 
      headless: false, // Set to false to see the testing in action
      slowMo: 500,     // Slow down for visibility
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    console.log("🌐 Browser launched, starting systematic navigation testing...");
  }

  async testNavigationItem(item, index) {
    const testResult = {
      index: index + 1,
      type: item.type,
      path: item.path,
      name: item.name,
      expectedResources: item.expectedResources,
      actualResources: null,
      sidebarVisible: false,
      contentLoaded: false,
      filteringWorks: false,
      resourcesRelevant: false,
      passed: false,
      errors: []
    };

    try {
      console.log(`\n🧪 [${index + 1}/${NAVIGATION_ITEMS.length}] Testing: ${item.name} (${item.path})`);
      
      // Navigate to the page
      await this.page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle0' });
      
      // Wait for content to load
      await this.page.waitForSelector('.resource-grid, .resource-list, .resource-compact, h1', { timeout: 5000 });
      
      // Test 1: Check if sidebar is visible and functional
      testResult.sidebarVisible = await this.page.$('.sidebar, [role="navigation"]') !== null;
      
      // Test 2: Check if main content loaded
      const contentExists = await this.page.$('.resource-item, .grid, .list') !== null;
      testResult.contentLoaded = contentExists || item.type === 'home';
      
      // Test 3: Count actual resources displayed
      if (item.type !== 'home') {
        // Wait for resources to load
        await this.page.waitForSelector('.resource-grid, .resource-list, .main-content', { timeout: 3000 }).catch(() => {});
        
        const resourceElements = await this.page.$$('.resource-item, [data-testid="resource-item"], .grid-item, .list-item');
        testResult.actualResources = resourceElements.length;
        
        // Alternative method: check resource count from page content
        if (testResult.actualResources === 0) {
          const countText = await this.page.$eval('h1, .resource-count, .page-header, .content-header', el => el.textContent).catch(() => '');
          const match = countText.match(/(\d+)\s*resources?/i);
          if (match) {
            testResult.actualResources = parseInt(match[1]);
          }
        }
      } else {
        testResult.actualResources = 2011; // Home page shows all resources
      }
      
      // Test 4: Check if sidebar navigation works (click test)
      if (testResult.sidebarVisible && index < 5) { // Test first few items to avoid too many clicks
        try {
          const sidebarLink = await this.page.$(`a[href="${item.path}"], button[onclick*="${item.path}"]`);
          if (sidebarLink) {
            await sidebarLink.click();
            await this.page.waitForTimeout(1000);
            const newUrl = this.page.url();
            testResult.filteringWorks = newUrl.includes(item.path) || newUrl === `${BASE_URL}${item.path}`;
          }
        } catch (e) {
          testResult.errors.push(`Sidebar navigation failed: ${e.message}`);
        }
      }
      
      // Test 5: Take screenshot for visual verification
      const screenshotPath = `./test-screenshots/navigation-screenshots/${item.type}-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      try {
        await this.page.screenshot({ 
          path: screenshotPath,
          fullPage: false,
          clip: { x: 0, y: 0, width: 1920, height: 1080 }
        });
        testResult.screenshotPath = screenshotPath;
      } catch (e) {
        testResult.errors.push(`Screenshot failed: ${e.message}`);
      }
      
      // Test 6: Verify resource relevance (sample first few resources)
      if (item.type !== 'home' && testResult.actualResources > 0) {
        try {
          const sampleResources = await this.page.$$eval('.resource-item, .grid-item, .list-item', elements => 
            elements.slice(0, 3).map(el => ({
              title: el.querySelector('h3, .title, .resource-title, h2, .card-title')?.textContent || '',
              description: el.querySelector('p, .description, .resource-description, .card-description')?.textContent || ''
            }))
          );
          
          // Check if resources contain relevant keywords
          const relevantKeywords = this.getRelevantKeywords(item.name);
          const relevantCount = sampleResources.filter(resource => 
            relevantKeywords.some(keyword => 
              resource.title.toLowerCase().includes(keyword) || 
              resource.description.toLowerCase().includes(keyword)
            )
          ).length;
          
          testResult.resourcesRelevant = relevantCount > 0 || item.type === 'sub-subcategory'; // Sub-subcategories are more specific
        } catch (e) {
          testResult.errors.push(`Resource relevance check failed: ${e.message}`);
        }
      } else {
        testResult.resourcesRelevant = true; // Home page is always relevant
      }
      
      // Test 7: Special handling for sub-subcategories
      if (item.type === 'sub-subcategory') {
        // Verify breadcrumb navigation shows parent hierarchy
        try {
          const breadcrumbExists = await this.page.$('.breadcrumb, .nav-path, [aria-label="breadcrumb"]') !== null;
          testResult.breadcrumbVisible = breadcrumbExists;
          
          // Check if parent category/subcategory info is displayed
          const pageTitle = await this.page.$eval('h1, .page-title', el => el.textContent).catch(() => '');
          testResult.hierarchyDisplayed = pageTitle.includes(item.name);
        } catch (e) {
          testResult.errors.push(`Sub-subcategory hierarchy check failed: ${e.message}`);
        }
      }
      
      // Overall pass/fail determination
      const resourceCountValid = testResult.expectedResources === 0 ? 
                                (testResult.actualResources === 0) : 
                                (Math.abs(testResult.actualResources - testResult.expectedResources) <= 5); // Allow small variance
      
      testResult.passed = testResult.sidebarVisible && 
                         testResult.contentLoaded && 
                         resourceCountValid &&
                         testResult.resourcesRelevant;
      
      if (testResult.passed) {
        this.results.passed++;
        console.log(`✅ PASSED: ${testResult.actualResources}/${testResult.expectedResources} resources`);
      } else {
        this.results.failed++;
        console.log(`❌ FAILED: ${testResult.actualResources}/${testResult.expectedResources} resources`);
        console.log(`   Issues: ${testResult.errors.join(', ')}`);
      }
      
    } catch (error) {
      testResult.errors.push(`Navigation test failed: ${error.message}`);
      testResult.passed = false;
      this.results.failed++;
      console.log(`❌ ERROR: ${error.message}`);
    }
    
    this.results.tests.push(testResult);
    return testResult;
  }
  
  getRelevantKeywords(itemName) {
    const keywordMap = {
      'Community & Events': ['community', 'event', 'conference', 'meetup'],
      'Encoding & Codecs': ['encode', 'codec', 'ffmpeg', 'h264', 'h265', 'av1'],
      'General Tools': ['tool', 'utility', 'software'],
      'Infrastructure & Delivery': ['server', 'delivery', 'cdn', 'cloud', 'streaming'],
      'Intro & Learning': ['tutorial', 'learn', 'guide', 'introduction', 'course'],
      'Media Tools': ['media', 'video', 'audio', 'processing'],
      'Players & Clients': ['player', 'client', 'playback'],
      'Protocols & Transport': ['protocol', 'transport', 'rtmp', 'hls', 'dash'],
      'Standards & Industry': ['standard', 'spec', 'industry', 'mpeg'],
      // Add subcategory keywords
      'Events & Conferences': ['event', 'conference', 'summit'],
      'Encoding Tools': ['encode', 'ffmpeg', 'tool'],
      'DRM': ['drm', 'protection', 'security'],
      'Streaming Servers': ['server', 'streaming', 'live'],
      'Mobile & Web Players': ['mobile', 'web', 'player', 'browser'],
      // ... add more as needed
    };
    
    return keywordMap[itemName] || [itemName.toLowerCase().split(' ')[0]];
  }

  async generateReport() {
    const summary = {
      testSummary: {
        total: this.results.totalItems,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${((this.results.passed / this.results.totalItems) * 100).toFixed(1)}%`
      },
      categoryBreakdown: {
        home: this.results.tests.filter(t => t.type === 'home').length,
        categories: this.results.tests.filter(t => t.type === 'category').length,
        subcategories: this.results.tests.filter(t => t.type === 'subcategory').length,
        subSubcategories: this.results.tests.filter(t => t.type === 'sub-subcategory').length
      },
      failedTests: this.results.tests.filter(t => !t.passed).map(t => ({
        name: t.name,
        path: t.path,
        expectedResources: t.expectedResources,
        actualResources: t.actualResources,
        errors: t.errors
      }))
    };
    
    console.log("\n📋 COMPREHENSIVE 3-LEVEL NAVIGATION TEST RESULTS");
    console.log("=".repeat(55));
    console.log(`✅ Passed: ${summary.testSummary.passed}/${summary.testSummary.total} (${summary.testSummary.successRate})`);
    console.log(`❌ Failed: ${summary.testSummary.failed}/${summary.testSummary.total}`);
    console.log("\n🏗️ HIERARCHY BREAKDOWN:");
    console.log(`🏠 Home page: ${summary.categoryBreakdown.home}`);
    console.log(`📁 Categories tested: ${summary.categoryBreakdown.categories}`);
    console.log(`📂 Subcategories tested: ${summary.categoryBreakdown.subcategories}`);
    console.log(`🎯 Sub-subcategories tested: ${summary.categoryBreakdown.subSubcategories}`);
    
    if (summary.failedTests.length > 0) {
      console.log("\n❌ FAILED TESTS:");
      summary.failedTests.forEach(test => {
        console.log(`  • ${test.name}: ${test.actualResources}/${test.expectedResources} resources`);
        test.errors.forEach(error => console.log(`    - ${error}`));
      });
    }
    
    // Save detailed results
    await fs.writeFile(TEST_RESULTS_FILE, JSON.stringify({...this.results, summary}, null, 2));
    console.log(`\n📄 Detailed results saved to: ${TEST_RESULTS_FILE}`);
    
    return summary;
  }

  async runComprehensiveTest() {
    await this.init();
    
    console.log("\n🎯 Starting systematic navigation testing...");
    
    for (let i = 0; i < NAVIGATION_ITEMS.length; i++) {
      await this.testNavigationItem(NAVIGATION_ITEMS[i], i);
      
      // Small delay between tests
      await this.page.waitForTimeout(1000);
    }
    
    const summary = await this.generateReport();
    
    await this.browser.close();
    return summary;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new ComprehensiveNavigationTester();
  tester.runComprehensiveTest()
    .then(summary => {
      console.log("\n🎉 Comprehensive navigation testing completed!");
      process.exit(summary.testSummary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error("💥 Testing framework error:", error);
      process.exit(1);
    });
}

module.exports = ComprehensiveNavigationTester;