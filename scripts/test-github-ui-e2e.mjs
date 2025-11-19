import puppeteer from 'puppeteer';

/**
 * TIER 3: UI E2E Test for GitHub Export
 * Test complete user workflow in admin panel
 */

class GitHubExportUITest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:5000';
    this.results = {
      tests: [],
      screenshots: [],
      errors: []
    };
  }

  addResult(name, passed, message) {
    this.results.tests.push({ name, passed, message });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}: ${message}`);
  }

  async initialize() {
    console.log('\n=== TIER 3: UI E2E Test for GitHub Export ===\n');
    console.log('🚀 Initializing browser...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.results.errors.push({
          type: 'console',
          message: msg.text()
        });
      }
    });

    console.log('✅ Browser initialized\n');
  }

  async captureScreenshot(name) {
    const screenshotPath = `test-screenshots/github-export-${name}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.results.screenshots.push({
      name,
      path: screenshotPath,
      timestamp: new Date().toISOString()
    });
    console.log(`📸 Screenshot: ${screenshotPath}`);
    return screenshotPath;
  }

  async testAdminPageAccess() {
    console.log('Test 1: Accessing admin page...');
    
    try {
      // Try to navigate to admin page
      const response = await this.page.goto(`${this.baseUrl}/admin`, {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
      
      await this.captureScreenshot('01-admin-page');
      
      // Check if we're on login page or admin page
      const currentUrl = this.page.url();
      const isLoginPage = currentUrl.includes('/login');
      
      if (isLoginPage) {
        this.addResult(
          'Admin page access',
          false,
          'Redirected to login page - authentication required'
        );
        
        // Try to find login form
        const hasLoginForm = await this.page.$('form') !== null;
        this.addResult(
          'Login form available',
          hasLoginForm,
          hasLoginForm ? 'Login form found' : 'Login form not found'
        );
        
        return false;
      } else {
        this.addResult(
          'Admin page access',
          true,
          'Successfully accessed admin page'
        );
        return true;
      }
    } catch (error) {
      this.addResult(
        'Admin page access',
        false,
        `Error: ${error.message}`
      );
      return false;
    }
  }

  async testGitHubSyncPanel() {
    console.log('\nTest 2: Testing GitHub Sync panel UI...');
    
    try {
      // Look for GitHub Sync tab or panel
      const tabSelectors = [
        '[role="tab"]:has-text("GitHub Sync")',
        'button:has-text("GitHub Sync")',
        '[data-testid*="github"]',
        '[data-testid*="sync"]'
      ];
      
      let tabFound = false;
      let clickedTab = false;
      
      for (const selector of tabSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.click(selector);
          tabFound = true;
          clickedTab = true;
          await this.page.waitForTimeout(1000);
          break;
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!tabFound) {
        // Check if content is already visible
        const hasRepoInput = await this.page.$('[data-testid="input-repo-url"]') !== null;
        if (hasRepoInput) {
          tabFound = true;
          console.log('ℹ️  GitHub Sync content already visible');
        }
      }
      
      this.addResult(
        'GitHub Sync tab found',
        tabFound,
        tabFound ? (clickedTab ? 'Tab clicked' : 'Content visible') : 'Tab not found'
      );
      
      await this.captureScreenshot('02-github-sync-panel');
      
      return tabFound;
    } catch (error) {
      this.addResult(
        'GitHub Sync tab found',
        false,
        `Error: ${error.message}`
      );
      return false;
    }
  }

  async testRepositoryInput() {
    console.log('\nTest 3: Testing repository URL input...');
    
    try {
      // Find repository URL input
      const inputSelector = '[data-testid="input-repo-url"]';
      await this.page.waitForSelector(inputSelector, { timeout: 5000 });
      
      this.addResult(
        'Repository URL input visible',
        true,
        'Input field found'
      );
      
      // Clear and enter test repository URL
      await this.page.click(inputSelector, { clickCount: 3 });
      await this.page.keyboard.press('Backspace');
      const testRepoUrl = 'krzemienski/awesome-video';
      await this.page.type(inputSelector, testRepoUrl);
      
      await this.page.waitForTimeout(500);
      await this.captureScreenshot('03-repo-url-entered');
      
      // Verify input value
      const inputValue = await this.page.$eval(inputSelector, el => el.value);
      this.addResult(
        'Repository URL entered',
        inputValue === testRepoUrl,
        `Value: ${inputValue}`
      );
      
      return true;
    } catch (error) {
      this.addResult(
        'Repository URL input',
        false,
        `Error: ${error.message}`
      );
      return false;
    }
  }

  async testExportButton() {
    console.log('\nTest 4: Testing export button functionality...');
    
    try {
      // Find export button - try multiple selectors
      const buttonSelectors = [
        '[data-testid="button-export-github"]',
        'button:has-text("Export")',
        'button:has-text("Export to GitHub")',
        'button:has-text("Export Resources")'
      ];
      
      let exportButton = null;
      let usedSelector = null;
      
      for (const selector of buttonSelectors) {
        try {
          exportButton = await this.page.$(selector);
          if (exportButton) {
            usedSelector = selector;
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!exportButton) {
        this.addResult(
          'Export button found',
          false,
          'Export button not found with any selector'
        );
        return false;
      }
      
      this.addResult(
        'Export button found',
        true,
        `Found using: ${usedSelector}`
      );
      
      // Check if button is enabled
      const isDisabled = await this.page.$eval(usedSelector, el => el.disabled);
      this.addResult(
        'Export button enabled',
        !isDisabled,
        isDisabled ? 'Button is disabled' : 'Button is enabled'
      );
      
      if (isDisabled) {
        await this.captureScreenshot('04-export-button-disabled');
        return false;
      }
      
      // NOTE: We won't actually click the button to avoid triggering a real export
      // Instead, we'll verify the button exists and is ready to be clicked
      await this.captureScreenshot('04-export-button-ready');
      
      this.addResult(
        'Export button ready',
        true,
        'Button is ready to trigger export (not clicked for safety)'
      );
      
      return true;
    } catch (error) {
      this.addResult(
        'Export button test',
        false,
        `Error: ${error.message}`
      );
      return false;
    }
  }

  async testUIElements() {
    console.log('\nTest 5: Verifying all UI elements...');
    
    try {
      // Check for import button
      const hasImportButton = await this.page.$('[data-testid="button-import-github"]') !== null;
      this.addResult(
        'Import button present',
        hasImportButton,
        hasImportButton ? 'Import button found' : 'Import button not found'
      );
      
      // Check for reset button
      const hasResetButton = await this.page.$('[data-testid="button-reset-repo"]') !== null;
      this.addResult(
        'Reset button present',
        hasResetButton,
        hasResetButton ? 'Reset button found' : 'Reset button not found'
      );
      
      // Check for sync history or status indicators
      const hasSyncElements = await this.page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('sync') || text.includes('history') || text.includes('status');
      });
      
      this.addResult(
        'Sync status elements present',
        hasSyncElements,
        hasSyncElements ? 'Sync status information found' : 'No sync status found'
      );
      
      await this.captureScreenshot('05-ui-elements');
      
      return true;
    } catch (error) {
      this.addResult(
        'UI elements test',
        false,
        `Error: ${error.message}`
      );
      return false;
    }
  }

  async run() {
    try {
      await this.initialize();
      
      // Test 1: Admin page access
      const hasAdminAccess = await this.testAdminPageAccess();
      
      if (!hasAdminAccess) {
        console.log('\n⚠️  Cannot proceed without admin access.');
        console.log('ℹ️  This is expected if authentication is required.');
        console.log('ℹ️  Manual testing required for authenticated workflows.\n');
      } else {
        // Test 2: GitHub Sync panel
        const hasSyncPanel = await this.testGitHubSyncPanel();
        
        if (hasSyncPanel) {
          // Test 3: Repository input
          await this.testRepositoryInput();
          
          // Test 4: Export button
          await this.testExportButton();
          
          // Test 5: UI elements
          await this.testUIElements();
        }
      }
      
      // Print summary
      console.log('\n=== Test Summary ===\n');
      const passed = this.results.tests.filter(t => t.passed).length;
      const total = this.results.tests.length;
      const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
      
      console.log(`Total Tests: ${total}`);
      console.log(`Passed: ${passed}`);
      console.log(`Failed: ${total - passed}`);
      console.log(`Pass Rate: ${passRate}%\n`);
      
      if (this.results.errors.length > 0) {
        console.log('Console Errors:');
        this.results.errors.forEach((err, i) => {
          console.log(`  ${i + 1}. ${err.message}`);
        });
        console.log('');
      }
      
      if (this.results.screenshots.length > 0) {
        console.log('Screenshots captured:');
        this.results.screenshots.forEach(ss => {
          console.log(`  - ${ss.path}`);
        });
        console.log('');
      }
      
      if (total === 0) {
        console.log('ℹ️  No tests could be run due to authentication requirements.\n');
      } else if (passed === total) {
        console.log('🎉 All TIER 3 UI tests passed!\n');
      } else {
        console.log('⚠️  Some UI tests failed. See details above.\n');
      }
      
      return passed === total && total > 0;
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      console.error(error.stack);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Browser closed\n');
      }
    }
  }
}

// Run the test
const test = new GitHubExportUITest();
test.run()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
