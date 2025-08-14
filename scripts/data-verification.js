#!/usr/bin/env node

/**
 * Data Verification Script
 * Compares actual API filtering results against CSV reference data
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Reference data from CSV and Markdown files
const REFERENCE_DATA = {
  // Level 1: Categories
  categories: [
    { name: 'Community & Events', slug: 'community-events', expected: 91, level: 1 },
    { name: 'Encoding & Codecs', slug: 'encoding-codecs', expected: 392, level: 1 },
    { name: 'General Tools', slug: 'general-tools', expected: 97, level: 1 },
    { name: 'Infrastructure & Delivery', slug: 'infrastructure-delivery', expected: 134, level: 1 },
    { name: 'Intro & Learning', slug: 'intro-learning', expected: 229, level: 1 },
    { name: 'Media Tools', slug: 'media-tools', expected: 317, level: 1 },
    { name: 'Players & Clients', slug: 'players-clients', expected: 425, level: 1 },
    { name: 'Protocols & Transport', slug: 'protocols-transport', expected: 252, level: 1 },
    { name: 'Standards & Industry', slug: 'standards-industry', expected: 174, level: 1 }
  ],
  
  // Level 2: Subcategories
  subcategories: [
    { name: 'Community Groups', slug: 'community-groups', parent: 'Community & Events', expected: 4, level: 2 },
    { name: 'Events & Conferences', slug: 'events-conferences', parent: 'Community & Events', expected: 6, level: 2 },
    { name: 'Codecs', slug: 'codecs', parent: 'Encoding & Codecs', expected: 29, level: 2 },
    { name: 'Encoding Tools', slug: 'encoding-tools', parent: 'Encoding & Codecs', expected: 240, level: 2 },
    { name: 'DRM', slug: 'drm', parent: 'General Tools', expected: 17, level: 2 },
    { name: 'FFMPEG & Tools', slug: 'ffmpeg-tools', parent: 'General Tools', expected: 0, level: 2 },
    { name: 'Cloud & CDN', slug: 'cloud-cdn', parent: 'Infrastructure & Delivery', expected: 54, level: 2 },
    { name: 'Streaming Servers', slug: 'streaming-servers', parent: 'Infrastructure & Delivery', expected: 39, level: 2 },
    { name: 'Introduction', slug: 'introduction', parent: 'Intro & Learning', expected: 4, level: 2 },
    { name: 'Learning Resources', slug: 'learning-resources', parent: 'Intro & Learning', expected: 36, level: 2 },
    { name: 'Tutorials & Case Studies', slug: 'tutorials-case-studies', parent: 'Intro & Learning', expected: 60, level: 2 },
    { name: 'Ads & QoE', slug: 'ads-qoe', parent: 'Media Tools', expected: 45, level: 2 },
    { name: 'Audio & Subtitles', slug: 'audio-subtitles', parent: 'Media Tools', expected: 58, level: 2 },
    { name: 'Hardware Players', slug: 'hardware-players', parent: 'Players & Clients', expected: 63, level: 2 },
    { name: 'Mobile & Web Players', slug: 'mobile-web-players', parent: 'Players & Clients', expected: 148, level: 2 },
    { name: 'Adaptive Streaming', slug: 'adaptive-streaming', parent: 'Protocols & Transport', expected: 77, level: 2 },
    { name: 'Transport Protocols', slug: 'transport-protocols', parent: 'Protocols & Transport', expected: 92, level: 2 },
    { name: 'Specs & Standards', slug: 'specs-standards', parent: 'Standards & Industry', expected: 87, level: 2 },
    { name: 'Vendors & HDR', slug: 'vendors-hdr', parent: 'Standards & Industry', expected: 71, level: 2 }
  ],
  
  // Level 3: Sub-subcategories
  subSubcategories: [
    { name: 'Online Forums', slug: 'online-forums', parent: 'Community Groups', expected: 2, level: 3 },
    { name: 'Slack & Meetups', slug: 'slack-meetups', parent: 'Community Groups', expected: 0, level: 3 },
    { name: 'Conferences', slug: 'conferences', parent: 'Events & Conferences', expected: 0, level: 3 },
    { name: 'Podcasts & Webinars', slug: 'podcasts-webinars', parent: 'Events & Conferences', expected: 2, level: 3 },
    { name: 'AV1', slug: 'av1', parent: 'Codecs', expected: 6, level: 3 },
    { name: 'HEVC', slug: 'hevc', parent: 'Codecs', expected: 10, level: 3 },
    { name: 'VP9', slug: 'vp9', parent: 'Codecs', expected: 1, level: 3 },
    { name: 'FFMPEG', slug: 'ffmpeg', parent: 'Encoding Tools', expected: 66, level: 3 },
    { name: 'Other Encoders', slug: 'other-encoders', parent: 'Encoding Tools', expected: 1, level: 3 },
    { name: 'CDN Integration', slug: 'cdn-integration', parent: 'Cloud & CDN', expected: 3, level: 3 },
    { name: 'Cloud Platforms', slug: 'cloud-platforms', parent: 'Cloud & CDN', expected: 4, level: 3 },
    { name: 'Origin Servers', slug: 'origin-servers', parent: 'Streaming Servers', expected: 1, level: 3 },
    { name: 'Storage Solutions', slug: 'storage-solutions', parent: 'Streaming Servers', expected: 3, level: 3 },
    { name: 'Advertising', slug: 'advertising', parent: 'Ads & QoE', expected: 0, level: 3 },
    { name: 'Quality & Testing', slug: 'quality-testing', parent: 'Ads & QoE', expected: 36, level: 3 },
    { name: 'Audio', slug: 'audio', parent: 'Audio & Subtitles', expected: 8, level: 3 },
    { name: 'Subtitles & Captions', slug: 'subtitles-captions', parent: 'Audio & Subtitles', expected: 6, level: 3 },
    { name: 'Chromecast', slug: 'chromecast', parent: 'Hardware Players', expected: 2, level: 3 },
    { name: 'Roku', slug: 'roku', parent: 'Hardware Players', expected: 24, level: 3 },
    { name: 'Smart TVs', slug: 'smart-tv', parent: 'Hardware Players', expected: 12, level: 3 },
    { name: 'Android', slug: 'android', parent: 'Mobile & Web Players', expected: 4, level: 3 },
    { name: 'iOS/tvOS', slug: 'ios-tvos', parent: 'Mobile & Web Players', expected: 19, level: 3 },
    { name: 'Web Players', slug: 'web-players', parent: 'Mobile & Web Players', expected: 27, level: 3 },
    { name: 'DASH', slug: 'dash', parent: 'Adaptive Streaming', expected: 8, level: 3 },
    { name: 'HLS', slug: 'hls', parent: 'Adaptive Streaming', expected: 9, level: 3 },
    { name: 'RIST', slug: 'rist', parent: 'Transport Protocols', expected: 0, level: 3 },
    { name: 'RTMP', slug: 'rtmp', parent: 'Transport Protocols', expected: 0, level: 3 },
    { name: 'SRT', slug: 'srt', parent: 'Transport Protocols', expected: 0, level: 3 },
    { name: 'MPEG & Forums', slug: 'mpeg-forums', parent: 'Specs & Standards', expected: 10, level: 3 },
    { name: 'Official Specs', slug: 'official-specs', parent: 'Specs & Standards', expected: 4, level: 3 },
    { name: 'HDR Guidelines', slug: 'hdr-guidelines', parent: 'Vendors & HDR', expected: 3, level: 3 },
    { name: 'Vendor Docs', slug: 'vendor-docs', parent: 'Vendors & HDR', expected: 4, level: 3 }
  ]
};

class DataVerifier {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      discrepancies: [],
      details: {
        categories: [],
        subcategories: [],
        subSubcategories: []
      }
    };
  }

  async fetchAPI(endpoint) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`API fetch failed: ${error.message}`);
    }
  }

  async testCategory(category) {
    const result = {
      name: category.name,
      slug: category.slug,
      level: category.level,
      expected: category.expected,
      actual: null,
      status: 'PENDING',
      error: null,
      apiEndpoint: `/api/awesome-list?category=${category.slug}`
    };

    try {
      const data = await this.fetchAPI(`/api/awesome-list?category=${category.slug}`);
      result.actual = data.resources ? data.resources.length : 0;
      result.status = result.actual === result.expected ? 'PASS' : 'FAIL';
      
      if (result.status === 'FAIL') {
        this.results.discrepancies.push({
          type: 'category',
          name: category.name,
          expected: category.expected,
          actual: result.actual,
          difference: result.actual - result.expected
        });
      }
    } catch (error) {
      result.error = error.message;
      result.status = 'ERROR';
    }

    this.results.details.categories.push(result);
    this.results.totalTests++;
    if (result.status === 'PASS') this.results.passed++;
    else this.results.failed++;

    return result;
  }

  async testSubcategory(subcategory) {
    const result = {
      name: subcategory.name,
      slug: subcategory.slug,
      parent: subcategory.parent,
      level: subcategory.level,
      expected: subcategory.expected,
      actual: null,
      status: 'PENDING',
      error: null,
      apiEndpoint: `/api/awesome-list?subcategory=${subcategory.slug}`
    };

    try {
      const data = await this.fetchAPI(`/api/awesome-list?subcategory=${subcategory.slug}`);
      result.actual = data.resources ? data.resources.length : 0;
      result.status = result.actual === result.expected ? 'PASS' : 'FAIL';
      
      if (result.status === 'FAIL') {
        this.results.discrepancies.push({
          type: 'subcategory',
          name: subcategory.name,
          parent: subcategory.parent,
          expected: subcategory.expected,
          actual: result.actual,
          difference: result.actual - result.expected
        });
      }
    } catch (error) {
      result.error = error.message;
      result.status = 'ERROR';
    }

    this.results.details.subcategories.push(result);
    this.results.totalTests++;
    if (result.status === 'PASS') this.results.passed++;
    else this.results.failed++;

    return result;
  }

  async testSubSubcategory(subSubcategory) {
    const result = {
      name: subSubcategory.name,
      slug: subSubcategory.slug,
      parent: subSubcategory.parent,
      level: subSubcategory.level,
      expected: subSubcategory.expected,
      actual: null,
      status: 'PENDING',
      error: null,
      apiEndpoint: `/api/awesome-list?subSubcategory=${subSubcategory.slug}`
    };

    try {
      const data = await this.fetchAPI(`/api/awesome-list?subSubcategory=${subSubcategory.slug}`);
      result.actual = data.resources ? data.resources.length : 0;
      result.status = result.actual === result.expected ? 'PASS' : 'FAIL';
      
      if (result.status === 'FAIL') {
        this.results.discrepancies.push({
          type: 'sub-subcategory',
          name: subSubcategory.name,
          parent: subSubcategory.parent,
          expected: subSubcategory.expected,
          actual: result.actual,
          difference: result.actual - result.expected
        });
      }
    } catch (error) {
      result.error = error.message;
      result.status = 'ERROR';
    }

    this.results.details.subSubcategories.push(result);
    this.results.totalTests++;
    if (result.status === 'PASS') this.results.passed++;
    else this.results.failed++;

    return result;
  }

  async runCompleteVerification() {
    console.log('🔍 COMPREHENSIVE DATA VERIFICATION');
    console.log('Comparing API results against CSV reference data');
    console.log('=' + '='.repeat(50));

    // Test Categories (Level 1)
    console.log('\n📁 Testing Categories (Level 1)...');
    for (const category of REFERENCE_DATA.categories) {
      const result = await this.testCategory(category);
      const status = result.status === 'PASS' ? '✅' : result.status === 'ERROR' ? '💥' : '❌';
      console.log(`  ${status} ${category.name}: ${result.actual}/${result.expected}`);
    }

    // Test Subcategories (Level 2)
    console.log('\n📂 Testing Subcategories (Level 2)...');
    for (const subcategory of REFERENCE_DATA.subcategories) {
      const result = await this.testSubcategory(subcategory);
      const status = result.status === 'PASS' ? '✅' : result.status === 'ERROR' ? '💥' : '❌';
      console.log(`  ${status} ${subcategory.name}: ${result.actual}/${result.expected}`);
    }

    // Test Sub-subcategories (Level 3)
    console.log('\n🎯 Testing Sub-subcategories (Level 3)...');
    for (const subSubcategory of REFERENCE_DATA.subSubcategories) {
      const result = await this.testSubSubcategory(subSubcategory);
      const status = result.status === 'PASS' ? '✅' : result.status === 'ERROR' ? '💥' : '❌';
      console.log(`  ${status} ${subSubcategory.name}: ${result.actual}/${result.expected}`);
    }

    this.generateReport();
    return this.results;
  }

  generateReport() {
    console.log('\n📊 VERIFICATION RESULTS SUMMARY');
    console.log('=' + '='.repeat(40));
    console.log(`Total tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success rate: ${((this.results.passed / this.results.totalTests) * 100).toFixed(1)}%`);

    if (this.results.discrepancies.length > 0) {
      console.log('\n⚠️  MAJOR DISCREPANCIES FOUND:');
      
      // Group discrepancies by severity
      const critical = this.results.discrepancies.filter(d => Math.abs(d.difference) > 50);
      const moderate = this.results.discrepancies.filter(d => Math.abs(d.difference) > 10 && Math.abs(d.difference) <= 50);
      const minor = this.results.discrepancies.filter(d => Math.abs(d.difference) <= 10 && d.difference !== 0);

      if (critical.length > 0) {
        console.log('\n🔴 CRITICAL (>50 difference):');
        critical.forEach(d => {
          console.log(`   ${d.name}: Expected ${d.expected}, Got ${d.actual} (${d.difference > 0 ? '+' : ''}${d.difference})`);
        });
      }

      if (moderate.length > 0) {
        console.log('\n🟡 MODERATE (10-50 difference):');
        moderate.forEach(d => {
          console.log(`   ${d.name}: Expected ${d.expected}, Got ${d.actual} (${d.difference > 0 ? '+' : ''}${d.difference})`);
        });
      }

      if (minor.length > 0) {
        console.log('\n🟢 MINOR (1-10 difference):');
        minor.forEach(d => {
          console.log(`   ${d.name}: Expected ${d.expected}, Got ${d.actual} (${d.difference > 0 ? '+' : ''}${d.difference})`);
        });
      }
    }

    console.log('\n💾 Saving detailed results to test-screenshots/data-verification-results.json');
  }
}

// Run verification
const verifier = new DataVerifier();
verifier.runCompleteVerification()
  .then(async (results) => {
    // Save results to file
    const fs = await import('fs/promises');
    await fs.mkdir('./test-screenshots', { recursive: true });
    await fs.writeFile('./test-screenshots/data-verification-results.json', JSON.stringify(results, null, 2));
    
    const success = results.failed === 0;
    console.log(`\n${success ? '🎉 SUCCESS' : '⚠️  ISSUES FOUND'}: Data verification ${success ? 'passed' : 'completed with discrepancies'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });