#!/usr/bin/env tsx

/**
 * Configuration Validation Script
 * Validates awesome-list.config.yaml without git operations
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface AwesomeListConfig {
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
    analytics_dashboard: boolean;
  };
  analytics?: {
    google_analytics?: string;
  };
}

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m'
  };
  const reset = '\x1b[0m';
  const prefix = level === 'success' ? '✅' : level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${colors[level]}${prefix} ${message}${reset}`);
}

function validateConfiguration(): void {
  console.log('🔍 Validating Configuration\n');
  
  // Check if config file exists
  if (!fs.existsSync('awesome-list.config.yaml')) {
    log('Configuration file not found: awesome-list.config.yaml', 'error');
    return;
  }
  
  try {
    // Parse YAML
    const configContent = fs.readFileSync('awesome-list.config.yaml', 'utf8');
    const config = yaml.load(configContent) as AwesomeListConfig;
    
    // Validate structure
    log('Configuration file loaded successfully', 'success');
    
    // Display current configuration
    console.log('📄 Site Configuration:');
    console.log(`   Title: ${config.site.title}`);
    console.log(`   Description: ${config.site.description}`);
    console.log(`   URL: ${config.site.url}`);
    console.log(`   Author: ${config.site.author}`);
    
    console.log('\n📊 Source Configuration:');
    console.log(`   URL: ${config.source.url}`);
    console.log(`   Format: ${config.source.format}`);
    console.log(`   Refresh Interval: ${config.source.refresh_interval} hours`);
    
    console.log('\n🎨 Theme Configuration:');
    console.log(`   Default: ${config.theme.default}`);
    console.log(`   Primary Color: ${config.theme.primary_color}`);
    
    console.log('\n🔧 Features:');
    console.log(`   Search: ${config.features.search ? 'Enabled' : 'Disabled'}`);
    console.log(`   Categories: ${config.features.categories ? 'Enabled' : 'Disabled'}`);
    console.log(`   Analytics Dashboard: ${config.features.analytics_dashboard ? 'Enabled' : 'Disabled'}`);
    console.log(`   AI Tags: ${config.features.ai_tags ? 'Enabled' : 'Disabled'}`);
    console.log(`   AI Descriptions: ${config.features.ai_descriptions ? 'Enabled' : 'Disabled'}`);
    console.log(`   AI Categories: ${config.features.ai_categories ? 'Enabled' : 'Disabled'}`);
    
    if (config.analytics?.google_analytics) {
      console.log('\n📈 Analytics:');
      console.log(`   Google Analytics: ${config.analytics.google_analytics}`);
    }
    
    // Validation checks
    console.log('\n✅ Validation Results:');
    
    // Check required fields
    if (!config.site.title) log('Missing site title', 'warn');
    if (!config.site.url) log('Missing site URL', 'warn');
    if (!config.source.url) log('Missing source URL', 'error');
    if (!config.source.format) log('Missing source format', 'error');
    
    // Check URL format
    try {
      new URL(config.source.url);
      log('Source URL format is valid', 'success');
    } catch {
      log('Invalid source URL format', 'error');
    }
    
    // Check GitHub raw URL
    if (config.source.url.includes('github.com') && !config.source.url.includes('raw.githubusercontent.com')) {
      log('URL should point to raw content, not GitHub UI', 'warn');
    }
    
    // Check AI features
    const aiFeatures = config.features.ai_tags || config.features.ai_descriptions || config.features.ai_categories;
    if (aiFeatures) {
      log('AI features enabled - requires ANTHROPIC_API_KEY environment variable', 'info');
      if (!process.env.ANTHROPIC_API_KEY) {
        log('ANTHROPIC_API_KEY not found in environment', 'warn');
      } else {
        log('ANTHROPIC_API_KEY found in environment', 'success');
      }
    }
    
    log('Configuration validation completed', 'success');
    
  } catch (error) {
    log(`Configuration parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

validateConfiguration();