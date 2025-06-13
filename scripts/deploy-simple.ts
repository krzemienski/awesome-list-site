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

    // Create a sophisticated HTML page that matches our React interface
    const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Awesome Video Dashboard</title>
    <meta name="description" content="A curated collection of awesome video resources, tools, and technologies for developers and content creators">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        primary: {
                            DEFAULT: 'hsl(var(--primary))',
                            foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                            DEFAULT: 'hsl(var(--secondary))',
                            foreground: 'hsl(var(--secondary-foreground))'
                        },
                        destructive: {
                            DEFAULT: 'hsl(var(--destructive))',
                            foreground: 'hsl(var(--destructive-foreground))'
                        },
                        muted: {
                            DEFAULT: 'hsl(var(--muted))',
                            foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                            DEFAULT: 'hsl(var(--accent))',
                            foreground: 'hsl(var(--accent-foreground))'
                        },
                        popover: {
                            DEFAULT: 'hsl(var(--popover))',
                            foreground: 'hsl(var(--popover-foreground))'
                        },
                        card: {
                            DEFAULT: 'hsl(var(--card))',
                            foreground: 'hsl(var(--card-foreground))'
                        }
                    },
                    borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                    }
                }
            }
        }
    </script>
    <style>
        :root {
            --background: 0 0% 4%;
            --foreground: 0 0% 98%;
            --card: 0 0% 4%;
            --card-foreground: 0 0% 98%;
            --popover: 0 0% 4%;
            --popover-foreground: 0 0% 98%;
            --primary: 0 72% 51%;
            --primary-foreground: 0 86% 97%;
            --secondary: 0 0% 9%;
            --secondary-foreground: 0 0% 98%;
            --muted: 0 0% 9%;
            --muted-foreground: 0 0% 64%;
            --accent: 0 0% 9%;
            --accent-foreground: 0 0% 98%;
            --destructive: 0 63% 31%;
            --destructive-foreground: 0 86% 97%;
            --border: 0 0% 15%;
            --input: 0 0% 15%;
            --ring: 0 72% 51%;
            --radius: 0.5rem;
        }
        
        * {
            border-color: hsl(var(--border));
        }
        
        body {
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            font-feature-settings: "rlig" 1, "calt" 1;
        }
        
        .search-input {
            background-color: hsl(var(--background));
            border: 1px solid hsl(var(--border));
            color: hsl(var(--foreground));
        }
        
        .search-input:focus {
            outline: 2px solid transparent;
            outline-offset: 2px;
            box-shadow: 0 0 0 2px hsl(var(--ring));
        }
        
        .resource-card {
            background-color: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            color: hsl(var(--card-foreground));
            transition: all 0.2s ease-in-out;
        }
        
        .resource-card:hover {
            border-color: hsl(var(--ring));
            transform: translateY(-2px);
            box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        
        .btn-primary {
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            border: 1px solid hsl(var(--primary));
            transition: all 0.2s ease-in-out;
        }
        
        .btn-primary:hover {
            background-color: hsl(var(--primary) / 0.9);
        }
        
        .btn-secondary {
            background-color: hsl(var(--secondary));
            color: hsl(var(--secondary-foreground));
            border: 1px solid hsl(var(--border));
        }
        
        .btn-secondary:hover {
            background-color: hsl(var(--accent));
        }
        
        .badge {
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
        }
        
        .stats-card {
            background-color: hsl(var(--card));
            border: 1px solid hsl(var(--border));
        }
        
        .animate-in {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
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