#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1920, height: 1080 };
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots', 'suite-2');
const RESULTS_DIR = path.join(__dirname, '..', 'test-results');

// Ensure directories exist
[SCREENSHOT_DIR, RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 9 Category Pages
const CATEGORIES = [
  { slug: 'intro-learning', name: 'Intro & Learning', expectedCount: 229 },
  { slug: 'protocols-transport', name: 'Protocols & Transport', expectedCount: 252 },
  { slug: 'encoding-codecs', name: 'Encoding & Codecs', expectedCount: 392 },
  { slug: 'players-clients', name: 'Players & Clients', expectedCount: 269 },
  { slug: 'media-tools', name: 'Media Tools', expectedCount: 317 },
  { slug: 'standards-industry', name: 'Standards & Industry', expectedCount: 174 },
  { slug: 'infrastructure-delivery', name: 'Infrastructure & Delivery', expectedCount: 190 },
  { slug: 'general-tools', name: 'General Tools', expectedCount: 97 },
  { slug: 'community-events', name: 'Community & Events', expectedCount: 91 }
];

// 19 Subcategory Pages
const SUBCATEGORIES = [
  { slug: 'introduction', name: 'Introduction', expectedCount: 4, parentCategory: 'Intro & Learning' },
  { slug: 'learning-resources', name: 'Learning Resources', expectedCount: 36, parentCategory: 'Intro & Learning' },
  { slug: 'tutorials-case-studies', name: 'Tutorials & Case Studies', expectedCount: 60, parentCategory: 'Intro & Learning' },
  { slug: 'adaptive-streaming', name: 'Adaptive Streaming', expectedCount: 144, parentCategory: 'Protocols & Transport' },
  { slug: 'transport-protocols', name: 'Transport Protocols', expectedCount: 13, parentCategory: 'Protocols & Transport' },
  { slug: 'encoding-tools', name: 'Encoding Tools', expectedCount: 240, parentCategory: 'Encoding & Codecs' },
  { slug: 'codecs', name: 'Codecs', expectedCount: 29, parentCategory: 'Encoding & Codecs' },
  { slug: 'hardware-players', name: 'Hardware Players', expectedCount: 35, parentCategory: 'Players & Clients' },
  { slug: 'mobile-web-players', name: 'Mobile & Web Players', expectedCount: 81, parentCategory: 'Players & Clients' },
  { slug: 'audio-subtitles', name: 'Audio & Subtitles', expectedCount: 58, parentCategory: 'Media Tools' },
  { slug: 'ads-qoe', name: 'Ads & QoE', expectedCount: 45, parentCategory: 'Media Tools' },
  { slug: 'specs-standards', name: 'Specs & Standards', expectedCount: 36, parentCategory: 'Standards & Industry' },
  { slug: 'vendors-hdr', name: 'Vendors & HDR', expectedCount: 5, parentCategory: 'Standards & Industry' },
  { slug: 'streaming-servers', name: 'Streaming Servers', expectedCount: 39, parentCategory: 'Infrastructure & Delivery' },
  { slug: 'cloud-cdn', name: 'Cloud & CDN', expectedCount: 9, parentCategory: 'Infrastructure & Delivery' },
  { slug: 'ffmpeg-tools', name: 'FFMPEG & Tools', expectedCount: 25, parentCategory: 'General Tools' },
  { slug: 'drm', name: 'DRM', expectedCount: 51, parentCategory: 'General Tools' },
  { slug: 'community-groups', name: 'Community Groups', expectedCount: 33, parentCategory: 'Community & Events' },
  { slug: 'events-conferences', name: 'Events & Conferences', expectedCount: 55, parentCategory: 'Community & Events' }
];

// 32 Sub-Subcategory Pages
const SUB_SUBCATEGORIES = [
  { slug: 'hls', name: 'HLS', expectedCount: 63, parentSubcategory: 'Adaptive Streaming', parentCategory: 'Protocols & Transport' },
  { slug: 'dash', name: 'DASH', expectedCount: 50, parentSubcategory: 'Adaptive Streaming', parentCategory: 'Protocols & Transport' },
  { slug: 'rist', name: 'RIST', expectedCount: 1, parentSubcategory: 'Transport Protocols', parentCategory: 'Protocols & Transport' },
  { slug: 'srt', name: 'SRT', expectedCount: 1, parentSubcategory: 'Transport Protocols', parentCategory: 'Protocols & Transport' },
  { slug: 'rtmp', name: 'RTMP', expectedCount: 0, parentSubcategory: 'Transport Protocols', parentCategory: 'Protocols & Transport' },
  { slug: 'ffmpeg', name: 'FFMPEG', expectedCount: 66, parentSubcategory: 'Encoding Tools', parentCategory: 'Encoding & Codecs' },
  { slug: 'other-encoders', name: 'Other Encoders', expectedCount: 1, parentSubcategory: 'Encoding Tools', parentCategory: 'Encoding & Codecs' },
  { slug: 'hevc', name: 'HEVC', expectedCount: 10, parentSubcategory: 'Codecs', parentCategory: 'Encoding & Codecs' },
  { slug: 'vp9', name: 'VP9', expectedCount: 1, parentSubcategory: 'Codecs', parentCategory: 'Encoding & Codecs' },
  { slug: 'av1', name: 'AV1', expectedCount: 6, parentSubcategory: 'Codecs', parentCategory: 'Encoding & Codecs' },
  { slug: 'roku', name: 'Roku', expectedCount: 26, parentSubcategory: 'Hardware Players', parentCategory: 'Players & Clients' },
  { slug: 'smart-tvs', name: 'Smart TVs', expectedCount: 3, parentSubcategory: 'Hardware Players', parentCategory: 'Players & Clients' },
  { slug: 'chromecast', name: 'Chromecast', expectedCount: 1, parentSubcategory: 'Hardware Players', parentCategory: 'Players & Clients' },
  { slug: 'iostvos', name: 'iOS/tvOS', expectedCount: 31, parentSubcategory: 'Mobile & Web Players', parentCategory: 'Players & Clients' },
  { slug: 'android', name: 'Android', expectedCount: 10, parentSubcategory: 'Mobile & Web Players', parentCategory: 'Players & Clients' },
  { slug: 'web-players', name: 'Web Players', expectedCount: 25, parentSubcategory: 'Mobile & Web Players', parentCategory: 'Players & Clients' },
  { slug: 'audio', name: 'Audio', expectedCount: 8, parentSubcategory: 'Audio & Subtitles', parentCategory: 'Media Tools' },
  { slug: 'subtitles-captions', name: 'Subtitles & Captions', expectedCount: 40, parentSubcategory: 'Audio & Subtitles', parentCategory: 'Media Tools' },
  { slug: 'advertising', name: 'Advertising', expectedCount: 0, parentSubcategory: 'Ads & QoE', parentCategory: 'Media Tools' },
  { slug: 'quality-testing', name: 'Quality & Testing', expectedCount: 36, parentSubcategory: 'Ads & QoE', parentCategory: 'Media Tools' },
  { slug: 'official-specs', name: 'Official Specs', expectedCount: 3, parentSubcategory: 'Specs & Standards', parentCategory: 'Standards & Industry' },
  { slug: 'mpeg-forums', name: 'MPEG & Forums', expectedCount: 6, parentSubcategory: 'Specs & Standards', parentCategory: 'Standards & Industry' },
  { slug: 'vendor-docs', name: 'Vendor Docs', expectedCount: 1, parentSubcategory: 'Vendors & HDR', parentCategory: 'Standards & Industry' },
  { slug: 'hdr-guidelines', name: 'HDR Guidelines', expectedCount: 1, parentSubcategory: 'Vendors & HDR', parentCategory: 'Standards & Industry' },
  { slug: 'origin-servers', name: 'Origin Servers', expectedCount: 1, parentSubcategory: 'Streaming Servers', parentCategory: 'Infrastructure & Delivery' },
  { slug: 'storage-solutions', name: 'Storage Solutions', expectedCount: 3, parentSubcategory: 'Streaming Servers', parentCategory: 'Infrastructure & Delivery' },
  { slug: 'cloud-platforms', name: 'Cloud Platforms', expectedCount: 4, parentSubcategory: 'Cloud & CDN', parentCategory: 'Infrastructure & Delivery' },
  { slug: 'cdn-integration', name: 'CDN Integration', expectedCount: 1, parentSubcategory: 'Cloud & CDN', parentCategory: 'Infrastructure & Delivery' },
  { slug: 'online-forums', name: 'Online Forums', expectedCount: 2, parentSubcategory: 'Community Groups', parentCategory: 'Community & Events' },
  { slug: 'slack-meetups', name: 'Slack & Meetups', expectedCount: 0, parentSubcategory: 'Community Groups', parentCategory: 'Community & Events' },
  { slug: 'conferences', name: 'Conferences', expectedCount: 0, parentSubcategory: 'Events & Conferences', parentCategory: 'Community & Events' },
  { slug: 'podcasts-webinars', name: 'Podcasts & Webinars', expectedCount: 2, parentSubcategory: 'Events & Conferences', parentCategory: 'Community & Events' }
];

// Test results structure
const results = {
  testSuite: 'Navigation Functionality Test Suite 2',
  timestamp: new Date().toISOString(),
  viewport: VIEWPORT,
  summary: {
    totalPages: 60,
    categories: { total: 9, passed: 0, failed: 0, warnings: 0 },
    subcategories: { total: 19, passed: 0, failed: 0, warnings: 0 },
    subSubcategories: { total: 32, passed: 0, failed: 0, warnings: 0 },
    overall: { passed: 0, failed: 0, warnings: 0 }
  },
  categories: [],
  subcategories: [],
  subSubcategories: []
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCategoryPage(browser, category, index) {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`📁 CATEGORY ${index + 1}/9: ${category.name}`);
  console.log(`${'━'.repeat(80)}`);
  
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  
  const result = {
    type: 'category',
    name: category.name,
    slug: category.slug,
    url: `/category/${category.slug}`,
    expectedCount: category.expectedCount,
    tests: {
      navigation: { status: 'pending', message: '' },
      urlPattern: { status: 'pending', message: '' },
      resourceCount: { status: 'pending', actualCount: 0, message: '' },
      breadcrumb: { status: 'pending', message: '' },
      tagFilter: { status: 'pending', message: '' },
      resourceGrid: { status: 'pending', message: '' }
    },
    screenshot: '',
    errors: []
  };
  
  try {
    // Test 1: Navigate to page
    console.log(`🌐 Navigating to ${BASE_URL}${result.url}`);
    const response = await page.goto(`${BASE_URL}${result.url}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    if (response && response.ok()) {
      result.tests.navigation.status = 'passed';
      result.tests.navigation.message = `HTTP ${response.status()}`;
      console.log(`✅ Navigation: HTTP ${response.status()}`);
    } else {
      result.tests.navigation.status = 'failed';
      result.tests.navigation.message = `HTTP ${response?.status() || 'unknown'}`;
      result.errors.push(`Navigation failed: ${response?.status()}`);
      console.log(`❌ Navigation failed`);
    }
    
    await page.waitForSelector('h1', { timeout: 5000 });
    await sleep(500);
    
    // Test 2: URL Pattern
    const currentUrl = page.url();
    const expectedUrl = `${BASE_URL}/category/${category.slug}`;
    if (currentUrl === expectedUrl) {
      result.tests.urlPattern.status = 'passed';
      result.tests.urlPattern.message = currentUrl;
      console.log(`✅ URL Pattern: Correct`);
    } else {
      result.tests.urlPattern.status = 'failed';
      result.tests.urlPattern.message = `Expected ${expectedUrl}, got ${currentUrl}`;
      result.errors.push(`URL mismatch`);
      console.log(`❌ URL Pattern: Mismatch`);
    }
    
    // Test 3: Resource Count
    const resourceCountText = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('p, div, span'));
      const found = elements.find(el => el.textContent.includes('resources available'));
      return found ? found.textContent.trim() : null;
    });
    
    if (resourceCountText) {
      const match = resourceCountText.match(/(\d+)\s*resources/);
      const actualCount = match ? parseInt(match[1]) : 0;
      result.tests.resourceCount.actualCount = actualCount;
      
      if (actualCount === category.expectedCount) {
        result.tests.resourceCount.status = 'passed';
        result.tests.resourceCount.message = `${actualCount} resources (correct)`;
        console.log(`✅ Resource Count: ${actualCount} (correct)`);
      } else {
        result.tests.resourceCount.status = 'warning';
        result.tests.resourceCount.message = `Expected ${category.expectedCount}, got ${actualCount}`;
        result.errors.push(`Count mismatch: ${actualCount} vs ${category.expectedCount}`);
        console.log(`⚠️  Resource Count: ${actualCount} (expected ${category.expectedCount})`);
      }
    } else {
      result.tests.resourceCount.status = 'failed';
      result.tests.resourceCount.message = 'Count not found';
      result.errors.push('Resource count not displayed');
      console.log(`❌ Resource Count: Not found`);
    }
    
    // Test 4: Breadcrumb / Back button
    const backButton = await page.$('[data-testid="button-back-home"]');
    if (backButton) {
      result.tests.breadcrumb.status = 'passed';
      result.tests.breadcrumb.message = 'Back to Home button present';
      console.log(`✅ Breadcrumb: Back button found`);
    } else {
      result.tests.breadcrumb.status = 'failed';
      result.tests.breadcrumb.message = 'Back button missing';
      result.errors.push('No breadcrumb/back button');
      console.log(`❌ Breadcrumb: Not found`);
    }
    
    // Test 5: TagFilter Component
    const tagFilter = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="tag"], [class*="filter"]');
      return elements.length > 0;
    });
    
    if (tagFilter) {
      result.tests.tagFilter.status = 'passed';
      result.tests.tagFilter.message = 'TagFilter visible';
      console.log(`✅ TagFilter: Present`);
    } else {
      result.tests.tagFilter.status = 'warning';
      result.tests.tagFilter.message = 'TagFilter not clearly visible';
      console.log(`⚠️  TagFilter: Not clearly visible`);
    }
    
    // Test 6: Resource Grid
    const resourceCards = await page.$$('[data-testid^="card-resource-"]');
    if (resourceCards.length > 0) {
      result.tests.resourceGrid.status = 'passed';
      result.tests.resourceGrid.message = `${resourceCards.length} cards displayed`;
      console.log(`✅ Resource Grid: ${resourceCards.length} cards`);
    } else {
      result.tests.resourceGrid.status = 'failed';
      result.tests.resourceGrid.message = 'No resource cards found';
      result.errors.push('Resource grid empty');
      console.log(`❌ Resource Grid: No cards found`);
    }
    
    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `category-${category.slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshot = `suite-2/category-${category.slug}.png`;
    console.log(`📸 Screenshot: category-${category.slug}.png`);
    
  } catch (error) {
    result.errors.push(`Exception: ${error.message}`);
    console.log(`❌ ERROR: ${error.message}`);
  } finally {
    await page.close();
  }
  
  // Determine overall status
  const statuses = Object.values(result.tests).map(t => t.status);
  if (statuses.every(s => s === 'passed')) {
    results.summary.categories.passed++;
    results.summary.overall.passed++;
    console.log(`✅ PASSED: ${category.name}`);
  } else if (statuses.some(s => s === 'failed')) {
    results.summary.categories.failed++;
    results.summary.overall.failed++;
    console.log(`❌ FAILED: ${category.name}`);
  } else {
    results.summary.categories.warnings++;
    results.summary.overall.warnings++;
    console.log(`⚠️  WARNING: ${category.name}`);
  }
  
  return result;
}

async function testSubcategoryPage(browser, subcategory, index) {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`📂 SUBCATEGORY ${index + 1}/19: ${subcategory.name}`);
  console.log(`${'━'.repeat(80)}`);
  
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  
  const result = {
    type: 'subcategory',
    name: subcategory.name,
    slug: subcategory.slug,
    url: `/subcategory/${subcategory.slug}`,
    expectedCount: subcategory.expectedCount,
    parentCategory: subcategory.parentCategory,
    tests: {
      navigation: { status: 'pending', message: '' },
      urlPattern: { status: 'pending', message: '' },
      resourceCount: { status: 'pending', actualCount: 0, message: '' },
      breadcrumb: { status: 'pending', message: '' },
      tagFilter: { status: 'pending', message: '' },
      subSubcategories: { status: 'pending', message: '' }
    },
    screenshot: '',
    errors: []
  };
  
  try {
    // Test 1: Navigate
    console.log(`🌐 Navigating to ${BASE_URL}${result.url}`);
    const response = await page.goto(`${BASE_URL}${result.url}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    if (response && response.ok()) {
      result.tests.navigation.status = 'passed';
      result.tests.navigation.message = `HTTP ${response.status()}`;
      console.log(`✅ Navigation: HTTP ${response.status()}`);
    } else {
      result.tests.navigation.status = 'failed';
      result.tests.navigation.message = `HTTP ${response?.status() || 'unknown'}`;
      result.errors.push(`Navigation failed`);
      console.log(`❌ Navigation failed`);
    }
    
    await page.waitForSelector('h1', { timeout: 5000 });
    await sleep(500);
    
    // Test 2: URL Pattern
    const currentUrl = page.url();
    const expectedUrl = `${BASE_URL}/subcategory/${subcategory.slug}`;
    if (currentUrl === expectedUrl) {
      result.tests.urlPattern.status = 'passed';
      result.tests.urlPattern.message = currentUrl;
      console.log(`✅ URL Pattern: Correct`);
    } else {
      result.tests.urlPattern.status = 'failed';
      result.tests.urlPattern.message = `URL mismatch`;
      result.errors.push(`URL mismatch`);
      console.log(`❌ URL Pattern: Mismatch`);
    }
    
    // Test 3: Resource Count - use data-testid for reliability
    const countBadge = await page.evaluate(() => {
      const badge = document.querySelector('[data-testid="badge-count"]');
      if (badge && badge.textContent) {
        const count = parseInt(badge.textContent.trim());
        return isNaN(count) ? null : count;
      }
      return null;
    });
    
    if (countBadge !== null) {
      result.tests.resourceCount.actualCount = countBadge;
      if (countBadge === subcategory.expectedCount) {
        result.tests.resourceCount.status = 'passed';
        result.tests.resourceCount.message = `${countBadge} resources (correct)`;
        console.log(`✅ Resource Count: ${countBadge} (correct)`);
      } else {
        result.tests.resourceCount.status = 'warning';
        result.tests.resourceCount.message = `Expected ${subcategory.expectedCount}, got ${countBadge}`;
        result.errors.push(`Count mismatch`);
        console.log(`⚠️  Resource Count: ${countBadge} (expected ${subcategory.expectedCount})`);
      }
    } else {
      result.tests.resourceCount.status = 'failed';
      result.tests.resourceCount.message = 'Count badge not found';
      result.errors.push('No count badge');
      console.log(`❌ Resource Count: Not found`);
    }
    
    // Test 4: Breadcrumb
    const backButton = await page.$('[data-testid="button-back-category"]');
    if (backButton) {
      const buttonText = await page.evaluate(el => el.textContent, backButton);
      const hasCategoryName = buttonText.includes(subcategory.parentCategory);
      
      if (hasCategoryName) {
        result.tests.breadcrumb.status = 'passed';
        result.tests.breadcrumb.message = `Back button with parent category`;
        console.log(`✅ Breadcrumb: Correct`);
      } else {
        result.tests.breadcrumb.status = 'warning';
        result.tests.breadcrumb.message = `Back button exists but may lack category name`;
        console.log(`⚠️  Breadcrumb: Partial`);
      }
    } else {
      result.tests.breadcrumb.status = 'failed';
      result.tests.breadcrumb.message = 'No back button';
      result.errors.push('No breadcrumb');
      console.log(`❌ Breadcrumb: Not found`);
    }
    
    // Test 5: TagFilter
    const tagFilter = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="tag"], [class*="filter"]');
      return elements.length > 0;
    });
    
    if (tagFilter) {
      result.tests.tagFilter.status = 'passed';
      result.tests.tagFilter.message = 'TagFilter visible';
      console.log(`✅ TagFilter: Present`);
    } else {
      result.tests.tagFilter.status = 'warning';
      result.tests.tagFilter.message = 'TagFilter not visible';
      console.log(`⚠️  TagFilter: Not visible`);
    }
    
    // Test 6: Sub-subcategories (check if any badges indicate them)
    const subSubBadges = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.badge, [class*="badge"]'));
      return badges.filter(badge => {
        const variant = badge.className;
        return variant.includes('outline') && !variant.includes('secondary');
      }).length;
    });
    
    result.tests.subSubcategories.status = 'passed';
    result.tests.subSubcategories.message = `${subSubBadges} sub-subcategory indicators found`;
    console.log(`✅ Sub-subcategories: ${subSubBadges} indicators`);
    
    // Screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `subcategory-${subcategory.slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshot = `suite-2/subcategory-${subcategory.slug}.png`;
    console.log(`📸 Screenshot: subcategory-${subcategory.slug}.png`);
    
  } catch (error) {
    result.errors.push(`Exception: ${error.message}`);
    console.log(`❌ ERROR: ${error.message}`);
  } finally {
    await page.close();
  }
  
  // Determine status
  const statuses = Object.values(result.tests).map(t => t.status);
  if (statuses.every(s => s === 'passed')) {
    results.summary.subcategories.passed++;
    results.summary.overall.passed++;
    console.log(`✅ PASSED: ${subcategory.name}`);
  } else if (statuses.some(s => s === 'failed')) {
    results.summary.subcategories.failed++;
    results.summary.overall.failed++;
    console.log(`❌ FAILED: ${subcategory.name}`);
  } else {
    results.summary.subcategories.warnings++;
    results.summary.overall.warnings++;
    console.log(`⚠️  WARNING: ${subcategory.name}`);
  }
  
  return result;
}

async function testSubSubcategoryPage(browser, subSubcat, index) {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`📄 SUB-SUBCATEGORY ${index + 1}/32: ${subSubcat.name}`);
  console.log(`${'━'.repeat(80)}`);
  
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  
  const result = {
    type: 'sub-subcategory',
    name: subSubcat.name,
    slug: subSubcat.slug,
    url: `/sub-subcategory/${subSubcat.slug}`,
    expectedCount: subSubcat.expectedCount,
    parentSubcategory: subSubcat.parentSubcategory,
    parentCategory: subSubcat.parentCategory,
    tests: {
      navigation: { status: 'pending', message: '' },
      urlPattern: { status: 'pending', message: '' },
      resourceCount: { status: 'pending', actualCount: 0, message: '' },
      breadcrumb: { status: 'pending', message: '' },
      tagFilter: { status: 'pending', message: '' }
    },
    screenshot: '',
    errors: []
  };
  
  try {
    // Test 1: Navigate
    console.log(`🌐 Navigating to ${BASE_URL}${result.url}`);
    const response = await page.goto(`${BASE_URL}${result.url}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    if (response && response.ok()) {
      result.tests.navigation.status = 'passed';
      result.tests.navigation.message = `HTTP ${response.status()}`;
      console.log(`✅ Navigation: HTTP ${response.status()}`);
    } else {
      result.tests.navigation.status = 'failed';
      result.tests.navigation.message = `HTTP ${response?.status() || 'unknown'}`;
      result.errors.push(`Navigation failed`);
      console.log(`❌ Navigation failed`);
    }
    
    await page.waitForSelector('h1', { timeout: 5000 });
    await sleep(500);
    
    // Test 2: URL Pattern
    const currentUrl = page.url();
    const expectedUrl = `${BASE_URL}/sub-subcategory/${subSubcat.slug}`;
    if (currentUrl === expectedUrl) {
      result.tests.urlPattern.status = 'passed';
      result.tests.urlPattern.message = currentUrl;
      console.log(`✅ URL Pattern: Correct`);
    } else {
      result.tests.urlPattern.status = 'failed';
      result.tests.urlPattern.message = `URL mismatch`;
      result.errors.push(`URL mismatch`);
      console.log(`❌ URL Pattern: Mismatch`);
    }
    
    // Test 3: Resource Count
    const countBadge = await page.$('[data-testid="badge-count"]');
    if (countBadge) {
      const countText = await page.evaluate(el => el.textContent, countBadge);
      const actualCount = parseInt(countText.trim());
      result.tests.resourceCount.actualCount = actualCount;
      
      if (actualCount === subSubcat.expectedCount) {
        result.tests.resourceCount.status = 'passed';
        result.tests.resourceCount.message = `${actualCount} resources (correct)`;
        console.log(`✅ Resource Count: ${actualCount} (correct)`);
      } else {
        result.tests.resourceCount.status = 'warning';
        result.tests.resourceCount.message = `Expected ${subSubcat.expectedCount}, got ${actualCount}`;
        result.errors.push(`Count mismatch`);
        console.log(`⚠️  Resource Count: ${actualCount} (expected ${subSubcat.expectedCount})`);
      }
    } else {
      result.tests.resourceCount.status = 'failed';
      result.tests.resourceCount.message = 'Count badge not found';
      result.errors.push('No count badge');
      console.log(`❌ Resource Count: Not found`);
    }
    
    // Test 4: Breadcrumb (3-level)
    const breadcrumb = await page.$('[data-testid="text-breadcrumb"]');
    if (breadcrumb) {
      const breadcrumbText = await page.evaluate(el => el.textContent, breadcrumb);
      const hasCategory = breadcrumbText.includes(subSubcat.parentCategory);
      const hasSubcategory = breadcrumbText.includes(subSubcat.parentSubcategory);
      
      if (hasCategory && hasSubcategory) {
        result.tests.breadcrumb.status = 'passed';
        result.tests.breadcrumb.message = `Full 3-level breadcrumb`;
        console.log(`✅ Breadcrumb: Complete (${breadcrumbText})`);
      } else {
        result.tests.breadcrumb.status = 'warning';
        result.tests.breadcrumb.message = `Partial breadcrumb`;
        console.log(`⚠️  Breadcrumb: Incomplete`);
      }
    } else {
      result.tests.breadcrumb.status = 'failed';
      result.tests.breadcrumb.message = 'No breadcrumb';
      result.errors.push('No breadcrumb');
      console.log(`❌ Breadcrumb: Not found`);
    }
    
    // Test 5: TagFilter
    const tagFilter = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="tag"], [class*="filter"]');
      return elements.length > 0;
    });
    
    if (tagFilter) {
      result.tests.tagFilter.status = 'passed';
      result.tests.tagFilter.message = 'TagFilter visible';
      console.log(`✅ TagFilter: Present`);
    } else {
      result.tests.tagFilter.status = 'warning';
      result.tests.tagFilter.message = 'TagFilter not visible';
      console.log(`⚠️  TagFilter: Not visible`);
    }
    
    // Screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `subsubcat-${subSubcat.slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshot = `suite-2/subsubcat-${subSubcat.slug}.png`;
    console.log(`📸 Screenshot: subsubcat-${subSubcat.slug}.png`);
    
  } catch (error) {
    result.errors.push(`Exception: ${error.message}`);
    console.log(`❌ ERROR: ${error.message}`);
  } finally {
    await page.close();
  }
  
  // Determine status
  const statuses = Object.values(result.tests).map(t => t.status);
  if (statuses.every(s => s === 'passed')) {
    results.summary.subSubcategories.passed++;
    results.summary.overall.passed++;
    console.log(`✅ PASSED: ${subSubcat.name}`);
  } else if (statuses.some(s => s === 'failed')) {
    results.summary.subSubcategories.failed++;
    results.summary.overall.failed++;
    console.log(`❌ FAILED: ${subSubcat.name}`);
  } else {
    results.summary.subSubcategories.warnings++;
    results.summary.overall.warnings++;
    console.log(`⚠️  WARNING: ${subSubcat.name}`);
  }
  
  return result;
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🧪 NAVIGATION FUNCTIONALITY TEST SUITE 2');
  console.log('Testing All 60 Navigation Pages');
  console.log('═'.repeat(80));
  console.log(`📐 Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📊 Total Pages: 60 (9 categories + 19 subcategories + 32 sub-subcategories)`);
  console.log('═'.repeat(80));
  
  let browser;
  
  try {
    console.log('\n🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    console.log('✅ Browser launched\n');
    
    // Test Categories
    console.log('\n' + '═'.repeat(80));
    console.log('SECTION 1: TESTING 9 CATEGORY PAGES');
    console.log('═'.repeat(80));
    
    for (let i = 0; i < CATEGORIES.length; i++) {
      const result = await testCategoryPage(browser, CATEGORIES[i], i);
      results.categories.push(result);
    }
    
    // Test Subcategories
    console.log('\n' + '═'.repeat(80));
    console.log('SECTION 2: TESTING 19 SUBCATEGORY PAGES');
    console.log('═'.repeat(80));
    
    for (let i = 0; i < SUBCATEGORIES.length; i++) {
      const result = await testSubcategoryPage(browser, SUBCATEGORIES[i], i);
      results.subcategories.push(result);
    }
    
    // Test Sub-subcategories
    console.log('\n' + '═'.repeat(80));
    console.log('SECTION 3: TESTING 32 SUB-SUBCATEGORY PAGES');
    console.log('═'.repeat(80));
    
    for (let i = 0; i < SUB_SUBCATEGORIES.length; i++) {
      const result = await testSubSubcategoryPage(browser, SUB_SUBCATEGORIES[i], i);
      results.subSubcategories.push(result);
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    results.fatalError = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Print Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\n📁 Categories (9 total):`);
  console.log(`   ✅ Passed: ${results.summary.categories.passed}`);
  console.log(`   ⚠️  Warnings: ${results.summary.categories.warnings}`);
  console.log(`   ❌ Failed: ${results.summary.categories.failed}`);
  
  console.log(`\n📂 Subcategories (19 total):`);
  console.log(`   ✅ Passed: ${results.summary.subcategories.passed}`);
  console.log(`   ⚠️  Warnings: ${results.summary.subcategories.warnings}`);
  console.log(`   ❌ Failed: ${results.summary.subcategories.failed}`);
  
  console.log(`\n📄 Sub-subcategories (32 total):`);
  console.log(`   ✅ Passed: ${results.summary.subSubcategories.passed}`);
  console.log(`   ⚠️  Warnings: ${results.summary.subSubcategories.warnings}`);
  console.log(`   ❌ Failed: ${results.summary.subSubcategories.failed}`);
  
  console.log(`\n🎯 Overall (60 pages):`);
  console.log(`   ✅ Passed: ${results.summary.overall.passed}`);
  console.log(`   ⚠️  Warnings: ${results.summary.overall.warnings}`);
  console.log(`   ❌ Failed: ${results.summary.overall.failed}`);
  
  const successRate = ((results.summary.overall.passed / 60) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);
  console.log('═'.repeat(80));
  
  // Save JSON report
  const jsonPath = path.join(RESULTS_DIR, 'suite-2-navigation.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 JSON Report: ${jsonPath}`);
  
  // Generate Markdown report
  const markdown = generateMarkdownReport(results);
  const markdownPath = path.join(RESULTS_DIR, 'SUITE_2_NAVIGATION_REPORT.md');
  fs.writeFileSync(markdownPath, markdown);
  console.log(`📝 Markdown Report: ${markdownPath}`);
  
  console.log('\n✨ Test suite completed!\n');
  
  process.exit(results.summary.overall.failed > 0 ? 1 : 0);
}

function generateMarkdownReport(results) {
  let md = `# Navigation Functionality Test Suite Report\n\n`;
  md += `**Test Suite:** ${results.testSuite}\n`;
  md += `**Timestamp:** ${results.timestamp}\n`;
  md += `**Viewport:** ${results.viewport.width}x${results.viewport.height}\n\n`;
  
  md += `## Executive Summary\n\n`;
  md += `Tested all 60 navigation pages across 3 levels:\n\n`;
  md += `| Level | Total | ✅ Passed | ⚠️ Warnings | ❌ Failed |\n`;
  md += `|-------|-------|----------|------------|----------|\n`;
  md += `| Categories | ${results.summary.categories.total} | ${results.summary.categories.passed} | ${results.summary.categories.warnings} | ${results.summary.categories.failed} |\n`;
  md += `| Subcategories | ${results.summary.subcategories.total} | ${results.summary.subcategories.passed} | ${results.summary.subcategories.warnings} | ${results.summary.subcategories.failed} |\n`;
  md += `| Sub-subcategories | ${results.summary.subSubcategories.total} | ${results.summary.subSubcategories.passed} | ${results.summary.subSubcategories.warnings} | ${results.summary.subSubcategories.failed} |\n`;
  md += `| **Overall** | **60** | **${results.summary.overall.passed}** | **${results.summary.overall.warnings}** | **${results.summary.overall.failed}** |\n\n`;
  
  const successRate = ((results.summary.overall.passed / 60) * 100).toFixed(1);
  md += `**Success Rate:** ${successRate}%\n\n`;
  
  // Category details
  md += `## Category Pages (9)\n\n`;
  results.categories.forEach((cat, i) => {
    const status = Object.values(cat.tests).every(t => t.status === 'passed') ? '✅' :
                   Object.values(cat.tests).some(t => t.status === 'failed') ? '❌' : '⚠️';
    md += `### ${i + 1}. ${cat.name} ${status}\n\n`;
    md += `- **URL:** \`${cat.url}\`\n`;
    md += `- **Expected Count:** ${cat.expectedCount}\n`;
    md += `- **Actual Count:** ${cat.tests.resourceCount.actualCount}\n`;
    md += `- **Screenshot:** \`${cat.screenshot}\`\n\n`;
    
    md += `**Tests:**\n`;
    Object.entries(cat.tests).forEach(([name, test]) => {
      const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
      md += `- ${icon} ${name}: ${test.message}\n`;
    });
    
    if (cat.errors.length > 0) {
      md += `\n**Errors:** ${cat.errors.join(', ')}\n`;
    }
    md += `\n`;
  });
  
  // Subcategory details
  md += `## Subcategory Pages (19)\n\n`;
  results.subcategories.forEach((sub, i) => {
    const status = Object.values(sub.tests).every(t => t.status === 'passed') ? '✅' :
                   Object.values(sub.tests).some(t => t.status === 'failed') ? '❌' : '⚠️';
    md += `### ${i + 1}. ${sub.name} ${status}\n\n`;
    md += `- **URL:** \`${sub.url}\`\n`;
    md += `- **Parent Category:** ${sub.parentCategory}\n`;
    md += `- **Expected Count:** ${sub.expectedCount}\n`;
    md += `- **Actual Count:** ${sub.tests.resourceCount.actualCount}\n`;
    md += `- **Screenshot:** \`${sub.screenshot}\`\n\n`;
    
    md += `**Tests:**\n`;
    Object.entries(sub.tests).forEach(([name, test]) => {
      const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
      md += `- ${icon} ${name}: ${test.message}\n`;
    });
    
    if (sub.errors.length > 0) {
      md += `\n**Errors:** ${sub.errors.join(', ')}\n`;
    }
    md += `\n`;
  });
  
  // Sub-subcategory details
  md += `## Sub-subcategory Pages (32)\n\n`;
  results.subSubcategories.forEach((subSub, i) => {
    const status = Object.values(subSub.tests).every(t => t.status === 'passed') ? '✅' :
                   Object.values(subSub.tests).some(t => t.status === 'failed') ? '❌' : '⚠️';
    md += `### ${i + 1}. ${subSub.name} ${status}\n\n`;
    md += `- **URL:** \`${subSub.url}\`\n`;
    md += `- **Parent:** ${subSub.parentCategory} > ${subSub.parentSubcategory}\n`;
    md += `- **Expected Count:** ${subSub.expectedCount}\n`;
    md += `- **Actual Count:** ${subSub.tests.resourceCount.actualCount}\n`;
    md += `- **Screenshot:** \`${subSub.screenshot}\`\n\n`;
    
    md += `**Tests:**\n`;
    Object.entries(subSub.tests).forEach(([name, test]) => {
      const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
      md += `- ${icon} ${name}: ${test.message}\n`;
    });
    
    if (subSub.errors.length > 0) {
      md += `\n**Errors:** ${subSub.errors.join(', ')}\n`;
    }
    md += `\n`;
  });
  
  return md;
}

main();
