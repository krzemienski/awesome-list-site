#!/usr/bin/env tsx

/**
 * Simplified Deployment Script
 * 
 * This script provides a reliable deployment process without complex git operations
 * that can fail in restricted environments.
 */

import { createInterface } from 'readline';
import { execSync } from 'child_process';
import * as fs from 'fs';
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
  analytics?: {
    google_analytics?: string;
  };
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function header(title: string): void {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 ${title}`);
  console.log('='.repeat(50));
}

async function loadConfiguration(): Promise<DeployConfig> {
  if (!fs.existsSync('awesome-list.config.yaml')) {
    throw new Error('Configuration file not found. Run: npx tsx scripts/setup-wizard.ts');
  }
  
  try {
    const configContent = fs.readFileSync('awesome-list.config.yaml', 'utf8');
    const config = yaml.load(configContent) as DeployConfig;
    return config;
  } catch (error) {
    throw new Error(`Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function showConfiguration(config: DeployConfig): Promise<boolean> {
  console.log('\n📋 Configuration Summary:');
  console.log(`  Site: ${config.site.title}`);
  console.log(`  URL: ${config.site.url}`);
  console.log(`  Source: ${config.source.url}`);
  console.log(`  Format: ${config.source.format}`);
  console.log(`  Theme: ${config.theme.default}`);
  
  if (config.features.ai_tags || config.features.ai_descriptions) {
    console.log(`  AI Features: Enabled`);
  }
  
  if (config.analytics?.google_analytics) {
    console.log(`  Analytics: ${config.analytics.google_analytics}`);
  }
  
  const answer = await prompt('\n❓ Deploy with this configuration? (y/n): ');
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function checkEnvironment(): Promise<void> {
  const envVars = [
    { name: 'ANTHROPIC_API_KEY', description: 'AI features' },
    { name: 'VITE_GA_MEASUREMENT_ID', description: 'Google Analytics' }
  ];
  
  console.log('\n🔧 Environment Variables:');
  
  for (const envVar of envVars) {
    const value = process.env[envVar.name];
    if (value) {
      log(`${envVar.name}: Found`, 'success');
    } else {
      log(`${envVar.name}: Missing (${envVar.description})`, 'warn');
    }
  }
  
  const hasAIFeatures = process.env.ANTHROPIC_API_KEY;
  if (!hasAIFeatures) {
    console.log(`
ℹ️ To enable AI features:
  export ANTHROPIC_API_KEY="sk-ant-your-key"
  
For GitHub deployment, add as repository secret.
    `);
  }
}

async function fetchData(): Promise<void> {
  log('Fetching awesome list data...');
  
  try {
    execSync('npx tsx scripts/build-static.ts', { stdio: 'inherit' });
    log('Data fetched successfully', 'success');
  } catch (error) {
    throw new Error('Failed to fetch data. Check your internet connection and source URL.');
  }
}

async function createTriggerForGitHub(): Promise<void> {
  log('Creating GitHub Actions trigger...');
  
  const triggerData = {
    timestamp: new Date().toISOString(),
    trigger: 'deployment-request',
    message: 'Deploy awesome list static site'
  };
  
  fs.writeFileSync('.deploy-trigger', JSON.stringify(triggerData, null, 2));
  
  try {
    execSync('git add .deploy-trigger', { stdio: 'pipe' });
    execSync('git commit -m "Trigger deployment"', { stdio: 'pipe' });
    
    const pushAnswer = await prompt('❓ Push trigger to GitHub? (y/n): ');
    if (pushAnswer.toLowerCase() === 'y' || pushAnswer.toLowerCase() === 'yes') {
      execSync('git push origin main', { stdio: 'inherit' });
      log('Trigger pushed to GitHub', 'success');
    } else {
      log('Trigger created locally but not pushed', 'info');
    }
  } catch (error) {
    log('Could not commit trigger file. Ensure git is properly configured.', 'warn');
    log('You can manually commit and push the .deploy-trigger file', 'info');
  }
}

async function main(): Promise<void> {
  try {
    header('Simple Deployment');
    
    // Step 1: Load configuration
    const config = await loadConfiguration();
    log('Configuration loaded', 'success');
    
    // Step 2: Show configuration and confirm
    const confirmed = await showConfiguration(config);
    if (!confirmed) {
      log('Deployment cancelled', 'info');
      return;
    }
    
    // Step 3: Check environment
    await checkEnvironment();
    
    // Step 4: Fetch data
    await fetchData();
    
    // Step 5: Create deployment trigger
    await createTriggerForGitHub();
    
    // Success
    log('Deployment initiated successfully!', 'success');
    console.log(`
🎉 Next Steps:
1. GitHub Actions will build and deploy your site
2. Enable GitHub Pages in repository settings if not already done
3. Your site will be available at: ${config.site.url}
4. Check the Actions tab for deployment progress
    `);
    
  } catch (error) {
    log(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    console.log(`
🔧 Troubleshooting:
- Ensure you're in the project root directory
- Run the setup wizard: npx tsx scripts/setup-wizard.ts
- Check your internet connection
- Verify the awesome list URL is accessible
    `);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}