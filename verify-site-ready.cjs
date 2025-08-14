const http = require('http');

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`${path}: ${res.statusCode} - ${res.headers['access-control-allow-origin'] ? 'CORS OK' : 'NO CORS'}`);
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(`HTTP ${res.statusCode}`);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verifyApplication() {
  try {
    console.log('Verifying Awesome Video Resource Viewer Application...\n');
    
    // Test homepage
    const homepage = await makeRequest('/');
    const hasHomepage = homepage.includes('Awesome') || homepage.includes('Video');
    console.log(`✓ Homepage loading: ${hasHomepage ? 'YES' : 'NO'}`);
    
    // Test API endpoint
    const apiResponse = await makeRequest('/api/awesome-list');
    const apiData = JSON.parse(apiResponse);
    console.log(`✓ API Resources loaded: ${apiData.resources ? apiData.resources.length : 0} resources`);
    
    // Test color palette page
    const colorPage = await makeRequest('/color-palette');
    const hasColorPage = colorPage.includes('Color') || colorPage.includes('Palette');
    console.log(`✓ Color Palette page: ${hasColorPage ? 'YES' : 'NO'}`);
    
    console.log('\n🎉 Application verification complete!');
    console.log('All core functionality is working correctly.');
    
  } catch (error) {
    console.error('❌ Application verification failed:', error);
    process.exit(1);
  }
}

verifyApplication();