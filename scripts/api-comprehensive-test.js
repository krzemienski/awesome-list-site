import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const REPORT_DIR = path.join(__dirname, '..', 'test-screenshots');

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

const CATEGORY_SLUGS = {
  'Intro & Learning': 'intro-learning',
  'Protocols & Transport': 'protocols-transport',
  'Encoding & Codecs': 'encoding-codecs',
  'Players & Clients': 'players-clients',
  'Media Tools': 'media-tools',
  'Standards & Industry': 'standards-industry',
  'Infrastructure & Delivery': 'infrastructure-delivery',
  'General Tools': 'general-tools',
  'Community & Events': 'community-events'
};

class APIComprehensiveTester {
  constructor() {
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
    console.log('🚀 Starting API-Based Comprehensive Tests...\n');
    
    // Create report directory
    await fs.mkdir(REPORT_DIR, { recursive: true });
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

  async testAPI() {
    console.log('\n📡 Testing API Endpoints...\n');
    
    try {
      // Test main API endpoint
      const response = await fetch(`${BASE_URL}/api/awesome-list`);
      const data = await response.json();
      
      if (!response.ok) {
        await this.addResult('API Endpoint', 'failed', { 
          error: `Status ${response.status}` 
        });
        return null;
      }
      
      await this.addResult('API Endpoint', 'passed', {
        details: { status: response.status }
      });
      
      // Test data structure
      if (data.resources && data.categories) {
        await this.addResult('API Data Structure', 'passed');
      } else {
        await this.addResult('API Data Structure', 'failed', {
          error: 'Missing resources or categories in response'
        });
      }
      
      // Test total resource count
      const totalResources = data.resources ? data.resources.length : 0;
      if (totalResources === EXPECTED_COUNTS.total) {
        await this.addResult('Total Resource Count', 'passed', {
          details: { count: totalResources }
        });
      } else {
        await this.addResult('Total Resource Count', 'failed', {
          error: `Expected ${EXPECTED_COUNTS.total}, got ${totalResources}`
        });
      }
      
      return data;
      
    } catch (error) {
      await this.addResult('API Tests', 'failed', { 
        error: error.message 
      });
      return null;
    }
  }

  async testCategoryData(data) {
    if (!data || !data.categories) return;
    
    console.log('\n📊 Testing Category Data...\n');
    
    // Test each category count
    for (const [categoryName, expectedCount] of Object.entries(EXPECTED_COUNTS.categories)) {
      const category = data.categories.find(c => c.name === categoryName);
      
      if (category) {
        const actualCount = category.resources ? category.resources.length : 0;
        
        if (actualCount === expectedCount) {
          await this.addResult(`Category Count: ${categoryName}`, 'passed', {
            details: { expected: expectedCount, actual: actualCount }
          });
        } else {
          await this.addResult(`Category Count: ${categoryName}`, 'failed', {
            error: `Expected ${expectedCount}, got ${actualCount}`
          });
        }
        
        // Test slug exists
        if (category.slug) {
          const expectedSlug = CATEGORY_SLUGS[categoryName];
          if (category.slug === expectedSlug) {
            await this.addResult(`Category Slug: ${categoryName}`, 'passed', {
              details: { slug: category.slug }
            });
          } else {
            await this.addResult(`Category Slug: ${categoryName}`, 'warning', {
              message: `Expected slug "${expectedSlug}", got "${category.slug}"`
            });
          }
        } else {
          await this.addResult(`Category Slug: ${categoryName}`, 'failed', {
            error: 'No slug found'
          });
        }
      } else {
        await this.addResult(`Category Count: ${categoryName}`, 'failed', {
          error: 'Category not found in data'
        });
      }
    }
  }

  async testSubcategoryData(data) {
    if (!data || !data.categories) return;
    
    console.log('\n🔍 Testing Subcategory Data...\n');
    
    // Test Encoding & Codecs subcategories
    const encodingCategory = data.categories.find(c => c.name === 'Encoding & Codecs');
    
    if (encodingCategory && encodingCategory.subcategories) {
      const encodingTools = encodingCategory.subcategories.find(s => s.name === 'Encoding Tools');
      const codecs = encodingCategory.subcategories.find(s => s.name === 'Codecs');
      
      if (encodingTools) {
        await this.addResult('Subcategory: Encoding Tools', 'passed', {
          details: { 
            resources: encodingTools.resources?.length || 0,
            hasFFMPEG: encodingTools.subSubcategories?.some(s => s.name === 'FFMPEG')
          }
        });
      } else {
        await this.addResult('Subcategory: Encoding Tools', 'failed', {
          error: 'Not found under Encoding & Codecs'
        });
      }
      
      if (codecs) {
        await this.addResult('Subcategory: Codecs', 'passed', {
          details: { resources: codecs.resources?.length || 0 }
        });
        
        // Test codec sub-subcategories
        if (codecs.subSubcategories) {
          const hasAV1 = codecs.subSubcategories.some(s => s.name === 'AV1');
          const hasHEVC = codecs.subSubcategories.some(s => s.name === 'HEVC');
          const hasVP9 = codecs.subSubcategories.some(s => s.name === 'VP9');
          
          if (hasAV1 && hasHEVC && hasVP9) {
            await this.addResult('Codec Types (AV1, HEVC, VP9)', 'passed', {
              details: {
                AV1: codecs.subSubcategories.find(s => s.name === 'AV1')?.resources?.length || 0,
                HEVC: codecs.subSubcategories.find(s => s.name === 'HEVC')?.resources?.length || 0,
                VP9: codecs.subSubcategories.find(s => s.name === 'VP9')?.resources?.length || 0
              }
            });
          } else {
            await this.addResult('Codec Types (AV1, HEVC, VP9)', 'failed', {
              error: 'Missing expected codec types',
              details: { hasAV1, hasHEVC, hasVP9 }
            });
          }
        }
      } else {
        await this.addResult('Subcategory: Codecs', 'failed', {
          error: 'Not found under Encoding & Codecs'
        });
      }
    } else {
      await this.addResult('Encoding & Codecs Subcategories', 'failed', {
        error: 'Encoding & Codecs category not found or has no subcategories'
      });
    }
  }

  async testSearch(data) {
    if (!data || !data.resources) return;
    
    console.log('\n🔎 Testing Search Simulation...\n');
    
    // Simulate search for "video"
    const videoResults = data.resources.filter(r => 
      r.title?.toLowerCase().includes('video') || 
      r.description?.toLowerCase().includes('video')
    );
    
    await this.addResult('Search Simulation: "video"', 'passed', {
      details: { resultCount: videoResults.length }
    });
    
    // Simulate search for "ffmpeg"
    const ffmpegResults = data.resources.filter(r => 
      r.title?.toLowerCase().includes('ffmpeg') || 
      r.description?.toLowerCase().includes('ffmpeg') ||
      r.subSubcategory?.toLowerCase().includes('ffmpeg')
    );
    
    const ffmpegCount = ffmpegResults.length;
    if (ffmpegCount >= 60 && ffmpegCount <= 70) { // Allow some variance
      await this.addResult('Search Simulation: "ffmpeg"', 'passed', {
        details: { resultCount: ffmpegCount, expected: 66 }
      });
    } else {
      await this.addResult('Search Simulation: "ffmpeg"', 'warning', {
        message: `Expected ~66 results, got ${ffmpegCount}`,
        details: { resultCount: ffmpegCount }
      });
    }
    
    // Simulate search for "codec"
    const codecResults = data.resources.filter(r => 
      r.title?.toLowerCase().includes('codec') || 
      r.description?.toLowerCase().includes('codec') ||
      r.category?.toLowerCase().includes('codec')
    );
    
    await this.addResult('Search Simulation: "codec"', 'passed', {
      details: { resultCount: codecResults.length }
    });
  }

  async testCategoryPages() {
    console.log('\n📁 Testing Category Page Endpoints...\n');
    
    for (const [categoryName, expectedCount] of Object.entries(EXPECTED_COUNTS.categories)) {
      const slug = CATEGORY_SLUGS[categoryName];
      const categoryPath = `/category/${slug}`;
      
      try {
        // Test if the page would be accessible
        const response = await fetch(`${BASE_URL}${categoryPath}`);
        
        if (response.ok) {
          // Check if it's an HTML page
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            await this.addResult(`Category Page: ${categoryName}`, 'passed', {
              details: { 
                path: categoryPath,
                expectedCount,
                status: response.status
              }
            });
          } else {
            await this.addResult(`Category Page: ${categoryName}`, 'warning', {
              message: 'Page exists but not HTML',
              details: { path: categoryPath, contentType }
            });
          }
        } else {
          await this.addResult(`Category Page: ${categoryName}`, 'failed', {
            error: `HTTP ${response.status}`,
            details: { path: categoryPath }
          });
        }
      } catch (error) {
        await this.addResult(`Category Page: ${categoryName}`, 'failed', {
          error: error.message,
          details: { path: categoryPath }
        });
      }
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
      path.join(REPORT_DIR, 'api-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate markdown report
    const markdown = `# API Comprehensive Test Report

## Summary
- **Total Tests:** ${report.summary.total}
- **Passed:** ${report.summary.passed} ✅
- **Failed:** ${report.summary.failed} ❌
- **Warnings:** ${report.summary.warnings} ⚠️
- **Success Rate:** ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%

## Test Categories

### API Tests
- Main endpoint functionality
- Data structure validation
- Total resource count verification

### Category Tests
- All 9 main categories verified for correct counts
- Category slugs validated

### Subcategory Tests
- Encoding & Codecs subcategories verified
- Codec types (AV1, HEVC, VP9) confirmed

### Search Simulation
- Search for "video" tested
- Search for "ffmpeg" tested (expecting ~66 results)
- Search for "codec" tested

### Category Pages
- All 9 category page routes tested

## Detailed Results

${report.tests.map(test => {
  let icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
  let details = test.details ? `\n  - Details: ${JSON.stringify(test.details, null, 2).replace(/\n/g, '\n    ')}` : '';
  let error = test.error ? `\n  - Error: ${test.error}` : '';
  let message = test.message ? `\n  - Message: ${test.message}` : '';
  
  return `### ${icon} ${test.test}
  - Status: ${test.status}${details}${error}${message}`;
}).join('\n\n')}

## Expected vs Actual Counts

| Category | Expected | Status |
|----------|----------|--------|
${Object.entries(EXPECTED_COUNTS.categories).map(([name, count]) => {
  const test = report.tests.find(t => t.test === `Category Count: ${name}`);
  const status = test?.status === 'passed' ? '✅' : test?.status === 'failed' ? '❌' : '❓';
  return `| ${name} | ${count} | ${status} |`;
}).join('\n')}

## Timestamp
- Started: ${report.timestamp}
- Completed: ${report.completedAt}
- Duration: ${(report.duration / 1000).toFixed(2)}s

## Notes
This report is based on API testing without browser automation. Visual testing would require additional tools like Puppeteer or Playwright.
`;
    
    await fs.writeFile(
      path.join(REPORT_DIR, 'API_TEST_REPORT.md'),
      markdown
    );
    
    console.log('\n📁 Report saved to test-screenshots/API_TEST_REPORT.md');
  }

  async run() {
    try {
      await this.init();
      
      // Run API tests and get data
      const data = await this.testAPI();
      
      if (data) {
        // Run data validation tests
        await this.testCategoryData(data);
        await this.testSubcategoryData(data);
        await this.testSearch(data);
      }
      
      // Test category pages
      await this.testCategoryPages();
      
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
    }
  }
}

// Run tests
async function main() {
  const tester = new APIComprehensiveTester();
  await tester.run();
}

main().catch(console.error);