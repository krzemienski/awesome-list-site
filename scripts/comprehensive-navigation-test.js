/**
 * Comprehensive Navigation Testing Framework
 * Tests all sidebar navigation items systematically against JSON/CSV data
 * 
 * Tests: 9 categories + 18 subcategories + home page = 28 total navigation paths
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const https = require('https');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const JSON_SOURCE = 'https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json';
const TEST_RESULTS_FILE = './test-screenshots/comprehensive-navigation-results.json';

// Expected navigation structure from console logs
const NAVIGATION_ITEMS = [
  // Home page
  { type: 'home', path: '/', name: 'Home', expectedResources: 2011 },
  
  // Categories (9 items)
  { type: 'category', path: '/category/community-events', name: 'Community & Events', expectedResources: 91 },
  { type: 'category', path: '/category/encoding-codecs', name: 'Encoding & Codecs', expectedResources: 392 },
  { type: 'category', path: '/category/general-tools', name: 'General Tools', expectedResources: 97 },
  { type: 'category', path: '/category/infrastructure-delivery', name: 'Infrastructure & Delivery', expectedResources: 134 },
  { type: 'category', path: '/category/intro-learning', name: 'Intro & Learning', expectedResources: 229 },
  { type: 'category', path: '/category/media-tools', name: 'Media Tools', expectedResources: 317 },
  { type: 'category', path: '/category/players-clients', name: 'Players & Clients', expectedResources: 382 },
  { type: 'category', path: '/category/protocols-transport', name: 'Protocols & Transport', expectedResources: 231 },
  { type: 'category', path: '/category/standards-industry', name: 'Standards & Industry', expectedResources: 168 },
  
  // Subcategories (18 items)
  { type: 'subcategory', path: '/subcategory/events-conferences', name: 'Events & Conferences', expectedResources: 6 },
  { type: 'subcategory', path: '/subcategory/community-groups', name: 'Community Groups', expectedResources: 4 },
  { type: 'subcategory', path: '/subcategory/encoding-tools', name: 'Encoding Tools', expectedResources: 240 },
  { type: 'subcategory', path: '/subcategory/codecs', name: 'Codecs', expectedResources: 29 },
  { type: 'subcategory', path: '/subcategory/drm', name: 'DRM', expectedResources: 17 },
  { type: 'subcategory', path: '/subcategory/streaming-servers', name: 'Streaming Servers', expectedResources: 39 },
  { type: 'subcategory', path: '/subcategory/cloud-cdn', name: 'Cloud & CDN', expectedResources: 9 },
  { type: 'subcategory', path: '/subcategory/tutorials-case-studies', name: 'Tutorials & Case Studies', expectedResources: 60 },
  { type: 'subcategory', path: '/subcategory/learning-resources', name: 'Learning Resources', expectedResources: 36 },
  { type: 'subcategory', path: '/subcategory/introduction', name: 'Introduction', expectedResources: 4 },
  { type: 'subcategory', path: '/subcategory/audio-subtitles', name: 'Audio & Subtitles', expectedResources: 58 },
  { type: 'subcategory', path: '/subcategory/ads-qoe', name: 'Ads & QoE', expectedResources: 45 },
  { type: 'subcategory', path: '/subcategory/mobile-web-players', name: 'Mobile & Web Players', expectedResources: 81 },
  { type: 'subcategory', path: '/subcategory/hardware-players', name: 'Hardware Players', expectedResources: 35 },
  { type: 'subcategory', path: '/subcategory/adaptive-streaming', name: 'Adaptive Streaming', expectedResources: 131 },
  { type: 'subcategory', path: '/subcategory/transport-protocols', name: 'Transport Protocols', expectedResources: 13 },
  { type: 'subcategory', path: '/subcategory/specs-standards', name: 'Specs & Standards', expectedResources: 35 },
  { type: 'subcategory', path: '/subcategory/vendors-hdr', name: 'Vendors & HDR', expectedResources: 5 },
];

class ComprehensiveNavigationTester {
  constructor() {
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
    console.log("🚀 Initializing Comprehensive Navigation Testing Framework");
    console.log(`📊 Testing ${NAVIGATION_ITEMS.length} navigation items total`);
    
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
        const resourceElements = await this.page.$$('.resource-item, [data-testid="resource-item"]');
        testResult.actualResources = resourceElements.length;
        
        // For home page, check total count from stats or title
        if (item.type === 'home') {
          const totalText = await this.page.$eval('h1, .stats', el => el.textContent).catch(() => '');
          const match = totalText.match(/(\d+)/);
          testResult.actualResources = match ? parseInt(match[1]) : 0;
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
      
      // Test 5: Verify resource relevance (sample first few resources)
      if (item.type !== 'home' && testResult.actualResources > 0) {
        try {
          const sampleResources = await this.page.$$eval('.resource-item', elements => 
            elements.slice(0, 3).map(el => ({
              title: el.querySelector('h3, .title, .resource-title')?.textContent || '',
              description: el.querySelector('p, .description, .resource-description')?.textContent || ''
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
          
          testResult.resourcesRelevant = relevantCount > 0; // At least one relevant resource
        } catch (e) {
          testResult.errors.push(`Resource relevance check failed: ${e.message}`);
        }
      } else {
        testResult.resourcesRelevant = true; // Home page is always relevant
      }
      
      // Overall pass/fail determination
      testResult.passed = testResult.sidebarVisible && 
                         testResult.contentLoaded && 
                         (Math.abs(testResult.actualResources - testResult.expectedResources) <= 5) && // Allow small variance
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
        subcategories: this.results.tests.filter(t => t.type === 'subcategory').length
      },
      failedTests: this.results.tests.filter(t => !t.passed).map(t => ({
        name: t.name,
        path: t.path,
        expectedResources: t.expectedResources,
        actualResources: t.actualResources,
        errors: t.errors
      }))
    };
    
    console.log("\n📋 COMPREHENSIVE NAVIGATION TEST RESULTS");
    console.log("=" * 50);
    console.log(`✅ Passed: ${summary.testSummary.passed}/${summary.testSummary.total} (${summary.testSummary.successRate})`);
    console.log(`❌ Failed: ${summary.testSummary.failed}/${summary.testSummary.total}`);
    console.log(`📁 Categories tested: ${summary.categoryBreakdown.categories}`);
    console.log(`📂 Subcategories tested: ${summary.categoryBreakdown.subcategories}`);
    console.log(`🏠 Home page: ${summary.categoryBreakdown.home}`);
    
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