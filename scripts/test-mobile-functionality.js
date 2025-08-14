import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mobile device configurations for testing
const MOBILE_DEVICES = [
  {
    name: 'iPhone 12',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'iPhone SE',
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Samsung Galaxy S21',
    viewport: { width: 384, height: 854 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
  },
  {
    name: 'iPad',
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  }
];

const DESKTOP_BASE_URL = 'http://localhost:5000';

async function testMobileFunctionality() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for CI/CD
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {};

  for (const device of MOBILE_DEVICES) {
    console.log(`\n🔍 Testing ${device.name}...`);
    
    const page = await browser.newPage();
    await page.setViewport(device.viewport);
    await page.setUserAgent(device.userAgent);

    try {
      // Test results for this device
      const deviceResults = {
        device: device.name,
        viewport: device.viewport,
        tests: {}
      };

      // Test 1: Home page loads properly
      console.log('  📱 Testing home page load...');
      await page.goto(DESKTOP_BASE_URL, { waitUntil: 'networkidle2' });
      await page.waitForSelector('[data-testid="resource-grid"], .grid', { timeout: 10000 });
      
      const homePageLoaded = await page.evaluate(() => {
        const resources = document.querySelectorAll('[data-testid="resource-card"], .grid > *');
        return resources.length > 0;
      });
      
      deviceResults.tests.homePageLoad = homePageLoaded;
      console.log(`    ✅ Home page loaded: ${homePageLoaded}`);
      
      await page.screenshot({ 
        path: join(__dirname, '../test-screenshots', `${device.name.replace(/\s+/g, '-')}-home.png`),
        fullPage: true 
      });

      // Test 2: Resource popover functionality
      console.log('  📱 Testing resource popover...');
      
      // Find and click first resource
      const firstResource = await page.$('.grid > * [role="button"], .grid > * [data-testid="resource-card"]');
      if (firstResource) {
        // Get the bounding box before clicking
        const resourceBox = await firstResource.boundingBox();
        console.log(`    Resource position: ${JSON.stringify(resourceBox)}`);
        
        // Click the resource
        await firstResource.click();
        
        // Wait for dialog to appear
        await page.waitForSelector('[data-radix-dialog-content]', { timeout: 5000 });
        
        // Check if dialog is properly positioned within viewport
        const dialogPosition = await page.evaluate(() => {
          const dialog = document.querySelector('[data-radix-dialog-content]');
          if (!dialog) return null;
          
          const rect = dialog.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            withinViewport: rect.left >= 0 && rect.right <= viewportWidth && rect.top >= 0 && rect.bottom <= viewportHeight,
            centered: Math.abs((rect.left + rect.width/2) - viewportWidth/2) < 20,
            viewportWidth,
            viewportHeight
          };
        });
        
        console.log(`    Dialog position: ${JSON.stringify(dialogPosition)}`);
        deviceResults.tests.dialogPositioning = dialogPosition;
        
        await page.screenshot({ 
          path: join(__dirname, '../test-screenshots', `${device.name.replace(/\s+/g, '-')}-dialog-open.png`),
          fullPage: false 
        });
        
        // Test dialog content interaction
        const openButton = await page.$('[data-radix-dialog-content] button');
        if (openButton) {
          const buttonText = await page.evaluate(btn => btn.textContent, openButton);
          console.log(`    Dialog button text: ${buttonText}`);
        }
        
        // Close dialog
        const closeButton = await page.$('[data-radix-dialog-close], [data-radix-dialog-content] button[aria-label*="close"], .lucide-x');
        if (closeButton) {
          await closeButton.click();
          await page.waitForSelector('[data-radix-dialog-content]', { hidden: true, timeout: 3000 });
        }
      }

      // Test 3: Search functionality
      console.log('  📱 Testing search...');
      const searchInput = await page.$('input[type="search"], input[placeholder*="search"]');
      if (searchInput) {
        await searchInput.click();
        await searchInput.type('FFMPEG');
        await page.waitForTimeout(1000); // Wait for debounced search
        
        const searchResults = await page.evaluate(() => {
          const resources = document.querySelectorAll('[data-testid="resource-card"], .grid > *');
          return resources.length;
        });
        
        console.log(`    Search results count: ${searchResults}`);
        deviceResults.tests.searchFunctionality = searchResults > 0;
        
        // Clear search
        await searchInput.click({ clickCount: 3 });
        await searchInput.press('Backspace');
        await page.waitForTimeout(500);
      }

      // Test 4: Category filtering
      console.log('  📱 Testing category filtering...');
      const categorySelect = await page.$('[data-radix-select-trigger]');
      if (categorySelect) {
        await categorySelect.click();
        await page.waitForSelector('[data-radix-select-content]', { timeout: 3000 });
        
        const selectOpen = await page.$('[data-radix-select-content]');
        if (selectOpen) {
          await page.screenshot({ 
            path: join(__dirname, '../test-screenshots', `${device.name.replace(/\s+/g, '-')}-select-open.png`),
            fullPage: false 
          });
          
          const selectOption = await page.$('[data-radix-select-item]:nth-child(2)');
          if (selectOption) {
            await selectOption.click();
            await page.waitForTimeout(1000);
            
            const filteredResults = await page.evaluate(() => {
              const resources = document.querySelectorAll('[data-testid="resource-card"], .grid > *');
              return resources.length;
            });
            
            console.log(`    Filtered results count: ${filteredResults}`);
            deviceResults.tests.categoryFiltering = filteredResults > 0;
          }
        }
      }

      // Test 5: Comparison mode (if implemented)
      console.log('  📱 Testing comparison mode...');
      const comparisonButton = await page.$('button:has-text("Compare"), button:has-text("Select to Compare")');
      if (comparisonButton) {
        await comparisonButton.click();
        await page.waitForTimeout(500);
        
        // Try to select a few resources for comparison
        const checkboxes = await page.$$('input[type="checkbox"][data-testid*="resource"]');
        if (checkboxes.length > 0) {
          await checkboxes[0].click();
          if (checkboxes.length > 1) {
            await checkboxes[1].click();
          }
          
          const compareButton = await page.$('button:has-text("Compare")');
          if (compareButton) {
            await compareButton.click();
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: join(__dirname, '../test-screenshots', `${device.name.replace(/\s+/g, '-')}-comparison.png`),
              fullPage: false 
            });
          }
        }
        
        deviceResults.tests.comparisonMode = checkboxes.length > 0;
      }

      // Test 6: Touch interactions
      console.log('  📱 Testing touch interactions...');
      await page.touchscreen.tap(100, 100);
      await page.waitForTimeout(200);
      
      deviceResults.tests.touchInteractions = true;

      // Test 7: Layout switcher
      console.log('  📱 Testing layout switcher...');
      const layoutButtons = await page.$$('button[data-testid*="layout"], [role="tablist"] button');
      if (layoutButtons.length > 0) {
        for (let i = 0; i < Math.min(layoutButtons.length, 3); i++) {
          await layoutButtons[i].click();
          await page.waitForTimeout(500);
          
          await page.screenshot({ 
            path: join(__dirname, '../test-screenshots', `${device.name.replace(/\s+/g, '-')}-layout-${i}.png`),
            fullPage: false 
          });
        }
        deviceResults.tests.layoutSwitcher = true;
      }

      // Final screenshot
      await page.screenshot({ 
        path: join(__dirname, '../test-screenshots', `${device.name.replace(/\s+/g, '-')}-final.png`),
        fullPage: true 
      });

      results[device.name] = deviceResults;
      console.log(`✅ ${device.name} testing completed`);

    } catch (error) {
      console.error(`❌ Error testing ${device.name}:`, error);
      results[device.name] = { error: error.message, device: device.name };
    } finally {
      await page.close();
    }
  }

  await browser.close();
  
  // Generate test report
  console.log('\n📊 MOBILE TEST REPORT');
  console.log('='.repeat(50));
  
  for (const [deviceName, result] of Object.entries(results)) {
    console.log(`\n📱 ${deviceName}:`);
    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`);
      continue;
    }
    
    for (const [testName, testResult] of Object.entries(result.tests)) {
      const status = testResult ? '✅' : '❌';
      if (typeof testResult === 'object') {
        console.log(`  ${status} ${testName}: ${JSON.stringify(testResult, null, 2)}`);
      } else {
        console.log(`  ${status} ${testName}: ${testResult}`);
      }
    }
  }
  
  // Save detailed results
  const fs = await import('fs');
  await fs.promises.writeFile(
    join(__dirname, '../test-screenshots/mobile-test-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n📁 Screenshots saved to test-screenshots/');
  console.log('📄 Detailed results saved to mobile-test-results.json');
  
  return results;
}

// Run the test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMobileFunctionality().catch(console.error);
}

export { testMobileFunctionality };