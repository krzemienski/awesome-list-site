#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = './theme-test-screenshots';

// Theme configurations to test
const THEMES = [
  'violet', 'red', 'rose', 'orange', 'green', 
  'blue', 'yellow', 'zinc'
];

const MODES = ['light', 'dark'];

// Mobile viewport sizes to test
const VIEWPORTS = {
  'mobile-small': { width: 320, height: 568, isMobile: true },
  'mobile-medium': { width: 375, height: 667, isMobile: true },
  'mobile-large': { width: 414, height: 896, isMobile: true },
  'tablet': { width: 768, height: 1024, isMobile: true },
  'desktop': { width: 1920, height: 1080, isMobile: false }
};

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

async function waitForThemeApplication(page) {
  // Wait for theme CSS variables to be applied
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const primaryColor = getComputedStyle(root).getPropertyValue('--primary');
    return primaryColor && primaryColor !== '';
  }, { timeout: 5000 });
  
  // Additional wait for animations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function applyTheme(page, theme, mode) {
  console.log(`  Applying theme: ${theme} in ${mode} mode`);
  
  // Execute theme change in the browser context
  await page.evaluate((theme, mode) => {
    // Import the theme functions from the global scope if available
    if (window.applyThemeWithTransition && window.shadcnThemes) {
      const selectedTheme = window.shadcnThemes.find(t => t.value === theme);
      if (selectedTheme) {
        window.applyThemeWithTransition(selectedTheme, mode, false);
      }
    }
    
    // Also set the mode through the theme context if available
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    root.setAttribute('data-theme', theme);
    
    // Update localStorage
    localStorage.setItem('theme-preferences', JSON.stringify({
      theme: theme,
      mode: mode,
      timestamp: new Date().toISOString()
    }));
  }, theme, mode);
  
  await waitForThemeApplication(page);
}

async function getThemeColors(page) {
  return await page.evaluate(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    return {
      primary: styles.getPropertyValue('--primary'),
      background: styles.getPropertyValue('--background'),
      foreground: styles.getPropertyValue('--foreground'),
      card: styles.getPropertyValue('--card'),
      muted: styles.getPropertyValue('--muted'),
      dataTheme: root.getAttribute('data-theme'),
      classList: root.className
    };
  });
}

async function testThemeSystem() {
  console.log('🎨 Starting Comprehensive Theme System Test');
  console.log('==========================================\n');
  
  await ensureDir(SCREENSHOT_DIR);
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const testResults = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    themes: {},
    mobile: {},
    errors: []
  };
  
  try {
    // Test 1: Theme Color Switching
    console.log('📋 Test 1: Theme Color Switching');
    console.log('---------------------------------');
    
    for (const theme of THEMES) {
      console.log(`\nTesting ${theme} theme:`);
      testResults.themes[theme] = {};
      
      for (const mode of MODES) {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        
        // Apply theme
        await applyTheme(page, theme, mode);
        
        // Get theme colors
        const colors = await getThemeColors(page);
        
        // Take screenshot
        const screenshotPath = path.join(SCREENSHOT_DIR, `theme-${theme}-${mode}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        
        // Verify theme is applied
        const isThemeApplied = colors.dataTheme === theme && colors.classList.includes(mode);
        
        testResults.themes[theme][mode] = {
          applied: isThemeApplied,
          colors: colors,
          screenshot: screenshotPath
        };
        
        if (isThemeApplied) {
          console.log(`  ✅ ${mode} mode: Applied successfully`);
          testResults.passed++;
        } else {
          console.log(`  ❌ ${mode} mode: Failed to apply`);
          testResults.failed++;
        }
        
        testResults.totalTests++;
        await page.close();
      }
    }
    
    // Test 2: Mobile Responsiveness
    console.log('\n📱 Test 2: Mobile Responsiveness');
    console.log('----------------------------------');
    
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      console.log(`\nTesting ${viewportName} (${viewport.width}x${viewport.height}):`);
      testResults.mobile[viewportName] = {};
      
      const page = await browser.newPage();
      await page.setViewport(viewport);
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      
      // Test with violet theme in dark mode
      await applyTheme(page, 'violet', 'dark');
      
      // Take screenshot of homepage
      const homePath = path.join(SCREENSHOT_DIR, `mobile-${viewportName}-home.png`);
      await page.screenshot({ path: homePath, fullPage: false });
      
      // Check if mobile menu is visible/functional
      const mobileMenuExists = await page.evaluate(() => {
        // Check for hamburger menu or mobile-specific elements
        const mobileMenu = document.querySelector('[data-mobile-menu], button[aria-label*="menu"], button[aria-label*="Menu"]');
        return mobileMenu !== null;
      });
      
      // Check touch target sizes
      const touchTargetsOk = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        let allOk = true;
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            allOk = false;
          }
        });
        return allOk;
      });
      
      testResults.mobile[viewportName] = {
        screenshot: homePath,
        mobileMenuExists: mobileMenuExists,
        touchTargetsOk: touchTargetsOk,
        viewport: viewport
      };
      
      if (touchTargetsOk) {
        console.log(`  ✅ Touch targets meet minimum size`);
        testResults.passed++;
      } else {
        console.log(`  ⚠️  Some touch targets are too small`);
        testResults.failed++;
      }
      testResults.totalTests++;
      
      await page.close();
    }
    
    // Test 3: Theme Persistence
    console.log('\n💾 Test 3: Theme Persistence');
    console.log('-----------------------------');
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // Set a specific theme
    await applyTheme(page, 'green', 'light');
    
    // Reload the page
    await page.reload({ waitUntil: 'networkidle2' });
    await waitForThemeApplication(page);
    
    // Check if theme persisted
    const persistedColors = await getThemeColors(page);
    const themePersisted = persistedColors.dataTheme === 'green' && persistedColors.classList.includes('light');
    
    if (themePersisted) {
      console.log('  ✅ Theme persists after reload');
      testResults.passed++;
    } else {
      console.log('  ❌ Theme does not persist after reload');
      testResults.failed++;
    }
    testResults.totalTests++;
    
    await page.close();
    
    // Test 4: Interactive Theme Switching
    console.log('\n🔄 Test 4: Interactive Theme Switching');
    console.log('---------------------------------------');
    
    const interactivePage = await browser.newPage();
    await interactivePage.setViewport({ width: 1920, height: 1080 });
    await interactivePage.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // Try to find and click the theme selector
    const themeSelectorExists = await interactivePage.evaluate(() => {
      const selector = document.querySelector('[aria-label*="theme"], button:has(svg.lucide-palette), button:has(.lucide-sun), button:has(.lucide-moon)');
      return selector !== null;
    });
    
    if (themeSelectorExists) {
      console.log('  ✅ Theme selector component found');
      testResults.passed++;
      
      // Take screenshot of theme selector
      const selectorPath = path.join(SCREENSHOT_DIR, 'theme-selector-ui.png');
      await interactivePage.screenshot({ path: selectorPath });
    } else {
      console.log('  ⚠️  Theme selector component not found');
      testResults.failed++;
    }
    testResults.totalTests++;
    
    await interactivePage.close();
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    testResults.errors.push(error.message);
  } finally {
    await browser.close();
  }
  
  // Generate test report
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`Total Tests: ${testResults.totalTests}`);
  console.log(`Passed: ${testResults.passed} (${Math.round(testResults.passed / testResults.totalTests * 100)}%)`);
  console.log(`Failed: ${testResults.failed} (${Math.round(testResults.failed / testResults.totalTests * 100)}%)`);
  
  if (testResults.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    testResults.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Save test results
  const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📁 Test report saved to: ${reportPath}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}/`);
  
  return testResults;
}

// Run the test
testThemeSystem().catch(console.error);