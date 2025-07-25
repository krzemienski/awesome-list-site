#!/usr/bin/env tsx
/**
 * Direct deployment script that bypasses git operations
 * Uses GitHub API to create deployment files directly
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';
import * as yaml from 'js-yaml';

interface DeployConfig {
  site: {
    title: string;
    description: string;
    url: string;
    author: string;
  };
  source: {
    url: string;
    format: string;
    refresh_interval: number;
  };
  theme: {
    default: string;
    primary_color: string;
  };
  features: {
    ai_tags: boolean;
    ai_descriptions: boolean;
    ai_categories: boolean;
    search: boolean;
    categories: boolean;
  };
}

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warn: '\x1b[33m'     // yellow
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}${message}${reset}`);
}

async function loadConfig(): Promise<DeployConfig> {
  try {
    const configPath = join(process.cwd(), 'awesome-list.config.yaml');
    const configContent = readFileSync(configPath, 'utf8');
    return yaml.load(configContent) as DeployConfig;
  } catch (error) {
    log('Configuration file not found or invalid', 'error');
    throw new Error('Please run the setup wizard first: npm run wizard');
  }
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

async function fetchAwesomeVideoData(): Promise<AwesomeVideoData> {
  log('Fetching awesome-video data...', 'info');
  
  try {
    const response = await fetch('https://raw.githubusercontent.com/krzemienski/awesome-video/master/awesome-video.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
    
    const data = await response.json() as AwesomeVideoData;
    log(`Successfully fetched ${data.projects?.length || 0} resources`, 'success');
    return data;
  } catch (error) {
    log(`Failed to fetch awesome-video data: ${(error as Error).message}`, 'error');
    throw error;
  }
}

interface DeploymentResource {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
}

interface DeploymentData {
  title: string;
  description: string;
  repoUrl: string;
  resources: DeploymentResource[];
}

function transformDataForDeployment(rawData: AwesomeVideoData, config: DeployConfig): DeploymentData {
  const resources: DeploymentResource[] = [];
  let resourceId = 1;

  if (rawData.projects && Array.isArray(rawData.projects)) {
    rawData.projects.forEach((project: AwesomeVideoProject) => {
      if (project.title && project.homepage) {
        resources.push({
          id: resourceId++,
          title: project.title,
          url: project.homepage,
          description: project.description || '',
          category: project.category?.[0] || 'Uncategorized',
          subcategory: project.category?.[1] || undefined,
          tags: project.tags || []
        });
      }
    });
  }

  return {
    title: config.site.title,
    description: config.site.description,
    repoUrl: config.source.url,
    resources: resources
  };
}

async function createDeploymentFiles(data: DeploymentData, config: DeployConfig): Promise<void> {
  log('Creating deployment files...', 'info');

  // Ensure directories exist
  const publicDir = join(process.cwd(), 'client', 'public');
  const dataDir = join(publicDir, 'data');
  
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Write the main data file
  const dataPath = join(dataDir, 'awesome-list.json');
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  log(`Created: ${dataPath}`, 'success');

  // Create sitemap data
  const sitemapData = {
    lastUpdated: new Date().toISOString(),
    totalResources: data.resources.length,
    categories: [...new Set(data.resources.map((r: any) => r.category))],
    config: {
      title: config.site.title,
      description: config.site.description,
      url: config.site.url
    }
  };

  const sitemapPath = join(dataDir, 'sitemap.json');
  writeFileSync(sitemapPath, JSON.stringify(sitemapData, null, 2));
  log(`Created: ${sitemapPath}`, 'success');

  // Create deployment trigger
  const triggerPath = join(process.cwd(), '.build-trigger');
  writeFileSync(triggerPath, new Date().toISOString());
  log(`Created: ${triggerPath}`, 'success');

  log(`Deployment files ready with ${data.resources.length} resources`, 'success');
}

async function createGitHubDeploymentInstructions(): Promise<void> {
  const instructions = `
# GitHub Pages Deployment Instructions

Your deployment files are ready! Follow these steps to deploy:

## Option 1: Using GitHub Web Interface
1. Go to your repository: https://github.com/krzemienski/awesome-list-site
2. Upload the following files to the root directory:
   - \`.build-trigger\`
   - \`client/public/data/awesome-list.json\`
   - \`client/public/data/sitemap.json\`

## Option 2: Manual Git Commands
Run these commands in your terminal:

\`\`\`bash
git add .build-trigger client/public/data/
git commit -m "Deploy awesome-video static site with ${new Date().toLocaleDateString()}"
git push origin main
\`\`\`

## Verification
After pushing, check GitHub Actions at:
https://github.com/krzemienski/awesome-list-site/actions

Your site will be available at:
https://krzemienski.github.io/awesome-list-site

## Next Steps
- The GitHub Actions workflow will automatically build and deploy your site
- Changes typically take 5-10 minutes to appear on GitHub Pages
- Monitor the Actions tab for any deployment issues
`;

  writeFileSync('DEPLOYMENT-INSTRUCTIONS.md', instructions);
  log('Created: DEPLOYMENT-INSTRUCTIONS.md', 'success');
}

async function main(): Promise<void> {
  try {
    log('🚀 Starting Direct Deployment Process', 'info');
    console.log('=' .repeat(50));

    // Load configuration
    const config = await loadConfig();
    log(`Loaded configuration for: ${config.site.title}`, 'success');

    // Fetch data
    const rawData = await fetchAwesomeVideoData();
    
    // Transform data
    const deploymentData = transformDataForDeployment(rawData, config);
    
    // Create deployment files
    await createDeploymentFiles(deploymentData, config);
    
    // Create deployment instructions
    await createGitHubDeploymentInstructions();

    console.log('=' .repeat(50));
    log('✅ Deployment preparation complete!', 'success');
    log('📖 See DEPLOYMENT-INSTRUCTIONS.md for next steps', 'info');
    
  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();