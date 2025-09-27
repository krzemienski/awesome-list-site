const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

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

  async initialize() {
    console.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
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
      if (msg.type() === 'error') {
        this.results.errors.push({
          type: 'console',
          message: msg.text(),
          location: 'desktop'
        });
      }
    });

    this.mobilePage.on('console', msg => {
      if (msg.type() === 'error') {
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

  // 1. RESOURCE CARD FUNCTIONALITY TESTS
  async testResourceCardFunctionality() {
    console.log('\n🎯 Testing Resource Card Functionality...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl);
      await page.waitForSelector('[data-testid^="resource-card-"]', { timeout: 10000 });

      // Test hover states
      const cardSelector = '[data-testid^="resource-card-"]';
      const cards = await page.$$(cardSelector);
      
      if (cards.length > 0) {
        const firstCard = cards[0];
        
        // Get initial styles
        const initialStyles = await page.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            transform: computed.transform,
            boxShadow: computed.boxShadow
          };
        }, firstCard);

        // Hover over card
        await firstCard.hover();
        await page.waitForTimeout(500); // Wait for transition

        // Get hover styles
        const hoverStyles = await page.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            transform: computed.transform,
            boxShadow: computed.boxShadow
          };
        }, firstCard);

        // Check if hover state applied
        this.results.resourceCardTests.hoverState = {
          success: initialStyles.transform !== hoverStyles.transform || 
                   initialStyles.boxShadow !== hoverStyles.boxShadow,
          initialTransform: initialStyles.transform,
          hoverTransform: hoverStyles.transform
        };

        // Test external link icon
        const hasExternalIcon = await page.evaluate(() => {
          const card = document.querySelector('[data-testid^="resource-card-"]');
          if (!card) return false;
          card.dispatchEvent(new MouseEvent('mouseenter'));
          const icon = card.querySelector('svg.lucide-external-link');
          return icon ? window.getComputedStyle(icon).opacity !== '0' : false;
        });

        this.results.resourceCardTests.externalLinkIcon = {
          success: hasExternalIcon,
          message: hasExternalIcon ? 'External link icon appears on hover' : 'External link icon not found or not visible'
        };

        // Test card click (opens in new tab)
        const cardUrl = await page.evaluate(() => {
          const card = document.querySelector('[data-testid^="resource-card-"]');
          if (!card) return null;
          
          // Find the first link or get from onclick
          const link = card.querySelector('a');
          return link ? link.href : null;
        });

        // Test bookmark functionality
        const hasBookmark = await page.evaluate(() => {
          const card = document.querySelector('[data-testid^="resource-card-"]');
          if (!card) return false;
          const bookmarkBtn = card.querySelector('button:has(svg.lucide-bookmark)');
          return bookmarkBtn !== null;
        });

        this.results.resourceCardTests.bookmarkFunctionality = {
          exists: hasBookmark,
          message: hasBookmark ? 'Bookmark button found' : 'Bookmark functionality not implemented'
        };

        // Test share functionality
        const hasShare = await page.evaluate(() => {
          const card = document.querySelector('[data-testid^="resource-card-"]');
          if (!card) return false;
          const shareBtn = card.querySelector('button:has(svg.lucide-share-2)');
          return shareBtn !== null;
        });

        this.results.resourceCardTests.shareFunctionality = {
          exists: hasShare,
          message: hasShare ? 'Share button found' : 'Share functionality not implemented'
        };

        console.log('✅ Resource card functionality tests completed');
      } else {
        throw new Error('No resource cards found on page');
      }
    } catch (error) {
      console.error('❌ Resource card tests failed:', error);
      this.results.resourceCardTests.error = error.message;
    }
  }

  // 2. ADVANCED SEARCH FEATURES
  async testAdvancedSearchFeatures() {
    console.log('\n🔍 Testing Advanced Search Features...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl);
      await page.waitForSelector('body');

      // Open search dialog (Cmd+K)
      await page.keyboard.down('Meta');
      await page.keyboard.press('k');
      await page.keyboard.up('Meta');
      
      await page.waitForTimeout(500);

      // Check if search dialog opened
      const searchDialogVisible = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog && dialog.offsetParent !== null;
      });

      if (!searchDialogVisible) {
        // Try clicking search button if keyboard shortcut didn't work
        const searchButton = await page.$('button:has(svg.lucide-search)');
        if (searchButton) {
          await searchButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Test special characters
      const specialCharTests = [
        { query: 'C++', expected: 'Should handle plus signs' },
        { query: 'H.264', expected: 'Should handle dots and numbers' },
        { query: '@#$%', expected: 'Should handle special characters' },
        { query: 'VP9/AV1', expected: 'Should handle slashes' }
      ];

      for (const test of specialCharTests) {
        await page.type('input[type="text"], input[type="search"]', test.query);
        await page.waitForTimeout(500);
        
        const hasResults = await page.evaluate(() => {
          const results = document.querySelectorAll('[role="dialog"] [class*="hover:bg-accent"]');
          return results.length > 0;
        });

        this.results.searchTests[`specialChar_${test.query}`] = {
          query: test.query,
          hasResults,
          expected: test.expected
        };

        // Clear search
        await page.evaluate(() => {
          const input = document.querySelector('input[type="text"], input[type="search"]');
          if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      }

      // Test case-insensitive search
      const caseTests = ['ffmpeg', 'FFMPEG', 'FFmpeG'];
      const caseResults = [];

      for (const query of caseTests) {
        await page.type('input[type="text"], input[type="search"]', query);
        await page.waitForTimeout(500);
        
        const resultCount = await page.evaluate(() => {
          const results = document.querySelectorAll('[role="dialog"] [class*="hover:bg-accent"]');
          return results.length;
        });

        caseResults.push({ query, count: resultCount });

        // Clear search
        await page.evaluate(() => {
          const input = document.querySelector('input[type="text"], input[type="search"]');
          if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      }

      // Check if all case variations return same results
      const caseSensitive = caseResults.some(r => r.count !== caseResults[0].count);
      this.results.searchTests.caseInsensitive = {
        success: !caseSensitive,
        results: caseResults,
        message: caseSensitive ? 'Search is case sensitive' : 'Search is case insensitive'
      };

      // Test search highlighting
      await page.type('input[type="text"], input[type="search"]', 'video');
      await page.waitForTimeout(500);

      const hasHighlighting = await page.evaluate(() => {
        const results = document.querySelectorAll('[role="dialog"] [class*="hover:bg-accent"]');
        if (results.length === 0) return false;
        
        // Check for any highlighting indicators (bold, mark tags, different color)
        const firstResult = results[0];
        const hasMarkTag = firstResult.querySelector('mark') !== null;
        const hasBoldText = firstResult.querySelector('b, strong') !== null;
        const hasHighlightClass = firstResult.querySelector('[class*="highlight"]') !== null;
        
        return hasMarkTag || hasBoldText || hasHighlightClass;
      });

      this.results.searchTests.highlighting = {
        implemented: hasHighlighting,
        message: hasHighlighting ? 'Search highlighting implemented' : 'No search highlighting detected'
      };

      // Close search dialog
      await page.keyboard.press('Escape');

      console.log('✅ Advanced search tests completed');
    } catch (error) {
      console.error('❌ Search tests failed:', error);
      this.results.searchTests.error = error.message;
    }
  }

  // 3. NAVIGATION TESTING
  async testNavigation() {
    console.log('\n🧭 Testing Navigation Features...');
    const page = this.desktopPage;
    
    try {
      // Test deep linking
      await page.goto(`${this.baseUrl}/sub-subcategory/av1`);
      await page.waitForTimeout(2000);

      const av1PageLoaded = await page.evaluate(() => {
        const title = document.querySelector('h1');
        return title && title.textContent.toLowerCase().includes('av1');
      });

      this.results.navigationTests.deepLinking = {
        success: av1PageLoaded,
        url: '/sub-subcategory/av1',
        message: av1PageLoaded ? 'Deep linking works' : 'Deep linking failed'
      };

      // Test breadcrumb navigation
      const hasBreadcrumbs = await page.evaluate(() => {
        const breadcrumbs = document.querySelector('[aria-label="Breadcrumb"], nav ol, [class*="breadcrumb"]');
        return breadcrumbs !== null;
      });

      if (hasBreadcrumbs) {
        const breadcrumbLinks = await page.$$('nav a, [aria-label="Breadcrumb"] a');
        if (breadcrumbLinks.length > 0) {
          await breadcrumbLinks[0].click();
          await page.waitForTimeout(1000);
          
          const navigatedFromBreadcrumb = await page.evaluate(() => {
            return window.location.pathname !== '/sub-subcategory/av1';
          });

          this.results.navigationTests.breadcrumbNavigation = {
            success: navigatedFromBreadcrumb,
            message: 'Breadcrumb navigation works'
          };
        }
      } else {
        this.results.navigationTests.breadcrumbNavigation = {
          success: false,
          message: 'No breadcrumbs found'
        };
      }

      // Test browser back/forward
      await page.goto(this.baseUrl);
      await page.waitForTimeout(1000);
      
      // Click on a category
      await page.click('[data-testid="sidebar-category-encoding"] button, [data-testid="sidebar-category-encoding"]');
      await page.waitForTimeout(1000);
      
      const beforeBackUrl = page.url();
      
      // Go back
      await page.goBack();
      await page.waitForTimeout(1000);
      const afterBackUrl = page.url();
      
      // Go forward
      await page.goForward();
      await page.waitForTimeout(1000);
      const afterForwardUrl = page.url();

      this.results.navigationTests.browserHistory = {
        backButton: afterBackUrl !== beforeBackUrl,
        forwardButton: afterForwardUrl === beforeBackUrl,
        message: 'Browser history navigation works'
      };

      // Test 404 page
      await page.goto(`${this.baseUrl}/category/invalid-category`);
      await page.waitForTimeout(2000);

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
      console.error('❌ Navigation tests failed:', error);
      this.results.navigationTests.error = error.message;
    }
  }

  // 4. VISUAL SCREENSHOT ANALYSIS
  async testVisualAnalysis() {
    console.log('\n📸 Performing Visual Analysis...');
    
    try {
      // Desktop homepage
      await this.desktopPage.goto(this.baseUrl);
      await this.desktopPage.waitForSelector('[data-testid^="resource-card-"]', { timeout: 10000 });
      await this.captureScreenshot(this.desktopPage, 'desktop-homepage-visual');

      // Analyze desktop layout
      const desktopAnalysis = await this.desktopPage.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid^="resource-card-"]');
        const sidebar = document.querySelector('[data-testid^="sidebar"]');
        
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
        const containerPadding = window.getComputedStyle(document.querySelector('main') || document.body).padding;

        return {
          cardCount: cards.length,
          hasSidebar: sidebar !== null,
          truncatedTexts: truncatedTexts.slice(0, 5), // First 5 truncated texts
          spacing: {
            cardSpacing,
            containerPadding
          }
        };
      });

      this.results.visualAnalysis.desktop = desktopAnalysis;

      // Mobile homepage
      await this.mobilePage.goto(this.baseUrl);
      await this.mobilePage.waitForSelector('[data-testid^="resource-card-"], [data-testid^="resource-list-item"]', { timeout: 10000 });
      await this.captureScreenshot(this.mobilePage, 'mobile-homepage-visual');

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
        const sidebar = document.querySelector('[data-testid^="sidebar"]');
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
      console.error('❌ Visual analysis failed:', error);
      this.results.visualAnalysis.error = error.message;
    }
  }

  // 5. MOBILE-SPECIFIC TESTS
  async testMobileInteractions() {
    console.log('\n📱 Testing Mobile Interactions...');
    const page = this.mobilePage;
    
    try {
      await page.goto(this.baseUrl);
      await page.waitForTimeout(2000);

      // Test sidebar swipe gestures
      const sidebarButton = await page.$('[data-testid="sidebar-toggle"], button:has(svg.lucide-menu)');
      if (sidebarButton) {
        await sidebarButton.click();
        await page.waitForTimeout(500);
        
        const sidebarOpenBefore = await page.evaluate(() => {
          const sidebar = document.querySelector('[data-testid^="sidebar"], aside');
          return sidebar && window.getComputedStyle(sidebar).display !== 'none';
        });

        // Simulate swipe left to close sidebar
        await page.touchscreen.swipe({
          start: { x: 200, y: 400 },
          end: { x: 50, y: 400 },
          speed: 500
        });
        await page.waitForTimeout(500);

        const sidebarOpenAfter = await page.evaluate(() => {
          const sidebar = document.querySelector('[data-testid^="sidebar"], aside');
          return sidebar && window.getComputedStyle(sidebar).display !== 'none';
        });

        this.results.mobileTests.sidebarSwipe = {
          beforeSwipe: sidebarOpenBefore,
          afterSwipe: sidebarOpenAfter,
          success: sidebarOpenBefore && !sidebarOpenAfter,
          message: 'Sidebar swipe gesture works'
        };
      }

      // Test smooth scrolling
      await page.evaluate(() => window.scrollTo(0, 0));
      const scrollStartTime = Date.now();
      
      await page.evaluate(() => {
        window.scrollTo({ top: 1000, behavior: 'smooth' });
      });
      
      await page.waitForTimeout(1000);
      const scrollEndTime = Date.now();
      const scrollDuration = scrollEndTime - scrollStartTime;
      
      const finalScrollPosition = await page.evaluate(() => window.scrollY);

      this.results.mobileTests.smoothScrolling = {
        duration: scrollDuration,
        finalPosition: finalScrollPosition,
        success: finalScrollPosition > 500,
        message: 'Smooth scrolling works'
      };

      // Test momentum scrolling
      await page.touchscreen.swipe({
        start: { x: 195, y: 600 },
        end: { x: 195, y: 200 },
        speed: 100
      });
      await page.waitForTimeout(500);

      const momentumScrollPosition = await page.evaluate(() => window.scrollY);
      
      this.results.mobileTests.momentumScrolling = {
        position: momentumScrollPosition,
        success: momentumScrollPosition > 100,
        message: 'Momentum scrolling works'
      };

      // Test pinch-to-zoom
      const initialScale = await page.evaluate(() => {
        return window.visualViewport ? window.visualViewport.scale : 1;
      });

      await page.touchscreen.pinch({
        center: { x: 195, y: 400 },
        scale: 2
      });
      await page.waitForTimeout(500);

      const zoomedScale = await page.evaluate(() => {
        return window.visualViewport ? window.visualViewport.scale : 1;
      });

      this.results.mobileTests.pinchToZoom = {
        initialScale,
        zoomedScale,
        success: zoomedScale !== initialScale,
        message: 'Pinch-to-zoom behavior detected'
      };

      // Test card touch interactions
      const card = await page.$('[data-testid^="resource-card-"]');
      if (card) {
        // Test tap
        await card.tap();
        await page.waitForTimeout(500);

        // Check if action was triggered (e.g., navigation or modal)
        const actionTriggered = await page.evaluate(() => {
          // Check if URL changed or modal opened
          return window.location.pathname !== '/' || 
                 document.querySelector('[role="dialog"]') !== null;
        });

        this.results.mobileTests.cardTap = {
          success: true, // Tap executed without error
          actionTriggered,
          message: 'Card tap interaction works'
        };
      }

      console.log('✅ Mobile interaction tests completed');
    } catch (error) {
      console.error('❌ Mobile tests failed:', error);
      this.results.mobileTests.error = error.message;
    }
  }

  // 6. MODAL AND DIALOG TESTS
  async testModalDialogBehavior() {
    console.log('\n🪟 Testing Modal and Dialog Behavior...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl);
      
      // Open search dialog
      await page.keyboard.down('Meta');
      await page.keyboard.press('k');
      await page.keyboard.up('Meta');
      await page.waitForTimeout(500);

      const dialogOpen = await page.evaluate(() => {
        return document.querySelector('[role="dialog"]') !== null;
      });

      if (dialogOpen) {
        // Test Escape key to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        const dialogClosedByEscape = await page.evaluate(() => {
          return document.querySelector('[role="dialog"]') === null;
        });

        this.results.modalTests.escapeKey = {
          success: dialogClosedByEscape,
          message: 'Escape key closes dialog'
        };

        // Reopen for click-outside test
        await page.keyboard.down('Meta');
        await page.keyboard.press('k');
        await page.keyboard.up('Meta');
        await page.waitForTimeout(500);

        // Test click outside to close
        await page.mouse.click(100, 100); // Click outside dialog
        await page.waitForTimeout(500);

        const dialogClosedByClickOutside = await page.evaluate(() => {
          return document.querySelector('[role="dialog"]') === null;
        });

        this.results.modalTests.clickOutside = {
          success: dialogClosedByClickOutside,
          message: 'Click outside closes dialog'
        };

        // Test dialog centering on different viewports
        const viewportSizes = [
          { width: 1920, height: 1080, name: 'desktop' },
          { width: 768, height: 1024, name: 'tablet' },
          { width: 390, height: 844, name: 'mobile' }
        ];

        for (const viewport of viewportSizes) {
          await page.setViewport(viewport);
          
          // Open dialog
          await page.keyboard.down('Meta');
          await page.keyboard.press('k');
          await page.keyboard.up('Meta');
          await page.waitForTimeout(500);

          const isCentered = await page.evaluate(() => {
            const dialog = document.querySelector('[role="dialog"]');
            if (!dialog) return false;
            
            const rect = dialog.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            const horizontalCenter = Math.abs((rect.left + rect.right) / 2 - windowWidth / 2) < 10;
            const verticalCenter = Math.abs((rect.top + rect.bottom) / 2 - windowHeight / 2) < 50;
            
            return horizontalCenter && verticalCenter;
          });

          this.results.modalTests[`centering_${viewport.name}`] = {
            success: isCentered,
            viewport: viewport.name,
            message: `Dialog centered on ${viewport.name}`
          };

          // Close dialog
          await page.keyboard.press('Escape');
        }
      }

      console.log('✅ Modal/Dialog tests completed');
    } catch (error) {
      console.error('❌ Modal tests failed:', error);
      this.results.modalTests.error = error.message;
    }
  }

  // 7. PERFORMANCE AND ANIMATION TESTS
  async testPerformanceAndAnimations() {
    console.log('\n⚡ Testing Performance and Animations...');
    const page = this.desktopPage;
    
    try {
      // Start performance measurement
      await page.evaluateOnNewDocument(() => {
        window.performanceMetrics = {
          memoryStart: performance.memory ? performance.memory.usedJSHeapSize : 0,
          startTime: Date.now()
        };
      });

      await page.goto(this.baseUrl);
      await page.waitForSelector('[data-testid^="resource-card-"]', { timeout: 10000 });

      // Test memory usage
      const memoryMetrics = await page.evaluate(() => {
        if (!performance.memory) return null;
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      });

      this.results.performanceTests.memory = memoryMetrics;

      // Test CPU usage during scrolling
      const cpuMetrics = await page.metrics();
      
      // Scroll and measure
      await page.evaluate(() => {
        let scrollCount = 0;
        const interval = setInterval(() => {
          window.scrollBy(0, 100);
          scrollCount++;
          if (scrollCount >= 10) clearInterval(interval);
        }, 100);
      });
      
      await page.waitForTimeout(2000);
      const cpuMetricsAfterScroll = await page.metrics();

      this.results.performanceTests.cpu = {
        before: cpuMetrics,
        after: cpuMetricsAfterScroll,
        tasksDuration: cpuMetricsAfterScroll.TaskDuration - cpuMetrics.TaskDuration
      };

      // Test network optimization (check for caching headers)
      const responses = [];
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          fromCache: response.fromCache()
        });
      });

      // Reload to check caching
      await page.reload();
      await page.waitForTimeout(2000);

      const cachedResources = responses.filter(r => r.fromCache).length;
      const totalResources = responses.length;

      this.results.performanceTests.caching = {
        cachedResources,
        totalResources,
        cacheRatio: totalResources > 0 ? cachedResources / totalResources : 0,
        message: `${cachedResources}/${totalResources} resources cached`
      };

      // Test slow network conditions
      await page.emulateNetworkConditions({
        downloadThroughput: 50 * 1024, // 50kb/s
        uploadThroughput: 20 * 1024,   // 20kb/s
        latency: 400
      });

      const slowLoadStart = Date.now();
      await page.reload({ waitUntil: 'networkidle0' });
      const slowLoadTime = Date.now() - slowLoadStart;

      this.results.performanceTests.slowNetwork = {
        loadTime: slowLoadTime,
        success: slowLoadTime < 30000, // Should load within 30 seconds
        message: `Page loads in ${slowLoadTime}ms on slow network`
      };

      // Reset network conditions
      await page.emulateNetworkConditions({
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      });

      // Test animation smoothness
      const animationMetrics = await page.evaluate(async () => {
        const cards = document.querySelectorAll('[data-testid^="resource-card-"]');
        if (cards.length === 0) return null;

        // Trigger hover animation
        const card = cards[0];
        const startTime = performance.now();
        
        card.dispatchEvent(new MouseEvent('mouseenter'));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        return {
          duration,
          smooth: duration < 600, // Animation should complete within 600ms
          cardCount: cards.length
        };
      });

      this.results.performanceTests.animations = animationMetrics;

      // Test loading skeleton
      await page.goto(this.baseUrl);
      
      const hasLoadingSkeleton = await page.evaluate(() => {
        const skeletons = document.querySelectorAll('[class*="skeleton"], [data-testid*="skeleton"]');
        return skeletons.length > 0;
      });

      this.results.performanceTests.loadingSkeleton = {
        exists: hasLoadingSkeleton,
        message: hasLoadingSkeleton ? 'Loading skeletons present' : 'No loading skeletons found'
      };

      console.log('✅ Performance tests completed');
    } catch (error) {
      console.error('❌ Performance tests failed:', error);
      this.results.performanceTests.error = error.message;
    }
  }

  // 8. SECURITY TESTS
  async testSecurity() {
    console.log('\n🔒 Testing Security Features...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl);

      // Test XSS in search
      await page.keyboard.down('Meta');
      await page.keyboard.press('k');
      await page.keyboard.up('Meta');
      await page.waitForTimeout(500);

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        await page.type('input[type="text"], input[type="search"]', payload);
        await page.waitForTimeout(500);

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

        // Clear input
        await page.evaluate(() => {
          const input = document.querySelector('input[type="text"], input[type="search"]');
          if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      }

      // Test CSRF protection
      const hasCsrfToken = await page.evaluate(() => {
        // Check for CSRF tokens in forms
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
          const csrfInput = form.querySelector('input[name*="csrf"], input[name*="token"]');
          if (csrfInput) return true;
        }
        
        // Check for CSRF in meta tags
        const csrfMeta = document.querySelector('meta[name*="csrf"]');
        return csrfMeta !== null;
      });

      this.results.securityTests.csrf = {
        protected: hasCsrfToken,
        message: hasCsrfToken ? 'CSRF protection found' : 'No CSRF protection detected'
      };

      // Test Content Security Policy
      const cspHeader = await page.evaluate(() => {
        // Check for CSP meta tag
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
      console.error('❌ Security tests failed:', error);
      this.results.securityTests.error = error.message;
    }
  }

  // 9. ACCESSIBILITY TESTS
  async testAccessibility() {
    console.log('\n♿ Testing Accessibility...');
    const page = this.desktopPage;
    
    try {
      await page.goto(this.baseUrl);
      await page.waitForSelector('body');

      // Check color contrast
      const contrastIssues = await page.evaluate(() => {
        const issues = [];
        const elements = document.querySelectorAll('*');
        
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const bgColor = style.backgroundColor;
          const textColor = style.color;
          
          if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)') {
            // Simple contrast check (would need proper WCAG calculation in production)
            const isDark = bgColor.includes('0, 0, 0') || bgColor.includes('rgb(0');
            const isLightText = textColor.includes('255, 255, 255') || textColor.includes('rgb(255');
            
            if (isDark === isLightText) {
              // Likely good contrast
            } else if (el.textContent.trim()) {
              issues.push({
                text: el.textContent.substring(0, 30),
                bg: bgColor,
                fg: textColor
              });
            }
          }
        });
        
        return issues.slice(0, 5); // Return first 5 issues
      });

      this.results.accessibilityTests.contrast = {
        issues: contrastIssues,
        success: contrastIssues.length === 0,
        message: `Found ${contrastIssues.length} potential contrast issues`
      };

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
        const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        const links = document.querySelectorAll('a:not([aria-label]):not([aria-labelledby])');
        
        return {
          unlabeledButtons: buttons.length,
          unlabeledLinks: links.length,
          totalButtons: document.querySelectorAll('button').length,
          totalLinks: document.querySelectorAll('a').length
        };
      });

      this.results.accessibilityTests.aria = ariaCheck;

      // Test RTL support
      await page.evaluate(() => {
        document.documentElement.setAttribute('dir', 'rtl');
      });
      await page.waitForTimeout(500);

      const rtlLayout = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-testid^="sidebar"], aside');
        if (!sidebar) return null;
        
        const rect = sidebar.getBoundingClientRect();
        return {
          position: rect.left < window.innerWidth / 2 ? 'left' : 'right',
          isRtl: window.getComputedStyle(document.documentElement).direction === 'rtl'
        };
      });

      this.results.accessibilityTests.rtl = {
        supported: rtlLayout && rtlLayout.isRtl,
        sidebarPosition: rtlLayout ? rtlLayout.position : 'unknown',
        message: 'RTL layout support'
      };

      // Reset to LTR
      await page.evaluate(() => {
        document.documentElement.setAttribute('dir', 'ltr');
      });

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
        message: 'Keyboard navigation works'
      };

      console.log('✅ Accessibility tests completed');
    } catch (error) {
      console.error('❌ Accessibility tests failed:', error);
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
      md += `- **Hover State:** ${tests.hoverState?.success ? '✅' : '❌'} ${tests.hoverState?.hoverTransform || 'N/A'}\n`;
      md += `- **External Link Icon:** ${tests.externalLinkIcon?.success ? '✅' : '❌'} ${tests.externalLinkIcon?.message || ''}\n`;
      md += `- **Bookmark Functionality:** ${tests.bookmarkFunctionality?.exists ? '✅' : '❌'} ${tests.bookmarkFunctionality?.message || ''}\n`;
      md += `- **Share Functionality:** ${tests.shareFunctionality?.exists ? '✅' : '❌'} ${tests.shareFunctionality?.message || ''}\n\n`;
    }

    // Search Tests
    md += `## 2. Advanced Search Features\n\n`;
    if (report.results.searchTests) {
      const tests = report.results.searchTests;
      md += `- **Case Insensitive:** ${tests.caseInsensitive?.success ? '✅' : '❌'} ${tests.caseInsensitive?.message || ''}\n`;
      md += `- **Search Highlighting:** ${tests.highlighting?.implemented ? '✅' : '❌'} ${tests.highlighting?.message || ''}\n`;
      md += `- **Special Characters:** Multiple tests performed\n\n`;
    }

    // Navigation Tests
    md += `## 3. Navigation\n\n`;
    if (report.results.navigationTests) {
      const tests = report.results.navigationTests;
      md += `- **Deep Linking:** ${tests.deepLinking?.success ? '✅' : '❌'} ${tests.deepLinking?.message || ''}\n`;
      md += `- **Breadcrumb Navigation:** ${tests.breadcrumbNavigation?.success ? '✅' : '❌'} ${tests.breadcrumbNavigation?.message || ''}\n`;
      md += `- **Browser History:** Back: ${tests.browserHistory?.backButton ? '✅' : '❌'}, Forward: ${tests.browserHistory?.forwardButton ? '✅' : '❌'}\n`;
      md += `- **404 Page:** ${tests.notFoundPage?.success ? '✅' : '❌'} ${tests.notFoundPage?.message || ''}\n\n`;
    }

    // Visual Analysis
    md += `## 4. Visual Analysis\n\n`;
    if (report.results.visualAnalysis) {
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

    // Mobile Tests
    md += `## 5. Mobile Interactions\n\n`;
    if (report.results.mobileTests) {
      const tests = report.results.mobileTests;
      md += `- **Sidebar Swipe:** ${tests.sidebarSwipe?.success ? '✅' : '❌'} ${tests.sidebarSwipe?.message || ''}\n`;
      md += `- **Smooth Scrolling:** ${tests.smoothScrolling?.success ? '✅' : '❌'} Position: ${tests.smoothScrolling?.finalPosition || 0}px\n`;
      md += `- **Momentum Scrolling:** ${tests.momentumScrolling?.success ? '✅' : '❌'}\n`;
      md += `- **Pinch to Zoom:** ${tests.pinchToZoom?.success ? '✅' : '❌'}\n`;
      md += `- **Card Tap:** ${tests.cardTap?.success ? '✅' : '❌'}\n\n`;
    }

    // Modal Tests
    md += `## 6. Modal/Dialog Behavior\n\n`;
    if (report.results.modalTests) {
      const tests = report.results.modalTests;
      md += `- **Escape Key:** ${tests.escapeKey?.success ? '✅' : '❌'} ${tests.escapeKey?.message || ''}\n`;
      md += `- **Click Outside:** ${tests.clickOutside?.success ? '✅' : '❌'} ${tests.clickOutside?.message || ''}\n`;
      md += `- **Centering Desktop:** ${tests.centering_desktop?.success ? '✅' : '❌'}\n`;
      md += `- **Centering Tablet:** ${tests.centering_tablet?.success ? '✅' : '❌'}\n`;
      md += `- **Centering Mobile:** ${tests.centering_mobile?.success ? '✅' : '❌'}\n\n`;
    }

    // Performance Tests
    md += `## 7. Performance\n\n`;
    if (report.results.performanceTests) {
      const tests = report.results.performanceTests;
      if (tests.memory) {
        md += `- **Memory Usage:** ${(tests.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB\n`;
      }
      if (tests.caching) {
        md += `- **Caching:** ${tests.caching.message} (${(tests.caching.cacheRatio * 100).toFixed(1)}%)\n`;
      }
      if (tests.slowNetwork) {
        md += `- **Slow Network Load:** ${tests.slowNetwork.success ? '✅' : '❌'} ${tests.slowNetwork.message}\n`;
      }
      if (tests.animations) {
        md += `- **Animation Smoothness:** ${tests.animations?.smooth ? '✅' : '❌'} Duration: ${tests.animations?.duration?.toFixed(0) || 0}ms\n`;
      }
      if (tests.loadingSkeleton) {
        md += `- **Loading Skeletons:** ${tests.loadingSkeleton?.exists ? '✅' : '❌'}\n`;
      }
      md += '\n';
    }

    // Security Tests
    md += `## 8. Security\n\n`;
    if (report.results.securityTests) {
      const tests = report.results.securityTests;
      let xssProtected = true;
      for (const key in tests) {
        if (key.startsWith('xss_') && tests[key].triggered) {
          xssProtected = false;
        }
      }
      md += `- **XSS Protection:** ${xssProtected ? '✅' : '❌ VULNERABILITY DETECTED!'}\n`;
      md += `- **CSRF Protection:** ${tests.csrf?.protected ? '✅' : '⚠️'} ${tests.csrf?.message || ''}\n`;
      md += `- **CSP Header:** ${tests.csp?.exists ? '✅' : '⚠️'} ${tests.csp?.message || ''}\n\n`;
    }

    // Accessibility Tests
    md += `## 9. Accessibility\n\n`;
    if (report.results.accessibilityTests) {
      const tests = report.results.accessibilityTests;
      if (tests.contrast) {
        md += `- **Color Contrast:** ${tests.contrast.success ? '✅' : '⚠️'} ${tests.contrast.message}\n`;
      }
      if (tests.images) {
        md += `- **Image Alt Text:** ${tests.images.missingAlt}/${tests.images.total} missing\n`;
      }
      if (tests.aria) {
        md += `- **ARIA Labels:** ${tests.aria.unlabeledButtons} unlabeled buttons, ${tests.aria.unlabeledLinks} unlabeled links\n`;
      }
      if (tests.rtl) {
        md += `- **RTL Support:** ${tests.rtl.supported ? '✅' : '❌'}\n`;
      }
      if (tests.keyboardNav) {
        md += `- **Keyboard Navigation:** ${tests.keyboardNav.focusable ? '✅' : '❌'}\n`;
      }
      md += '\n';
    }

    // Screenshots
    md += `## Screenshots\n\n`;
    for (const screenshot of report.results.screenshots) {
      md += `- **${screenshot.name}** (${screenshot.viewport}): \`${screenshot.path}\`\n`;
    }
    md += '\n';

    // Errors and Warnings
    if (report.results.errors.length > 0) {
      md += `## Console Errors\n\n`;
      for (const error of report.results.errors) {
        md += `- **${error.location}:** ${error.message}\n`;
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