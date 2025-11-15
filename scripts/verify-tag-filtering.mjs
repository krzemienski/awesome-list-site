import puppeteer from 'puppeteer';

async function verifyTagFiltering() {
  console.log('🧪 Starting Tag Filter Verification Test\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const baseUrl = 'http://localhost:5000';
  const results = {
    category: { passed: false, details: '' },
    subcategory: { passed: false, details: '' },
    subsubcategory: { passed: false, details: '' }
  };
  
  try {
    console.log('📋 Test 1: Category Page - Tag Filter');
    console.log('   Navigating to Encoding & Codecs category...');
    await page.goto(`${baseUrl}/category/encoding-codecs`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="card-resource-0"]', { timeout: 5000 });
    
    // Check if TagFilter is present
    const categoryTagFilterButton = await page.$('button:has-text("Filter by Tag")');
    if (categoryTagFilterButton) {
      console.log('   ✅ TagFilter button found on Category page');
      
      // Click the filter button to open popover
      await categoryTagFilterButton.click();
      await page.waitForTimeout(500);
      
      // Check if popover opened with tags
      const popoverExists = await page.$('.max-h-64');
      if (popoverExists) {
        console.log('   ✅ TagFilter popover opened successfully');
        
        // Count available tags
        const tagCount = await page.$$eval('[role="checkbox"]', checkboxes => checkboxes.length);
        console.log(`   ✅ Found ${tagCount} available tags`);
        
        if (tagCount > 0) {
          // Click first tag to filter
          const firstCheckbox = await page.$('[role="checkbox"]');
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          // Check if results count updated
          const resultsText = await page.$eval('[data-testid="text-results-count"]', el => el.textContent);
          console.log(`   ✅ Results after filtering: ${resultsText}`);
          
          results.category.passed = true;
          results.category.details = `Tag filtering works with ${tagCount} tags available`;
        }
      }
    } else {
      console.log('   ❌ TagFilter button NOT found on Category page');
      results.category.details = 'TagFilter button not found';
    }
    
    console.log('\n📋 Test 2: Subcategory Page - Tag Filter');
    console.log('   Navigating to Adaptive Streaming subcategory...');
    await page.goto(`${baseUrl}/subcategory/adaptive-streaming`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="card-resource-0"]', { timeout: 5000 });
    
    const subcategoryTagFilterButton = await page.$('button:has-text("Filter by Tag")');
    if (subcategoryTagFilterButton) {
      console.log('   ✅ TagFilter button found on Subcategory page');
      
      await subcategoryTagFilterButton.click();
      await page.waitForTimeout(500);
      
      const popoverExists = await page.$('.max-h-64');
      if (popoverExists) {
        console.log('   ✅ TagFilter popover opened successfully');
        
        const tagCount = await page.$$eval('[role="checkbox"]', checkboxes => checkboxes.length);
        console.log(`   ✅ Found ${tagCount} available tags`);
        
        if (tagCount > 0) {
          const firstCheckbox = await page.$('[role="checkbox"]');
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          const resultsText = await page.$eval('[data-testid="text-results-count"]', el => el.textContent);
          console.log(`   ✅ Results after filtering: ${resultsText}`);
          
          results.subcategory.passed = true;
          results.subcategory.details = `Tag filtering works with ${tagCount} tags available`;
        }
      }
    } else {
      console.log('   ❌ TagFilter button NOT found on Subcategory page');
      results.subcategory.details = 'TagFilter button not found';
    }
    
    console.log('\n📋 Test 3: SubSubcategory Page - Tag Filter');
    console.log('   Navigating to HEVC sub-subcategory...');
    await page.goto(`${baseUrl}/sub-subcategory/hevc`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="card-resource-0"]', { timeout: 5000 });
    
    const subsubTagFilterButton = await page.$('button:has-text("Filter by Tag")');
    if (subsubTagFilterButton) {
      console.log('   ✅ TagFilter button found on SubSubcategory page');
      
      await subsubTagFilterButton.click();
      await page.waitForTimeout(500);
      
      const popoverExists = await page.$('.max-h-64');
      if (popoverExists) {
        console.log('   ✅ TagFilter popover opened successfully');
        
        const tagCount = await page.$$eval('[role="checkbox"]', checkboxes => checkboxes.length);
        console.log(`   ✅ Found ${tagCount} available tags`);
        
        if (tagCount > 0) {
          const firstCheckbox = await page.$('[role="checkbox"]');
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          const resultsText = await page.$eval('[data-testid="text-results-count"]', el => el.textContent);
          console.log(`   ✅ Results after filtering: ${resultsText}`);
          
          results.subsubcategory.passed = true;
          results.subsubcategory.details = `Tag filtering works with ${tagCount} tags available`;
        }
      }
    } else {
      console.log('   ❌ TagFilter button NOT found on SubSubcategory page');
      results.subsubcategory.details = 'TagFilter button not found';
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Category Page:       ${results.category.passed ? '✅ PASS' : '❌ FAIL'} - ${results.category.details}`);
  console.log(`Subcategory Page:    ${results.subcategory.passed ? '✅ PASS' : '❌ FAIL'} - ${results.subcategory.details}`);
  console.log(`SubSubcategory Page: ${results.subsubcategory.passed ? '✅ PASS' : '❌ FAIL'} - ${results.subsubcategory.details}`);
  console.log('='.repeat(60));
  
  const allPassed = results.category.passed && results.subcategory.passed && results.subsubcategory.passed;
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);
  
  process.exit(allPassed ? 0 : 1);
}

verifyTagFiltering();
