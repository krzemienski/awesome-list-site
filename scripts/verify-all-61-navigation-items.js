#!/usr/bin/env node

/**
 * Complete 61-Item Navigation Verification Against CSV Taxonomy
 * Tests every single navigation item from the definitive CSV file
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Definitive taxonomy from CSV file (61 total items)
const CSV_TAXONOMY = {
  home: { name: 'Home', expected: 2011, type: 'home', path: '/' },
  
  // 9 Categories (Level 1) 
  categories: {
    'community-events': { name: 'Community & Events', expected: 91 },
    'encoding-codecs': { name: 'Encoding & Codecs', expected: 392 },
    'general-tools': { name: 'General Tools', expected: 97 },
    'infrastructure-delivery': { name: 'Infrastructure & Delivery', expected: 134 },
    'intro-learning': { name: 'Intro & Learning', expected: 229 },
    'media-tools': { name: 'Media Tools', expected: 317 },
    'players-clients': { name: 'Players & Clients', expected: 425 },
    'protocols-transport': { name: 'Protocols & Transport', expected: 252 },
    'standards-industry': { name: 'Standards & Industry', expected: 174 }
  },
  
  // 19 Subcategories (Level 2)
  subcategories: {
    'community-groups': { name: 'Community Groups', expected: 4, parent: 'Community & Events' },
    'events-conferences': { name: 'Events & Conferences', expected: 6, parent: 'Community & Events' },
    'codecs': { name: 'Codecs', expected: 29, parent: 'Encoding & Codecs' },
    'encoding-tools': { name: 'Encoding Tools', expected: 240, parent: 'Encoding & Codecs' },
    'drm': { name: 'DRM', expected: 17, parent: 'General Tools' },
    'ffmpeg-tools': { name: 'FFMPEG & Tools', expected: 0, parent: 'General Tools' },
    'cloud-cdn': { name: 'Cloud & CDN', expected: 54, parent: 'Infrastructure & Delivery' },
    'streaming-servers': { name: 'Streaming Servers', expected: 39, parent: 'Infrastructure & Delivery' },
    'introduction': { name: 'Introduction', expected: 4, parent: 'Intro & Learning' },
    'learning-resources': { name: 'Learning Resources', expected: 36, parent: 'Intro & Learning' },
    'tutorials-case-studies': { name: 'Tutorials & Case Studies', expected: 60, parent: 'Intro & Learning' },
    'ads-qoe': { name: 'Ads & QoE', expected: 45, parent: 'Media Tools' },
    'audio-subtitles': { name: 'Audio & Subtitles', expected: 58, parent: 'Media Tools' },
    'hardware-players': { name: 'Hardware Players', expected: 63, parent: 'Players & Clients' },
    'mobile-web-players': { name: 'Mobile & Web Players', expected: 148, parent: 'Players & Clients' },
    'adaptive-streaming': { name: 'Adaptive Streaming', expected: 77, parent: 'Protocols & Transport' },
    'transport-protocols': { name: 'Transport Protocols', expected: 92, parent: 'Protocols & Transport' },
    'specs-standards': { name: 'Specs & Standards', expected: 87, parent: 'Standards & Industry' },
    'vendors-hdr': { name: 'Vendors & HDR', expected: 71, parent: 'Standards & Industry' }
  },
  
  // 32 Sub-subcategories (Level 3)  
  subSubcategories: {
    'online-forums': { name: 'Online Forums', expected: 2, parent: 'Community Groups' },
    'slack-meetups': { name: 'Slack & Meetups', expected: 0, parent: 'Community Groups' },
    'conferences': { name: 'Conferences', expected: 0, parent: 'Events & Conferences' },
    'podcasts-webinars': { name: 'Podcasts & Webinars', expected: 2, parent: 'Events & Conferences' },
    'av1': { name: 'AV1', expected: 6, parent: 'Codecs' },
    'hevc': { name: 'HEVC', expected: 10, parent: 'Codecs' },
    'vp9': { name: 'VP9', expected: 1, parent: 'Codecs' },
    'ffmpeg': { name: 'FFMPEG', expected: 66, parent: 'Encoding Tools' },
    'other-encoders': { name: 'Other Encoders', expected: 1, parent: 'Encoding Tools' },
    'cdn-integration': { name: 'CDN Integration', expected: 3, parent: 'Cloud & CDN' },
    'cloud-platforms': { name: 'Cloud Platforms', expected: 4, parent: 'Cloud & CDN' },
    'origin-servers': { name: 'Origin Servers', expected: 1, parent: 'Streaming Servers' },
    'storage-solutions': { name: 'Storage Solutions', expected: 3, parent: 'Streaming Servers' },
    'advertising': { name: 'Advertising', expected: 0, parent: 'Ads & QoE' },
    'quality-testing': { name: 'Quality & Testing', expected: 36, parent: 'Ads & QoE' },
    'audio': { name: 'Audio', expected: 8, parent: 'Audio & Subtitles' },
    'subtitles-captions': { name: 'Subtitles & Captions', expected: 6, parent: 'Audio & Subtitles' },
    'chromecast': { name: 'Chromecast', expected: 2, parent: 'Hardware Players' },
    'roku': { name: 'Roku', expected: 24, parent: 'Hardware Players' },
    'smart-tvs': { name: 'Smart TVs', expected: 12, parent: 'Hardware Players' },
    'android': { name: 'Android', expected: 4, parent: 'Mobile & Web Players' },
    'iostvos': { name: 'iOS/tvOS', expected: 19, parent: 'Mobile & Web Players' },
    'web-players': { name: 'Web Players', expected: 27, parent: 'Mobile & Web Players' },
    'dash': { name: 'DASH', expected: 8, parent: 'Adaptive Streaming' },
    'hls': { name: 'HLS', expected: 9, parent: 'Adaptive Streaming' },
    'rist': { name: 'RIST', expected: 0, parent: 'Transport Protocols' },
    'rtmp': { name: 'RTMP', expected: 0, parent: 'Transport Protocols' },
    'srt': { name: 'SRT', expected: 0, parent: 'Transport Protocols' },
    'mpeg-forums': { name: 'MPEG & Forums', expected: 10, parent: 'Specs & Standards' },
    'official-specs': { name: 'Official Specs', expected: 4, parent: 'Specs & Standards' },
    'hdr-guidelines': { name: 'HDR Guidelines', expected: 3, parent: 'Vendors & HDR' },
    'vendor-docs': { name: 'Vendor Docs', expected: 4, parent: 'Vendors & HDR' }
  }
};

class ComprehensiveNavigationVerifier {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.discrepancies = [];
  }

  async testNavigationPath(type, slug, item) {
    let endpoint;
    switch (type) {
      case 'home':
        endpoint = '/api/awesome-list';
        break;
      case 'category':
        endpoint = `/api/awesome-list?category=${slug}`;
        break;
      case 'subcategory':
        endpoint = `/api/awesome-list?subcategory=${slug}`;
        break;
      case 'sub-subcategory':
        endpoint = `/api/awesome-list?subSubcategory=${slug}`;
        break;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const actualCount = data.resources.length;
      const expectedCount = item.expected;
      const isMatch = actualCount === expectedCount;
      
      const result = {
        type,
        slug,
        name: item.name,
        expected: expectedCount,
        actual: actualCount,
        isMatch,
        status: response.ok ? 'accessible' : 'failed',
        parent: item.parent || null,
        endpoint
      };
      
      this.results.push(result);
      
      if (isMatch) {
        this.passed++;
        console.log(`✅ ${item.name}: ${actualCount} resources (expected ${expectedCount})`);
      } else {
        this.failed++;
        console.log(`❌ ${item.name}: ${actualCount} resources (expected ${expectedCount}) - DISCREPANCY: ${actualCount - expectedCount}`);
        this.discrepancies.push(result);
      }
      
      return result;
      
    } catch (error) {
      const result = {
        type,
        slug,
        name: item.name,
        expected: item.expected,
        actual: 0,
        isMatch: false,
        status: 'error',
        error: error.message,
        parent: item.parent || null,
        endpoint
      };
      
      this.results.push(result);
      this.failed++;
      console.log(`💥 ${item.name}: ERROR - ${error.message}`);
      return result;
    }
  }

  async verifyAllNavigationItems() {
    console.log("🚀 COMPREHENSIVE VERIFICATION OF ALL 61 NAVIGATION ITEMS");
    console.log("=" + "=".repeat(70));
    console.log("Testing against definitive CSV taxonomy data...\n");

    // Test Home (1 item)
    console.log("🏠 TESTING HOME PAGE (1 item)");
    console.log("-".repeat(50));
    await this.testNavigationPath('home', '', CSV_TAXONOMY.home);

    // Test Categories (9 items)
    console.log("\n📁 TESTING CATEGORIES (9 items)");
    console.log("-".repeat(50));
    for (const [slug, item] of Object.entries(CSV_TAXONOMY.categories)) {
      await this.testNavigationPath('category', slug, item);
    }

    // Test Subcategories (19 items)
    console.log("\n📂 TESTING SUBCATEGORIES (19 items)");
    console.log("-".repeat(50));
    for (const [slug, item] of Object.entries(CSV_TAXONOMY.subcategories)) {
      await this.testNavigationPath('subcategory', slug, item);
    }

    // Test Sub-subcategories (32 items)
    console.log("\n📄 TESTING SUB-SUBCATEGORIES (32 items)");
    console.log("-".repeat(50));
    for (const [slug, item] of Object.entries(CSV_TAXONOMY.subSubcategories)) {
      await this.testNavigationPath('sub-subcategory', slug, item);
    }
  }

  generateComprehensiveReport() {
    console.log("\n" + "=".repeat(80));
    console.log("📋 COMPREHENSIVE 61-ITEM NAVIGATION VERIFICATION REPORT");
    console.log("=".repeat(80));

    const totalItems = this.results.length;
    const successRate = ((this.passed / totalItems) * 100).toFixed(1);

    console.log(`📊 SUMMARY:`);
    console.log(`   🎯 Total Items Tested: ${totalItems}/61`);
    console.log(`   ✅ Passed: ${this.passed}`);
    console.log(`   ❌ Failed: ${this.failed}`);
    console.log(`   📈 Success Rate: ${successRate}%`);
    console.log(`   🚨 Discrepancies Found: ${this.discrepancies.length}`);

    if (this.discrepancies.length > 0) {
      console.log(`\n🚨 MAJOR DISCREPANCIES (${this.discrepancies.length}):`);
      console.log("-".repeat(70));
      this.discrepancies.forEach((item, index) => {
        const diff = item.actual - item.expected;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        console.log(`${index + 1}. ${item.name} (${item.type})`);
        console.log(`   Expected: ${item.expected}, Actual: ${item.actual} (${diffStr})`);
        console.log(`   Endpoint: ${item.endpoint}`);
        if (item.parent) console.log(`   Parent: ${item.parent}`);
      });
    }

    // Category-level discrepancies summary
    const categoryDiscrepancies = this.discrepancies.filter(d => d.type === 'category');
    if (categoryDiscrepancies.length > 0) {
      console.log(`\n📁 CATEGORY-LEVEL ISSUES (${categoryDiscrepancies.length}):`);
      console.log("-".repeat(50));
      categoryDiscrepancies.forEach(cat => {
        const diff = cat.actual - cat.expected;
        console.log(`   ${cat.name}: Expected ${cat.expected}, Got ${cat.actual} (${diff > 0 ? '+' : ''}${diff})`);
      });
    }

    console.log(`\n📝 VERIFICATION STATUS:`);
    if (this.passed === 61 && this.failed === 0) {
      console.log(`   ✅ PERFECT SUCCESS - All 61 navigation items are mathematically consistent with CSV data`);
    } else {
      console.log(`   ❌ INCONSISTENCIES DETECTED - Navigation does not match CSV taxonomy`);
      console.log(`   📊 Items matching CSV: ${this.passed}/61 (${successRate}%)`);
    }

    return {
      totalTested: totalItems,
      passed: this.passed,
      failed: this.failed,
      successRate: parseFloat(successRate),
      discrepancies: this.discrepancies,
      isFullyConsistent: this.passed === 61 && this.failed === 0
    };
  }

  async runCompleteVerification() {
    console.log("🔍 Starting complete 61-item navigation verification against CSV taxonomy...");
    
    try {
      await this.verifyAllNavigationItems();
      const report = this.generateComprehensiveReport();
      
      if (report.isFullyConsistent) {
        console.log("\n✅ VERIFICATION PASSED - All navigation items match CSV data");
        process.exit(0);
      } else {
        console.log("\n❌ VERIFICATION FAILED - Discrepancies found against CSV data");
        process.exit(1);
      }
      
    } catch (error) {
      console.error(`💥 Verification failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the comprehensive verification
const verifier = new ComprehensiveNavigationVerifier();
verifier.runCompleteVerification();