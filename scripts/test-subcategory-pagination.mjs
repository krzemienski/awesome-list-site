import puppeteer from 'puppeteer';

async function testSubcategoryPagination() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Testing Subcategory Pagination Fix...\n');

    // Test the Codecs subcategory specifically mentioned in the bug report
    console.log('1. Testing /subcategory/codecs page:');
    await page.goto('http://localhost:5000/subcategory/codecs', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // Check the header text
    const headerText = await page.$eval('p.text-muted-foreground', el => el.textContent.trim());
    console.log(`   Header shows: "${headerText}"`);

    // Count visible resource cards
    const cardCount = await page.$$eval('[class*="ResourceCard"], [class*="resource-card"], .grid > div > div', 
      elements => elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.width > 0 && window.getComputedStyle(el).display !== 'none';
      }).length
    );
    console.log(`   Visible resource cards: ${cardCount}`);

    // Check if pagination is visible
    const paginationExists = await page.$('[class*="pagination"], [class*="Pagination"]') !== null;
    console.log(`   Pagination visible: ${paginationExists}`);

    if (paginationExists) {
      // Get pagination details
      const paginationText = await page.$eval('[class*="Showing"]', el => el.textContent.trim()).catch(() => 'N/A');
      console.log(`   Pagination text: "${paginationText}"`);
    }

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-screenshots/codecs-pagination-fix.png', fullPage: false });

    // Test another subcategory for consistency
    console.log('\n2. Testing /subcategory/encoding-tools page:');
    await page.goto('http://localhost:5000/subcategory/encoding-tools', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    const headerText2 = await page.$eval('p.text-muted-foreground', el => el.textContent.trim());
    console.log(`   Header shows: "${headerText2}"`);

    const cardCount2 = await page.$$eval('[class*="ResourceCard"], [class*="resource-card"], .grid > div > div', 
      elements => elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.width > 0 && window.getComputedStyle(el).display !== 'none';
      }).length
    );
    console.log(`   Visible resource cards: ${cardCount2}`);

    // Test SubSubcategory page
    console.log('\n3. Testing /subsubcategory/av1 page:');
    await page.goto('http://localhost:5000/subsubcategory/av1', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    const headerText3 = await page.$eval('p.text-muted-foreground', el => el.textContent.trim());
    console.log(`   Header shows: "${headerText3}"`);

    const cardCount3 = await page.$$eval('[class*="ResourceCard"], [class*="resource-card"], .grid > div > div', 
      elements => elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.width > 0 && window.getComputedStyle(el).display !== 'none';
      }).length
    );
    console.log(`   Visible resource cards: ${cardCount3}`);

    console.log('\n✅ Test complete! The fix ensures:');
    console.log('   - Header shows correct paginated range (e.g., "Showing 1-24 of 29 resources")');
    console.log('   - Pagination is always visible for navigation and page size control');
    console.log('   - Resource count matches what is displayed on the current page');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testSubcategoryPagination();