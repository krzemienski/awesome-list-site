#!/usr/bin/env tsx
/**
 * Static Site Generation Script for Awesome Dash Video
 * 
 * This script pre-generates the data needed for static site deployment
 * by fetching the awesome-video JSON data and creating static files.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fetchAwesomeVideoList } from '../server/awesome-video-parser';

async function buildStaticData() {
  console.log('🚀 Starting static site generation...');
  
  try {
    // Create dist directory if it doesn't exist
    const distDir = join(process.cwd(), 'dist');
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    // Fetch the awesome-video data
    console.log('📡 Fetching awesome-video data...');
    const awesomeListData = await fetchAwesomeVideoList();
    
    console.log(`✅ Successfully fetched ${awesomeListData.resources.length} resources`);
    
    // Write the data to a static JSON file that the frontend can consume
    const staticDataPath = join(process.cwd(), 'client', 'public', 'data', 'awesome-list.json');
    const dataDir = join(process.cwd(), 'client', 'public', 'data');
    
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    writeFileSync(staticDataPath, JSON.stringify(awesomeListData, null, 2));
    console.log(`📄 Static data written to: ${staticDataPath}`);
    
    // Generate sitemap data
    const sitemapData = {
      lastBuild: new Date().toISOString(),
      totalResources: awesomeListData.resources.length,
      categories: [...new Set(awesomeListData.resources.map(r => r.category))],
      urls: [
        '/',
        ...awesomeListData.resources.map(r => `/resource/${encodeURIComponent(r.id)}`)
      ]
    };
    
    const sitemapPath = join(process.cwd(), 'client', 'public', 'data', 'sitemap.json');
    writeFileSync(sitemapPath, JSON.stringify(sitemapData, null, 2));
    console.log(`🗺️  Sitemap data written to: ${sitemapPath}`);
    
    console.log('✨ Static site generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during static site generation:', error);
    process.exit(1);
  }
}

buildStaticData();