#!/usr/bin/env tsx
/**
 * Simplified deployment script that creates a basic static site
 * without complex bundling that causes timeouts
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import { fetchAwesomeVideoList } from '../server/awesome-video-parser';

async function createSimpleDeployment() {
  console.log('🚀 Creating simplified deployment...');
  
  try {
    // Create output directory
    const outputDir = join(process.cwd(), 'dist', 'public');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Fetch and generate static data
    console.log('📡 Fetching awesome-video data...');
    const awesomeListData = await fetchAwesomeVideoList();
    
    // Create data directory
    const dataDir = join(outputDir, 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    // Write static data
    writeFileSync(
      join(dataDir, 'awesome-list.json'),
      JSON.stringify(awesomeListData, null, 2)
    );

    // Create sitemap
    const sitemapData = {
      lastBuild: new Date().toISOString(),
      totalResources: awesomeListData.resources.length,
      categories: [...new Set(awesomeListData.resources.map(r => r.category))],
      urls: ['/']
    };
    
    writeFileSync(
      join(dataDir, 'sitemap.json'),
      JSON.stringify(sitemapData, null, 2)
    );

    // Create a simple HTML page
    const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Awesome Video Dashboard</title>
    <meta name="description" content="A curated collection of awesome video resources, tools, and technologies for developers and content creators">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            background: #0a0a0a; 
            color: #ffffff; 
            line-height: 1.6; 
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header { 
            background: #1a1a1a; 
            padding: 2rem; 
            border-bottom: 1px solid #333; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 0 1rem; 
        }
        h1 { 
            color: #ef4444; 
            font-size: 2.5rem; 
            margin-bottom: 0.5rem; 
        }
        .subtitle { 
            color: #888; 
            font-size: 1.1rem; 
        }
        .main { 
            flex: 1; 
            padding: 2rem; 
        }
        .stats { 
            background: #1a1a1a; 
            padding: 1.5rem; 
            border-radius: 8px; 
            margin-bottom: 2rem; 
            border: 1px solid #333;
        }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 1rem; 
            margin-top: 2rem; 
        }
        .card { 
            background: #1a1a1a; 
            padding: 1.5rem; 
            border-radius: 8px; 
            border: 1px solid #333; 
        }
        .loading { 
            text-align: center; 
            padding: 3rem; 
            color: #888; 
        }
        .error { 
            background: #fee; 
            color: #c53030; 
            padding: 1rem; 
            border-radius: 4px; 
            margin: 1rem 0; 
        }
        .resource { 
            margin-bottom: 1rem; 
            padding-bottom: 1rem; 
            border-bottom: 1px solid #333; 
        }
        .resource:last-child { 
            border-bottom: none; 
            margin-bottom: 0; 
        }
        .resource-title { 
            color: #ef4444; 
            font-weight: 600; 
            margin-bottom: 0.5rem; 
        }
        .resource-description { 
            color: #ccc; 
            font-size: 0.9rem; 
        }
        .category { 
            background: #ef4444; 
            color: white; 
            padding: 0.25rem 0.5rem; 
            border-radius: 4px; 
            font-size: 0.8rem; 
            display: inline-block; 
            margin-top: 0.5rem; 
        }
    </style>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${process.env.VITE_GA_MEASUREMENT_ID || 'G-383541848'}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${process.env.VITE_GA_MEASUREMENT_ID || 'G-383541848'}');
    </script>
</head>
<body>
    <header class="header">
        <div class="container">
            <h1>Awesome Video Dashboard</h1>
            <p class="subtitle">A curated collection of awesome video resources, tools, and technologies</p>
        </div>
    </header>
    
    <main class="main">
        <div class="container">
            <div class="stats">
                <h2>Loading awesome video resources...</h2>
                <p>Fetching ${awesomeListData.resources.length} curated video tools and technologies</p>
            </div>
            
            <div id="content" class="loading">
                <p>Loading resources from awesome-video...</p>
            </div>
        </div>
    </main>

    <script>
        // Embedded data for reliability on GitHub Pages
        const embeddedData = ${JSON.stringify(awesomeListData)};
        
        // Function to render data
        function renderData(data) {
            console.log('Rendering data with', data.resources?.length, 'resources');
            const content = document.getElementById('content');
            const categories = {};
            
            // Group by category
            data.resources.forEach(resource => {
                if (!categories[resource.category]) {
                    categories[resource.category] = [];
                }
                categories[resource.category].push(resource);
            });
            
            // Render categories
            content.innerHTML = Object.entries(categories)
                .map(([category, resources]) => \`
                    <div class="card">
                        <h3>\${category} (\${resources.length} resources)</h3>
                        <div class="resources">
                            \${resources.slice(0, 10).map(resource => \`
                                <div class="resource">
                                    <div class="resource-title">
                                        <a href="\${resource.url}" target="_blank" style="color: #ef4444; text-decoration: none;">
                                            \${resource.title}
                                        </a>
                                    </div>
                                    <div class="resource-description">\${resource.description}</div>
                                    <span class="category">\${resource.category}</span>
                                </div>
                            \`).join('')}
                            \${resources.length > 10 ? \`<p style="color: #888; font-style: italic;">... and \${resources.length - 10} more resources</p>\` : ''}
                        </div>
                    </div>
                \`).join('');
            
            // Track page view
            gtag('event', 'page_view', {
                page_title: 'Awesome Video Dashboard',
                page_location: window.location.href
            });
        }
        
        // Use embedded data immediately
        try {
            renderData(embeddedData);
        } catch (error) {
            console.error('Error rendering embedded data:', error);
            document.getElementById('content').innerHTML = \`
                <div class="error">
                    <h3>Error loading resources</h3>
                    <p>Failed to render awesome-video data: \${error.message}</p>
                </div>
            \`;
        }
    </script>
</body>
</html>`;

    writeFileSync(join(outputDir, 'index.html'), htmlContent);

    console.log(`✅ Simple deployment created successfully!`);
    console.log(`📊 Generated site with ${awesomeListData.resources.length} resources`);
    console.log(`📁 Output directory: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

createSimpleDeployment();