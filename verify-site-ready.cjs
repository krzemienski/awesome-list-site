#!/usr/bin/env node

const http = require('http');

console.log('🔍 Checking if site is ready...');

const checkSite = () => {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Site is running on http://localhost:5000');
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Content length: ${data.length} bytes`);
        
        // Check for theme
        const themeMatch = data.match(/data-theme="([^"]+)"/);
        if (themeMatch) {
          console.log(`   Current theme: ${themeMatch[1]}`);
        }
        
        resolve(true);
      });
    }).on('error', (err) => {
      console.error('❌ Site is not accessible:', err.message);
      reject(false);
    });
  });
};

checkSite().catch(() => process.exit(1));