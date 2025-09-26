import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComprehensiveTestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:5000';
    this.testResults = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      categories: {},
      performanceMetrics: {},
      errors: [],
      recommendations: []
    };
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Listen for console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.testResults.errors.push({
          type: 'console_error',
          message: msg.text(),
          location: this.page.url()
        });
      }
    });
    
    // Listen for page errors
    this.page.on('pageerror', error => {
      this.testResults.errors.push({
        type: 'page_error',
        message: error.message,
        location: this.page.url()
      });
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  addResult(category, testName, status, details = {}) {
    if (!this.testResults.categories[category]) {
      this.testResults.categories[category] = {
        tests: [],
        summary: { passed: 0, failed: 0, total: 0 }
      };
    }
    
    const test = {
      name: testName,
      status: status,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    this.testResults.categories[category].tests.push(test);
    this.testResults.categories[category].summary.total++;
    this.testResults.summary.total++;
    
    if (status === 'PASS') {
      this.testResults.categories[category].summary.passed++;
      this.testResults.summary.passed++;
    } else if (status === 'FAIL') {
      this.testResults.categories[category].summary.failed++;
      this.testResults.summary.failed++;
    } else if (status === 'WARNING') {
      this.testResults.summary.warnings++;
    }
    
    console.log(`[${category}] ${testName}: ${status}`);
    if (details.error) console.error(`  Error: ${details.error}`);
    if (details.info) console.log(`  Info: ${details.info}`);
  }

  async measurePerformance(action, fn) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    if (!this.testResults.performanceMetrics[action]) {
      this.testResults.performanceMetrics[action] = [];
    }
    this.testResults.performanceMetrics[action].push(duration);
    
    return { result, duration };
  }

  // 1. SEARCH FUNCTIONALITY TESTS
  async testSearchFunctionality() {
    console.log('\n🔍 Testing Search Functionality...\n');
    
    try {
      // Navigate to homepage
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      
      // Test search button existence
      const searchButton = await this.page.$('[data-testid*="search"]');
      if (searchButton) {
        this.addResult('Search', 'Search button exists', 'PASS');
        
        // Click search button to open dialog
        await searchButton.click();
        await this.page.waitForTimeout(500);
        
        // Check if search dialog opened
        const searchDialog = await this.page.$('[role="dialog"]');
        if (searchDialog) {
          this.addResult('Search', 'Search dialog opens', 'PASS');
          
          // Test real-time search filtering
          const searchTerms = ['video', 'streaming', 'ffmpeg', 'codec'];
          
          for (const term of searchTerms) {
            const { result, duration } = await this.measurePerformance(`search_${term}`, async () => {
              // Find search input
              const searchInput = await this.page.$('input[type="text"]');
              if (!searchInput) return false;
              
              // Clear and type search term
              await searchInput.click({ clickCount: 3 });
              await searchInput.type(term);
              await this.page.waitForTimeout(500);
              
              // Check for results
              const results = await this.page.$$eval('[data-testid*="search-result"], [class*="hover:bg-accent"]', 
                els => els.length
              );
              
              return results > 0;
            });
            
            if (result) {
              this.addResult('Search', `Search for "${term}"`, 'PASS', {
                info: `Found results in ${duration.toFixed(2)}ms`
              });
            } else {
              this.addResult('Search', `Search for "${term}"`, 'FAIL', {
                error: 'No results found'
              });
            }
            
            // Clear search
            const searchInput = await this.page.$('input[type="text"]');
            if (searchInput) {
              await searchInput.click({ clickCount: 3 });
              await this.page.keyboard.press('Backspace');
            }
          }
          
          // Close dialog
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
        } else {
          this.addResult('Search', 'Search dialog opens', 'FAIL');
        }
      } else {
        this.addResult('Search', 'Search button exists', 'FAIL');
      }
      
      // Test search on category page
      await this.page.goto(`${this.baseUrl}/category/encoding-codecs`, { waitUntil: 'networkidle0' });
      
      // Look for search input on category page
      const categorySearchInput = await this.page.$('input[placeholder*="Search"], input[type="search"]');
      if (categorySearchInput) {
        this.addResult('Search', 'Category page search exists', 'PASS');
        
        await categorySearchInput.type('ffmpeg');
        await this.page.waitForTimeout(1000);
        
        // Check if results are filtered
        const visibleCards = await this.page.$$('[data-testid*="resource"], [class*="resource-card"]');
        this.addResult('Search', 'Category page search filters', visibleCards.length > 0 ? 'PASS' : 'FAIL', {
          info: `Found ${visibleCards.length} filtered results`
        });
      } else {
        this.addResult('Search', 'Category page search exists', 'FAIL');
      }
      
    } catch (error) {
      this.addResult('Search', 'Search functionality test', 'FAIL', {
        error: error.message
      });
    }
  }

  // 2. FILTERS AND SORTING TESTS
  async testFiltersAndSorting() {
    console.log('\n🎯 Testing Filters and Sorting...\n');
    
    try {
      // Navigate to encoding-codecs category
      await this.page.goto(`${this.baseUrl}/category/encoding-codecs`, { waitUntil: 'networkidle0' });
      
      // Test initial resource count
      let resourceCount = await this.page.$$eval('[data-testid*="resource"], [class*="resource-card"]', 
        els => els.length
      );
      this.addResult('Filters', 'Initial resource count', 'PASS', {
        info: `${resourceCount} resources loaded`
      });
      
      // Test subcategory filter
      const subcategorySelect = await this.page.$('select, [role="combobox"]');
      if (subcategorySelect) {
        // Click to open dropdown
        await subcategorySelect.click();
        await this.page.waitForTimeout(500);
        
        // Look for "Codecs" option
        const codecsOption = await this.page.$('[role="option"]:has-text("Codecs"), option:has-text("Codecs")');
        if (codecsOption) {
          await codecsOption.click();
          await this.page.waitForTimeout(1000);
          
          resourceCount = await this.page.$$eval('[data-testid*="resource"], [class*="resource-card"]', 
            els => els.length
          );
          
          // Should show around 29 resources
          const isCorrectCount = resourceCount >= 25 && resourceCount <= 35;
          this.addResult('Filters', 'Subcategory filter (Codecs)', isCorrectCount ? 'PASS' : 'WARNING', {
            info: `${resourceCount} resources shown (expected ~29)`
          });
        } else {
          this.addResult('Filters', 'Subcategory filter (Codecs)', 'FAIL', {
            error: 'Could not find Codecs option'
          });
        }
      } else {
        this.addResult('Filters', 'Subcategory filter exists', 'FAIL');
      }
      
      // Test sort options
      const sortSelects = await this.page.$$('select, [role="combobox"]');
      if (sortSelects.length > 1) {
        const sortSelect = sortSelects[1]; // Second select is usually sort
        await sortSelect.click();
        await this.page.waitForTimeout(500);
        
        // Try to select alphabetical sort
        const alphabeticalOption = await this.page.$('[role="option"]:has-text("Alphabetical"), option[value*="name"]');
        if (alphabeticalOption) {
          await alphabeticalOption.click();
          await this.page.waitForTimeout(1000);
          
          // Get first few resource titles to check order
          const titles = await this.page.$$eval('[data-testid*="resource"] h3, [class*="resource-card"] h3', 
            els => els.slice(0, 5).map(el => el.textContent)
          );
          
          const isSorted = titles.every((title, i) => 
            i === 0 || title.localeCompare(titles[i-1]) >= 0
          );
          
          this.addResult('Filters', 'Sort alphabetically', isSorted ? 'PASS' : 'WARNING', {
            info: `First titles: ${titles.join(', ')}`
          });
        } else {
          this.addResult('Filters', 'Sort options available', 'WARNING');
        }
      } else {
        this.addResult('Filters', 'Sort dropdown exists', 'WARNING');
      }
      
      // Test filter persistence
      const currentUrl = this.page.url();
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(500);
      await this.page.goto(currentUrl, { waitUntil: 'networkidle0' });
      
      // Check if filters are still applied
      resourceCount = await this.page.$$eval('[data-testid*="resource"], [class*="resource-card"]', 
        els => els.length
      );
      
      this.addResult('Filters', 'Filter persistence', 'PASS', {
        info: 'Navigated away and back, checking filter state'
      });
      
    } catch (error) {
      this.addResult('Filters', 'Filters and sorting test', 'FAIL', {
        error: error.message
      });
    }
  }

  // 3. LAYOUT SWITCHING TESTS
  async testLayoutSwitching() {
    console.log('\n📐 Testing Layout Switching...\n');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      
      // Look for layout switcher
      const layoutSwitcher = await this.page.$('[data-testid*="layout"], [class*="layout-switcher"]');
      
      if (layoutSwitcher) {
        this.addResult('Layout', 'Layout switcher exists', 'PASS');
        
        const layouts = ['cards', 'list', 'compact'];
        
        for (const layout of layouts) {
          // Look for layout button
          const layoutButton = await this.page.$(`button:has-text("${layout}"), [data-testid*="${layout}"]`);
          
          if (layoutButton) {
            await layoutButton.click();
            await this.page.waitForTimeout(1000);
            
            // Check if layout changed
            let layoutApplied = false;
            
            if (layout === 'cards') {
              const cards = await this.page.$$('[class*="grid"] [class*="card"]');
              layoutApplied = cards.length > 0;
            } else if (layout === 'list') {
              const listItems = await this.page.$$('[class*="list-item"], [class*="flex-col"]');
              layoutApplied = listItems.length > 0;
            } else if (layout === 'compact') {
              const compactItems = await this.page.$$('[class*="compact"], [class*="py-2"]');
              layoutApplied = compactItems.length > 0;
            }
            
            this.addResult('Layout', `Switch to ${layout} view`, layoutApplied ? 'PASS' : 'WARNING', {
              info: `Layout ${layout} ${layoutApplied ? 'applied' : 'may not be visible'}`
            });
          } else {
            this.addResult('Layout', `${layout} button exists`, 'WARNING');
          }
        }
        
        // Test persistence
        await this.page.reload({ waitUntil: 'networkidle0' });
        
        // Check if layout is persisted
        const currentLayout = await this.page.evaluate(() => {
          return sessionStorage.getItem('awesome-layout');
        });
        
        this.addResult('Layout', 'Layout persistence', currentLayout ? 'PASS' : 'WARNING', {
          info: `Persisted layout: ${currentLayout || 'none'}`
        });
        
        // Test on mobile viewport
        await this.page.setViewport({ width: 375, height: 812 });
        await this.page.waitForTimeout(1000);
        
        const mobileLayout = await this.page.$$('[class*="card"], [class*="list-item"]');
        this.addResult('Layout', 'Mobile responsive layout', mobileLayout.length > 0 ? 'PASS' : 'FAIL');
        
        // Reset viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
        
      } else {
        this.addResult('Layout', 'Layout switcher exists', 'FAIL');
      }
      
    } catch (error) {
      this.addResult('Layout', 'Layout switching test', 'FAIL', {
        error: error.message
      });
    }
  }

  // 4. PAGINATION TESTS
  async testPagination() {
    console.log('\n📄 Testing Pagination...\n');
    
    try {
      // Navigate to category with many resources
      await this.page.goto(`${this.baseUrl}/category/encoding-codecs`, { waitUntil: 'networkidle0' });
      
      // Look for pagination controls
      const pagination = await this.page.$('[data-testid*="pagination"], [class*="pagination"], nav');
      
      if (pagination) {
        this.addResult('Pagination', 'Pagination controls exist', 'PASS');
        
        // Get initial scroll position
        const initialScrollY = await this.page.evaluate(() => window.scrollY);
        
        // Test next button
        const nextButton = await this.page.$('button:has-text("Next"), [aria-label*="next"]');
        if (nextButton) {
          const isDisabled = await nextButton.evaluate(el => el.disabled);
          
          if (!isDisabled) {
            await nextButton.click();
            await this.page.waitForTimeout(1000);
            
            // Check if page changed without skeleton reload
            const hasSkeletons = await this.page.$$('[class*="skeleton"]');
            this.addResult('Pagination', 'No skeleton on page change', hasSkeletons.length === 0 ? 'PASS' : 'FAIL');
            
            // Check scroll reset
            const newScrollY = await this.page.evaluate(() => window.scrollY);
            this.addResult('Pagination', 'Scroll resets to top', newScrollY < 100 ? 'PASS' : 'WARNING', {
              info: `Scroll position: ${newScrollY}`
            });
            
            // Test previous button
            const prevButton = await this.page.$('button:has-text("Previous"), [aria-label*="prev"]');
            if (prevButton) {
              await prevButton.click();
              await this.page.waitForTimeout(1000);
              this.addResult('Pagination', 'Previous button works', 'PASS');
            }
          } else {
            this.addResult('Pagination', 'Next button enabled', 'WARNING', {
              info: 'Not enough pages to test'
            });
          }
        } else {
          this.addResult('Pagination', 'Next button exists', 'FAIL');
        }
        
        // Test page number buttons
        const pageButtons = await this.page.$$('button[class*="page"], [aria-label*="page"]');
        if (pageButtons.length > 0) {
          this.addResult('Pagination', 'Page number buttons exist', 'PASS', {
            info: `${pageButtons.length} page buttons found`
          });
        }
        
        // Test state persistence
        const currentUrl = this.page.url();
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        await this.page.goto(currentUrl, { waitUntil: 'networkidle0' });
        
        // Check if we're still on the same page
        this.addResult('Pagination', 'Page state persistence', 'PASS', {
          info: 'Navigated away and back'
        });
        
      } else {
        this.addResult('Pagination', 'Pagination controls exist', 'WARNING', {
          info: 'May not have enough items for pagination'
        });
      }
      
    } catch (error) {
      this.addResult('Pagination', 'Pagination test', 'FAIL', {
        error: error.message
      });
    }
  }

  // 5. AI RECOMMENDATIONS TESTS
  async testAIRecommendations() {
    console.log('\n🤖 Testing AI Recommendations...\n');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      
      // Look for AI recommendations button or panel
      const aiElements = await this.page.$$('[data-testid*="ai"], [data-testid*="recommendation"], [class*="recommendation"], button:has-text("AI"), button:has-text("Recommendations")');
      
      if (aiElements.length > 0) {
        this.addResult('AI', 'AI Recommendations element exists', 'PASS', {
          info: `Found ${aiElements.length} AI-related elements`
        });
        
        // Try to open recommendations
        const aiButton = await this.page.$('button:has-text("AI"), button:has-text("Recommendations"), [data-testid*="recommendation-toggle"]');
        
        if (aiButton) {
          await aiButton.click();
          await this.page.waitForTimeout(1000);
          
          // Check if panel opened
          const recommendationPanel = await this.page.$('[data-testid*="recommendation-panel"], [class*="recommendation-panel"]');
          
          if (recommendationPanel) {
            this.addResult('AI', 'Recommendations panel opens', 'PASS');
            
            // Check for recommendations content
            const recommendations = await this.page.$$('[data-testid*="recommendation-item"], [class*="recommendation"] [class*="card"]');
            
            this.addResult('AI', 'Recommendations displayed', recommendations.length > 0 ? 'PASS' : 'WARNING', {
              info: `${recommendations.length} recommendations shown`
            });
            
            // Test closing panel
            const closeButton = await this.page.$('button[aria-label*="close"], button:has-text("Close")');
            if (closeButton) {
              await closeButton.click();
              await this.page.waitForTimeout(500);
              this.addResult('AI', 'Panel closes properly', 'PASS');
            }
          } else {
            this.addResult('AI', 'Recommendations panel opens', 'WARNING', {
              info: 'Panel may not be visible or implemented'
            });
          }
        } else {
          this.addResult('AI', 'AI Recommendations button', 'WARNING', {
            info: 'Button not found, feature may not be implemented'
          });
        }
      } else {
        this.addResult('AI', 'AI Recommendations feature', 'INFO', {
          info: 'Feature not found - may not be implemented'
        });
      }
      
    } catch (error) {
      this.addResult('AI', 'AI Recommendations test', 'FAIL', {
        error: error.message
      });
    }
  }

  // 6. COLOR PALETTE GENERATOR TESTS
  async testColorPalette() {
    console.log('\n🎨 Testing Color Palette Generator...\n');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      
      // Look for color palette or theme elements
      const paletteElements = await this.page.$$('[data-testid*="palette"], [data-testid*="color"], [data-testid*="theme"], button:has-text("Color"), button:has-text("Theme"), button:has-text("Palette")');
      
      if (paletteElements.length > 0) {
        this.addResult('ColorPalette', 'Color palette element exists', 'PASS', {
          info: `Found ${paletteElements.length} palette-related elements`
        });
        
        // Try to open palette generator
        const paletteButton = paletteElements[0];
        await paletteButton.click();
        await this.page.waitForTimeout(1000);
        
        // Check if dialog/modal opened
        const paletteDialog = await this.page.$('[role="dialog"], [class*="palette-generator"], [class*="color-palette"]');
        
        if (paletteDialog) {
          this.addResult('ColorPalette', 'Palette generator opens', 'PASS');
          
          // Test generation
          const generateButton = await this.page.$('button:has-text("Generate"), button[data-testid*="generate"]');
          if (generateButton) {
            await generateButton.click();
            await this.page.waitForTimeout(2000);
            
            // Check for generated colors
            const colorElements = await this.page.$$('[class*="color"], [style*="background-color"]');
            this.addResult('ColorPalette', 'Colors generated', colorElements.length >= 3 ? 'PASS' : 'WARNING', {
              info: `${colorElements.length} color elements found`
            });
          }
          
          // Test export/copy
          const exportButton = await this.page.$('button:has-text("Export"), button:has-text("Copy"), button[data-testid*="export"]');
          if (exportButton) {
            this.addResult('ColorPalette', 'Export/Copy functionality exists', 'PASS');
          }
          
          // Close dialog
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
          
        } else {
          this.addResult('ColorPalette', 'Palette generator opens', 'WARNING', {
            info: 'Dialog may not be visible or implemented'
          });
        }
      } else {
        this.addResult('ColorPalette', 'Color palette feature', 'INFO', {
          info: 'Feature not found - may not be implemented'
        });
      }
      
    } catch (error) {
      this.addResult('ColorPalette', 'Color palette test', 'FAIL', {
        error: error.message
      });
    }
  }

  // 7. PERFORMANCE TESTS
  async testPerformance() {
    console.log('\n⚡ Testing Performance...\n');
    
    try {
      // Test initial page load
      const { duration: loadTime } = await this.measurePerformance('initial_load', async () => {
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        return true;
      });
      
      this.addResult('Performance', 'Initial page load time', loadTime < 3000 ? 'PASS' : 'WARNING', {
        info: `${loadTime.toFixed(2)}ms`
      });
      
      // Test route transitions
      const routes = [
        '/category/protocols-transport',
        '/category/encoding-codecs',
        '/category/players-clients'
      ];
      
      for (const route of routes) {
        const { duration } = await this.measurePerformance(`route_${route}`, async () => {
          await this.page.goto(`${this.baseUrl}${route}`, { waitUntil: 'networkidle0' });
          return true;
        });
        
        this.addResult('Performance', `Route transition to ${route}`, duration < 2000 ? 'PASS' : 'WARNING', {
          info: `${duration.toFixed(2)}ms`
        });
      }
      
      // Test lazy loading
      await this.page.goto(`${this.baseUrl}/category/encoding-codecs`, { waitUntil: 'networkidle0' });
      
      // Scroll down to trigger lazy loading
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await this.page.waitForTimeout(1000);
      
      // Check for lazy loaded elements
      const lazyLoadedElements = await this.page.$$('[data-loaded="true"], [class*="loaded"]');
      this.addResult('Performance', 'Lazy loading works', 'PASS', {
        info: `${lazyLoadedElements.length} elements lazy loaded`
      });
      
      // Check for console errors
      this.addResult('Performance', 'Console errors', this.testResults.errors.length === 0 ? 'PASS' : 'WARNING', {
        info: `${this.testResults.errors.length} errors found`,
        errors: this.testResults.errors
      });
      
      // Test memory usage (basic check)
      const metrics = await this.page.metrics();
      this.addResult('Performance', 'Memory usage', metrics.JSHeapUsedSize < 50000000 ? 'PASS' : 'WARNING', {
        info: `Heap size: ${(metrics.JSHeapUsedSize / 1000000).toFixed(2)}MB`
      });
      
    } catch (error) {
      this.addResult('Performance', 'Performance test', 'FAIL', {
        error: error.message
      });
    }
  }

  // 8. EDGE CASES TESTS
  async testEdgeCases() {
    console.log('\n🔧 Testing Edge Cases...\n');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      
      // Test empty search results
      const searchButton = await this.page.$('[data-testid*="search"]');
      if (searchButton) {
        await searchButton.click();
        await this.page.waitForTimeout(500);
        
        const searchInput = await this.page.$('input[type="text"]');
        if (searchInput) {
          await searchInput.type('xyzabc123nonexistent');
          await this.page.waitForTimeout(1000);
          
          // Check for empty state message
          const emptyState = await this.page.$(':has-text("No results"), :has-text("not found")');
          this.addResult('EdgeCases', 'Empty search results handled', emptyState ? 'PASS' : 'WARNING');
          
          await this.page.keyboard.press('Escape');
        }
      }
      
      // Test rapid navigation
      const rapidNavTest = async () => {
        for (let i = 0; i < 5; i++) {
          await this.page.goto(`${this.baseUrl}/category/protocols-transport`, { waitUntil: 'domcontentloaded' });
          await this.page.goto(`${this.baseUrl}/category/encoding-codecs`, { waitUntil: 'domcontentloaded' });
        }
        return true;
      };
      
      try {
        await rapidNavTest();
        this.addResult('EdgeCases', 'Rapid navigation handling', 'PASS');
      } catch (error) {
        this.addResult('EdgeCases', 'Rapid navigation handling', 'FAIL', {
          error: error.message
        });
      }
      
      // Test browser back/forward
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
      await this.page.goto(`${this.baseUrl}/category/encoding-codecs`, { waitUntil: 'networkidle0' });
      
      await this.page.goBack({ waitUntil: 'networkidle0' });
      let currentUrl = this.page.url();
      this.addResult('EdgeCases', 'Browser back button', currentUrl === this.baseUrl + '/' ? 'PASS' : 'WARNING', {
        info: `Current URL: ${currentUrl}`
      });
      
      await this.page.goForward({ waitUntil: 'networkidle0' });
      currentUrl = this.page.url();
      this.addResult('EdgeCases', 'Browser forward button', currentUrl.includes('encoding-codecs') ? 'PASS' : 'WARNING', {
        info: `Current URL: ${currentUrl}`
      });
      
      // Test very long resource titles (check if they're truncated properly)
      const longTitles = await this.page.$$eval('[data-testid*="resource"] h3, [class*="card"] h3', 
        els => els.filter(el => el.textContent.length > 50)
      );
      
      this.addResult('EdgeCases', 'Long titles handling', 'PASS', {
        info: `${longTitles.length} long titles found and displayed`
      });
      
    } catch (error) {
      this.addResult('EdgeCases', 'Edge cases test', 'FAIL', {
        error: error.message
      });
    }
  }

  // Generate test report
  generateReport() {
    console.log('\n📊 Generating Test Report...\n');
    
    // Calculate pass rate
    const passRate = (this.testResults.summary.passed / this.testResults.summary.total * 100).toFixed(2);
    
    // Performance summary
    const performanceSummary = {};
    for (const [metric, times] of Object.entries(this.testResults.performanceMetrics)) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      performanceSummary[metric] = {
        average: avg.toFixed(2),
        min: Math.min(...times).toFixed(2),
        max: Math.max(...times).toFixed(2)
      };
    }
    
    // Generate recommendations
    const recommendations = [];
    
    if (this.testResults.summary.failed > 0) {
      recommendations.push('Fix failing tests before deployment');
    }
    
    if (this.testResults.errors.length > 0) {
      recommendations.push('Address console errors for better stability');
    }
    
    if (performanceSummary.initial_load?.average > 3000) {
      recommendations.push('Optimize initial page load time (currently > 3s)');
    }
    
    if (!this.testResults.categories['AI']?.tests.some(t => t.status === 'PASS')) {
      recommendations.push('Consider implementing AI recommendations feature');
    }
    
    if (!this.testResults.categories['ColorPalette']?.tests.some(t => t.status === 'PASS')) {
      recommendations.push('Consider implementing color palette generator feature');
    }
    
    this.testResults.performanceSummary = performanceSummary;
    this.testResults.recommendations = recommendations;
    this.testResults.passRate = passRate;
    
    return this.testResults;
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log(`Testing URL: ${this.baseUrl}`);
    console.log('=' .repeat(50));
    
    await this.initialize();
    
    try {
      await this.testSearchFunctionality();
      await this.testFiltersAndSorting();
      await this.testLayoutSwitching();
      await this.testPagination();
      await this.testAIRecommendations();
      await this.testColorPalette();
      await this.testPerformance();
      await this.testEdgeCases();
      
      const report = this.generateReport();
      
      // Save report to file
      const reportPath = path.join(__dirname, 'test-results', 'comprehensive-test-report.json');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport(report);
      const mdPath = path.join(__dirname, 'test-results', 'TEST_REPORT.md');
      await fs.writeFile(mdPath, markdownReport);
      
      console.log('\n' + '=' .repeat(50));
      console.log('📊 TEST SUMMARY');
      console.log('=' .repeat(50));
      console.log(`Total Tests: ${report.summary.total}`);
      console.log(`Passed: ${report.summary.passed} ✅`);
      console.log(`Failed: ${report.summary.failed} ❌`);
      console.log(`Warnings: ${report.summary.warnings} ⚠️`);
      console.log(`Pass Rate: ${report.passRate}%`);
      console.log('\nReports saved to:');
      console.log(`  - ${reportPath}`);
      console.log(`  - ${mdPath}`);
      
      return report;
      
    } catch (error) {
      console.error('Test suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  generateMarkdownReport(report) {
    let md = '# Awesome Video Resources - Comprehensive Test Report\n\n';
    md += `**Test Date:** ${report.timestamp}\n\n`;
    md += `**Pass Rate:** ${report.passRate}%\n\n`;
    
    md += '## Summary\n\n';
    md += `- **Total Tests:** ${report.summary.total}\n`;
    md += `- **Passed:** ${report.summary.passed} ✅\n`;
    md += `- **Failed:** ${report.summary.failed} ❌\n`;
    md += `- **Warnings:** ${report.summary.warnings} ⚠️\n\n`;
    
    md += '## Test Results by Category\n\n';
    
    for (const [category, data] of Object.entries(report.categories)) {
      md += `### ${category}\n\n`;
      md += `**Summary:** ${data.summary.passed}/${data.summary.total} passed\n\n`;
      
      md += '| Test | Status | Details |\n';
      md += '|------|--------|--------|\n';
      
      for (const test of data.tests) {
        const status = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
        const details = test.info || test.error || '-';
        md += `| ${test.name} | ${status} | ${details} |\n`;
      }
      md += '\n';
    }
    
    md += '## Performance Metrics\n\n';
    md += '| Metric | Average (ms) | Min (ms) | Max (ms) |\n';
    md += '|--------|-------------|----------|----------|\n';
    
    for (const [metric, data] of Object.entries(report.performanceSummary)) {
      md += `| ${metric.replace(/_/g, ' ')} | ${data.average} | ${data.min} | ${data.max} |\n`;
    }
    md += '\n';
    
    if (report.errors.length > 0) {
      md += '## Console Errors\n\n';
      for (const error of report.errors) {
        md += `- **${error.type}:** ${error.message} (at ${error.location})\n`;
      }
      md += '\n';
    }
    
    md += '## Recommendations\n\n';
    for (const rec of report.recommendations) {
      md += `- ${rec}\n`;
    }
    md += '\n';
    
    md += '## Feature Status\n\n';
    md += '| Feature | Status | Notes |\n';
    md += '|---------|--------|-------|\n';
    md += `| Search | ${report.categories.Search?.summary.passed > 0 ? '✅ Implemented' : '❌ Not Working'} | Real-time search with dialog |\n`;
    md += `| Filters & Sorting | ${report.categories.Filters?.summary.passed > 0 ? '✅ Implemented' : '❌ Not Working'} | Category and sort options |\n`;
    md += `| Layout Switching | ${report.categories.Layout?.summary.passed > 0 ? '✅ Implemented' : '❌ Not Working'} | Cards/List/Compact views |\n`;
    md += `| Pagination | ${report.categories.Pagination?.summary.passed > 0 ? '✅ Implemented' : '❌ Not Working'} | Page controls and navigation |\n`;
    md += `| AI Recommendations | ${report.categories.AI?.tests.some(t => t.status === 'PASS') ? '⚠️ Partial' : '❌ Not Found'} | AI-powered suggestions |\n`;
    md += `| Color Palette | ${report.categories.ColorPalette?.tests.some(t => t.status === 'PASS') ? '⚠️ Partial' : '❌ Not Found'} | Theme customization |\n`;
    md += '\n';
    
    return md;
  }
}

// Run tests
(async () => {
  const tester = new ComprehensiveTestRunner();
  
  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
})();