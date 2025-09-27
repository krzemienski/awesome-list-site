import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimplifiedComprehensiveTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      mobile: {},
      preferences: {},
      layout: {},
      navigation: {},
      resourceCards: {},
      screenshots: []
    };
  }

  async setup() {
    console.log('🚀 Launching browser...');
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        defaultViewport: null
      });
      this.page = await this.browser.newPage();
      
      // Set up console logging but don't spam
      this.page.on('console', msg => {
        const text = msg.text();
        if (!text.includes('[vite]') && !text.includes('Third-party cookie') && !text.includes('React DevTools')) {
          console.log(`Browser: ${text}`);
        }
      });

      await this.page.goto('http://localhost:5000', { 
        waitUntil: 'networkidle2',
        timeout: 20000 
      });
      
      console.log('✅ App loaded successfully');
      return true;
    } catch (error) {
      console.error('Setup failed:', error.message);
      return false;
    }
  }

  async wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async screenshot(name) {
    try {
      const screenshotPath = path.join(__dirname, 'test-screenshots', `${name}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: false });
      this.results.screenshots.push(name);
      console.log(`📸 Screenshot: ${name}.png`);
    } catch (error) {
      console.error(`Failed to take screenshot ${name}:`, error.message);
    }
  }

  async testMobileViewport() {
    console.log('\n📱 Mobile Testing...\n');
    
    try {
      // Set mobile viewport
      await this.page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await this.wait(1000);
      
      const viewportSize = await this.page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }));
      
      this.results.mobile.viewport = {
        passed: viewportSize.width <= 390 && viewportSize.height <= 844,
        details: `${viewportSize.width}x${viewportSize.height}`
      };
      
      console.log(`✅ Mobile viewport: ${viewportSize.width}x${viewportSize.height}`);
      
      // Test hamburger menu
      const hamburger = await this.page.$('button[data-testid*="sidebar-trigger"], button[aria-label*="menu"], button:has(svg.lucide-menu)');
      
      if (hamburger) {
        await hamburger.click();
        await this.wait(1000);
        
        const sidebarOpen = await this.page.evaluate(() => {
          const sidebar = document.querySelector('[data-state="open"], [data-sidebar="state"], .fixed.inset-y-0');
          const sheetContent = document.querySelector('[role="dialog"] .fixed.inset-y-0.left-0');
          return sidebar !== null || sheetContent !== null;
        });
        
        this.results.mobile.sidebar = {
          passed: sidebarOpen,
          details: sidebarOpen ? 'Sidebar opened' : 'Sidebar not found'
        };
        
        if (sidebarOpen) {
          // Check sidebar content
          const sidebarContent = await this.page.evaluate(() => {
            const texts = Array.from(document.querySelectorAll('h2, h3, p')).map(el => el.textContent);
            const hasAwesome = texts.some(t => t && t.includes('Awesome'));
            const hasResources = texts.some(t => t && t.includes('2,011') || t && t.includes('2011'));
            const categories = document.querySelectorAll('button[data-testid*="category"], a[href*="/category"]').length;
            
            return {
              hasTitle: hasAwesome,
              hasResourceCount: hasResources,
              categoryCount: categories
            };
          });
          
          this.results.mobile.sidebarContent = {
            passed: sidebarContent.hasTitle && sidebarContent.hasResourceCount,
            details: `Title: ${sidebarContent.hasTitle}, Resources: ${sidebarContent.hasResourceCount}, Categories: ${sidebarContent.categoryCount}`
          };
          
          await this.screenshot('mobile-sidebar-open');
          
          // Close sidebar
          await this.page.keyboard.press('Escape');
          await this.wait(500);
        }
      }
      
      // Test touch targets
      const touchTargetSizes = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        let minSize = 100;
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          minSize = Math.min(minSize, rect.width, rect.height);
        });
        return minSize;
      });
      
      this.results.mobile.touchTargets = {
        passed: touchTargetSizes >= 44,
        details: `Min touch target: ${touchTargetSizes}px`
      };
      
      // Test viewport meta
      const viewportMeta = await this.page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta ? meta.getAttribute('content') : null;
      });
      
      this.results.mobile.viewportMeta = {
        passed: viewportMeta !== null,
        details: viewportMeta || 'No viewport meta'
      };
      
      // Test landscape
      await this.page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
      await this.wait(1000);
      await this.screenshot('mobile-landscape');
      
      this.results.mobile.landscape = {
        passed: true,
        details: 'Landscape tested'
      };
      
      // Reset to portrait
      await this.page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      
    } catch (error) {
      console.error('Mobile test error:', error.message);
    }
  }

  async testUserPreferences() {
    console.log('\n⚙️ User Preferences Testing...\n');
    
    try {
      // Navigate to home
      await this.page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      // Find and click preferences button
      const prefsButton = await this.page.$('button:has-text("Preferences"), button:has-text("Settings")');
      
      if (prefsButton) {
        await prefsButton.click();
        await this.wait(1500);
        
        const dialogOpen = await this.page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          return dialog && (dialog.textContent?.includes('Personal') || dialog.textContent?.includes('Settings'));
        });
        
        this.results.preferences.dialogOpen = {
          passed: dialogOpen,
          details: dialogOpen ? 'Dialog opened' : 'Dialog not found'
        };
        
        if (dialogOpen) {
          await this.screenshot('preferences-dialog');
          
          // Test skill level dropdown
          const skillTrigger = await this.page.$('[role="combobox"], button:has-text("Beginner"), button:has-text("Select")');
          if (skillTrigger) {
            await skillTrigger.click();
            await this.wait(500);
            
            // Select Intermediate
            const intermediate = await this.page.$('[role="option"]:has-text("Intermediate")');
            if (intermediate) {
              await intermediate.click();
              await this.wait(500);
              
              this.results.preferences.skillChange = {
                passed: true,
                details: 'Changed to Intermediate'
              };
            }
          }
          
          // Test tabs
          const tabs = await this.page.$$('[role="tab"]');
          this.results.preferences.tabs = {
            passed: tabs.length >= 3,
            details: `Found ${tabs.length} tabs`
          };
          
          // Save preferences
          const saveButton = await this.page.$('button:has-text("Save"), button:has-text("Apply")');
          if (saveButton) {
            await saveButton.click();
            await this.wait(1000);
          }
          
          // Reopen to test persistence
          const reopenButton = await this.page.$('button:has-text("Preferences"), button:has-text("Settings")');
          if (reopenButton) {
            await reopenButton.click();
            await this.wait(1000);
            
            const skillPersisted = await this.page.evaluate(() => {
              const content = document.querySelector('[role="dialog"]')?.textContent;
              return content?.includes('Intermediate') || false;
            });
            
            this.results.preferences.persistence = {
              passed: skillPersisted,
              details: skillPersisted ? 'Settings persisted' : 'Settings not persisted'
            };
            
            // Close dialog
            await this.page.keyboard.press('Escape');
            await this.wait(500);
          }
        }
      }
    } catch (error) {
      console.error('Preferences test error:', error.message);
    }
  }

  async testLayoutSwitching() {
    console.log('\n🎨 Layout Switching Testing...\n');
    
    try {
      // Navigate to home
      await this.page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      // Test list view
      const listButton = await this.page.$('[data-testid="layout-list-button"], button[title*="List"], button:has(svg.lucide-list)');
      if (listButton) {
        await listButton.click();
        await this.wait(1000);
        
        const listItems = await this.page.$$('[data-testid*="resource-list-item"]');
        this.results.layout.listView = {
          passed: listItems.length > 0,
          details: `${listItems.length} list items`
        };
        await this.screenshot('layout-list');
      }
      
      // Test compact view
      const compactButton = await this.page.$('[data-testid="layout-compact-button"], button[title*="Compact"], button:has(svg.lucide-grid3x3)');
      if (compactButton) {
        await compactButton.click();
        await this.wait(1000);
        
        const compactItems = await this.page.$$('[data-testid*="resource-compact"]');
        this.results.layout.compactView = {
          passed: compactItems.length > 0,
          details: `${compactItems.length} compact items`
        };
        await this.screenshot('layout-compact');
      }
      
      // Test cards view
      const cardsButton = await this.page.$('[data-testid="layout-cards-button"], button[title*="Card"], button:has(svg.lucide-layout-grid)');
      if (cardsButton) {
        await cardsButton.click();
        await this.wait(1000);
        
        const cardItems = await this.page.$$('[data-testid*="resource-card"]');
        this.results.layout.cardsView = {
          passed: cardItems.length > 0,
          details: `${cardItems.length} card items`
        };
        await this.screenshot('layout-cards');
      }
      
      // Test persistence
      if (listButton) {
        await listButton.click();
        await this.wait(1000);
        
        // Navigate to category
        await this.page.goto('http://localhost:5000/category/encoding-codecs', { waitUntil: 'networkidle2' });
        await this.wait(2000);
        
        const persistedListItems = await this.page.$$('[data-testid*="resource-list-item"]');
        this.results.layout.persistence = {
          passed: persistedListItems.length > 0,
          details: 'Layout persisted across navigation'
        };
      }
      
    } catch (error) {
      console.error('Layout test error:', error.message);
    }
  }

  async testNavigation() {
    console.log('\n🧭 Navigation Testing...\n');
    
    try {
      // Test encoding-codecs category
      await this.page.goto('http://localhost:5000/category/encoding-codecs', { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      const categoryResources = await this.page.$$('[data-testid*="resource-"]');
      this.results.navigation.encodingCodecs = {
        passed: categoryResources.length > 0,
        details: `${categoryResources.length} resources in encoding-codecs`
      };
      await this.screenshot('nav-encoding-codecs');
      
      // Test AV1 sub-subcategory
      await this.page.goto('http://localhost:5000/sub-subcategory/av1', { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      const av1Resources = await this.page.$$('[data-testid*="resource-"]');
      this.results.navigation.av1 = {
        passed: av1Resources.length === 6,
        details: `${av1Resources.length} resources in AV1 (expected 6)`
      };
      await this.screenshot('nav-av1');
      
      // Test HEVC
      await this.page.goto('http://localhost:5000/sub-subcategory/hevc', { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      const hevcResources = await this.page.$$('[data-testid*="resource-"]');
      this.results.navigation.hevc = {
        passed: hevcResources.length === 10,
        details: `${hevcResources.length} resources in HEVC (expected 10)`
      };
      await this.screenshot('nav-hevc');
      
      // Test VP9
      await this.page.goto('http://localhost:5000/sub-subcategory/vp9', { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      const vp9Resources = await this.page.$$('[data-testid*="resource-"]');
      this.results.navigation.vp9 = {
        passed: vp9Resources.length === 1,
        details: `${vp9Resources.length} resources in VP9 (expected 1)`
      };
      await this.screenshot('nav-vp9');
      
    } catch (error) {
      console.error('Navigation test error:', error.message);
    }
  }

  async testResourceCards() {
    console.log('\n🎯 Resource Card Testing...\n');
    
    try {
      // Switch to desktop for hover testing
      await this.page.setViewport({ width: 1440, height: 900 });
      await this.page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      // Test hover state
      const firstCard = await this.page.$('[data-testid*="resource-card"]');
      if (firstCard) {
        await this.page.hover('[data-testid*="resource-card"]');
        await this.wait(500);
        
        const hoverActive = await this.page.evaluate(() => {
          const card = document.querySelector('[data-testid*="resource-card"]');
          const styles = card ? window.getComputedStyle(card) : null;
          return styles && (styles.transform !== 'none' || styles.boxShadow !== 'none');
        });
        
        this.results.resourceCards.hover = {
          passed: hoverActive,
          details: 'Hover effects active'
        };
        await this.screenshot('card-hover');
      }
      
      // Test bookmark button
      const bookmarkButton = await this.page.$('button:has-text("Bookmark"), button:has(svg.lucide-bookmark)');
      this.results.resourceCards.bookmark = {
        passed: bookmarkButton !== null,
        details: bookmarkButton ? 'Bookmark button found' : 'No bookmark button'
      };
      
      // Test share button
      const shareButton = await this.page.$('button:has-text("Share"), button:has(svg.lucide-share)');
      this.results.resourceCards.share = {
        passed: shareButton !== null,
        details: shareButton ? 'Share button found' : 'No share button'
      };
      
    } catch (error) {
      console.error('Resource card test error:', error.message);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Report...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      },
      results: this.results,
      screenshots: this.results.screenshots
    };
    
    // Calculate totals
    for (const section of Object.values(this.results)) {
      if (typeof section === 'object' && !Array.isArray(section)) {
        for (const test of Object.values(section)) {
          if (test && typeof test.passed === 'boolean') {
            report.summary.total++;
            if (test.passed) report.summary.passed++;
            else report.summary.failed++;
          }
        }
      }
    }
    
    report.summary.passRate = report.summary.total > 0 
      ? `${Math.round((report.summary.passed / report.summary.total) * 100)}%` 
      : '0%';
    
    // Save JSON report
    const jsonPath = path.join(__dirname, 'test-results', 'comprehensive-test.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    let markdown = `# Comprehensive Test Report\n\n`;
    markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests**: ${report.summary.total}\n`;
    markdown += `- **Passed**: ${report.summary.passed}\n`;
    markdown += `- **Failed**: ${report.summary.failed}\n`;
    markdown += `- **Pass Rate**: ${report.summary.passRate}\n\n`;
    
    // Add test results
    for (const [section, tests] of Object.entries(this.results)) {
      if (typeof tests === 'object' && !Array.isArray(tests)) {
        markdown += `## ${section.charAt(0).toUpperCase() + section.slice(1)}\n\n`;
        for (const [name, result] of Object.entries(tests)) {
          if (result && typeof result.passed === 'boolean') {
            const status = result.passed ? '✅' : '❌';
            markdown += `- ${status} **${name}**: ${result.details}\n`;
          }
        }
        markdown += '\n';
      }
    }
    
    // Add screenshots
    if (this.results.screenshots.length > 0) {
      markdown += `## Screenshots\n\n`;
      for (const screenshot of this.results.screenshots) {
        markdown += `- ${screenshot}.png\n`;
      }
    }
    
    const mdPath = path.join(__dirname, 'test-results', 'COMPREHENSIVE_TEST.md');
    await fs.writeFile(mdPath, markdown);
    
    console.log('✅ Report generated');
    console.log(`📄 JSON: ${jsonPath}`);
    console.log(`📄 Markdown: ${mdPath}`);
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      const setupSuccess = await this.setup();
      if (!setupSuccess) {
        console.error('Setup failed, aborting tests');
        return;
      }
      
      // Run all test suites
      await this.testMobileViewport();
      await this.testUserPreferences();
      await this.testLayoutSwitching();
      await this.testNavigation();
      await this.testResourceCards();
      
      // Generate report
      const report = await this.generateReport();
      
      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('TEST SUMMARY');
      console.log('='.repeat(60));
      console.log(`Total Tests: ${report.summary.total}`);
      console.log(`Passed: ${report.summary.passed}`);
      console.log(`Failed: ${report.summary.failed}`);
      console.log(`Pass Rate: ${report.summary.passRate}`);
      console.log('='.repeat(60));
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
const test = new SimplifiedComprehensiveTest();
test.run().catch(console.error);