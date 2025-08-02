#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Configuration
const BASE_URL = 'http://localhost:5000';
const MOBILE_VIEWPORT = { width: 375, height: 812 };
const SCREENSHOT_DIR = './mobile-test-screenshots';

// Test categories and subcategories
const TEST_ROUTES = [
  { path: '/', name: 'home' },
  { path: '/category/adaptive-streaming', name: 'adaptive-streaming' },
  { path: '/category/android', name: 'android' },
  { path: '/category/encoding-tools', name: 'encoding-tools' },
  { path: '/category/codecs', name: 'codecs' },
  { path: '/subcategory/introduction', name: 'introduction' },
  { path: '/subcategory/ffmpeg', name: 'ffmpeg' },
  { path: '/subcategory/learning-resources', name: 'learning-resources' }
];

async function ensureScreenshotDir() {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating screenshot directory:', error);
  }
}

async function runMobileTests() {
  console.log('🚀 Starting comprehensive mobile tests...\n');
  
  await ensureScreenshotDir();
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: MOBILE_VIEWPORT
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
  const results = {
    passed: 0,
    failed: 0,
    issues: []
  };

  try {
    // Test 1: Home page mobile experience
    console.log('📱 Testing home page mobile experience...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Check mobile menu
    const menuButton = await page.locator('button[aria-label="Toggle menu"], button:has(svg.lucide-menu)').first();
    if (await menuButton.isVisible()) {
      results.passed++;
      console.log('✅ Mobile menu button visible');
    } else {
      results.failed++;
      results.issues.push('Mobile menu button not visible on home page');
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'home-mobile.png'),
      fullPage: true 
    });

    // Test 2: Navigation functionality
    console.log('\n🧭 Testing navigation functionality...');
    await menuButton.click();
    await page.waitForTimeout(300);
    
    const sidebar = await page.locator('aside, [role="navigation"]').first();
    if (await sidebar.isVisible()) {
      results.passed++;
      console.log('✅ Sidebar opens correctly');
      await page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, 'sidebar-open.png') 
      });
    } else {
      results.failed++;
      results.issues.push('Sidebar does not open on mobile');
    }

    // Test 3: Test each route
    console.log('\n🔄 Testing category and subcategory pages...');
    for (const route of TEST_ROUTES) {
      console.log(`\n  Testing ${route.name}...`);
      await page.goto(`${BASE_URL}${route.path}`);
      await page.waitForLoadState('networkidle');
      
      // Check for 404 or error
      const pageContent = await page.content();
      if (pageContent.includes('Did you forget to add the page to the router?') || 
          pageContent.includes('404')) {
        results.failed++;
        results.issues.push(`${route.name} page shows 404 error`);
        console.log(`  ❌ ${route.name} page not found`);
      } else {
        // Check if content loads
        const hasContent = await page.locator('h1, h2, [class*="resource"], [class*="card"]').first().isVisible();
        if (hasContent) {
          results.passed++;
          console.log(`  ✅ ${route.name} page loads with content`);
        } else {
          results.failed++;
          results.issues.push(`${route.name} page loads but has no content`);
          console.log(`  ❌ ${route.name} page has no content`);
        }
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: path.join(SCREENSHOT_DIR, `${route.name}-mobile.png`),
        fullPage: true 
      });
    }

    // Test 4: Touch targets
    console.log('\n👆 Testing touch target sizes...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const buttons = await page.locator('button, a, [role="button"]').all();
    let tooSmallTargets = 0;
    
    for (const button of buttons.slice(0, 10)) { // Check first 10 buttons
      const box = await button.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        tooSmallTargets++;
      }
    }
    
    if (tooSmallTargets === 0) {
      results.passed++;
      console.log('✅ All touch targets meet minimum size requirements');
    } else {
      results.failed++;
      results.issues.push(`${tooSmallTargets} touch targets are too small`);
      console.log(`❌ ${tooSmallTargets} touch targets are below 44x44 pixels`);
    }

    // Test 5: Search functionality
    console.log('\n🔍 Testing mobile search...');
    const searchButton = await page.locator('button:has-text("Search"), button:has(svg.lucide-search)').first();
    if (await searchButton.isVisible()) {
      await searchButton.click();
      await page.waitForTimeout(300);
      
      const searchDialog = await page.locator('[role="dialog"]:has(input)').first();
      if (await searchDialog.isVisible()) {
        results.passed++;
        console.log('✅ Search dialog opens on mobile');
        
        // Test search input
        const searchInput = await searchDialog.locator('input').first();
        await searchInput.type('android');
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: path.join(SCREENSHOT_DIR, 'search-results-mobile.png') 
        });
      } else {
        results.failed++;
        results.issues.push('Search dialog does not open on mobile');
      }
    }

    // Test 6: Performance check
    console.log('\n⚡ Testing performance...');
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });
    
    if (metrics.loadComplete < 3000) {
      results.passed++;
      console.log(`✅ Page loads in ${metrics.loadComplete}ms`);
    } else {
      results.failed++;
      results.issues.push(`Page load time too slow: ${metrics.loadComplete}ms`);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    results.failed++;
    results.issues.push(`Test execution error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
  
  if (results.issues.length > 0) {
    console.log('\n🔴 Issues Found:');
    results.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  // Write detailed report
  const report = {
    timestamp: new Date().toISOString(),
    viewport: MOBILE_VIEWPORT,
    results: {
      total: results.passed + results.failed,
      passed: results.passed,
      failed: results.failed,
      successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(2) + '%'
    },
    issues: results.issues,
    screenshots: await fs.readdir(SCREENSHOT_DIR)
  };
  
  await fs.writeFile(
    path.join(SCREENSHOT_DIR, 'test-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Detailed report saved to:', path.join(SCREENSHOT_DIR, 'test-report.json'));
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runMobileTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});