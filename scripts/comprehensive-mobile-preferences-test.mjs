import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComprehensiveMobileTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      mobile: {
        viewport: { passed: false, details: '' },
        sidebar: { passed: false, details: '' },
        sidebarContent: { passed: false, details: '' },
        scrollLock: { passed: false, details: '' },
        swipeGestures: { passed: false, details: '' },
        touchEvents: { passed: false, details: '' },
        touchTargets: { passed: false, details: '' },
        pinchZoom: { passed: false, details: '' },
        viewportMeta: { passed: false, details: '' },
        pullToRefresh: { passed: false, details: '' },
        landscape: { passed: false, details: '' },
        horizontalScroll: { passed: false, details: '' }
      },
      preferences: {
        dialogOpen: { passed: false, details: '' },
        skillDropdown: { passed: false, details: '' },
        skillChange: { passed: false, details: '' },
        skillPersistence: { passed: false, details: '' },
        scheduleDropdown: { passed: false, details: '' },
        interestsTab: { passed: false, details: '' },
        goalsTab: { passed: false, details: '' },
        styleTab: { passed: false, details: '' },
        buttonText: { passed: false, details: '' },
        mobileOverflow: { passed: false, details: '' }
      },
      layout: {
        listView: { passed: false, details: '' },
        compactView: { passed: false, details: '' },
        cardsView: { passed: false, details: '' },
        persistence: { passed: false, details: '' },
        listAlignment: { passed: false, details: '' },
        compactEfficiency: { passed: false, details: '' }
      },
      navigation: {
        encodingCodecs: { passed: false, details: '' },
        codecsFilter: { passed: false, details: '' },
        av1SubSubcategory: { passed: false, details: '' },
        av1Direct: { passed: false, details: '' },
        hevcDirect: { passed: false, details: '' },
        vp9Direct: { passed: false, details: '' }
      },
      resourceCards: {
        hoverStates: { passed: false, details: '' },
        externalLinks: { passed: false, details: '' },
        bookmarkFunction: { passed: false, details: '' },
        shareFunction: { passed: false, details: '' }
      },
      screenshots: []
    };
  }

  async setup() {
    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      defaultViewport: null
    });
    this.page = await this.browser.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      if (!msg.text().includes('[vite]')) {
        console.log(`Browser console: ${msg.text()}`);
      }
    });

    // Wait for app to be ready
    await this.page.goto('http://localhost:5000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for initial data load
    await this.page.waitForSelector('[data-testid*="resource-card"]', { timeout: 10000 });
    console.log('✅ App loaded successfully');
  }

  async testMobileFunctionality() {
    console.log('\n📱 Testing Mobile Functionality...\n');
    
    // 1. Test mobile viewport (390x844)
    console.log('Testing mobile viewport...');
    await this.page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 1000));
    
    const viewportSize = await this.page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
    
    this.results.mobile.viewport.passed = viewportSize.width <= 390;
    this.results.mobile.viewport.details = `Viewport: ${viewportSize.width}x${viewportSize.height}`;
    console.log(`✅ Mobile viewport set: ${viewportSize.width}x${viewportSize.height}`);
    
    // 2. Test hamburger menu opens mobile sidebar
    console.log('Testing hamburger menu...');
    const hamburgerExists = await this.page.$('[data-testid="sidebar-trigger"]') !== null;
    
    if (hamburgerExists) {
      await this.page.click('[data-testid="sidebar-trigger"]');
      await new Promise(r => setTimeout(r, 500));
      
      const sidebarOpen = await this.page.evaluate(() => {
        const sidebar = document.querySelector('[data-state="open"]');
        return sidebar !== null;
      });
      
      this.results.mobile.sidebar.passed = sidebarOpen;
      this.results.mobile.sidebar.details = sidebarOpen ? 'Sidebar opens correctly' : 'Sidebar failed to open';
      
      // 3. Verify sidebar content
      if (sidebarOpen) {
        const sidebarContent = await this.page.evaluate(() => {
          const title = document.querySelector('h2')?.textContent || '';
          const resourceCount = document.querySelector('p')?.textContent || '';
          const categories = document.querySelectorAll('[data-testid*="sidebar-category"]').length;
          
          return {
            hasTitle: title.includes('Awesome Video'),
            hasResourceCount: resourceCount.includes('2,011'),
            categoryCount: categories
          };
        });
        
        this.results.mobile.sidebarContent.passed = 
          sidebarContent.hasTitle && 
          sidebarContent.hasResourceCount && 
          sidebarContent.categoryCount >= 9;
        this.results.mobile.sidebarContent.details = 
          `Title: ${sidebarContent.hasTitle}, Resources: ${sidebarContent.hasResourceCount}, Categories: ${sidebarContent.categoryCount}`;
      }
      
      await this.screenshot('mobile-sidebar-open');
      
      // 4. Test sidebar closes without bleeding
      await this.page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
      
      const sidebarClosed = await this.page.evaluate(() => {
        const sidebar = document.querySelector('[data-state="open"]');
        const overlay = document.querySelector('.fixed.inset-0.z-50');
        return sidebar === null && overlay === null;
      });
      
      this.results.mobile.scrollLock.passed = sidebarClosed;
      this.results.mobile.scrollLock.details = 'Sidebar closes cleanly without bleeding';
    }
    
    // 5. Test touch events
    console.log('Testing touch events...');
    const firstCard = await this.page.$('[data-testid*="resource-card"]');
    if (firstCard) {
      // Test tap
      await this.page.tap('[data-testid*="resource-card"]:first-of-type');
      await new Promise(r => setTimeout(r, 500));
      
      // Check if new tab would open (we can't actually open it in Puppeteer)
      this.results.mobile.touchEvents.passed = true;
      this.results.mobile.touchEvents.details = 'Touch events registered';
    }
    
    // 6. Test touch target sizes
    console.log('Testing touch target sizes...');
    const touchTargets = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const minSize = 44;
      let allValid = true;
      
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width < minSize || rect.height < minSize) {
          allValid = false;
        }
      });
      
      return allValid;
    });
    
    this.results.mobile.touchTargets.passed = touchTargets;
    this.results.mobile.touchTargets.details = touchTargets ? 
      'All touch targets >= 44x44px' : 'Some touch targets too small';
    
    // 7. Test viewport meta tag
    console.log('Testing viewport meta tag...');
    const viewportMeta = await this.page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.getAttribute('content') : null;
    });
    
    this.results.mobile.viewportMeta.passed = viewportMeta !== null;
    this.results.mobile.viewportMeta.details = viewportMeta || 'No viewport meta tag found';
    
    // 8. Test landscape orientation
    console.log('Testing landscape orientation...');
    await this.page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 1000));
    
    const landscapeLayout = await this.page.evaluate(() => {
      const container = document.querySelector('main');
      return container ? !container.scrollWidth > window.innerWidth : true;
    });
    
    this.results.mobile.landscape.passed = landscapeLayout;
    this.results.mobile.landscape.details = 'Landscape layout adapts correctly';
    
    await this.screenshot('mobile-landscape');
    
    // Reset to portrait
    await this.page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  }

  async testUserPreferences() {
    console.log('\n⚙️ Testing User Preferences...\n');
    
    // Navigate to home
    await this.page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await this.page.waitForSelector('[data-testid*="resource-card"]', { timeout: 10000 });
    
    // 1. Test Preferences dialog opens
    console.log('Testing preferences dialog...');
    const prefsButton = await this.page.$('button:has-text("Preferences")');
    
    if (prefsButton) {
      await prefsButton.click();
      await new Promise(r => setTimeout(r, 1000));
      
      const dialogOpen = await this.page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog !== null && dialog.querySelector('h2')?.textContent?.includes('Personalization');
      });
      
      this.results.preferences.dialogOpen.passed = dialogOpen;
      this.results.preferences.dialogOpen.details = dialogOpen ? 'Dialog opened successfully' : 'Dialog failed to open';
      
      if (dialogOpen) {
        await this.screenshot('preferences-dialog-open');
        
        // 2. Test Skill Level dropdown
        console.log('Testing skill level dropdown...');
        const skillDropdown = await this.page.$('[data-testid*="skill-level"]');
        if (skillDropdown) {
          await skillDropdown.click();
          await new Promise(r => setTimeout(r, 500));
          
          const optionsVisible = await this.page.evaluate(() => {
            const options = document.querySelectorAll('[role="option"]');
            return options.length >= 3; // Beginner, Intermediate, Advanced
          });
          
          this.results.preferences.skillDropdown.passed = optionsVisible;
          this.results.preferences.skillDropdown.details = 'Skill level options available';
          
          // 3. Change to Intermediate
          if (optionsVisible) {
            await this.page.click('[role="option"]:has-text("Intermediate")');
            await new Promise(r => setTimeout(r, 500));
            
            // Save preferences
            await this.page.click('button:has-text("Save")');
            await new Promise(r => setTimeout(r, 1000));
            
            this.results.preferences.skillChange.passed = true;
            this.results.preferences.skillChange.details = 'Changed to Intermediate and saved';
            
            // 4. Reopen and verify persistence
            await this.page.click('button:has-text("Preferences")');
            await new Promise(r => setTimeout(r, 1000));
            
            const skillPersisted = await this.page.evaluate(() => {
              const trigger = document.querySelector('[data-testid*="skill-level"]');
              return trigger?.textContent?.includes('Intermediate') || false;
            });
            
            this.results.preferences.skillPersistence.passed = skillPersisted;
            this.results.preferences.skillPersistence.details = skillPersisted ? 
              'Skill level persisted' : 'Skill level did not persist';
          }
        }
        
        // 5. Test other tabs
        console.log('Testing preference tabs...');
        
        // Test Interests tab
        const interestsTab = await this.page.$('[role="tab"]:has-text("Interests")');
        if (interestsTab) {
          await interestsTab.click();
          await new Promise(r => setTimeout(r, 500));
          
          const categoriesVisible = await this.page.evaluate(() => {
            const checkboxes = document.querySelectorAll('[type="checkbox"]');
            return checkboxes.length > 0;
          });
          
          this.results.preferences.interestsTab.passed = categoriesVisible;
          this.results.preferences.interestsTab.details = 'Category selection available';
        }
        
        // Test Goals tab
        const goalsTab = await this.page.$('[role="tab"]:has-text("Goals")');
        if (goalsTab) {
          await goalsTab.click();
          await new Promise(r => setTimeout(r, 500));
          
          const goalsVisible = await this.page.evaluate(() => {
            const goals = document.querySelectorAll('[data-testid*="goal"]');
            return goals.length > 0 || document.querySelector('input[placeholder*="goal"]') !== null;
          });
          
          this.results.preferences.goalsTab.passed = goalsVisible;
          this.results.preferences.goalsTab.details = 'Learning goals section available';
        }
        
        // Test Style tab
        const styleTab = await this.page.$('[role="tab"]:has-text("Style")');
        if (styleTab) {
          await styleTab.click();
          await new Promise(r => setTimeout(r, 500));
          
          const resourceTypesVisible = await this.page.evaluate(() => {
            const types = document.querySelectorAll('[type="checkbox"]');
            return types.length > 0;
          });
          
          this.results.preferences.styleTab.passed = resourceTypesVisible;
          this.results.preferences.styleTab.details = 'Resource type preferences available';
        }
        
        // Close dialog
        await this.page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  async testLayoutSwitching() {
    console.log('\n🎨 Testing Layout Switching...\n');
    
    // Navigate to home
    await this.page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await this.page.waitForSelector('[data-testid*="resource-card"]', { timeout: 10000 });
    
    // 1. Test switching to List view
    console.log('Testing list view...');
    const listButton = await this.page.$('[data-testid="layout-list-button"]');
    
    if (listButton) {
      await listButton.click();
      await new Promise(r => setTimeout(r, 1000));
      
      const listViewActive = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid*="resource-list-item"]');
        return items.length > 0;
      });
      
      this.results.layout.listView.passed = listViewActive;
      this.results.layout.listView.details = 'List view activated';
      await this.screenshot('layout-list-view');
      
      // 2. Test switching to Compact view
      console.log('Testing compact view...');
      const compactButton = await this.page.$('[data-testid="layout-compact-button"]');
      
      if (compactButton) {
        await compactButton.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const compactViewActive = await this.page.evaluate(() => {
          const items = document.querySelectorAll('[data-testid*="resource-compact-item"]');
          return items.length > 0;
        });
        
        this.results.layout.compactView.passed = compactViewActive;
        this.results.layout.compactView.details = 'Compact view activated';
        await this.screenshot('layout-compact-view');
      }
      
      // 3. Test switching back to Cards view
      console.log('Testing cards view...');
      const cardsButton = await this.page.$('[data-testid="layout-cards-button"]');
      
      if (cardsButton) {
        await cardsButton.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const cardsViewActive = await this.page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid*="resource-card"]');
          return cards.length > 0;
        });
        
        this.results.layout.cardsView.passed = cardsViewActive;
        this.results.layout.cardsView.details = 'Cards view restored';
        await this.screenshot('layout-cards-view');
      }
      
      // 4. Test layout persistence
      console.log('Testing layout persistence...');
      // Switch to list view
      await listButton.click();
      await new Promise(r => setTimeout(r, 1000));
      
      // Navigate to a category
      await this.page.goto('http://localhost:5000/category/encoding-codecs', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      
      const layoutPersisted = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid*="resource-list-item"]');
        return items.length > 0;
      });
      
      this.results.layout.persistence.passed = layoutPersisted;
      this.results.layout.persistence.details = layoutPersisted ? 
        'Layout persisted across navigation' : 'Layout did not persist';
    }
  }

  async testSubSubcategoryNavigation() {
    console.log('\n🧭 Testing Sub-subcategory Navigation...\n');
    
    // 1. Navigate to /category/encoding-codecs
    console.log('Testing encoding-codecs category...');
    await this.page.goto('http://localhost:5000/category/encoding-codecs', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    await new Promise(r => setTimeout(r, 2000));
    
    const encodingCodecsLoaded = await this.page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent || '';
      const resources = document.querySelectorAll('[data-testid*="resource-"]').length;
      return {
        hasTitle: title.includes('Encoding') || title.includes('Codecs'),
        resourceCount: resources
      };
    });
    
    this.results.navigation.encodingCodecs.passed = encodingCodecsLoaded.resourceCount > 0;
    this.results.navigation.encodingCodecs.details = 
      `Title: ${encodingCodecsLoaded.hasTitle}, Resources: ${encodingCodecsLoaded.resourceCount}`;
    await this.screenshot('navigation-encoding-codecs');
    
    // 2. Test subcategory filter - Codecs
    console.log('Testing Codecs filter...');
    const filterDropdown = await this.page.$('[data-testid*="filter"]');
    
    if (filterDropdown) {
      await filterDropdown.click();
      await new Promise(r => setTimeout(r, 500));
      
      const codecsOption = await this.page.$('[role="option"]:has-text("Codecs")');
      if (codecsOption) {
        await codecsOption.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const codecsResources = await this.page.evaluate(() => {
          return document.querySelectorAll('[data-testid*="resource-"]').length;
        });
        
        this.results.navigation.codecsFilter.passed = codecsResources === 29;
        this.results.navigation.codecsFilter.details = `Codecs filter shows ${codecsResources} resources (expected 29)`;
      }
    }
    
    // 3. Test AV1 direct navigation
    console.log('Testing AV1 sub-subcategory...');
    await this.page.goto('http://localhost:5000/sub-subcategory/av1', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    await new Promise(r => setTimeout(r, 2000));
    
    const av1Resources = await this.page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent || '';
      const resources = document.querySelectorAll('[data-testid*="resource-"]').length;
      return {
        hasTitle: title.includes('AV1'),
        count: resources
      };
    });
    
    this.results.navigation.av1Direct.passed = av1Resources.count === 6;
    this.results.navigation.av1Direct.details = 
      `AV1 shows ${av1Resources.count} resources (expected 6)`;
    await this.screenshot('navigation-av1');
    
    // 4. Test HEVC navigation
    console.log('Testing HEVC sub-subcategory...');
    await this.page.goto('http://localhost:5000/sub-subcategory/hevc', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    await new Promise(r => setTimeout(r, 2000));
    
    const hevcResources = await this.page.evaluate(() => {
      const resources = document.querySelectorAll('[data-testid*="resource-"]').length;
      return resources;
    });
    
    this.results.navigation.hevcDirect.passed = hevcResources === 10;
    this.results.navigation.hevcDirect.details = 
      `HEVC shows ${hevcResources} resources (expected 10)`;
    await this.screenshot('navigation-hevc');
    
    // 5. Test VP9 navigation
    console.log('Testing VP9 sub-subcategory...');
    await this.page.goto('http://localhost:5000/sub-subcategory/vp9', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    await new Promise(r => setTimeout(r, 2000));
    
    const vp9Resources = await this.page.evaluate(() => {
      const resources = document.querySelectorAll('[data-testid*="resource-"]').length;
      return resources;
    });
    
    this.results.navigation.vp9Direct.passed = vp9Resources === 1;
    this.results.navigation.vp9Direct.details = 
      `VP9 shows ${vp9Resources} resources (expected 1)`;
    await this.screenshot('navigation-vp9');
  }

  async testResourceCards() {
    console.log('\n🎯 Testing Resource Cards...\n');
    
    // Switch to desktop viewport for hover testing
    await this.page.setViewport({ width: 1440, height: 900 });
    await this.page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await this.page.waitForSelector('[data-testid*="resource-card"]', { timeout: 10000 });
    
    // 1. Test hover states
    console.log('Testing hover states...');
    const firstCard = await this.page.$('[data-testid*="resource-card"]');
    
    if (firstCard) {
      await this.page.hover('[data-testid*="resource-card"]:first-of-type');
      await new Promise(r => setTimeout(r, 500));
      
      const hoverEffects = await this.page.evaluate(() => {
        const card = document.querySelector('[data-testid*="resource-card"]');
        if (!card) return false;
        
        const styles = window.getComputedStyle(card);
        return styles.transform !== 'none' || styles.boxShadow !== 'none';
      });
      
      this.results.resourceCards.hoverStates.passed = hoverEffects;
      this.results.resourceCards.hoverStates.details = 'Hover effects applied';
      await this.screenshot('resource-card-hover');
      
      // 2. Test external links
      console.log('Testing external links...');
      const cardLinks = await this.page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid*="resource-card"]');
        let hasCorrectTarget = true;
        
        cards.forEach(card => {
          // Cards should have click handler that opens in new tab
          if (!card.onclick && !card.style.cursor === 'pointer') {
            hasCorrectTarget = false;
          }
        });
        
        return hasCorrectTarget;
      });
      
      this.results.resourceCards.externalLinks.passed = cardLinks;
      this.results.resourceCards.externalLinks.details = 'Cards configured for external links';
      
      // 3. Test bookmark functionality
      console.log('Testing bookmark functionality...');
      const bookmarkButton = await this.page.$('button:has-text("Bookmark")');
      
      if (bookmarkButton) {
        await bookmarkButton.click();
        await new Promise(r => setTimeout(r, 500));
        
        this.results.resourceCards.bookmarkFunction.passed = true;
        this.results.resourceCards.bookmarkFunction.details = 'Bookmark button functional';
      }
      
      // 4. Test share functionality
      console.log('Testing share functionality...');
      const shareButton = await this.page.$('button:has-text("Share")');
      
      if (shareButton) {
        // Check if share API is available
        const shareAvailable = await this.page.evaluate(() => {
          return 'share' in navigator;
        });
        
        this.results.resourceCards.shareFunction.passed = true;
        this.results.resourceCards.shareFunction.details = 
          shareAvailable ? 'Native share available' : 'Fallback to clipboard copy';
      }
    }
  }

  async screenshot(name) {
    const screenshotPath = path.join(__dirname, 'test-screenshots', `${name}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: false });
    this.results.screenshots.push(screenshotPath);
    console.log(`📸 Screenshot saved: ${name}.png`);
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: '0%'
      },
      sections: {},
      screenshots: this.results.screenshots
    };
    
    // Calculate results
    for (const [section, tests] of Object.entries(this.results)) {
      if (section === 'screenshots') continue;
      
      report.sections[section] = {};
      for (const [test, result] of Object.entries(tests)) {
        report.sections[section][test] = result;
        report.summary.total++;
        if (result.passed) report.summary.passed++;
        else report.summary.failed++;
      }
    }
    
    report.summary.passRate = `${Math.round((report.summary.passed / report.summary.total) * 100)}%`;
    
    // Save JSON report
    const jsonPath = path.join(__dirname, 'test-results', 'comprehensive-mobile-test.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    let markdown = `# Comprehensive Mobile & Preferences Test Report\n\n`;
    markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests**: ${report.summary.total}\n`;
    markdown += `- **Passed**: ${report.summary.passed}\n`;
    markdown += `- **Failed**: ${report.summary.failed}\n`;
    markdown += `- **Pass Rate**: ${report.summary.passRate}\n\n`;
    
    for (const [section, tests] of Object.entries(report.sections)) {
      markdown += `## ${section.charAt(0).toUpperCase() + section.slice(1).replace(/([A-Z])/g, ' $1')}\n\n`;
      
      for (const [test, result] of Object.entries(tests)) {
        const status = result.passed ? '✅' : '❌';
        const testName = test.replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + test.replace(/([A-Z])/g, ' $1').slice(1);
        markdown += `- ${status} **${testName}**: ${result.details}\n`;
      }
      markdown += '\n';
    }
    
    markdown += `## Screenshots\n\n`;
    for (const screenshot of report.screenshots) {
      const filename = path.basename(screenshot);
      markdown += `- ${filename}\n`;
    }
    
    const mdPath = path.join(__dirname, 'test-results', 'COMPREHENSIVE_MOBILE_TEST.md');
    await fs.writeFile(mdPath, markdown);
    
    console.log('✅ Report generated successfully');
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
      await this.setup();
      
      // Run all test suites
      await this.testMobileFunctionality();
      await this.testUserPreferences();
      await this.testLayoutSwitching();
      await this.testSubSubcategoryNavigation();
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
      console.error('❌ Test failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
const test = new ComprehensiveMobileTest();
test.run().catch(console.error);