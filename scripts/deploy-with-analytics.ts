#!/usr/bin/env tsx
/**
 * Complete Deployment Script with Google Analytics Integration
 * Builds static site with GA tracking and creates deployment files
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

interface AwesomeVideoProject {
  title: string;
  homepage: string;
  description?: string;
  category?: string[];
  tags?: string[];
}

interface AwesomeVideoData {
  projects: AwesomeVideoProject[];
}

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}${message}${reset}`);
}

function executeCommand(command: string, description: string): void {
  log(`⚡ ${description}...`);
  try {
    execSync(command, { stdio: 'pipe' });
    log(`✅ ${description} completed`);
  } catch (error) {
    log(`❌ ${description} failed: ${error}`, 'error');
    throw error;
  }
}

async function createEnvironmentFile(): Promise<void> {
  log('🔧 Creating deployment environment file...');
  
  const envContent = `# Deployment Environment Variables
VITE_GA_MEASUREMENT_ID=${process.env.VITE_GA_MEASUREMENT_ID || 'G-383541848'}
VITE_SITE_TITLE="Awesome Video"
VITE_SITE_DESCRIPTION="A curated list of awesome video tools, libraries, and resources"
VITE_SITE_URL="https://krzemienski.github.io/awesome-list-site"
VITE_DEFAULT_THEME="dark"
NODE_ENV=production
`;

  writeFileSync('.env.production', envContent);
  log('✅ Environment file created with Google Analytics integration');
}

async function fetchAwesomeVideoData(): Promise<void> {
  log('📡 Fetching awesome-video data...');
  
  // Ensure data directory exists
  const dataDir = join(process.cwd(), 'client/public/data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dataUrl = 'https://raw.githubusercontent.com/krzemienski/awesome-video/master/contents.json';
  const outputPath = join(dataDir, 'awesome-list.json');
  
  executeCommand(
    `curl -L "${dataUrl}" -o "${outputPath}"`,
    'Downloading awesome-video data'
  );
}

async function generateSitemap(): Promise<void> {
  log('🗺️ Generating sitemap...');
  
  const baseUrl = process.env.VITE_SITE_URL || 'https://krzemienski.github.io/awesome-list-site';
  const currentDate = new Date().toISOString();
  
  const sitemap: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/advanced`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7
    }
  ];

  // Load awesome-video data for category pages
  const dataPath = join(process.cwd(), 'client/public/data/awesome-list.json');
  
  if (existsSync(dataPath)) {
    try {
      const rawData = readFileSync(dataPath, 'utf-8');
      const data: AwesomeVideoData = JSON.parse(rawData);
      
      const categories = new Set<string>();
      
      data.projects.forEach(project => {
        if (project.category && Array.isArray(project.category)) {
          project.category.forEach(cat => {
            if (cat && cat.trim()) {
              categories.add(cat.toLowerCase().replace(/\s+/g, '-'));
            }
          });
        }
      });

      categories.forEach(category => {
        sitemap.push({
          url: `${baseUrl}/category/${category}`,
          lastModified: currentDate,
          changeFrequency: 'weekly',
          priority: 0.9
        });
      });

      log(`📊 Generated sitemap with ${sitemap.length} entries (${categories.size} categories)`);
      
    } catch (error) {
      log('⚠️ Could not process awesome-list data for sitemap', 'warn');
    }
  }

  // Write JSON sitemap
  const sitemapPath = join(process.cwd(), 'client/public/data/sitemap.json');
  writeFileSync(sitemapPath, JSON.stringify(sitemap, null, 2));
  
  // Write XML sitemap
  const xmlSitemap = generateXMLSitemap(sitemap);
  const xmlPath = join(process.cwd(), 'client/public/sitemap.xml');
  writeFileSync(xmlPath, xmlSitemap);
  
  log('✅ Sitemap files generated');
}

function generateXMLSitemap(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

async function buildStaticSite(): Promise<void> {
  log('🏗️ Building static React application...');
  
  // Load production environment
  executeCommand('cp .env.production .env', 'Setting production environment');
  
  // Build the client
  executeCommand('npx vite build', 'Building React application');
  
  log('✅ Static site build completed');
}

async function createDeploymentInstructions(): Promise<void> {
  log('📋 Creating deployment instructions...');
  
  const instructions = `# Deployment Instructions for Awesome Video Static Site

## Files Ready for Deployment

The following files have been generated and are ready for GitHub Pages deployment:

- \`client/dist/\` - Complete static site build
- \`client/public/sitemap.xml\` - SEO sitemap
- \`client/public/data/sitemap.json\` - Application sitemap
- \`client/public/data/awesome-list.json\` - Awesome video data
- \`.github/workflows/deploy-static.yml\` - GitHub Actions workflow

## Google Analytics Integration

✅ Google Analytics is configured with measurement ID: ${process.env.VITE_GA_MEASUREMENT_ID || 'Not set'}

## Next Steps

1. **Create deployment branch:**
   \`\`\`bash
   git checkout -b deployment
   git add .
   git commit -m "Add deployment configuration and static build"
   git push origin deployment
   \`\`\`

2. **Set up GitHub repository secrets:**
   - Go to your repository settings
   - Navigate to Secrets and variables > Actions
   - Add secret: \`VITE_GA_MEASUREMENT_ID\` with value: \`${process.env.VITE_GA_MEASUREMENT_ID || 'G-383541848'}\`

3. **Enable GitHub Pages:**
   - Go to repository Settings > Pages
   - Set source to "GitHub Actions"
   - The workflow will deploy automatically on pushes to main

4. **Manual deployment option:**
   - Copy contents of \`client/dist/\` to your \`gh-pages\` branch
   - Ensure \`awesome-list.json\` is in the \`data/\` directory

## Site Features

- 🔍 Full-text search across 2011+ video resources
- 📱 Responsive design with dark theme
- 📊 Google Analytics tracking
- 🏷️ Category-based navigation
- 🎯 SEO optimized with sitemaps
- ⚡ Fast static site performance

Your awesome-video site is ready for deployment!
`;

  writeFileSync('DEPLOYMENT-READY.md', instructions);
  log('✅ Deployment instructions created');
}

async function main(): Promise<void> {
  try {
    log('🚀 Starting deployment build process...', 'info');
    
    await createEnvironmentFile();
    await fetchAwesomeVideoData();
    await generateSitemap();
    await buildStaticSite();
    await createDeploymentInstructions();
    
    log('🎉 Deployment build completed successfully!', 'success');
    log('📖 Check DEPLOYMENT-READY.md for next steps', 'info');
    
  } catch (error) {
    log(`💥 Deployment build failed: ${error}`, 'error');
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as deployWithAnalytics };