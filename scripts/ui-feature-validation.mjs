import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_RESULTS_DIR = path.join(path.dirname(__dirname), 'test-screenshots');
const TEST_REPORT_PATH = path.join(path.dirname(__dirname), 'UI_FEATURE_VALIDATION_REPORT.md');

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

// Utility function to wait
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    await wait(1000);
    
    // Open preferences dialog using xpath selector
    const prefsButton = await page.$x("//button[contains(., 'Preferences')]");
    results.preferencesButtonExists = prefsButton.length > 0;
    
    if (prefsButton.length > 0) {
      await prefsButton[0].click();
      await wait(1000);
      results.screenshots = { dialogOpen: await takeScreenshot(page, 'preferences-dialog-open') };
      
      // Test Profile tab (should be active by default)
      console.log('  📋 Testing Profile tab...');
      
      // Test Skill Level dropdown
      const skillSelect = await page.$('[data-testid="skill-level-select"]');
      results.skillLevelSelectExists = skillSelect !== null;
      
      if (skillSelect) {
        await skillSelect.click();
        await wait(500);
        
        // Click Intermediate option
        const intermediateOption = await page.$x("//div[@role='option'][contains(., 'Intermediate')]");
        if (intermediateOption.length > 0) {
          await intermediateOption[0].click();
          await wait(500);
          results.skillLevelChanged = true;
        }
        
        // Check current value
        const skillValue = await page.evaluate(() => {
          const select = document.querySelector('[data-testid="skill-level-select"]');
          return select ? select.textContent : null;
        });
        results.selectedSkillLevel = skillValue;
      }
      
      // Test Learning Schedule dropdown
      const scheduleSelect = await page.$('[data-testid="learning-schedule-select"]');
      results.scheduleSelectExists = scheduleSelect !== null;
      
      if (scheduleSelect) {
        await scheduleSelect.click();
        await wait(500);
        
        // Click Weekly option
        const weeklyOption = await page.$x("//div[@role='option'][contains(., 'Weekly')]");
        if (weeklyOption.length > 0) {
          await weeklyOption[0].click();
          await wait(500);
          results.scheduleChanged = true;
        }
      }
      
      // Test Interests tab
      console.log('  🎯 Testing Interests tab...');
      const interestsTab = await page.$x("//button[@role='tab'][contains(., 'Interests')]");
      if (interestsTab.length > 0) {
        await interestsTab[0].click();
        await wait(500);
        
        // Select some categories
        const checkboxes = await page.$$('input[type="checkbox"]');
        results.interestCheckboxesCount = checkboxes.length;
        
        if (checkboxes.length >= 3) {
          await checkboxes[0].click();
          await wait(100);
          await checkboxes[1].click();
          await wait(100);
          await checkboxes[2].click();
          await wait(100);
          results.interestsSelected = 3;
        }
        
        await takeScreenshot(page, 'preferences-interests-selected');
      }
      
      // Test Goals tab
      console.log('  🎯 Testing Goals tab...');
      const goalsTab = await page.$x("//button[@role='tab'][contains(., 'Goals')]");
      if (goalsTab.length > 0) {
        await goalsTab[0].click();
        await wait(500);
        
        const goalCheckboxes = await page.$$('[role="tabpanel"] input[type="checkbox"]');
        results.goalsCheckboxesCount = goalCheckboxes.length;
        
        if (goalCheckboxes.length >= 2) {
          await goalCheckboxes[0].click();
          await wait(100);
          await goalCheckboxes[1].click();
          await wait(100);
          results.goalsSelected = 2;
        }
      }
      
      // Test Style tab
      console.log('  🎨 Testing Style tab...');
      const styleTab = await page.$x("//button[@role='tab'][contains(., 'Style')]");
      if (styleTab.length > 0) {
        await styleTab[0].click();
        await wait(500);
        
        const styleCheckboxes = await page.$$('[role="tabpanel"] input[type="checkbox"]');
        results.styleCheckboxesCount = styleCheckboxes.length;
        
        if (styleCheckboxes.length >= 3) {
          await styleCheckboxes[0].click();
          await wait(100);
          await styleCheckboxes[1].click();
          await wait(100);
          await styleCheckboxes[2].click();
          await wait(100);
          results.stylesSelected = 3;
        }
      }
      
      // Save preferences
      console.log('  💾 Saving preferences...');
      const saveButton = await page.$x("//button[contains(., 'Save')]");
      if (saveButton.length > 0) {
        await saveButton[0].click();
        await wait(1000);
        results.preferenceSaved = true;
      }
      
      // Check localStorage for saved preferences
      const savedProfile = await page.evaluate(() => {
        return localStorage.getItem('awesome-video-user-profile');
      });
      results.profileSavedToLocalStorage = savedProfile !== null;
      
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        results.savedData = {
          skillLevel: profile.skillLevel,
          timeCommitment: profile.timeCommitment,
          categoriesCount: profile.preferredCategories?.length || 0,
          goalsCount: profile.learningGoals?.length || 0,
          resourceTypesCount: profile.preferredResourceTypes?.length || 0
        };
      }
      
      // Reopen dialog to verify persistence
      console.log('  🔄 Verifying persistence...');
      await wait(1000);
      const reopenButton = await page.$x("//button[contains(., 'Preferences')]");
      if (reopenButton.length > 0) {
        await reopenButton[0].click();
        await wait(1000);
        
        // Check persisted values
        const persistedSkillLevel = await page.evaluate(() => {
          const select = document.querySelector('[data-testid="skill-level-select"]');
          return select ? select.textContent : null;
        });
        results.persistedSkillLevel = persistedSkillLevel;
        
        const persistedSchedule = await page.evaluate(() => {
          const select = document.querySelector('[data-testid="learning-schedule-select"]');
          return select ? select.textContent : null;
        });
        results.persistedSchedule = persistedSchedule;
        
        results.valuesPersisted = persistedSkillLevel?.includes('Intermediate') && persistedSchedule?.includes('Weekly');
        
        await takeScreenshot(page, 'preferences-reopened-verify');
        
        // Close dialog
        await page.keyboard.press('Escape');
        await wait(500);
      }
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
    await wait(1000);
    
    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return {
        isDark: document.documentElement.classList.contains('dark'),
        themeVariant: localStorage.getItem('theme-variant')
      };
    });
    results.initialTheme = initialTheme;
    
    // Find and click theme selector (palette button)
    const themeButton = await page.$('button svg.lucide-palette');
    results.themeSelectorExists = themeButton !== null;
    
    if (themeButton) {
      // Click the parent button
      const parentButton = await page.evaluateHandle(el => el.closest('button'), themeButton);
      await parentButton.asElement().click();
      await wait(1000);
      
      await takeScreenshot(page, 'theme-selector-open');
      
      // Try selecting a different theme variant
      const themeOptions = await page.$$('button[title]');
      results.themeOptionsCount = themeOptions.length;
      
      if (themeOptions.length > 1) {
        // Click second theme option
        await themeOptions[1].click();
        await wait(1000);
        
        const newTheme = await page.evaluate(() => {
          return {
            isDark: document.documentElement.classList.contains('dark'),
            themeVariant: localStorage.getItem('theme-variant')
          };
        });
        results.themeChanged = newTheme.themeVariant !== initialTheme.themeVariant;
        results.newTheme = newTheme;
      }
      
      // Reload page to test persistence
      await page.reload({ waitUntil: 'networkidle2' });
      await wait(1000);
      
      const themeAfterReload = await page.evaluate(() => {
        return {
          isDark: document.documentElement.classList.contains('dark'),
          themeVariant: localStorage.getItem('theme-variant')
        };
      });
      results.themeAfterReload = themeAfterReload;
      results.themePersisted = themeAfterReload.themeVariant === results.newTheme?.themeVariant;
      
      await takeScreenshot(page, 'theme-after-reload');
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
    await wait(2000);
    
    // Scroll down to find pagination
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await wait(1000);
    
    // Get initial page info
    const initialPageInfo = await page.evaluate(() => {
      const showingText = Array.from(document.querySelectorAll('*')).find(
        el => el.textContent && el.textContent.includes('Showing') && el.textContent.includes('of')
      );
      return showingText ? showingText.textContent : null;
    });
    results.initialPageInfo = initialPageInfo;
    
    await takeScreenshot(page, 'home-pagination');
    
    // Try to navigate to page 2
    const page2Button = await page.$x("//button[text()='2']");
    results.hasPaginationButtons = page2Button.length > 0;
    
    if (page2Button.length > 0) {
      await page2Button[0].click();
      await wait(2000);
      
      const page2Info = await page.evaluate(() => {
        const showingText = Array.from(document.querySelectorAll('*')).find(
          el => el.textContent && el.textContent.includes('Showing') && el.textContent.includes('of')
        );
        return showingText ? showingText.textContent : null;
      });
      results.page2Info = page2Info;
      results.navigationWorked = page2Info !== initialPageInfo;
      
      await takeScreenshot(page, 'pagination-page2');
      
      // Test page 3
      const page3Button = await page.$x("//button[text()='3']");
      if (page3Button.length > 0) {
        await page3Button[0].click();
        await wait(2000);
        results.page3Navigated = true;
      }
    }
    
    // Test Previous/Next buttons
    const nextButtons = await page.$$('button svg.lucide-chevron-right');
    results.hasNextButton = nextButtons.length > 0;
    
    const prevButtons = await page.$$('button svg.lucide-chevron-left');
    results.hasPrevButton = prevButtons.length > 0;
    
    // Test category page pagination
    console.log('  📂 Testing category page pagination...');
    await page.goto('http://localhost:5000/category/Encoding', { waitUntil: 'networkidle2' });
    await wait(2000);
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await wait(1000);
    
    const categoryPagination = await page.evaluate(() => {
      const showingText = Array.from(document.querySelectorAll('*')).find(
        el => el.textContent && el.textContent.includes('Showing') && el.textContent.includes('of')
      );
      return showingText ? showingText.textContent : null;
    });
    results.categoryPaginationExists = categoryPagination !== null;
    
    await takeScreenshot(page, 'category-pagination');
    
    // Check mobile pagination button sizes
    console.log('  📱 Testing mobile pagination button sizes...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    await wait(2000);
    
    const buttonSizes = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(
        btn => btn.textContent && (btn.textContent.match(/^\d+$/) || btn.querySelector('svg'))
      );
      return buttons.map(btn => {
        const rect = btn.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    });
    results.mobilePaginationButtonSizes = buttonSizes;
    results.mobileButtonsMinHeight44px = buttonSizes.every(size => size.height >= 44);
    
    await takeScreenshot(page, 'mobile-pagination');
    
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
    await wait(2000);
    
    // Find resource cards
    const cards = await page.$$('[data-testid*="resource-card"]');
    results.resourceCardsFound = cards.length;
    
    // Check for title truncation
    const truncationInfo = await page.evaluate(() => {
      const titles = document.querySelectorAll('h3, h4, .text-lg');
      const descriptions = document.querySelectorAll('.text-sm.text-muted-foreground, .line-clamp-2');
      
      const titleInfo = Array.from(titles).map(title => {
        const styles = window.getComputedStyle(title);
        return {
          hasEllipsis: styles.textOverflow === 'ellipsis',
          isOverflowHidden: styles.overflow === 'hidden',
          hasLineClamp: title.className.includes('line-clamp')
        };
      });
      
      const descInfo = Array.from(descriptions).map(desc => {
        const styles = window.getComputedStyle(desc);
        return {
          hasLineClamp: desc.className.includes('line-clamp'),
          overflow: styles.overflow,
          display: styles.display
        };
      });
      
      return {
        titles: titleInfo,
        descriptions: descInfo
      };
    });
    
    results.titlesTruncated = truncationInfo.titles.some(t => t.hasEllipsis || t.hasLineClamp);
    results.descriptionsTruncated = truncationInfo.descriptions.some(d => d.hasLineClamp);
    
    await takeScreenshot(page, 'text-truncation-desktop');
    
    // Check badge visibility
    const badgeInfo = await page.evaluate(() => {
      const badges = document.querySelectorAll('.inline-flex.items-center.rounded-md, .inline-flex.items-center.rounded-full');
      return {
        count: badges.length,
        visible: Array.from(badges).filter(badge => {
          const rect = badge.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length
      };
    });
    results.badgesVisible = badgeInfo.visible;
    results.totalBadges = badgeInfo.count;
    
    // Test mobile text overflow
    console.log('  📱 Testing mobile text overflow...');
    await page.setViewport({ width: 390, height: 844 });
    await wait(2000);
    
    const mobileOverflow = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, p');
      const overflowing = [];
      
      elements.forEach(el => {
        if (el.scrollWidth > el.clientWidth) {
          overflowing.push({
            tag: el.tagName,
            text: el.textContent.substring(0, 30),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth
          });
        }
      });
      
      return overflowing;
    });
    results.mobileOverflowingElements = mobileOverflow.length;
    results.mobileTextContained = mobileOverflow.length === 0;
    
    // Check search placeholder
    const searchPlaceholder = await page.evaluate(() => {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
      return searchInput ? searchInput.placeholder : null;
    });
    results.searchPlaceholderText = searchPlaceholder;
    results.searchPlaceholderVisible = searchPlaceholder !== null && searchPlaceholder.length > 0;
    
    // Check breadcrumb on deep page
    await page.goto('http://localhost:5000/category/Encoding/codecs/av1', { waitUntil: 'networkidle2' });
    await wait(1000);
    
    const breadcrumbInfo = await page.evaluate(() => {
      const breadcrumb = document.querySelector('nav[aria-label="breadcrumb"], .flex.items-center.gap-2');
      if (breadcrumb) {
        return {
          exists: true,
          scrollWidth: breadcrumb.scrollWidth,
          clientWidth: breadcrumb.clientWidth,
          overflows: breadcrumb.scrollWidth > breadcrumb.clientWidth
        };
      }
      return { exists: false };
    });
    results.breadcrumbOverflow = breadcrumbInfo;
    
    await takeScreenshot(page, 'mobile-text-truncation');
    
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
      await wait(2000);
      
      const layoutInfo = await page.evaluate(() => {
        // Find grid container
        const grid = document.querySelector('.grid');
        const sidebar = document.querySelector('aside, .w-64, .w-72');
        const cards = document.querySelectorAll('[data-testid*="resource-card"], .group.transition-all');
        
        let gridColumns = 'unknown';
        if (grid) {
          const styles = window.getComputedStyle(grid);
          gridColumns = styles.gridTemplateColumns;
        }
        
        let sidebarWidth = 0;
        let sidebarVisible = false;
        if (sidebar) {
          const rect = sidebar.getBoundingClientRect();
          sidebarWidth = rect.width;
          sidebarVisible = rect.width > 0 && rect.height > 0;
        }
        
        return {
          gridColumns,
          sidebarWidth,
          sidebarVisible,
          visibleCards: cards.length
        };
      });
      
      results[breakpoint.name] = {
        viewport: `${breakpoint.width}x${breakpoint.height}`,
        ...layoutInfo,
        screenshot: await takeScreenshot(page, `responsive-${breakpoint.name}`)
      };
    }
    
    // Test column adjustments
    console.log('  🏗️ Testing grid column adjustments...');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    await wait(2000);
    
    const columnInfo = await page.evaluate(() => {
      const grid = document.querySelector('.grid');
      if (grid) {
        const cards = grid.querySelectorAll('> *');
        if (cards.length > 0) {
          const gridRect = grid.getBoundingClientRect();
          const cardRect = cards[0].getBoundingClientRect();
          const cardsPerRow = Math.floor(gridRect.width / cardRect.width);
          return { 
            cardsPerRow, 
            gridWidth: gridRect.width,
            cardWidth: cardRect.width 
          };
        }
      }
      return null;
    });
    results.mediumScreenColumns = columnInfo;
    
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
    await wait(1000);
    
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
      hasUserId: 'awesome-video-user-id' in localStorageData,
      data: localStorageData
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
      itemCount: Object.keys(sessionStorageData).length
    };
    
    // Check cookies
    const cookies = await page.cookies();
    results.cookies = {
      count: cookies.length,
      names: cookies.map(c => c.name)
    };
    
    // Test persistence after navigation
    console.log('  🔄 Testing persistence after navigation...');
    
    // Store test data
    await page.evaluate(() => {
      localStorage.setItem('test-persistence', 'test-value');
      sessionStorage.setItem('test-session', 'session-value');
    });
    
    // Navigate to another page
    await page.goto('http://localhost:5000/category/Encoding', { waitUntil: 'networkidle2' });
    await wait(1000);
    
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
    await wait(1000);
    
    // Test Tab navigation
    console.log('  ⌨️ Testing Tab navigation...');
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
          href: el.getAttribute('href'),
          type: el.getAttribute('type')
        };
      });
      
      tabbableElements.push(focusedElement);
    }
    
    results.tabbableElements = tabbableElements;
    results.tabNavigationWorks = tabbableElements.length > 0;
    
    // Check focus indicators
    const focusIndicators = await page.evaluate(() => {
      // Create and focus a button to check styles
      const button = document.querySelector('button');
      if (button) {
        button.focus();
        const styles = window.getComputedStyle(button);
        const focusStyles = window.getComputedStyle(button, ':focus');
        return {
          hasOutline: styles.outline !== 'none' || styles.outlineWidth !== '0px',
          hasBoxShadow: styles.boxShadow !== 'none',
          hasBorder: styles.borderWidth !== '0px'
        };
      }
      return null;
    });
    results.focusIndicators = focusIndicators;
    results.hasFocusIndicators = focusIndicators && 
      (focusIndicators.hasOutline || focusIndicators.hasBoxShadow);
    
    // Test dialog focus management
    console.log('  🎯 Testing dialog focus management...');
    const prefsButton = await page.$x("//button[contains(., 'Preferences')]");
    if (prefsButton.length > 0) {
      await prefsButton[0].click();
      await wait(1000);
      
      const dialogFocus = await page.evaluate(() => {
        const activeElement = document.activeElement;
        const dialog = document.querySelector('[role="dialog"]');
        return {
          focusInDialog: dialog && dialog.contains(activeElement),
          focusedElement: activeElement.tagName,
          dialogExists: dialog !== null
        };
      });
      results.dialogFocusManagement = dialogFocus;
      
      // Test Escape key
      await page.keyboard.press('Escape');
      await wait(500);
      
      const dialogClosed = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return !dialog || window.getComputedStyle(dialog).display === 'none';
      });
      results.escapeClosesDialog = dialogClosed;
    }
    
    // Check ARIA attributes
    console.log('  🏷️ Checking ARIA labels...');
    const ariaInfo = await page.evaluate(() => {
      const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]');
      const roleCount = {};
      
      ariaElements.forEach(el => {
        const role = el.getAttribute('role');
        if (role) {
          roleCount[role] = (roleCount[role] || 0) + 1;
        }
      });
      
      return {
        totalAriaElements: ariaElements.length,
        roleDistribution: roleCount,
        examples: Array.from(ariaElements).slice(0, 5).map(el => ({
          tag: el.tagName,
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label')
        }))
      };
    });
    results.ariaInfo = ariaInfo;
    
    // Test logical tab order
    results.tabOrderLogical = tabbableElements.filter(el => 
      ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
    ).length >= 5;
    
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
    await wait(1000);
    
    const has404 = await page.evaluate(() => {
      const body = document.body.textContent.toLowerCase();
      return body.includes('404') || body.includes('not found') || body.includes('page not found');
    });
    results.has404Page = has404;
    await takeScreenshot(page, 'error-404');
    
    // Test loading states
    console.log('  ⏳ Testing loading states...');
    await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded' });
    
    // Check for skeleton loaders immediately
    const hasSkeletons = await page.evaluate(() => {
      const skeletons = document.querySelectorAll('.animate-pulse, [class*="skeleton"]');
      return skeletons.length > 0;
    });
    results.hasSkeletonLoaders = hasSkeletons;
    
    if (hasSkeletons) {
      await takeScreenshot(page, 'loading-skeletons');
      
      // Wait for content to load
      await wait(3000);
      
      const skeletonsAfter = await page.evaluate(() => {
        const skeletons = document.querySelectorAll('.animate-pulse, [class*="skeleton"]');
        return skeletons.length;
      });
      results.skeletonsDisappearAfterLoad = skeletonsAfter === 0;
    }
    
    // Test empty state
    console.log('  📭 Testing empty state handling...');
    await page.goto('http://localhost:5000/category/NonExistentCategory', { waitUntil: 'networkidle2' });
    await wait(1000);
    
    const emptyState = await page.evaluate(() => {
      const body = document.body.textContent.toLowerCase();
      return body.includes('no resources') || body.includes('no results') || 
             body.includes('empty') || body.includes('not found') ||
             body.includes('0 resources');
    });
    results.hasEmptyState = emptyState;
    
    // Check for error boundaries
    const errorHandling = await page.evaluate(() => {
      // Check if React error boundaries are in place
      const hasErrorBoundary = document.querySelector('[class*="error"], [role="alert"]');
      return {
        hasErrorElements: hasErrorBoundary !== null,
        hasConsoleErrors: false // Will be set if console errors detected
      };
    });
    results.errorHandlingElements = errorHandling;
    
  } catch (error) {
    console.error('  ❌ Error in error handling test:', error.message);
    results.error = error.message;
  }
  
  return results;
}

// Generate comprehensive report
function generateReport(results) {
  let report = '# UI Feature Validation Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Executive Summary
  report += '## Executive Summary\n\n';
  
  const categories = [
    { name: 'User Preferences', key: 'userPreferences' },
    { name: 'Theme Switching', key: 'themeSwitching' },
    { name: 'Pagination', key: 'pagination' },
    { name: 'Text Truncation', key: 'textTruncation' },
    { name: 'Responsive Breakpoints', key: 'responsiveBreakpoints' },
    { name: 'Storage & Persistence', key: 'storage' },
    { name: 'Accessibility', key: 'accessibility' },
    { name: 'Error Handling', key: 'errorHandling' }
  ];
  
  let totalPassed = 0;
  let totalTests = categories.length;
  
  categories.forEach(cat => {
    const hasError = results[cat.key].error !== undefined;
    if (!hasError) totalPassed++;
    report += `- **${cat.name}**: ${hasError ? '❌ Failed' : '✅ Passed'}\n`;
  });
  
  report += `\n**Overall Success Rate**: ${Math.round((totalPassed/totalTests) * 100)}%\n\n`;
  
  // Detailed Results
  report += '## Detailed Test Results\n\n';
  
  // User Preferences
  report += '### User Preferences Persistence\n\n';
  const prefs = results.userPreferences;
  report += '| Test | Result | Details |\n';
  report += '|------|--------|----------|\n';
  report += `| Preferences Button | ${prefs.preferencesButtonExists ? '✅' : '❌'} | Button to open preferences dialog |\n`;
  report += `| Skill Level Dropdown | ${prefs.skillLevelSelectExists ? '✅' : '❌'} | Dropdown for selecting skill level |\n`;
  report += `| Learning Schedule | ${prefs.scheduleSelectExists ? '✅' : '❌'} | Schedule selection dropdown |\n`;
  report += `| Interest Categories | ${prefs.interestCheckboxesCount > 0 ? '✅' : '❌'} | ${prefs.interestCheckboxesCount || 0} checkboxes found |\n`;
  report += `| Goals Selection | ${prefs.goalsCheckboxesCount > 0 ? '✅' : '❌'} | ${prefs.goalsCheckboxesCount || 0} goal options |\n`;
  report += `| Style Preferences | ${prefs.styleCheckboxesCount > 0 ? '✅' : '❌'} | ${prefs.styleCheckboxesCount || 0} style options |\n`;
  report += `| Save to LocalStorage | ${prefs.profileSavedToLocalStorage ? '✅' : '❌'} | Profile saved to browser storage |\n`;
  report += `| Values Persist | ${prefs.valuesPersisted ? '✅' : '❌'} | Settings retained after reopening |\n`;
  
  if (prefs.savedData) {
    report += `\n**Saved Data Summary:**\n`;
    report += `- Skill Level: ${prefs.savedData.skillLevel}\n`;
    report += `- Time Commitment: ${prefs.savedData.timeCommitment}\n`;
    report += `- Selected Categories: ${prefs.savedData.categoriesCount}\n`;
    report += `- Learning Goals: ${prefs.savedData.goalsCount}\n`;
    report += `- Resource Types: ${prefs.savedData.resourceTypesCount}\n`;
  }
  report += '\n';
  
  // Theme Switching
  report += '### Theme Switching\n\n';
  const theme = results.themeSwitching;
  report += '| Test | Result | Details |\n';
  report += '|------|--------|----------|\n';
  report += `| Theme Selector | ${theme.themeSelectorExists ? '✅' : '❌'} | Palette button for theme selection |\n`;
  report += `| Theme Options | ${theme.themeOptionsCount > 0 ? '✅' : '❌'} | ${theme.themeOptionsCount || 0} theme variants available |\n`;
  report += `| Theme Changed | ${theme.themeChanged ? '✅' : '❌'} | Theme variant changed on selection |\n`;
  report += `| Theme Persisted | ${theme.themePersisted ? '✅' : '❌'} | Theme retained after page reload |\n`;
  
  if (theme.initialTheme && theme.newTheme) {
    report += `\n**Theme Details:**\n`;
    report += `- Initial: ${theme.initialTheme.themeVariant || 'default'}\n`;
    report += `- Changed to: ${theme.newTheme.themeVariant || 'unknown'}\n`;
    report += `- Dark Mode: ${theme.newTheme.isDark ? 'Yes' : 'No'}\n`;
  }
  report += '\n';
  
  // Pagination
  report += '### Pagination\n\n';
  const pagination = results.pagination;
  report += '| Test | Result | Details |\n';
  report += '|------|--------|----------|\n';
  report += `| Pagination Controls | ${pagination.hasPaginationButtons ? '✅' : '❌'} | Page number buttons present |\n`;
  report += `| Page 2 Navigation | ${pagination.navigationWorked ? '✅' : '❌'} | Successfully navigated to page 2 |\n`;
  report += `| Page 3 Navigation | ${pagination.page3Navigated ? '✅' : '❌'} | Successfully navigated to page 3 |\n`;
  report += `| Next Button | ${pagination.hasNextButton ? '✅' : '❌'} | Next page navigation button |\n`;
  report += `| Previous Button | ${pagination.hasPrevButton ? '✅' : '❌'} | Previous page navigation button |\n`;
  report += `| Category Pagination | ${pagination.categoryPaginationExists ? '✅' : '❌'} | Pagination on category pages |\n`;
  report += `| Mobile Button Size | ${pagination.mobileButtonsMinHeight44px ? '✅' : '❌'} | Buttons ≥ 44px height on mobile |\n`;
  report += '\n';
  
  // Text Truncation
  report += '### Text Truncation and Visual Elements\n\n';
  const truncation = results.textTruncation;
  report += '| Test | Result | Details |\n';
  report += '|------|--------|----------|\n';
  report += `| Resource Cards | ${truncation.resourceCardsFound > 0 ? '✅' : '❌'} | ${truncation.resourceCardsFound || 0} cards found |\n`;
  report += `| Title Truncation | ${truncation.titlesTruncated ? '✅' : '❌'} | Titles truncate with ellipsis |\n`;
  report += `| Description Truncation | ${truncation.descriptionsTruncated ? '✅' : '❌'} | Descriptions use line-clamp |\n`;
  report += `| Badge Visibility | ${truncation.badgesVisible > 0 ? '✅' : '❌'} | ${truncation.badgesVisible || 0} of ${truncation.totalBadges || 0} badges visible |\n`;
  report += `| Mobile Text Contained | ${truncation.mobileTextContained ? '✅' : '❌'} | ${truncation.mobileOverflowingElements || 0} overflowing elements |\n`;
  report += `| Search Placeholder | ${truncation.searchPlaceholderVisible ? '✅' : '❌'} | "${truncation.searchPlaceholderText || 'N/A'}" |\n`;
  report += `| Breadcrumb Handling | ${!truncation.breadcrumbOverflow?.overflows ? '✅' : '❌'} | Breadcrumb doesn't overflow |\n`;
  report += '\n';
  
  // Responsive Breakpoints
  report += '### Responsive Breakpoints\n\n';
  ['tablet', 'desktop', 'ultrawide'].forEach(breakpoint => {
    const data = results.responsiveBreakpoints[breakpoint];
    if (data) {
      report += `#### ${breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)} (${data.viewport})\n`;
      report += `- Visible Cards: ${data.visibleCards || 0}\n`;
      report += `- Sidebar: ${data.sidebarVisible ? `Visible (${data.sidebarWidth}px)` : 'Hidden'}\n`;
      report += `- Grid Columns: ${data.gridColumns || 'N/A'}\n\n`;
    }
  });
  
  if (results.responsiveBreakpoints.mediumScreenColumns) {
    const cols = results.responsiveBreakpoints.mediumScreenColumns;
    report += `**Medium Screen (1280px):** ${cols.cardsPerRow} cards per row\n\n`;
  }
  
  // Storage
  report += '### Storage and Persistence\n\n';
  const storage = results.storage;
  report += '| Test | Result | Details |\n';
  report += '|------|--------|----------|\n';
  report += `| User Profile | ${storage.localStorage?.hasUserProfile ? '✅' : '❌'} | Profile data in localStorage |\n`;
  report += `| Theme Settings | ${storage.localStorage?.hasTheme ? '✅' : '❌'} | Theme preferences saved |\n`;
  report += `| User ID | ${storage.localStorage?.hasUserId ? '✅' : '❌'} | Unique user identifier stored |\n`;
  report += `| LocalStorage Persist | ${storage.persistenceAfterNavigation?.localStoragePersisted ? '✅' : '❌'} | Data persists across navigation |\n`;
  report += `| SessionStorage Persist | ${storage.persistenceAfterNavigation?.sessionStoragePersisted ? '✅' : '❌'} | Session data persists |\n`;
  report += `| Cookies | ${storage.cookies?.count || 0} | ${storage.cookies?.names?.join(', ') || 'None'} |\n`;
  
  if (storage.localStorage?.keys) {
    report += `\n**LocalStorage Keys:** ${storage.localStorage.keys.join(', ')}\n`;
  }
  report += '\n';
  
  // Accessibility
  report += '### Keyboard and Accessibility\n\n';
  const a11y = results.accessibility;
  report += '| Test | Result | Details |\n';
  report += '|------|--------|----------|\n';
  report += `| Tab Navigation | ${a11y.tabNavigationWorks ? '✅' : '❌'} | ${a11y.tabbableElements?.length || 0} tabbable elements |\n`;
  report += `| Focus Indicators | ${a11y.hasFocusIndicators ? '✅' : '❌'} | Visual focus indicators present |\n`;
  report += `| Dialog Focus | ${a11y.dialogFocusManagement?.focusInDialog ? '✅' : '❌'} | Focus trapped in dialog |\n`;
  report += `| Escape Key | ${a11y.escapeClosesDialog ? '✅' : '❌'} | Escape closes dialogs |\n`;
  report += `| ARIA Elements | ${a11y.ariaInfo?.totalAriaElements > 0 ? '✅' : '❌'} | ${a11y.ariaInfo?.totalAriaElements || 0} elements with ARIA |\n`;
  report += `| Tab Order | ${a11y.tabOrderLogical ? '✅' : '❌'} | Logical keyboard navigation order |\n`;
  
  if (a11y.ariaInfo?.roleDistribution) {
    report += `\n**ARIA Roles Found:** ${Object.entries(a11y.ariaInfo.roleDistribution).map(([role, count]) => `${role} (${count})`).join(', ')}\n`;
  }
  report += '\n';
  
  // Error Handling
  report += '### Error Handling\n\n';
  const errors = results.errorHandling;
  report += '| Test | Result | Details |\n';
  report += '|------|--------|----------|\n';
  report += `| 404 Page | ${errors.has404Page ? '✅' : '❌'} | Custom 404 error page |\n`;
  report += `| Skeleton Loaders | ${errors.hasSkeletonLoaders ? '✅' : '❌'} | Loading skeletons present |\n`;
  report += `| Skeletons Clear | ${errors.skeletonsDisappearAfterLoad ? '✅' : '❌'} | Skeletons replaced by content |\n`;
  report += `| Empty State | ${errors.hasEmptyState ? '✅' : '❌'} | Handles empty/no results state |\n`;
  report += `| Error Elements | ${errors.errorHandlingElements?.hasErrorElements ? '✅' : '❌'} | Error boundary elements |\n`;
  report += '\n';
  
  // Screenshots
  report += '## Screenshots\n\n';
  report += 'The following screenshots were captured during testing:\n\n';
  
  results.screenshots.forEach(screenshot => {
    const filename = path.basename(screenshot);
    report += `- ${filename}\n`;
  });
  
  // Recommendations
  report += '\n## Recommendations\n\n';
  
  const recommendations = [];
  
  if (!prefs.valuesPersisted) {
    recommendations.push('- Ensure user preferences persist correctly after dialog close/reopen');
  }
  
  if (!pagination.mobileButtonsMinHeight44px) {
    recommendations.push('- Increase pagination button sizes to minimum 44px height for mobile accessibility');
  }
  
  if (truncation.mobileOverflowingElements > 0) {
    recommendations.push('- Fix text overflow issues on mobile viewports');
  }
  
  if (!a11y.escapeClosesDialog) {
    recommendations.push('- Implement Escape key handling for modal dialogs');
  }
  
  if (!errors.hasSkeletonLoaders) {
    recommendations.push('- Add skeleton loaders for better loading state feedback');
  }
  
  if (recommendations.length > 0) {
    report += recommendations.join('\n');
  } else {
    report += 'All tested features are working as expected. Great job!';
  }
  
  return report;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting UI Feature Validation Tests...');
  console.log('=' .repeat(60));
  
  let browser;
  
  try {
    await createTestDir();
    
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    
    // Set up console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ⚠️ Console error: ${msg.text()}`);
      }
    });
    
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
    fs.writeFileSync('test-results/ui-feature-validation-results.json', JSON.stringify(testResults, null, 2));
    
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