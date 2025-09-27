const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_DIR = 'test-screenshots';
const TEST_REPORT_PATH = 'UI_PERSISTENCE_TEST_REPORT.md';

// Utility function to create test directory
async function createTestDir() {
  if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
  }
}

// Utility function to take screenshot
async function takeScreenshot(page, name) {
  const filename = path.join(TEST_RESULTS_DIR, `${name}.png`);
  await page.screenshot({ path: filename, fullPage: false });
  return filename;
}

// Utility function to wait and check for element
async function waitAndCheck(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

// Initialize test results
const testResults = {
  userPreferences: {},
  themeSwitching: {},
  pagination: {},
  textTruncation: {},
  responsiveBreakpoints: {},
  storage: {},
  accessibility: {},
  errorHandling: {},
  screenshots: []
};

async function testUserPreferences(page) {
  console.log('\n🧪 Testing User Preferences Persistence...');
  const results = {};
  
  try {
    // Navigate to homepage
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Open preferences dialog
    const prefsButtonExists = await waitAndCheck(page, 'button:has-text("Preferences")');
    results.preferencesButtonExists = prefsButtonExists;
    
    if (prefsButtonExists) {
      await page.click('button:has-text("Preferences")');
      await page.waitForTimeout(500);
      results.screenshots = { dialogOpen: await takeScreenshot(page, 'preferences-dialog-open') };
      
      // Test Profile tab
      console.log('  📋 Testing Profile tab...');
      const profileTabExists = await waitAndCheck(page, '[role="tab"]:has-text("Profile")');
      results.profileTabExists = profileTabExists;
      
      if (profileTabExists) {
        // Test Skill Level dropdown
        const skillSelectExists = await waitAndCheck(page, '[data-testid="skill-level-select"]');
        results.skillLevelSelectExists = skillSelectExists;
        
        if (skillSelectExists) {
          await page.click('[data-testid="skill-level-select"]');
          await page.waitForTimeout(300);
          
          // Check all options exist
          results.beginnerOptionExists = await waitAndCheck(page, '[role="option"]:has-text("Beginner")');
          results.intermediateOptionExists = await waitAndCheck(page, '[role="option"]:has-text("Intermediate")');
          results.advancedOptionExists = await waitAndCheck(page, '[role="option"]:has-text("Advanced")');
          
          // Select Intermediate
          if (results.intermediateOptionExists) {
            await page.click('[role="option"]:has-text("Intermediate")');
            await page.waitForTimeout(300);
          }
        }
        
        // Test Learning Schedule dropdown
        const scheduleSelectExists = await waitAndCheck(page, '[data-testid="learning-schedule-select"]');
        results.scheduleSelectExists = scheduleSelectExists;
        
        if (scheduleSelectExists) {
          await page.click('[data-testid="learning-schedule-select"]');
          await page.waitForTimeout(300);
          
          // Check options and select Weekly
          const weeklyExists = await waitAndCheck(page, '[role="option"]:has-text("Weekly")');
          if (weeklyExists) {
            await page.click('[role="option"]:has-text("Weekly")');
            await page.waitForTimeout(300);
          }
        }
      }
      
      // Test Interests tab
      console.log('  🎯 Testing Interests tab...');
      const interestsTabExists = await waitAndCheck(page, '[role="tab"]:has-text("Interests")');
      if (interestsTabExists) {
        await page.click('[role="tab"]:has-text("Interests")');
        await page.waitForTimeout(300);
        
        // Select some categories
        const checkboxes = await page.$$('[type="checkbox"]');
        results.interestCheckboxesCount = checkboxes.length;
        
        if (checkboxes.length > 0) {
          // Click first 3 checkboxes
          for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
            await checkboxes[i].click();
            await page.waitForTimeout(100);
          }
        }
        results.screenshots.interestsSelected = await takeScreenshot(page, 'preferences-interests-selected');
      }
      
      // Test Goals tab
      console.log('  🎯 Testing Goals tab...');
      const goalsTabExists = await waitAndCheck(page, '[role="tab"]:has-text("Goals")');
      if (goalsTabExists) {
        await page.click('[role="tab"]:has-text("Goals")');
        await page.waitForTimeout(300);
        
        // Check for predefined goals
        const goalCheckboxes = await page.$$('[role="tabpanel"] [type="checkbox"]');
        results.goalsCheckboxesCount = goalCheckboxes.length;
        
        if (goalCheckboxes.length > 0) {
          // Select first 2 goals
          for (let i = 0; i < Math.min(2, goalCheckboxes.length); i++) {
            await goalCheckboxes[i].click();
            await page.waitForTimeout(100);
          }
        }
      }
      
      // Test Style tab
      console.log('  🎨 Testing Style tab...');
      const styleTabExists = await waitAndCheck(page, '[role="tab"]:has-text("Style")');
      if (styleTabExists) {
        await page.click('[role="tab"]:has-text("Style")');
        await page.waitForTimeout(300);
        
        // Select resource types
        const typeCheckboxes = await page.$$('[role="tabpanel"] [type="checkbox"]');
        results.styleCheckboxesCount = typeCheckboxes.length;
        
        if (typeCheckboxes.length > 0) {
          for (let i = 0; i < Math.min(3, typeCheckboxes.length); i++) {
            await typeCheckboxes[i].click();
            await page.waitForTimeout(100);
          }
        }
      }
      
      // Save preferences
      console.log('  💾 Saving preferences...');
      const saveButtonExists = await waitAndCheck(page, 'button:has-text("Save")');
      if (saveButtonExists) {
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(1000);
      }
      
      // Check localStorage for saved preferences
      const savedProfile = await page.evaluate(() => {
        return localStorage.getItem('awesome-video-user-profile');
      });
      results.profileSaved = savedProfile !== null;
      
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        results.savedSkillLevel = profile.skillLevel;
        results.savedTimeCommitment = profile.timeCommitment;
        results.savedCategoriesCount = profile.preferredCategories?.length || 0;
        results.savedGoalsCount = profile.learningGoals?.length || 0;
      }
      
      // Reopen dialog to verify persistence
      console.log('  🔄 Verifying persistence...');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Preferences")');
      await page.waitForTimeout(500);
      
      // Check if values persisted
      const skillLevelText = await page.$eval('[data-testid="skill-level-select"]', el => el.textContent);
      results.persistedSkillLevel = skillLevelText;
      
      const scheduleText = await page.$eval('[data-testid="learning-schedule-select"]', el => el.textContent);
      results.persistedSchedule = scheduleText;
      
      results.screenshots.reopened = await takeScreenshot(page, 'preferences-reopened-verify');
      
      // Close dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
  } catch (error) {
    console.error('  ❌ Error in user preferences test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

async function testThemeSwitching(page) {
  console.log('\n🎨 Testing Theme Switching...');
  const results = {};
  
  try {
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Find theme selector button
    const themeSelectorExists = await waitAndCheck(page, 'button[aria-label*="theme" i], button:has([class*="Palette"])');
    results.themeSelectorExists = themeSelectorExists;
    
    if (themeSelectorExists) {
      // Get initial theme
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });
      results.initialTheme = initialTheme;
      
      // Open theme selector
      await page.click('button[aria-label*="theme" i], button:has([class*="Palette"])');
      await page.waitForTimeout(500);
      results.screenshots = { selectorOpen: await takeScreenshot(page, 'theme-selector-open') };
      
      // Check for theme options
      const themeOptions = await page.$$('[role="option"], [class*="theme"]');
      results.themeOptionsCount = themeOptions.length;
      
      // Try to select a different theme
      if (themeOptions.length > 1) {
        await themeOptions[1].click();
        await page.waitForTimeout(500);
        
        const newTheme = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        });
        results.themeAfterChange = newTheme;
      }
      
      // Check localStorage for theme persistence
      const savedTheme = await page.evaluate(() => {
        return {
          themeMode: localStorage.getItem('theme'),
          themeVariant: localStorage.getItem('theme-variant')
        };
      });
      results.savedTheme = savedTheme;
      
      // Reload page to test persistence
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      const themeAfterReload = await page.evaluate(() => {
        return {
          mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          variant: localStorage.getItem('theme-variant')
        };
      });
      results.themeAfterReload = themeAfterReload;
      results.themePersisted = themeAfterReload.variant === savedTheme.themeVariant;
      
      results.screenshots.afterReload = await takeScreenshot(page, 'theme-after-reload');
    }
    
  } catch (error) {
    console.error('  ❌ Error in theme switching test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

async function testPagination(page) {
  console.log('\n📄 Testing Pagination...');
  const results = {};
  
  try {
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    
    // Scroll to find pagination controls
    await page.evaluate(() => {
      const pagination = document.querySelector('[class*="pagination"], [aria-label*="pagination"]');
      if (pagination) pagination.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(500);
    
    // Check for pagination elements
    const paginationExists = await waitAndCheck(page, '[class*="pagination"], [aria-label*="pagination"]');
    results.paginationExists = paginationExists;
    
    if (paginationExists) {
      results.screenshots = { homePagination: await takeScreenshot(page, 'home-pagination') };
      
      // Get initial page info
      const pageInfo = await page.evaluate(() => {
        const showingText = document.querySelector('[class*="text-muted"]:has-text("Showing")');
        return showingText ? showingText.textContent : null;
      });
      results.initialPageInfo = pageInfo;
      
      // Try to navigate to page 2
      const page2Button = await page.$('button:has-text("2")');
      if (page2Button) {
        await page2Button.click();
        await page.waitForTimeout(1000);
        
        const pageInfoAfterNav = await page.evaluate(() => {
          const showingText = document.querySelector('[class*="text-muted"]:has-text("Showing")');
          return showingText ? showingText.textContent : null;
        });
        results.page2Info = pageInfoAfterNav;
        results.navigationWorked = pageInfo !== pageInfoAfterNav;
        
        results.screenshots.page2 = await takeScreenshot(page, 'pagination-page2');
      }
      
      // Test Previous/Next buttons
      const nextButton = await page.$('button:has([class*="ChevronRight"])');
      if (nextButton) {
        const isDisabled = await page.evaluate(el => el.disabled, nextButton);
        results.nextButtonExists = true;
        results.nextButtonDisabled = isDisabled;
      }
      
      const prevButton = await page.$('button:has([class*="ChevronLeft"])');
      if (prevButton) {
        const isDisabled = await page.evaluate(el => el.disabled, prevButton);
        results.prevButtonExists = true;
        results.prevButtonDisabled = isDisabled;
      }
      
      // Test pagination on category page
      console.log('  📂 Testing category page pagination...');
      await page.goto('http://localhost:5000/category/Encoding', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      const categoryPaginationExists = await waitAndCheck(page, '[class*="pagination"], [aria-label*="pagination"]');
      results.categoryPaginationExists = categoryPaginationExists;
      
      if (categoryPaginationExists) {
        results.screenshots.categoryPagination = await takeScreenshot(page, 'category-pagination');
      }
      
      // Check mobile pagination button sizes
      console.log('  📱 Testing mobile pagination button sizes...');
      await page.setViewport({ width: 390, height: 844 });
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      const buttonSizes = await page.evaluate(() => {
        const buttons = document.querySelectorAll('[class*="pagination"] button');
        return Array.from(buttons).map(btn => {
          const rect = btn.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
      });
      results.mobilePaginationButtonSizes = buttonSizes;
      results.mobileButtonsMinHeight44px = buttonSizes.every(size => size.height >= 44);
      
      results.screenshots.mobilePagination = await takeScreenshot(page, 'mobile-pagination');
    }
    
  } catch (error) {
    console.error('  ❌ Error in pagination test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

async function testTextTruncation(page) {
  console.log('\n✂️ Testing Text Truncation...');
  const results = {};
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Find resource cards
    const cards = await page.$$('[data-testid*="resource-card"]');
    results.resourceCardsFound = cards.length;
    
    if (cards.length > 0) {
      // Check for title truncation
      const titleTruncation = await page.evaluate(() => {
        const titles = document.querySelectorAll('[class*="CardTitle"]');
        const truncatedTitles = [];
        
        titles.forEach(title => {
          const styles = window.getComputedStyle(title);
          if (styles.overflow === 'hidden' || 
              styles.textOverflow === 'ellipsis' ||
              title.classList.toString().includes('line-clamp')) {
            truncatedTitles.push({
              text: title.textContent,
              overflow: styles.overflow,
              textOverflow: styles.textOverflow
            });
          }
        });
        
        return truncatedTitles;
      });
      results.titlesTruncated = titleTruncation.length > 0;
      results.truncatedTitlesCount = titleTruncation.length;
      
      // Check for description truncation
      const descriptionTruncation = await page.evaluate(() => {
        const descriptions = document.querySelectorAll('[class*="CardDescription"]');
        const truncatedDescriptions = [];
        
        descriptions.forEach(desc => {
          if (desc.classList.toString().includes('line-clamp')) {
            truncatedDescriptions.push({
              text: desc.textContent.substring(0, 50),
              classes: desc.className
            });
          }
        });
        
        return truncatedDescriptions;
      });
      results.descriptionsTruncated = descriptionTruncation.length > 0;
      results.truncatedDescriptionsCount = descriptionTruncation.length;
      
      results.screenshots = { truncation: await takeScreenshot(page, 'text-truncation') };
      
      // Check badge visibility
      const badgeVisibility = await page.evaluate(() => {
        const badges = document.querySelectorAll('[class*="badge"]');
        return Array.from(badges).map(badge => ({
          text: badge.textContent,
          visible: badge.offsetWidth > 0 && badge.offsetHeight > 0
        }));
      });
      results.badgesVisible = badgeVisibility.filter(b => b.visible).length;
      results.totalBadges = badgeVisibility.length;
      
      // Test mobile text overflow
      console.log('  📱 Testing mobile text overflow...');
      await page.setViewport({ width: 390, height: 844 });
      await page.waitForTimeout(1000);
      
      const mobileTextOverflow = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="CardTitle"], [class*="CardDescription"]');
        const overflowing = [];
        
        elements.forEach(el => {
          if (el.scrollWidth > el.clientWidth) {
            overflowing.push({
              text: el.textContent.substring(0, 30),
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth
            });
          }
        });
        
        return overflowing;
      });
      results.mobileOverflowingElements = mobileTextOverflow.length;
      results.mobileTextContained = mobileTextOverflow.length === 0;
      
      // Check search placeholder visibility
      const searchInput = await page.$('input[placeholder*="Search"]');
      if (searchInput) {
        const placeholder = await page.evaluate(el => el.placeholder, searchInput);
        results.searchPlaceholderVisible = placeholder && placeholder.length > 0;
        results.searchPlaceholderText = placeholder;
      }
      
      // Check breadcrumb overflow
      await page.goto('http://localhost:5000/category/Encoding/codecs/av1', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(500);
      
      const breadcrumbOverflow = await page.evaluate(() => {
        const breadcrumb = document.querySelector('[aria-label="breadcrumb"], [class*="breadcrumb"]');
        if (breadcrumb) {
          return {
            scrollWidth: breadcrumb.scrollWidth,
            clientWidth: breadcrumb.clientWidth,
            overflows: breadcrumb.scrollWidth > breadcrumb.clientWidth
          };
        }
        return null;
      });
      results.breadcrumbOverflow = breadcrumbOverflow;
      
      results.screenshots.mobileTruncation = await takeScreenshot(page, 'mobile-text-truncation');
    }
    
  } catch (error) {
    console.error('  ❌ Error in text truncation test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

async function testResponsiveBreakpoints(page) {
  console.log('\n📐 Testing Responsive Breakpoints...');
  const results = {};
  
  try {
    const breakpoints = [
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'ultrawide', width: 2560, height: 1440 }
    ];
    
    for (const breakpoint of breakpoints) {
      console.log(`  📱 Testing ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})...`);
      
      await page.setViewport({ width: breakpoint.width, height: breakpoint.height });
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      // Check grid columns
      const gridInfo = await page.evaluate(() => {
        const grid = document.querySelector('[class*="grid"]');
        if (grid) {
          const styles = window.getComputedStyle(grid);
          return {
            columns: styles.gridTemplateColumns,
            gap: styles.gap || styles.gridGap
          };
        }
        return null;
      });
      
      // Check sidebar width (for larger screens)
      const sidebarInfo = await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="sidebar"], aside');
        if (sidebar) {
          const rect = sidebar.getBoundingClientRect();
          return {
            width: rect.width,
            visible: rect.width > 0 && rect.height > 0
          };
        }
        return null;
      });
      
      // Count visible resource cards
      const visibleCards = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid*="resource-card"]');
        return Array.from(cards).filter(card => {
          const rect = card.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length;
      });
      
      results[breakpoint.name] = {
        viewport: `${breakpoint.width}x${breakpoint.height}`,
        gridInfo,
        sidebarInfo,
        visibleCards,
        screenshot: await takeScreenshot(page, `responsive-${breakpoint.name}`)
      };
    }
    
    // Test column adjustments
    console.log('  🏗️ Testing grid column adjustments...');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    const mediumGrid = await page.evaluate(() => {
      const grid = document.querySelector('[class*="grid"]');
      if (grid) {
        const cards = grid.querySelectorAll('[data-testid*="resource-card"]');
        const firstCard = cards[0];
        const cardsPerRow = Math.floor(grid.offsetWidth / (firstCard ? firstCard.offsetWidth : 300));
        return { cardsPerRow, gridWidth: grid.offsetWidth };
      }
      return null;
    });
    results.mediumScreenGrid = mediumGrid;
    
  } catch (error) {
    console.error('  ❌ Error in responsive breakpoints test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

async function testStoragePersistence(page) {
  console.log('\n💾 Testing Storage and Persistence...');
  const results = {};
  
  try {
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Check localStorage
    const localStorageData = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        storage[key] = localStorage.getItem(key);
      }
      return storage;
    });
    
    results.localStorage = {
      keys: Object.keys(localStorageData),
      hasUserProfile: 'awesome-video-user-profile' in localStorageData,
      hasTheme: 'theme' in localStorageData || 'theme-variant' in localStorageData,
      hasUserId: 'awesome-video-user-id' in localStorageData
    };
    
    // Check sessionStorage
    const sessionStorageData = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        storage[key] = sessionStorage.getItem(key);
      }
      return storage;
    });
    
    results.sessionStorage = {
      keys: Object.keys(sessionStorageData),
      itemCount: sessionStorage.length
    };
    
    // Check cookies
    const cookies = await page.cookies();
    results.cookies = {
      count: cookies.length,
      names: cookies.map(c => c.name)
    };
    
    // Test persistence after navigation
    console.log('  🔄 Testing persistence after navigation...');
    
    // Store some data
    await page.evaluate(() => {
      localStorage.setItem('test-persistence', 'test-value');
      sessionStorage.setItem('test-session', 'session-value');
    });
    
    // Navigate to another page
    await page.goto('http://localhost:5000/category/Encoding', { waitUntil: 'networkidle2' });
    
    // Check if data persists
    const persistenceCheck = await page.evaluate(() => {
      return {
        localStorage: localStorage.getItem('test-persistence'),
        sessionStorage: sessionStorage.getItem('test-session')
      };
    });
    
    results.persistenceAfterNavigation = {
      localStoragePersisted: persistenceCheck.localStorage === 'test-value',
      sessionStoragePersisted: persistenceCheck.sessionStorage === 'session-value'
    };
    
    // Clean up test data
    await page.evaluate(() => {
      localStorage.removeItem('test-persistence');
      sessionStorage.removeItem('test-session');
    });
    
  } catch (error) {
    console.error('  ❌ Error in storage persistence test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

async function testAccessibility(page) {
  console.log('\n♿ Testing Keyboard Accessibility...');
  const results = {};
  
  try {
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Test Tab navigation
    console.log('  ⌨️ Testing Tab navigation...');
    
    // Start tabbing through elements
    const tabbableElements = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el.tagName,
          text: el.textContent?.substring(0, 30),
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          href: el.getAttribute('href')
        };
      });
      
      tabbableElements.push(focusedElement);
    }
    
    results.tabbableElements = tabbableElements;
    results.tabNavigationWorks = tabbableElements.length > 0;
    
    // Check focus indicators
    const focusIndicators = await page.evaluate(() => {
      // Focus on first button
      const button = document.querySelector('button');
      if (button) {
        button.focus();
        const styles = window.getComputedStyle(button, ':focus');
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          border: styles.border
        };
      }
      return null;
    });
    results.focusIndicators = focusIndicators;
    results.hasFocusIndicators = focusIndicators && 
      (focusIndicators.outline !== 'none' || 
       focusIndicators.boxShadow !== 'none' ||
       focusIndicators.border !== 'none');
    
    // Test dialog focus management
    console.log('  🎯 Testing dialog focus management...');
    await page.click('button:has-text("Preferences")');
    await page.waitForTimeout(500);
    
    const dialogFocus = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const dialog = document.querySelector('[role="dialog"]');
      return {
        focusInDialog: dialog && dialog.contains(activeElement),
        focusedElement: activeElement.tagName
      };
    });
    results.dialogFocusManagement = dialogFocus;
    
    // Test Escape key to close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const dialogClosed = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return !dialog || dialog.style.display === 'none';
    });
    results.escapeClosesDialog = dialogClosed;
    
    // Check ARIA labels
    console.log('  🏷️ Checking ARIA labels...');
    const ariaLabels = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
      return {
        count: elements.length,
        examples: Array.from(elements).slice(0, 5).map(el => ({
          tag: el.tagName,
          ariaLabel: el.getAttribute('aria-label'),
          ariaLabelledBy: el.getAttribute('aria-labelledby'),
          ariaDescribedBy: el.getAttribute('aria-describedby')
        }))
      };
    });
    results.ariaLabels = ariaLabels;
    
    // Check roles
    const roles = await page.evaluate(() => {
      const elements = document.querySelectorAll('[role]');
      const roleCount = {};
      elements.forEach(el => {
        const role = el.getAttribute('role');
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
      return roleCount;
    });
    results.roleAttributes = roles;
    
    // Test logical tab order
    results.tabOrderLogical = tabbableElements.every(el => 
      el.tagName === 'A' || el.tagName === 'BUTTON' || 
      el.tagName === 'INPUT' || el.tagName === 'SELECT'
    );
    
  } catch (error) {
    console.error('  ❌ Error in accessibility test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

async function testErrorHandling(page) {
  console.log('\n⚠️ Testing Error Handling...');
  const results = {};
  
  try {
    // Test 404 page
    console.log('  🚫 Testing 404 error page...');
    await page.goto('http://localhost:5000/non-existent-page', { waitUntil: 'networkidle2' });
    
    const has404 = await page.evaluate(() => {
      const body = document.body.textContent;
      return body.includes('404') || body.includes('not found') || body.includes('Not Found');
    });
    results.has404Page = has404;
    results.screenshots = { error404: await takeScreenshot(page, 'error-404') };
    
    // Test loading states
    console.log('  ⏳ Testing loading states...');
    await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded' });
    
    // Check for skeleton loaders
    const skeletons = await page.$$('[class*="skeleton"], [class*="Skeleton"]');
    results.hasSkeletonLoaders = skeletons.length > 0;
    results.skeletonCount = skeletons.length;
    
    // Wait for content to load and check if skeletons disappear
    await page.waitForTimeout(3000);
    const skeletonsAfter = await page.$$('[class*="skeleton"], [class*="Skeleton"]');
    results.skeletonsDisappearAfterLoad = skeletonsAfter.length < skeletons.length;
    
    // Test empty state
    console.log('  📭 Testing empty state handling...');
    await page.goto('http://localhost:5000/category/NonExistentCategory', { waitUntil: 'networkidle2' });
    
    const emptyState = await page.evaluate(() => {
      const body = document.body.textContent.toLowerCase();
      return body.includes('no resources') || body.includes('no results') || 
             body.includes('empty') || body.includes('not found');
    });
    results.hasEmptyState = emptyState;
    
    // Test API error simulation (if possible)
    console.log('  🔌 Testing API error handling...');
    
    // Intercept network requests to simulate failure
    await page.setRequestInterception(true);
    
    let interceptedRequest = false;
    page.on('request', request => {
      if (request.url().includes('/api/') && !interceptedRequest) {
        interceptedRequest = true;
        request.abort('failed');
      } else {
        request.continue();
      }
    });
    
    // Try to trigger an API call
    await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Check for error messages
    const errorMessage = await page.evaluate(() => {
      const errors = document.querySelectorAll('[class*="error"], [class*="Error"], [role="alert"]');
      return errors.length > 0;
    });
    results.showsErrorMessages = errorMessage;
    
    // Turn off request interception
    await page.setRequestInterception(false);
    
    // Test timeout handling
    console.log('  ⏰ Testing timeout handling...');
    const timeoutHandling = await page.evaluate(() => {
      // Check if the app has retry mechanisms or timeout configurations
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent || '').join('\n');
      return {
        hasRetryLogic: scripts.includes('retry') || scripts.includes('Retry'),
        hasTimeoutConfig: scripts.includes('timeout') || scripts.includes('Timeout')
      };
    });
    results.timeoutHandling = timeoutHandling;
    
  } catch (error) {
    console.error('  ❌ Error in error handling test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

// Generate comprehensive report
function generateReport(results) {
  let report = '# UI Persistence and Features Test Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Summary
  report += '## Test Summary\n\n';
  
  const testCategories = [
    { name: 'User Preferences', data: results.userPreferences },
    { name: 'Theme Switching', data: results.themeSwitching },
    { name: 'Pagination', data: results.pagination },
    { name: 'Text Truncation', data: results.textTruncation },
    { name: 'Responsive Breakpoints', data: results.responsiveBreakpoints },
    { name: 'Storage & Persistence', data: results.storage },
    { name: 'Accessibility', data: results.accessibility },
    { name: 'Error Handling', data: results.errorHandling }
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  
  testCategories.forEach(category => {
    const hasError = category.data.error !== undefined;
    totalTests++;
    if (!hasError) passedTests++;
    
    const status = hasError ? '❌ Failed' : '✅ Passed';
    report += `- **${category.name}**: ${status}\n`;
  });
  
  report += `\n**Overall Success Rate**: ${Math.round((passedTests/totalTests) * 100)}%\n\n`;
  
  // Detailed Results
  report += '## Detailed Results\n\n';
  
  // User Preferences
  report += '### User Preferences Persistence\n\n';
  const prefs = results.userPreferences;
  report += `- Preferences Button Exists: ${prefs.preferencesButtonExists ? '✅' : '❌'}\n`;
  report += `- Profile Tab Exists: ${prefs.profileTabExists ? '✅' : '❌'}\n`;
  report += `- Skill Level Saved: ${prefs.savedSkillLevel || 'N/A'}\n`;
  report += `- Time Commitment Saved: ${prefs.savedTimeCommitment || 'N/A'}\n`;
  report += `- Categories Selected: ${prefs.savedCategoriesCount || 0}\n`;
  report += `- Goals Selected: ${prefs.savedGoalsCount || 0}\n`;
  report += `- Persisted Skill Level: ${prefs.persistedSkillLevel || 'N/A'}\n`;
  report += `- Persisted Schedule: ${prefs.persistedSchedule || 'N/A'}\n`;
  report += `- Profile Saved to LocalStorage: ${prefs.profileSaved ? '✅' : '❌'}\n\n`;
  
  // Theme Switching
  report += '### Theme Switching\n\n';
  const theme = results.themeSwitching;
  report += `- Theme Selector Exists: ${theme.themeSelectorExists ? '✅' : '❌'}\n`;
  report += `- Initial Theme: ${theme.initialTheme || 'N/A'}\n`;
  report += `- Theme Options Count: ${theme.themeOptionsCount || 0}\n`;
  report += `- Saved Theme: ${JSON.stringify(theme.savedTheme) || 'N/A'}\n`;
  report += `- Theme Persisted After Reload: ${theme.themePersisted ? '✅' : '❌'}\n\n`;
  
  // Pagination
  report += '### Pagination\n\n';
  const pagination = results.pagination;
  report += `- Pagination Exists: ${pagination.paginationExists ? '✅' : '❌'}\n`;
  report += `- Navigation Worked: ${pagination.navigationWorked ? '✅' : '❌'}\n`;
  report += `- Category Pagination Exists: ${pagination.categoryPaginationExists ? '✅' : '❌'}\n`;
  report += `- Mobile Buttons Min Height 44px: ${pagination.mobileButtonsMinHeight44px ? '✅' : '❌'}\n\n`;
  
  // Text Truncation
  report += '### Text Truncation and Visual Elements\n\n';
  const truncation = results.textTruncation;
  report += `- Resource Cards Found: ${truncation.resourceCardsFound || 0}\n`;
  report += `- Titles Truncated: ${truncation.titlesTruncated ? '✅' : '❌'}\n`;
  report += `- Descriptions Truncated: ${truncation.descriptionsTruncated ? '✅' : '❌'}\n`;
  report += `- Badges Visible: ${truncation.badgesVisible || 0}/${truncation.totalBadges || 0}\n`;
  report += `- Mobile Text Contained: ${truncation.mobileTextContained ? '✅' : '❌'}\n`;
  report += `- Search Placeholder Visible: ${truncation.searchPlaceholderVisible ? '✅' : '❌'}\n`;
  report += `- Breadcrumb Overflow Handled: ${!truncation.breadcrumbOverflow?.overflows ? '✅' : '❌'}\n\n`;
  
  // Responsive Breakpoints
  report += '### Responsive Breakpoints\n\n';
  ['tablet', 'desktop', 'ultrawide'].forEach(breakpoint => {
    const data = results.responsiveBreakpoints[breakpoint];
    if (data) {
      report += `#### ${breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)} (${data.viewport})\n`;
      report += `- Visible Cards: ${data.visibleCards || 0}\n`;
      report += `- Sidebar Visible: ${data.sidebarInfo?.visible ? '✅' : '❌'}\n`;
      report += `- Sidebar Width: ${data.sidebarInfo?.width || 'N/A'}px\n\n`;
    }
  });
  
  // Storage
  report += '### Storage and Persistence\n\n';
  const storage = results.storage;
  report += `- LocalStorage Keys: ${storage.localStorage?.keys.join(', ') || 'None'}\n`;
  report += `- Has User Profile: ${storage.localStorage?.hasUserProfile ? '✅' : '❌'}\n`;
  report += `- Has Theme: ${storage.localStorage?.hasTheme ? '✅' : '❌'}\n`;
  report += `- Has User ID: ${storage.localStorage?.hasUserId ? '✅' : '❌'}\n`;
  report += `- LocalStorage Persisted: ${storage.persistenceAfterNavigation?.localStoragePersisted ? '✅' : '❌'}\n`;
  report += `- SessionStorage Persisted: ${storage.persistenceAfterNavigation?.sessionStoragePersisted ? '✅' : '❌'}\n\n`;
  
  // Accessibility
  report += '### Keyboard and Accessibility\n\n';
  const a11y = results.accessibility;
  report += `- Tab Navigation Works: ${a11y.tabNavigationWorks ? '✅' : '❌'}\n`;
  report += `- Has Focus Indicators: ${a11y.hasFocusIndicators ? '✅' : '❌'}\n`;
  report += `- Dialog Focus Management: ${a11y.dialogFocusManagement?.focusInDialog ? '✅' : '❌'}\n`;
  report += `- Escape Closes Dialog: ${a11y.escapeClosesDialog ? '✅' : '❌'}\n`;
  report += `- ARIA Labels Count: ${a11y.ariaLabels?.count || 0}\n`;
  report += `- Role Attributes: ${JSON.stringify(a11y.roleAttributes) || 'None'}\n`;
  report += `- Tab Order Logical: ${a11y.tabOrderLogical ? '✅' : '❌'}\n\n`;
  
  // Error Handling
  report += '### Error Handling\n\n';
  const errors = results.errorHandling;
  report += `- Has 404 Page: ${errors.has404Page ? '✅' : '❌'}\n`;
  report += `- Has Skeleton Loaders: ${errors.hasSkeletonLoaders ? '✅' : '❌'}\n`;
  report += `- Skeletons Disappear After Load: ${errors.skeletonsDisappearAfterLoad ? '✅' : '❌'}\n`;
  report += `- Has Empty State: ${errors.hasEmptyState ? '✅' : '❌'}\n`;
  report += `- Shows Error Messages: ${errors.showsErrorMessages ? '✅' : '❌'}\n`;
  report += `- Has Retry Logic: ${errors.timeoutHandling?.hasRetryLogic ? '✅' : '❌'}\n`;
  report += `- Has Timeout Config: ${errors.timeoutHandling?.hasTimeoutConfig ? '✅' : '❌'}\n\n`;
  
  // Screenshots
  report += '## Screenshots\n\n';
  report += 'The following screenshots were captured during testing:\n\n';
  
  results.screenshots.forEach(screenshot => {
    report += `- ${screenshot}\n`;
  });
  
  return report;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Comprehensive UI Persistence Tests...');
  console.log('=' .repeat(60));
  
  let browser;
  
  try {
    await createTestDir();
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Collect all screenshots
    const allScreenshots = [];
    
    // Run all tests
    testResults.userPreferences = await testUserPreferences(page);
    if (testResults.userPreferences.screenshots) {
      allScreenshots.push(...Object.values(testResults.userPreferences.screenshots));
    }
    
    testResults.themeSwitching = await testThemeSwitching(page);
    if (testResults.themeSwitching.screenshots) {
      allScreenshots.push(...Object.values(testResults.themeSwitching.screenshots));
    }
    
    testResults.pagination = await testPagination(page);
    if (testResults.pagination.screenshots) {
      allScreenshots.push(...Object.values(testResults.pagination.screenshots));
    }
    
    testResults.textTruncation = await testTextTruncation(page);
    if (testResults.textTruncation.screenshots) {
      allScreenshots.push(...Object.values(testResults.textTruncation.screenshots));
    }
    
    testResults.responsiveBreakpoints = await testResponsiveBreakpoints(page);
    ['tablet', 'desktop', 'ultrawide'].forEach(breakpoint => {
      if (testResults.responsiveBreakpoints[breakpoint]?.screenshot) {
        allScreenshots.push(testResults.responsiveBreakpoints[breakpoint].screenshot);
      }
    });
    
    testResults.storage = await testStoragePersistence(page);
    
    testResults.accessibility = await testAccessibility(page);
    
    testResults.errorHandling = await testErrorHandling(page);
    if (testResults.errorHandling.screenshots) {
      allScreenshots.push(...Object.values(testResults.errorHandling.screenshots));
    }
    
    testResults.screenshots = allScreenshots;
    
    // Generate and save report
    const report = generateReport(testResults);
    fs.writeFileSync(TEST_REPORT_PATH, report);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ All tests completed!');
    console.log(`📄 Report saved to: ${TEST_REPORT_PATH}`);
    console.log(`📸 Screenshots saved to: ${TEST_RESULTS_DIR}/`);
    
    // Save JSON results
    fs.writeFileSync('test-results/ui-persistence-test-results.json', JSON.stringify(testResults, null, 2));
    
  } catch (error) {
    console.error('Fatal error during testing:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the tests
runTests();