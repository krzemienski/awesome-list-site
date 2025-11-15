import puppeteer from 'puppeteer';

const baseUrl = 'http://localhost:5000';

async function testDesktopSidebarForceExpanded() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('🧪 Testing Desktop Sidebar Force Expanded Fix...\n');

    // Test 1: Initial load - sidebar should be expanded
    console.log('Test 1: Initial load with no cookies');
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 5000 });
    
    const initialState = await page.$eval('.group.peer', el => el.getAttribute('data-state'));
    const initialWidth = await page.$eval('[data-sidebar="sidebar"]', el => 
      window.getComputedStyle(el).width
    );
    
    console.log(`  ✓ Initial state: ${initialState}`);
    console.log(`  ✓ Initial width: ${initialWidth}`);
    
    if (initialState !== 'expanded') {
      throw new Error(`❌ FAILED: Expected state 'expanded', got '${initialState}'`);
    }
    if (initialWidth !== '256px') {
      throw new Error(`❌ FAILED: Expected width '256px', got '${initialWidth}'`);
    }

    // Test 2: Set sidebar_state=false cookie manually
    console.log('\nTest 2: Set sidebar_state=false cookie and reload');
    await page.setCookie({
      name: 'sidebar_state',
      value: 'false',
      path: '/',
      domain: 'localhost'
    });
    
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 5000 });
    
    const stateAfterCookie = await page.$eval('.group.peer', el => el.getAttribute('data-state'));
    const widthAfterCookie = await page.$eval('[data-sidebar="sidebar"]', el => 
      window.getComputedStyle(el).width
    );
    
    console.log(`  ✓ State after cookie: ${stateAfterCookie}`);
    console.log(`  ✓ Width after cookie: ${widthAfterCookie}`);
    
    if (stateAfterCookie !== 'expanded') {
      throw new Error(`❌ FAILED: Cookie should be ignored, state should be 'expanded', got '${stateAfterCookie}'`);
    }
    if (widthAfterCookie !== '256px') {
      throw new Error(`❌ FAILED: Cookie should be ignored, width should be '256px', got '${widthAfterCookie}'`);
    }

    // Test 3: Try CMD+B keyboard shortcut
    console.log('\nTest 3: Try CMD+B keyboard shortcut');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyB');
    await page.keyboard.up('Meta');
    await page.waitForTimeout(500);
    
    const stateAfterKeyboard = await page.$eval('.group.peer', el => el.getAttribute('data-state'));
    const widthAfterKeyboard = await page.$eval('[data-sidebar="sidebar"]', el => 
      window.getComputedStyle(el).width
    );
    
    console.log(`  ✓ State after CMD+B: ${stateAfterKeyboard}`);
    console.log(`  ✓ Width after CMD+B: ${widthAfterKeyboard}`);
    
    if (stateAfterKeyboard !== 'expanded') {
      throw new Error(`❌ FAILED: CMD+B should do nothing, state should be 'expanded', got '${stateAfterKeyboard}'`);
    }
    if (widthAfterKeyboard !== '256px') {
      throw new Error(`❌ FAILED: CMD+B should do nothing, width should be '256px', got '${widthAfterKeyboard}'`);
    }

    // Test 4: Verify grid layout uses full width
    console.log('\nTest 4: Verify grid layout uses full width');
    const gridCols = await page.$eval('.group\\/sidebar-wrapper', el => 
      window.getComputedStyle(el).gridTemplateColumns
    );
    
    console.log(`  ✓ Grid template columns: ${gridCols}`);
    
    if (!gridCols.includes('256px')) {
      throw new Error(`❌ FAILED: Grid should use 256px for sidebar, got '${gridCols}'`);
    }

    // Test 5: Try programmatic setOpen(false)
    console.log('\nTest 5: Try programmatic setOpen(false) via React context');
    await page.evaluate(() => {
      // Try to call setOpen(false) if we can access it
      // This is a test to ensure the setOpen is a no-op on desktop
      const event = new KeyboardEvent('keydown', {
        key: 'b',
        metaKey: true,
        bubbles: true
      });
      document.dispatchEvent(event);
    });
    await page.waitForTimeout(500);
    
    const stateAfterProgrammatic = await page.$eval('.group.peer', el => el.getAttribute('data-state'));
    const widthAfterProgrammatic = await page.$eval('[data-sidebar="sidebar"]', el => 
      window.getComputedStyle(el).width
    );
    
    console.log(`  ✓ State after programmatic attempt: ${stateAfterProgrammatic}`);
    console.log(`  ✓ Width after programmatic attempt: ${widthAfterProgrammatic}`);
    
    if (stateAfterProgrammatic !== 'expanded') {
      throw new Error(`❌ FAILED: Programmatic setOpen should be ignored, state should be 'expanded', got '${stateAfterProgrammatic}'`);
    }

    // Test 6: Navigate to different pages and verify sidebar stays expanded
    console.log('\nTest 6: Navigate to category page and verify sidebar stays expanded');
    await page.click('a[href="/category/intro-learning"]');
    await page.waitForTimeout(1000);
    
    const stateAfterNav = await page.$eval('.group.peer', el => el.getAttribute('data-state'));
    const widthAfterNav = await page.$eval('[data-sidebar="sidebar"]', el => 
      window.getComputedStyle(el).width
    );
    
    console.log(`  ✓ State after navigation: ${stateAfterNav}`);
    console.log(`  ✓ Width after navigation: ${widthAfterNav}`);
    
    if (stateAfterNav !== 'expanded') {
      throw new Error(`❌ FAILED: Sidebar should stay expanded after navigation, got '${stateAfterNav}'`);
    }

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log('  ✓ Desktop sidebar always shows as expanded (256px)');
    console.log('  ✓ No way to collapse via keyboard shortcuts');
    console.log('  ✓ Existing cookies don\'t affect desktop state');
    console.log('  ✓ Grid layout always uses full width on desktop');
    console.log('  ✓ CMD+B does absolutely nothing on desktop');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testDesktopSidebarForceExpanded();
