#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

/**
 * Static Site Generation Script for GitHub Pages
 * Pre-generates data and prepares for static deployment
 */

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

interface Resource {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
}

interface AwesomeListData {
  title: string;
  description: string;
  repoUrl: string;
  resources: Resource[];
}

function log(message: string, level: 'info' | 'success' | 'error' = 'info'): void {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m'    // red
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}${message}${reset}`);
}

async function fetchAwesomeVideoData(): Promise<AwesomeVideoData> {
  const sourceUrl = 'https://raw.githubusercontent.com/krzemienski/awesome-video/master/contents.json';
  
  log('Fetching awesome-video data from JSON source');
  log(`Fetching from: ${sourceUrl}`);
  
  try {
    const response = await fetch(sourceUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as AwesomeVideoData;
    log(`✅ JSON data fetched successfully`);
    log(`✅ Parsed ${data.projects.length} video resources`);
    
    return data;
  } catch (error) {
    log(`❌ Error fetching JSON data: ${error.message}`, 'error');
    throw error;
  }
}

function transformDataForStatic(rawData: AwesomeVideoData): AwesomeListData {
  const resources: Resource[] = [];
  let resourceId = 1;

  // Transform each project into our resource format
  rawData.projects.forEach((project: AwesomeVideoProject) => {
    const resource: Resource = {
      id: resourceId++,
      title: project.title || 'Untitled',
      url: project.homepage || '',
      description: project.description || 'No description available',
      category: project.category?.[0] || 'Uncategorized',
      subcategory: project.category?.[1] || undefined,
      tags: project.tags || []
    };

    resources.push(resource);
  });

  log(`✅ Transformed ${resources.length} resources`);

  return {
    title: 'Awesome Video',
    description: 'A curated list of awesome video tools, frameworks and libraries',
    repoUrl: 'https://github.com/krzemienski/awesome-video',
    resources
  };
}

async function createStaticDataFiles(data: AwesomeListData): Promise<void> {
  // Ensure client/public/data directory exists
  const dataDir = path.join('client', 'public', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Write the transformed data to JSON file
  const dataPath = path.join(dataDir, 'awesome-list.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  log(`✅ Created static data file: ${dataPath}`);
  log(`   - ${data.resources.length} resources`);
  log(`   - ${new Set(data.resources.map(r => r.category)).size} categories`);
}

async function updateViteConfigForGitHubPages(): Promise<void> {
  const viteConfigPath = 'vite.config.ts';
  let viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  
  // Add base path for GitHub Pages if not already present
  if (!viteConfig.includes('base:') && process.env.GITHUB_ACTIONS) {
    viteConfig = viteConfig.replace(
      'export default defineConfig({',
      `export default defineConfig({
  base: '/awesome-list-site/',`
    );
    
    fs.writeFileSync(viteConfigPath, viteConfig);
    log('✅ Updated vite.config.ts for GitHub Pages base path');
  }
}

async function main(): Promise<void> {
  try {
    log('🚀 Starting static site generation for GitHub Pages');
    
    // Fetch and transform data
    const rawData = await fetchAwesomeVideoData();
    const transformedData = transformDataForStatic(rawData);
    
    // Create static data files
    await createStaticDataFiles(transformedData);
    
    // Update Vite config for GitHub Pages deployment
    await updateViteConfigForGitHubPages();
    
    log('✅ Static site generation completed successfully', 'success');
    log(`📊 Generated ${transformedData.resources.length} resources for deployment`);
    
  } catch (error) {
    log(`❌ Static site generation failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();