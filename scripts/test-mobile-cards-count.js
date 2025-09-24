import puppeteer from 'puppeteer';

async function testMobileCardsCount() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set mobile viewport (iPhone 12 Pro)
  await page.setViewport({ width: 390, height: 844 });
  
  console.log('Testing mobile viewport (390x844) cards count...\n');
  
  try {
    // Navigate to homepage first to ensure data is loaded
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid^="card-resource"]', { timeout: 10000 });
    
    // Test a category page
    console.log('Testing category page: Intro & Learning');
    await page.goto('http://localhost:5000/category/intro-learning', { waitUntil: 'networkidle0' });
    
    // Wait for cards to load
    await page.waitForSelector('[data-testid^="card-resource"]', { timeout: 10000 });
    
    // Count the number of cards displayed
    const cardCount = await page.$$eval('[data-testid^="card-resource"]', cards => cards.length);
    
    console.log(`Cards found on mobile viewport: ${cardCount}`);
    
    // Check if layout switcher shows "cards" as active
    const activeLayout = await page.$eval('[aria-label="Layout selector"] button[data-state="on"]', 
      el => el.getAttribute('value'));
    console.log(`Active layout: ${activeLayout}`);
    
    // Check the items per page indicator if present
    const itemsPerPageText = await page.$eval('p.text-sm.text-muted-foreground', 
      el => el.textContent).catch(() => 'Not found');
    console.log(`Page info: ${itemsPerPageText}`);
    
    // Test result
    if (cardCount === 24) {
      console.log('\n✅ SUCCESS: Mobile viewport shows 24 cards as expected!');
    } else {
      console.log(`\n❌ FAILURE: Mobile viewport shows ${cardCount} cards instead of 24`);
    }
    
    // Test another category with more resources
    console.log('\n---\nTesting category page: Encoding & Codecs');
    await page.goto('http://localhost:5000/category/encoding-codecs', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid^="card-resource"]', { timeout: 10000 });
    
    const cardCount2 = await page.$$eval('[data-testid^="card-resource"]', cards => cards.length);
    console.log(`Cards found on mobile viewport: ${cardCount2}`);
    
    if (cardCount2 === 24) {
      console.log('✅ SUCCESS: Mobile viewport shows 24 cards as expected!');
    } else {
      console.log(`❌ FAILURE: Mobile viewport shows ${cardCount2} cards instead of 24`);
    }
    
    // Test subcategory page
    console.log('\n---\nTesting subcategory page: Adaptive Streaming');
    await page.goto('http://localhost:5000/subcategory/adaptive-streaming', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid^="card-resource"]', { timeout: 10000 });
    
    const cardCount3 = await page.$$eval('[data-testid^="card-resource"]', cards => cards.length);
    console.log(`Cards found on mobile viewport: ${cardCount3}`);
    
    if (cardCount3 === 24) {
      console.log('✅ SUCCESS: Mobile viewport shows 24 cards as expected!');
    } else {
      console.log(`❌ FAILURE: Mobile viewport shows ${cardCount3} cards instead of 24`);
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    const allPassed = cardCount === 24 && cardCount2 === 24 && cardCount3 === 24;
    if (allPassed) {
      console.log('✅ All tests passed! Mobile viewport displays 24 cards correctly on all category pages.');
    } else {
      console.log('❌ Some tests failed. Please review the results above.');
      console.log(`Category page: ${cardCount} cards (expected 24)`);
      console.log(`Encoding & Codecs: ${cardCount2} cards (expected 24)`);
      console.log(`Adaptive Streaming subcategory: ${cardCount3} cards (expected 24)`);
    }
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

testMobileCardsCount().catch(console.error);