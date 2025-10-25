import puppeteer from 'puppeteer';

async function testSSR() {
  let browser;
  
  try {
    console.log('Testing SSR implementation...');
    
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable request interception to check for HTML before JS executes
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() === 'script') {
        // Block JavaScript to check server-rendered HTML
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Navigate to homepage
    await page.goto('http://localhost:5000', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Get the HTML content
    const htmlContent = await page.content();
    
    console.log('HTML Length:', htmlContent.length);
    
    // Check for expected content in the HTML
    const checks = {
      'Title "Awesome Video Resources"': htmlContent.includes('Awesome Video Resources'),
      'Resource count "2011" or "2,011"': htmlContent.includes('2011') || htmlContent.includes('2,011'),
      'Category "Intro & Learning"': htmlContent.includes('Intro & Learning') || htmlContent.includes('intro-learning'),
      'Category "Encoding & Codecs"': htmlContent.includes('Encoding & Codecs') || htmlContent.includes('encoding-codecs'),
      'Category "Players & Clients"': htmlContent.includes('Players & Clients') || htmlContent.includes('players-clients'),
      'Resource cards present': htmlContent.includes('resource-card') || htmlContent.includes('resource'),
      'Sidebar present': htmlContent.includes('sidebar') || htmlContent.includes('aside'),
      'Has app content (not just root)': !htmlContent.includes('<div id="root"><!--app-html--></div>'),
      'Has dehydrated state': htmlContent.includes('__DEHYDRATED_STATE__') || htmlContent.includes('__INITIAL_DATA__')
    };
    
    console.log('\nSSR Verification Results:');
    console.log('========================');
    
    let passedChecks = 0;
    let failedChecks = 0;
    
    for (const [check, result] of Object.entries(checks)) {
      console.log(`${result ? '✅' : '❌'} ${check}`);
      if (result) passedChecks++;
      else failedChecks++;
    }
    
    console.log('\n========================');
    console.log(`Passed: ${passedChecks}/${Object.keys(checks).length}`);
    console.log(`Failed: ${failedChecks}/${Object.keys(checks).length}`);
    
    // Extract and show a snippet of the root element
    const rootMatch = htmlContent.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/);
    if (rootMatch) {
      const rootContent = rootMatch[1].substring(0, 500);
      console.log('\nRoot element content (first 500 chars):');
      console.log(rootContent);
    }
    
    // Check for categories in sidebar
    const categoriesFound = [];
    const categoryNames = [
      'Intro & Learning',
      'Protocols & Transport', 
      'Encoding & Codecs',
      'Players & Clients',
      'Media Tools',
      'Standards & Industry',
      'Infrastructure & Delivery',
      'General Tools',
      'Community & Events'
    ];
    
    for (const category of categoryNames) {
      if (htmlContent.includes(category)) {
        categoriesFound.push(category);
      }
    }
    
    console.log('\nCategories found in HTML:', categoriesFound.length);
    if (categoriesFound.length > 0) {
      console.log('Found categories:', categoriesFound.join(', '));
    }
    
    // Check if we're getting empty shell or rendered content
    if (htmlContent.includes('<!--app-html-->')) {
      console.log('\n⚠️  Warning: HTML still contains placeholder comment, SSR may not be working');
    }
    
    return {
      passed: passedChecks,
      failed: failedChecks,
      total: Object.keys(checks).length
    };
    
  } catch (error) {
    console.error('Error testing SSR:', error);
    return { passed: 0, failed: 0, total: 0 };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSSR().then(results => {
  console.log('\nTest completed.');
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});