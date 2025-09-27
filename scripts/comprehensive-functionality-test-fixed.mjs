import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

class ComprehensiveFunctionalityTest {
  constructor() {
    this.browser = null;
    this.desktopPage = null;
    this.mobilePage = null;
    this.results = {
      resourceCardTests: {},
      searchTests: {},
      navigationTests: {},
      visualAnalysis: {},
      mobileTests: {},
      modalTests: {},
      performanceTests: {},
      securityTests: {},
      accessibilityTests: {},
      screenshots: [],
      errors: [],
      warnings: []
    };
    this.baseUrl = 'http://localhost:5000';
  }

  // Helper function to replace deprecated waitForTimeout
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async initialize() {
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

    // Create desktop page
    this.desktopPage = await this.browser.newPage();
    await this.desktopPage.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    // Create mobile page
    this.mobilePage = await this.browser.newPage();
    await this.mobilePage.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    // Set up console monitoring
    this.desktopPage.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        this.results.errors.push({
          type: 'console',
          message: msg.text(),
          location: 'desktop'
        });
      }
    });

    this.mobilePage.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        this.results.errors.push({
          type: 'console',
          message: msg.text(),
          location: 'mobile'
        });
      }
    });

    console.log('✅ Browser initialized');
  }

  async captureScreenshot(page, name, isMobile = false) {
    const screenshotPath = `test-screenshots/${name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    this.results.screenshots.push({
      name,
      path: screenshotPath,
      viewport: isMobile ? 'mobile' : 'desktop',
      timestamp: new Date().toISOString()
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  // Helper to wait for page to be fully loaded
  async waitForPageLoad(page) {
    try {
      // Wait for network to be idle
      await page.waitForLoadState('networkidle').catch(() => {});
      // Wait for basic page content
      await page.waitForSelector('body', { timeout: 10000 });
      // Give React time to render
      await this.wait(2000);
    } catch (error) {
      console.warn('Page load warning:', error.message);
    }
  }

  // 1. RESOURCE CARD FUNCTIONALITY TESTS
  async testResourceCardFunctionality() {
    console.log('\n🎯 Testing Resource Card Functionality...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.waitForPageLoad(page);
      
      // Try multiple selectors for resource cards
      const cardSelectors = [
        '[data-testid^="resource-card-"]',
        '.resource-card',
        '[class*="card"]',
        'article',
        'div[class*="grid"] > div'
      ];
      
      let cards = [];
      for (const selector of cardSelectors) {
        cards = await page.$$(selector);
        if (cards.length > 0) {
          console.log(`Found ${cards.length} cards using selector: ${selector}`);
          break;
        }
      }
      
      if (cards.length > 0) {
        const firstCard = cards[0];
        
        // Get initial styles
        const initialStyles = await page.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            transform: computed.transform,
            boxShadow: computed.boxShadow,
            scale: computed.scale
          };
        }, firstCard);

        // Hover over card
        await firstCard.hover();
        await this.wait(500); // Wait for transition

        // Get hover styles
        const hoverStyles = await page.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            transform: computed.transform,
            boxShadow: computed.boxShadow,
            scale: computed.scale
          };
        }, firstCard);

        // Check if hover state applied
        this.results.resourceCardTests.hoverState = {
          success: initialStyles.transform !== hoverStyles.transform || 
                   initialStyles.boxShadow !== hoverStyles.boxShadow ||
                   initialStyles.scale !== hoverStyles.scale,
          initialTransform: initialStyles.transform,
          hoverTransform: hoverStyles.transform
        };

        // Test external link icon
        const hasExternalIcon = await page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid^="resource-card-"], [class*="card"]');
          if (cards.length === 0) return false;
          const card = cards[0];
          card.dispatchEvent(new MouseEvent('mouseenter'));
          const icon = card.querySelector('svg[class*="external"], svg[class*="link"], .lucide-external-link');
          return icon ? window.getComputedStyle(icon).opacity !== '0' : false;
        });

        this.results.resourceCardTests.externalLinkIcon = {
          success: hasExternalIcon,
          message: hasExternalIcon ? 'External link icon appears on hover' : 'External link icon not found or not visible'
        };

        // Test bookmark functionality
        const hasBookmark = await page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid^="resource-card-"], [class*="card"]');
          if (cards.length === 0) return false;
          const card = cards[0];
          const bookmarkBtn = card.querySelector('button svg[class*="bookmark"], .lucide-bookmark');
          return bookmarkBtn !== null;
        });

        this.results.resourceCardTests.bookmarkFunctionality = {
          exists: hasBookmark,
          message: hasBookmark ? 'Bookmark button found' : 'Bookmark functionality not present'
        };

        // Test share functionality
        const hasShare = await page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid^="resource-card-"], [class*="card"]');
          if (cards.length === 0) return false;
          const card = cards[0];
          const shareBtn = card.querySelector('button svg[class*="share"], .lucide-share-2');
          return shareBtn !== null;
        });

        this.results.resourceCardTests.shareFunctionality = {
          exists: hasShare,
          message: hasShare ? 'Share button found' : 'Share functionality not present'
        };

        // Test card click
        const cardClickable = await page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid^="resource-card-"], [class*="card"]');
          if (cards.length === 0) return false;
          const card = cards[0];
          const styles = window.getComputedStyle(card);
          return styles.cursor === 'pointer';
        });

        this.results.resourceCardTests.clickable = {
          success: cardClickable,
          message: cardClickable ? 'Card is clickable' : 'Card not configured as clickable'
        };

        console.log('✅ Resource card functionality tests completed');
      } else {
        this.results.resourceCardTests.error = 'No resource cards found on page';
        console.log('⚠️ No resource cards found, skipping card tests');
      }
    } catch (error) {
      console.error('❌ Resource card tests failed:', error.message);
      this.results.resourceCardTests.error = error.message;
    }
  }

  // 2. ADVANCED SEARCH FEATURES
  async testAdvancedSearchFeatures() {
    console.log('\n🔍 Testing Advanced Search Features...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.waitForPageLoad(page);

      // Try multiple ways to open search
      const searchOpened = await this.openSearchDialog(page);
      
      if (!searchOpened) {
        this.results.searchTests.error = 'Could not open search dialog';
        console.log('⚠️ Could not open search dialog');
        return;
      }

      // Test special characters
      const specialCharTests = [
        { query: 'C++', expected: 'Should handle plus signs' },
        { query: 'H.264', expected: 'Should handle dots and numbers' },
        { query: 'VP9', expected: 'Should handle alphanumeric' }
      ];

      for (const test of specialCharTests) {
        await this.clearSearchInput(page);
        await page.type('input[type="text"], input[type="search"]', test.query);
        await this.wait(1000);
        
        const hasResults = await page.evaluate(() => {
          const results = document.querySelectorAll('[role="dialog"] [class*="hover"], [class*="result"]');
          return results.length > 0;
        });

        this.results.searchTests[`specialChar_${test.query}`] = {
          query: test.query,
          hasResults,
          expected: test.expected
        };
      }

      // Test case-insensitive search
      await this.testCaseInsensitiveSearch(page);

      // Close search dialog
      await page.keyboard.press('Escape');
      await this.wait(500);

      console.log('✅ Advanced search tests completed');
    } catch (error) {
      console.error('❌ Search tests failed:', error.message);
      this.results.searchTests.error = error.message;
    }
  }

  async openSearchDialog(page) {
    // Try keyboard shortcut first
    try {
      await page.keyboard.down('Control');
      await page.keyboard.press('k');
      await page.keyboard.up('Control');
      await this.wait(1000);
      
      const dialogVisible = await page.evaluate(() => {
        return document.querySelector('[role="dialog"]') !== null;
      });
      
      if (dialogVisible) return true;
    } catch (e) {}

    // Try clicking search button
    try {
      const searchBtn = await page.$('button svg[class*="search"], .lucide-search');
      if (searchBtn) {
        const button = await searchBtn.evaluateHandle(el => el.closest('button'));
        await button.click();
        await this.wait(1000);
        
        const dialogVisible = await page.evaluate(() => {
          return document.querySelector('[role="dialog"]') !== null;
        });
        
        if (dialogVisible) return true;
      }
    } catch (e) {}

    // Try typing in search input directly
    try {
      const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
      if (searchInput) {
        await searchInput.click();
        await this.wait(500);
        return true;
      }
    } catch (e) {}

    return false;
  }

  async clearSearchInput(page) {
    await page.evaluate(() => {
      const input = document.querySelector('input[type="text"], input[type="search"]');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  async testCaseInsensitiveSearch(page) {
    const caseTests = ['video', 'VIDEO', 'Video'];
    const caseResults = [];

    for (const query of caseTests) {
      await this.clearSearchInput(page);
      await page.type('input[type="text"], input[type="search"]', query);
      await this.wait(1000);
      
      const resultCount = await page.evaluate(() => {
        const results = document.querySelectorAll('[role="dialog"] [class*="hover"], [class*="result"]');
        return results.length;
      });

      caseResults.push({ query, count: resultCount });
    }

    // Check if all case variations return similar results
    const caseSensitive = caseResults.some(r => Math.abs(r.count - caseResults[0].count) > 2);
    this.results.searchTests.caseInsensitive = {
      success: !caseSensitive,
      results: caseResults,
      message: caseSensitive ? 'Search appears case sensitive' : 'Search is case insensitive'
    };
  }

  // 3. NAVIGATION TESTING
  async testNavigation() {
    console.log('\n🧭 Testing Navigation Features...');
    const page = this.desktopPage;
    
    try {
      // Test deep linking
      await page.goto(`${this.baseUrl}/sub-subcategory/av1`, { waitUntil: 'networkidle2' });
      await this.wait(2000);

      const av1PageLoaded = await page.evaluate(() => {
        const text = document.body.textContent.toLowerCase();
        return text.includes('av1') || window.location.pathname.includes('av1');
      });

      this.results.navigationTests.deepLinking = {
        success: av1PageLoaded,
        url: '/sub-subcategory/av1',
        message: av1PageLoaded ? 'Deep linking works' : 'Deep linking failed'
      };

      // Test browser back/forward
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.wait(2000);
      
      const initialUrl = page.url();
      
      // Navigate to a different page
      await page.evaluate(() => {
        const link = document.querySelector('a[href*="category"], a[href*="subcategory"]');
        if (link) link.click();
      });
      await this.wait(2000);
      
      const navigatedUrl = page.url();
      
      // Go back
      await page.goBack();
      await this.wait(2000);
      const afterBackUrl = page.url();
      
      // Go forward
      await page.goForward();
      await this.wait(2000);
      const afterForwardUrl = page.url();

      this.results.navigationTests.browserHistory = {
        backButton: afterBackUrl === initialUrl,
        forwardButton: afterForwardUrl === navigatedUrl,
        message: 'Browser history navigation tested'
      };

      // Test 404 page
      await page.goto(`${this.baseUrl}/category/invalid-category-that-does-not-exist`, { waitUntil: 'networkidle2' });
      await this.wait(2000);

      const has404 = await page.evaluate(() => {
        const body = document.body.textContent.toLowerCase();
        return body.includes('not found') || body.includes('404') || body.includes('error');
      });

      this.results.navigationTests.notFoundPage = {
        success: has404,
        message: has404 ? '404 page works' : 'No 404 page found'
      };

      await this.captureScreenshot(page, 'navigation-404-page');

      console.log('✅ Navigation tests completed');
    } catch (error) {
      console.error('❌ Navigation tests failed:', error.message);
      this.results.navigationTests.error = error.message;
    }
  }

  // 4. VISUAL SCREENSHOT ANALYSIS
  async testVisualAnalysis() {
    console.log('\n📸 Performing Visual Analysis...');
    
    try {
      // Desktop homepage
      await this.desktopPage.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.waitForPageLoad(this.desktopPage);
      await this.captureScreenshot(this.desktopPage, 'desktop-homepage-visual');

      // Analyze desktop layout
      const desktopAnalysis = await this.desktopPage.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid^="resource-card-"], [class*="card"]');
        const sidebar = document.querySelector('[data-testid^="sidebar"], aside, [class*="sidebar"]');
        
        // Check text truncation
        const truncatedTexts = [];
        document.querySelectorAll('.line-clamp-2, .truncate, [class*="clamp"]').forEach(el => {
          if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            truncatedTexts.push({
              text: el.textContent.substring(0, 50),
              element: el.tagName
            });
          }
        });

        // Check spacing
        const cardSpacing = cards.length > 1 ? 
          window.getComputedStyle(cards[0]).marginBottom : '0px';
        
        // Check padding
        const main = document.querySelector('main');
        const containerPadding = main ? window.getComputedStyle(main).padding : 'unknown';

        return {
          cardCount: cards.length,
          hasSidebar: sidebar !== null,
          truncatedTexts: truncatedTexts.slice(0, 5),
          spacing: {
            cardSpacing,
            containerPadding
          }
        };
      });

      this.results.visualAnalysis.desktop = desktopAnalysis;

      // Mobile homepage
      await this.mobilePage.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.waitForPageLoad(this.mobilePage);
      await this.captureScreenshot(this.mobilePage, 'mobile-homepage-visual', true);

      // Analyze mobile layout
      const mobileAnalysis = await this.mobilePage.evaluate(() => {
        // Check text readability (minimum 14px)
        const smallTexts = [];
        document.querySelectorAll('p, span, div').forEach(el => {
          const fontSize = window.getComputedStyle(el).fontSize;
          const sizeInPx = parseFloat(fontSize);
          if (sizeInPx < 14 && el.textContent.trim()) {
            smallTexts.push({
              text: el.textContent.substring(0, 30),
              size: fontSize
            });
          }
        });

        // Check horizontal scrolling
        const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;

        // Check sidebar visibility
        const sidebar = document.querySelector('[data-testid^="sidebar"], aside, [class*="sidebar"]');
        const sidebarVisible = sidebar && window.getComputedStyle(sidebar).display !== 'none';

        return {
          smallTexts: smallTexts.slice(0, 5),
          hasHorizontalScroll,
          sidebarVisible,
          viewportWidth: window.innerWidth
        };
      });

      this.results.visualAnalysis.mobile = mobileAnalysis;

      console.log('✅ Visual analysis completed');
    } catch (error) {
      console.error('❌ Visual analysis failed:', error.message);
      this.results.visualAnalysis.error = error.message;
    }
  }

  // 5. MOBILE-SPECIFIC TESTS
  async testMobileInteractions() {
    console.log('\n📱 Testing Mobile Interactions...');
    const page = this.mobilePage;
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.waitForPageLoad(page);

      // Test sidebar toggle
      const sidebarButton = await page.$('[data-testid="sidebar-toggle"], button svg[class*="menu"], .lucide-menu');
      if (sidebarButton) {
        const button = await sidebarButton.evaluateHandle(el => el.closest('button'));
        await button.click();
        await this.wait(500);
        
        const sidebarOpen = await page.evaluate(() => {
          const sidebar = document.querySelector('[data-testid^="sidebar"], aside, [class*="sidebar"]');
          return sidebar && window.getComputedStyle(sidebar).display !== 'none';
        });

        this.results.mobileTests.sidebarToggle = {
          success: sidebarOpen,
          message: sidebarOpen ? 'Sidebar toggle works' : 'Sidebar toggle failed'
        };
      } else {
        this.results.mobileTests.sidebarToggle = {
          success: false,
          message: 'No sidebar toggle button found'
        };
      }

      // Test smooth scrolling
      await page.evaluate(() => window.scrollTo(0, 0));
      const scrollStartTime = Date.now();
      
      await page.evaluate(() => {
        window.scrollTo({ top: 1000, behavior: 'smooth' });
      });
      
      await this.wait(1500);
      const scrollEndTime = Date.now();
      const scrollDuration = scrollEndTime - scrollStartTime;
      
      const finalScrollPosition = await page.evaluate(() => window.scrollY);

      this.results.mobileTests.smoothScrolling = {
        duration: scrollDuration,
        finalPosition: finalScrollPosition,
        success: finalScrollPosition > 500,
        message: 'Smooth scrolling tested'
      };

      // Test viewport
      const viewportInfo = await page.evaluate(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
        };
      });

      this.results.mobileTests.viewport = {
        ...viewportInfo,
        success: !viewportInfo.hasHorizontalScroll,
        message: viewportInfo.hasHorizontalScroll ? 'Has horizontal scroll (bad)' : 'No horizontal scroll (good)'
      };

      console.log('✅ Mobile interaction tests completed');
    } catch (error) {
      console.error('❌ Mobile tests failed:', error.message);
      this.results.mobileTests.error = error.message;
    }
  }

  // 6. MODAL AND DIALOG TESTS
  async testModalDialogBehavior() {
    console.log('\n🪟 Testing Modal and Dialog Behavior...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.waitForPageLoad(page);
      
      // Try to open a dialog
      const dialogOpened = await this.openSearchDialog(page);

      if (dialogOpened) {
        // Test Escape key to close
        await page.keyboard.press('Escape');
        await this.wait(500);

        const dialogClosedByEscape = await page.evaluate(() => {
          return document.querySelector('[role="dialog"]') === null;
        });

        this.results.modalTests.escapeKey = {
          success: dialogClosedByEscape,
          message: dialogClosedByEscape ? 'Escape key closes dialog' : 'Escape key did not close dialog'
        };

        // Reopen for click-outside test
        await this.openSearchDialog(page);
        await this.wait(500);

        // Test click outside to close
        await page.mouse.click(50, 50); // Click in top-left corner
        await this.wait(500);

        const dialogClosedByClickOutside = await page.evaluate(() => {
          return document.querySelector('[role="dialog"]') === null;
        });

        this.results.modalTests.clickOutside = {
          success: dialogClosedByClickOutside,
          message: dialogClosedByClickOutside ? 'Click outside closes dialog' : 'Click outside did not close dialog'
        };
      } else {
        this.results.modalTests.error = 'Could not open any dialog for testing';
      }

      console.log('✅ Modal/Dialog tests completed');
    } catch (error) {
      console.error('❌ Modal tests failed:', error.message);
      this.results.modalTests.error = error.message;
    }
  }

  // 7. PERFORMANCE AND ANIMATION TESTS
  async testPerformanceAndAnimations() {
    console.log('\n⚡ Testing Performance and Animations...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.waitForPageLoad(page);

      // Test memory usage
      const memoryMetrics = await page.evaluate(() => {
        if (!performance.memory) return null;
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      });

      this.results.performanceTests.memory = memoryMetrics || { error: 'Memory API not available' };

      // Test page load performance
      const performanceMetrics = await page.evaluate(() => {
        const timing = performance.timing;
        return {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart
        };
      });

      this.results.performanceTests.pageLoad = {
        ...performanceMetrics,
        success: performanceMetrics.loadComplete < 5000,
        message: `Page loaded in ${performanceMetrics.loadComplete}ms`
      };

      // Test animation smoothness
      const animationMetrics = await page.evaluate(async () => {
        const cards = document.querySelectorAll('[data-testid^="resource-card-"], [class*="card"]');
        if (cards.length === 0) return null;

        const card = cards[0];
        const startTime = performance.now();
        
        card.dispatchEvent(new MouseEvent('mouseenter'));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        return {
          duration,
          smooth: duration < 600,
          cardCount: cards.length
        };
      });

      this.results.performanceTests.animations = animationMetrics || { error: 'No cards to test animations' };

      console.log('✅ Performance tests completed');
    } catch (error) {
      console.error('❌ Performance tests failed:', error.message);
      this.results.performanceTests.error = error.message;
    }
  }

  // 8. SECURITY TESTS
  async testSecurity() {
    console.log('\n🔒 Testing Security Features...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.waitForPageLoad(page);

      // Test XSS in search
      const searchOpened = await this.openSearchDialog(page);
      
      if (searchOpened) {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          'javascript:alert("XSS")',
          '<img src=x onerror=alert("XSS")>'
        ];

        for (const payload of xssPayloads) {
          await this.clearSearchInput(page);
          await page.type('input[type="text"], input[type="search"]', payload);
          await this.wait(500);

          const xssTriggered = await page.evaluate(() => {
            // Check if any script tags were rendered
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
              if (script.textContent.includes('alert')) return true;
            }
            
            // Check for dangerous attributes
            const imgs = document.querySelectorAll('img[onerror]');
            return imgs.length > 0;
          });

          this.results.securityTests[`xss_${xssPayloads.indexOf(payload)}`] = {
            payload: payload.substring(0, 30),
            triggered: xssTriggered,
            success: !xssTriggered,
            message: xssTriggered ? 'XSS vulnerability detected!' : 'XSS prevented'
          };
        }
      } else {
        this.results.securityTests.xss = {
          error: 'Could not test XSS - search not available'
        };
      }

      // Test Content Security Policy
      const cspHeader = await page.evaluate(() => {
        const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return cspMeta ? cspMeta.getAttribute('content') : null;
      });

      this.results.securityTests.csp = {
        exists: cspHeader !== null,
        policy: cspHeader,
        message: cspHeader ? 'CSP configured' : 'No CSP found'
      };

      console.log('✅ Security tests completed');
    } catch (error) {
      console.error('❌ Security tests failed:', error.message);
      this.results.securityTests.error = error.message;
    }
  }

  // 9. ACCESSIBILITY TESTS
  async testAccessibility() {
    console.log('\n♿ Testing Accessibility...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      await this.waitForPageLoad(page);

      // Check for alt text on images
      const imageAccessibility = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const missing = [];
        
        images.forEach(img => {
          if (!img.alt && !img.getAttribute('aria-label')) {
            missing.push({
              src: img.src.substring(img.src.lastIndexOf('/') + 1),
              width: img.width
            });
          }
        });
        
        return {
          total: images.length,
          missingAlt: missing.length,
          missing: missing.slice(0, 5)
        };
      });

      this.results.accessibilityTests.images = imageAccessibility;

      // Check ARIA labels
      const ariaCheck = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const links = document.querySelectorAll('a');
        
        let unlabeledButtons = 0;
        let unlabeledLinks = 0;
        
        buttons.forEach(btn => {
          const hasLabel = btn.getAttribute('aria-label') || 
                          btn.getAttribute('aria-labelledby') || 
                          btn.textContent.trim();
          if (!hasLabel) unlabeledButtons++;
        });
        
        links.forEach(link => {
          const hasLabel = link.getAttribute('aria-label') || 
                          link.getAttribute('aria-labelledby') || 
                          link.textContent.trim();
          if (!hasLabel) unlabeledLinks++;
        });
        
        return {
          unlabeledButtons,
          unlabeledLinks,
          totalButtons: buttons.length,
          totalLinks: links.length
        };
      });

      this.results.accessibilityTests.aria = ariaCheck;

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        return {
          tag: focused.tagName,
          class: focused.className,
          text: focused.textContent ? focused.textContent.substring(0, 30) : '',
          tabIndex: focused.tabIndex
        };
      });

      this.results.accessibilityTests.keyboardNav = {
        focusable: focusedElement.tag !== 'BODY',
        focusedElement,
        message: focusedElement.tag !== 'BODY' ? 'Keyboard navigation works' : 'No keyboard navigation'
      };

      console.log('✅ Accessibility tests completed');
    } catch (error) {
      console.error('❌ Accessibility tests failed:', error.message);
      this.results.accessibilityTests.error = error.message;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Comprehensive Test Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: this.results.warnings.length,
        errors: this.results.errors.length
      }
    };

    // Calculate summary statistics
    for (const category of Object.keys(this.results)) {
      if (typeof this.results[category] === 'object' && !Array.isArray(this.results[category])) {
        for (const test of Object.keys(this.results[category])) {
          if (this.results[category][test] && typeof this.results[category][test] === 'object') {
            report.summary.totalTests++;
            if (this.results[category][test].success) {
              report.summary.passed++;
            } else if (this.results[category][test].error) {
              report.summary.failed++;
            }
          }
        }
      }
    }

    // Save JSON report
    await fs.writeFile(
      'test-results/comprehensive-functionality-report.json',
      JSON.stringify(report, null, 2)
    );

    // Generate markdown report
    const markdown = this.generateMarkdownReport(report);
    await fs.writeFile(
      'COMPREHENSIVE_FUNCTIONALITY_TEST_REPORT.md',
      markdown
    );

    console.log('\n✅ Test report generated successfully!');
    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   ✅ Passed: ${report.summary.passed}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    console.log(`   ⚠️ Warnings: ${report.summary.warnings}`);
    console.log(`   🔴 Errors: ${report.summary.errors}`);
    
    return report;
  }

  generateMarkdownReport(report) {
    let md = `# Comprehensive Functionality Test Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Duration:** ${(report.duration / 1000).toFixed(2)} seconds\n\n`;
    
    md += `## Summary\n\n`;
    md += `- **Total Tests:** ${report.summary.totalTests}\n`;
    md += `- **Passed:** ${report.summary.passed} ✅\n`;
    md += `- **Failed:** ${report.summary.failed} ❌\n`;
    md += `- **Warnings:** ${report.summary.warnings} ⚠️\n`;
    md += `- **Errors:** ${report.summary.errors} 🔴\n\n`;

    // Resource Card Tests
    md += `## 1. Resource Card Functionality\n\n`;
    if (report.results.resourceCardTests) {
      const tests = report.results.resourceCardTests;
      if (tests.error) {
        md += `- **Error:** ${tests.error}\n\n`;
      } else {
        md += `- **Hover State:** ${tests.hoverState?.success ? '✅' : '❌'} ${tests.hoverState?.hoverTransform || 'N/A'}\n`;
        md += `- **External Link Icon:** ${tests.externalLinkIcon?.success ? '✅' : '❌'} ${tests.externalLinkIcon?.message || ''}\n`;
        md += `- **Bookmark Functionality:** ${tests.bookmarkFunctionality?.exists ? '✅' : '⚠️'} ${tests.bookmarkFunctionality?.message || ''}\n`;
        md += `- **Share Functionality:** ${tests.shareFunctionality?.exists ? '✅' : '⚠️'} ${tests.shareFunctionality?.message || ''}\n`;
        md += `- **Clickable:** ${tests.clickable?.success ? '✅' : '❌'} ${tests.clickable?.message || ''}\n\n`;
      }
    }

    // Search Tests
    md += `## 2. Advanced Search Features\n\n`;
    if (report.results.searchTests) {
      const tests = report.results.searchTests;
      if (tests.error) {
        md += `- **Error:** ${tests.error}\n\n`;
      } else {
        md += `- **Case Insensitive:** ${tests.caseInsensitive?.success ? '✅' : '❌'} ${tests.caseInsensitive?.message || ''}\n`;
        
        // Special character tests
        let specialCharResults = [];
        for (const key in tests) {
          if (key.startsWith('specialChar_')) {
            specialCharResults.push(`${tests[key].query}: ${tests[key].hasResults ? '✅' : '❌'}`);
          }
        }
        if (specialCharResults.length > 0) {
          md += `- **Special Characters:** ${specialCharResults.join(', ')}\n`;
        }
        md += '\n';
      }
    }

    // Navigation Tests
    md += `## 3. Navigation\n\n`;
    if (report.results.navigationTests) {
      const tests = report.results.navigationTests;
      if (tests.error) {
        md += `- **Error:** ${tests.error}\n\n`;
      } else {
        md += `- **Deep Linking:** ${tests.deepLinking?.success ? '✅' : '❌'} ${tests.deepLinking?.message || ''}\n`;
        md += `- **Browser History:** Back: ${tests.browserHistory?.backButton ? '✅' : '❌'}, Forward: ${tests.browserHistory?.forwardButton ? '✅' : '❌'}\n`;
        md += `- **404 Page:** ${tests.notFoundPage?.success ? '✅' : '❌'} ${tests.notFoundPage?.message || ''}\n\n`;
      }
    }

    // Visual Analysis
    md += `## 4. Visual Analysis\n\n`;
    if (report.results.visualAnalysis) {
      if (report.results.visualAnalysis.error) {
        md += `- **Error:** ${report.results.visualAnalysis.error}\n\n`;
      } else {
        md += `### Desktop\n`;
        const desktop = report.results.visualAnalysis.desktop;
        if (desktop) {
          md += `- **Cards Found:** ${desktop.cardCount}\n`;
          md += `- **Sidebar Present:** ${desktop.hasSidebar ? 'Yes' : 'No'}\n`;
          md += `- **Truncated Texts:** ${desktop.truncatedTexts?.length || 0}\n`;
          md += `- **Container Padding:** ${desktop.spacing?.containerPadding || 'N/A'}\n\n`;
        }

        md += `### Mobile\n`;
        const mobile = report.results.visualAnalysis.mobile;
        if (mobile) {
          md += `- **Small Texts (<14px):** ${mobile.smallTexts?.length || 0}\n`;
          md += `- **Horizontal Scroll:** ${mobile.hasHorizontalScroll ? 'Yes ❌' : 'No ✅'}\n`;
          md += `- **Viewport Width:** ${mobile.viewportWidth}px\n\n`;
        }
      }
    }

    // Mobile Tests
    md += `## 5. Mobile Interactions\n\n`;
    if (report.results.mobileTests) {
      const tests = report.results.mobileTests;
      if (tests.error) {
        md += `- **Error:** ${tests.error}\n\n`;
      } else {
        md += `- **Sidebar Toggle:** ${tests.sidebarToggle?.success ? '✅' : '❌'} ${tests.sidebarToggle?.message || ''}\n`;
        md += `- **Smooth Scrolling:** ${tests.smoothScrolling?.success ? '✅' : '❌'} Position: ${tests.smoothScrolling?.finalPosition || 0}px\n`;
        md += `- **Viewport:** ${tests.viewport?.success ? '✅' : '❌'} ${tests.viewport?.message || ''}\n\n`;
      }
    }

    // Modal Tests
    md += `## 6. Modal/Dialog Behavior\n\n`;
    if (report.results.modalTests) {
      const tests = report.results.modalTests;
      if (tests.error) {
        md += `- **Error:** ${tests.error}\n\n`;
      } else {
        md += `- **Escape Key:** ${tests.escapeKey?.success ? '✅' : '❌'} ${tests.escapeKey?.message || ''}\n`;
        md += `- **Click Outside:** ${tests.clickOutside?.success ? '✅' : '❌'} ${tests.clickOutside?.message || ''}\n\n`;
      }
    }

    // Performance Tests
    md += `## 7. Performance\n\n`;
    if (report.results.performanceTests) {
      const tests = report.results.performanceTests;
      if (tests.error) {
        md += `- **Error:** ${tests.error}\n\n`;
      } else {
        if (tests.memory && tests.memory.usedJSHeapSize) {
          md += `- **Memory Usage:** ${(tests.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB\n`;
        }
        if (tests.pageLoad) {
          md += `- **Page Load:** ${tests.pageLoad.success ? '✅' : '❌'} ${tests.pageLoad.message}\n`;
        }
        if (tests.animations) {
          md += `- **Animation Smoothness:** ${tests.animations.smooth ? '✅' : '❌'} Duration: ${tests.animations.duration?.toFixed(0) || 0}ms\n`;
        }
        md += '\n';
      }
    }

    // Security Tests
    md += `## 8. Security\n\n`;
    if (report.results.securityTests) {
      const tests = report.results.securityTests;
      if (tests.error) {
        md += `- **Error:** ${tests.error}\n\n`;
      } else {
        let xssProtected = true;
        for (const key in tests) {
          if (key.startsWith('xss_') && tests[key].triggered) {
            xssProtected = false;
          }
        }
        md += `- **XSS Protection:** ${xssProtected ? '✅' : '❌ VULNERABILITY DETECTED!'}\n`;
        md += `- **CSP Header:** ${tests.csp?.exists ? '✅' : '⚠️'} ${tests.csp?.message || ''}\n\n`;
      }
    }

    // Accessibility Tests
    md += `## 9. Accessibility\n\n`;
    if (report.results.accessibilityTests) {
      const tests = report.results.accessibilityTests;
      if (tests.error) {
        md += `- **Error:** ${tests.error}\n\n`;
      } else {
        if (tests.images) {
          md += `- **Image Alt Text:** ${tests.images.missingAlt}/${tests.images.total} missing\n`;
        }
        if (tests.aria) {
          md += `- **ARIA Labels:** ${tests.aria.unlabeledButtons} unlabeled buttons, ${tests.aria.unlabeledLinks} unlabeled links\n`;
        }
        if (tests.keyboardNav) {
          md += `- **Keyboard Navigation:** ${tests.keyboardNav.focusable ? '✅' : '❌'} ${tests.keyboardNav.message || ''}\n`;
        }
        md += '\n';
      }
    }

    // Screenshots
    md += `## Screenshots\n\n`;
    for (const screenshot of report.results.screenshots) {
      md += `- **${screenshot.name}** (${screenshot.viewport}): \`${screenshot.path}\`\n`;
    }
    md += '\n';

    // Console Errors
    if (report.results.errors.length > 0) {
      md += `## Console Errors\n\n`;
      for (const error of report.results.errors.slice(0, 10)) { // Limit to first 10 errors
        md += `- **${error.location}:** ${error.message}\n`;
      }
      if (report.results.errors.length > 10) {
        md += `- ... and ${report.results.errors.length - 10} more errors\n`;
      }
      md += '\n';
    }

    return md;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    this.startTime = Date.now();
    
    try {
      await this.initialize();
      
      // Run all test suites
      await this.testResourceCardFunctionality();
      await this.testAdvancedSearchFeatures();
      await this.testNavigation();
      await this.testVisualAnalysis();
      await this.testMobileInteractions();
      await this.testModalDialogBehavior();
      await this.testPerformanceAndAnimations();
      await this.testSecurity();
      await this.testAccessibility();
      
      // Generate final report
      const report = await this.generateReport();
      
      return report;
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
(async () => {
  const tester = new ComprehensiveFunctionalityTest();
  try {
    const report = await tester.run();
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
})();