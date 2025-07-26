#!/usr/bin/env tsx
/**
 * Fallback build script when Vite build times out
 * Creates a minimal static build using pre-generated data
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, copyFileSync } from 'fs';
import { join } from 'path';

async function buildReactFallback() {
  console.log('🔄 Starting fallback build process...');
  
  try {
    // Ensure dist/public directory exists
    const distDir = join(process.cwd(), 'dist', 'public');
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    // Copy static data files
    const dataDir = join(distDir, 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const sourceDataDir = join(process.cwd(), 'client', 'public', 'data');
    if (existsSync(join(sourceDataDir, 'awesome-list.json'))) {
      copyFileSync(
        join(sourceDataDir, 'awesome-list.json'),
        join(dataDir, 'awesome-list.json')
      );
      console.log('✅ Copied awesome-list.json');
    }

    if (existsSync(join(sourceDataDir, 'sitemap.json'))) {
      copyFileSync(
        join(sourceDataDir, 'sitemap.json'),
        join(dataDir, 'sitemap.json')
      );
      console.log('✅ Copied sitemap.json');
    }

    // Create a minimal index.html that loads the data
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Awesome Video</title>
  <meta name="description" content="A curated collection of awesome video resources and tools">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; }
    .loading { text-align: center; margin: 50px 0; }
    .resource { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px; }
    .resource h3 { margin: 0 0 10px 0; }
    .resource a { color: #0066cc; text-decoration: none; }
    .category { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">
      <h1>Awesome Video</h1>
      <p>Loading video resources...</p>
    </div>
  </div>
  <script>
    fetch('/data/awesome-list.json')
      .then(response => response.json())
      .then(data => {
        const root = document.getElementById('root');
        root.innerHTML = \`
          <h1>Awesome Video</h1>
          <p>A curated collection of \${data.resources.length} video resources and tools</p>
          <div id="resources"></div>
        \`;
        
        const resourcesContainer = document.getElementById('resources');
        data.resources.slice(0, 100).forEach(resource => {
          const div = document.createElement('div');
          div.className = 'resource';
          div.innerHTML = \`
            <h3><a href="\${resource.url}" target="_blank">\${resource.title}</a></h3>
            <p>\${resource.description || 'No description available'}</p>
            <span class="category">\${resource.category}</span>
          \`;
          resourcesContainer.appendChild(div);
        });
      })
      .catch(error => {
        document.getElementById('root').innerHTML = '<h1>Error loading resources</h1>';
        console.error('Error:', error);
      });
  </script>
</body>
</html>`;

    writeFileSync(join(distDir, 'index.html'), indexHtml);
    console.log('✅ Created fallback index.html');
    
    console.log('🎉 Fallback build completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during fallback build:', error);
    process.exit(1);
  }
}

buildReactFallback();