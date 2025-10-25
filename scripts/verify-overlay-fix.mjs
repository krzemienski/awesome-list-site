#!/usr/bin/env node
import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5000';

class OverlayFixVerification {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { passed: 0, failed: 0 }
    };
  }

  async setup() {
    console.log('🔧 Setting up browser...\n');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Browser console error:', msg.text());
      }
    });
  }

  async addTest(name, status, details = {}) {
    const result = { name, status, details, timestamp: new Date().toISOString() };
    this.results.tests.push(result);
    
    if (status === 'passed') {
      this.results.summary.passed++;
      console.log(`✅ ${name}`);
    } else {
      this.results.summary.failed++;
      console.log(`❌ ${name}`);
    }
    
    if (details.error) {
      console.log(`   Error: ${details.error}`);
    }
  }

  async testSearchDialogOverlay() {
    console.log('\n📋 Testing Search Dialog Overlay...\n');
    
    try {
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.page.waitForTimeout(1000);
      
      // Find a pagination button to test later
      const paginationButton = await this.page.$('button[aria-label="Go to next page"]');
      let canClickPagination = false;
      
      if (paginationButton) {
        // Open search dialog
        await this.page.keyboard.down('Meta');
        await this.page.keyboard.press('KeyK');
        await this.page.keyboard.up('Meta');
        await this.page.waitForTimeout(500);
        
        // Check dialog opened
        const dialogOpen = await this.page.$('[role="dialog"]');
        if (dialogOpen) {
          await this.addTest('Search dialog opens', 'passed');
          
          // Close dialog with Escape
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
          
          // Check dialog closed
          const dialogClosed = await this.page.$('[role="dialog"]');
          if (!dialogClosed) {
            await this.addTest('Search dialog closes', 'passed');
            
            // Test if pagination button is clickable
            try {
              await paginationButton.click({ timeout: 1000 });
              canClickPagination = true;
              await this.addTest('Pagination clickable after search dialog close', 'passed');
            } catch (err) {
              await this.addTest('Pagination clickable after search dialog close', 'failed', {
                error: 'Button not clickable - overlay might be blocking'
              });
            }
          } else {
            await this.addTest('Search dialog closes', 'failed', {
              error: 'Dialog still present after Escape'
            });
          }
        } else {
          await this.addTest('Search dialog opens', 'failed', {
            error: 'Dialog not found after keyboard shortcut'
          });
        }
      } else {
        console.log('   ℹ️  No pagination buttons on homepage to test');
      }
    } catch (error) {
      await this.addTest('Search dialog overlay test', 'failed', {
        error: error.message
      });
    }
  }

  async testPreferencesDialogOverlay() {
    console.log('\n📋 Testing Preferences Dialog Overlay...\n');
    
    try {
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.page.waitForTimeout(1000);
      
      // Find preferences button
      const prefsButton = await this.page.$('button[aria-label*="preferences"], button:has-text("Preferences"), [data-testid*="preferences"]');
      
      if (prefsButton) {
        // Open preferences
        await prefsButton.click();
        await this.page.waitForTimeout(500);
        
        // Check dialog opened
        const dialogOpen = await this.page.$('[role="dialog"]');
        if (dialogOpen) {
          await this.addTest('Preferences dialog opens', 'passed');
          
          // Close dialog
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
          
          // Check dialog closed
          const dialogClosed = await this.page.$('[role="dialog"]');
          if (!dialogClosed) {
            await this.addTest('Preferences dialog closes', 'passed');
            
            // Test if we can reopen preferences
            try {
              await prefsButton.click({ timeout: 1000 });
              await this.page.waitForTimeout(500);
              const reopened = await this.page.$('[role="dialog"]');
              if (reopened) {
                await this.addTest('Preferences can be reopened', 'passed');
                // Close again
                await this.page.keyboard.press('Escape');
              } else {
                await this.addTest('Preferences can be reopened', 'failed', {
                  error: 'Dialog did not reopen'
                });
              }
            } catch (err) {
              await this.addTest('Preferences can be reopened', 'failed', {
                error: 'Button not clickable - overlay might be blocking'
              });
            }
          } else {
            await this.addTest('Preferences dialog closes', 'failed', {
              error: 'Dialog still present after Escape'
            });
          }
        } else {
          await this.addTest('Preferences dialog opens', 'failed', {
            error: 'Dialog not found after button click'
          });
        }
      } else {
        console.log('   ℹ️  Preferences button not found');
      }
    } catch (error) {
      await this.addTest('Preferences dialog overlay test', 'failed', {
        error: error.message
      });
    }
  }

  async testMobileSidebarOverlay() {
    console.log('\n📋 Testing Mobile Sidebar Overlay...\n');
    
    try {
      // Set mobile viewport
      await this.page.setViewport({ width: 375, height: 812 });
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.page.waitForTimeout(1000);
      
      // Find sidebar toggle button
      const sidebarToggle = await this.page.$('button[aria-label*="sidebar"], button[aria-label*="menu"], button svg.lucide-menu');
      
      if (sidebarToggle) {
        // Open sidebar
        await sidebarToggle.click();
        await this.page.waitForTimeout(500);
        
        // Check if sidebar opened (sheet component)
        const sheetOpen = await this.page.$('[data-state="open"][role="dialog"], .sheet-content');
        if (sheetOpen) {
          await this.addTest('Mobile sidebar opens', 'passed');
          
          // Close sidebar with Escape
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
          
          // Check sidebar closed
          const sheetClosed = await this.page.$('[data-state="open"][role="dialog"], .sheet-content');
          if (!sheetClosed) {
            await this.addTest('Mobile sidebar closes', 'passed');
            
            // Test if other elements are clickable
            const clickableElement = await this.page.$('a, button');
            if (clickableElement) {
              try {
                await clickableElement.click({ timeout: 1000 });
                await this.addTest('Elements clickable after sidebar close', 'passed');
              } catch (err) {
                await this.addTest('Elements clickable after sidebar close', 'failed', {
                  error: 'Elements not clickable - overlay might be blocking'
                });
              }
            }
          } else {
            await this.addTest('Mobile sidebar closes', 'failed', {
              error: 'Sidebar still present after Escape'
            });
          }
        } else {
          await this.addTest('Mobile sidebar opens', 'failed', {
            error: 'Sidebar not found after toggle click'
          });
        }
      } else {
        console.log('   ℹ️  Sidebar toggle not found');
      }
      
      // Reset viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
    } catch (error) {
      await this.addTest('Mobile sidebar overlay test', 'failed', {
        error: error.message
      });
    }
  }

  async testOverlayPointerEvents() {
    console.log('\n📋 Testing Overlay Pointer Events...\n');
    
    try {
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Check for any remaining overlays with pointer-events
      const overlaysBlocking = await this.page.evaluate(() => {
        const overlays = document.querySelectorAll('[class*="overlay"], [data-radix-portal], [role="dialog"]');
        const blocking = [];
        
        overlays.forEach(el => {
          const styles = window.getComputedStyle(el);
          const isHidden = el.getAttribute('data-state') === 'closed' || 
                          styles.display === 'none' || 
                          styles.visibility === 'hidden';
          const hasPointerEvents = styles.pointerEvents !== 'none';
          
          if (!isHidden && hasPointerEvents) {
            blocking.push({
              tagName: el.tagName,
              className: el.className,
              dataState: el.getAttribute('data-state'),
              pointerEvents: styles.pointerEvents,
              display: styles.display,
              visibility: styles.visibility
            });
          }
        });
        
        return blocking;
      });
      
      if (overlaysBlocking.length === 0) {
        await this.addTest('No blocking overlays on page load', 'passed');
      } else {
        await this.addTest('No blocking overlays on page load', 'failed', {
          error: `Found ${overlaysBlocking.length} potential blocking overlays`,
          details: overlaysBlocking
        });
      }
    } catch (error) {
      await this.addTest('Overlay pointer events test', 'failed', {
        error: error.message
      });
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      
      console.log('🧪 Starting Overlay Fix Verification Tests\n');
      console.log('=' .repeat(50));
      
      await this.testSearchDialogOverlay();
      await this.testPreferencesDialogOverlay();
      await this.testMobileSidebarOverlay();
      await this.testOverlayPointerEvents();
      
      // Summary
      console.log('\n' + '='.repeat(50));
      console.log('\n📊 Test Summary:\n');
      console.log(`✅ Passed: ${this.results.summary.passed}`);
      console.log(`❌ Failed: ${this.results.summary.failed}`);
      console.log(`📝 Total: ${this.results.tests.length}`);
      
      if (this.results.summary.failed === 0) {
        console.log('\n🎉 All overlay fixes verified successfully!');
      } else {
        console.log('\n⚠️  Some tests failed. Review the results above.');
      }
      
    } catch (error) {
      console.error('Test execution error:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
const tester = new OverlayFixVerification();
tester.run().catch(console.error);