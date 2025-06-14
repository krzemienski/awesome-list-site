#!/usr/bin/env tsx

/**
 * Working deployment script that bypasses git lock issues
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m'
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}${message}${reset}`);
}

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

function section(title: string): void {
  console.log(`\n${'='.repeat(40)}`);
  console.log(`📋 ${title}`);
  console.log(`${'='.repeat(40)}`);
}

async function loadConfig() {
  if (!fs.existsSync('awesome-list.config.yaml')) {
    throw new Error('Configuration file not found. Run setup wizard first.');
  }
  
  const yaml = await import('js-yaml');
  const configContent = fs.readFileSync('awesome-list.config.yaml', 'utf8');
  return yaml.load(configContent) as any;
}

async function checkEnvironment() {
  section('Environment Check');
  
  // Check Node.js
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  log(`Node.js: ${nodeVersion}`, 'success');
  
  // Check if dependencies exist
  if (!fs.existsSync('node_modules')) {
    log('Installing dependencies...', 'info');
    execSync('npm ci', { stdio: 'inherit' });
  }
  log('Dependencies verified', 'success');
}

async function fetchData() {
  section('Data Fetching');
  log('Fetching awesome-video data...', 'info');
  
  try {
    execSync('npx tsx scripts/build-static.ts', { stdio: 'inherit' });
    log('Data fetched successfully', 'success');
  } catch (error) {
    throw new Error('Failed to fetch awesome-video data');
  }
}

async function createDeploymentFiles() {
  section('Creating Deployment Files');
  
  // Create a deployment manifest
  const deployManifest = {
    timestamp: new Date().toISOString(),
    trigger: 'manual-deployment',
    status: 'ready-for-github-actions',
    data_updated: fs.existsSync('client/public/data/awesome-list.json'),
    next_steps: [
      'Commit changes to git',
      'Push to trigger GitHub Actions',
      'Monitor deployment at GitHub Pages'
    ]
  };
  
  fs.writeFileSync('.deployment-ready', JSON.stringify(deployManifest, null, 2));
  log('Deployment manifest created', 'success');
  
  // Create GitHub Actions trigger
  const triggerContent = {
    timestamp: new Date().toISOString(),
    action: 'build-and-deploy',
    source: 'interactive-script'
  };
  
  fs.writeFileSync('.build-trigger', JSON.stringify(triggerContent, null, 2));
  log('GitHub Actions trigger created', 'success');
}

async function showNextSteps(config: any) {
  section('Next Steps');
  
  log('✅ Data preparation complete', 'success');
  log('✅ Deployment files created', 'success');
  
  console.log('\n📋 Manual Git Operations Required:');
  console.log('   git add .');
  console.log('   git commit -m "Deploy awesome-video site"');
  console.log('   git push origin main');
  
  console.log('\n🔗 Deployment Details:');
  console.log(`   Site URL: ${config.site.url}`);
  console.log('   GitHub Actions will handle the build process');
  console.log('   Check the Actions tab in your GitHub repository');
  
  log('\nDeployment preparation completed successfully!', 'success');
}

async function main() {
  try {
    console.log('🚀 Simple Deployment Process\n');
    
    const config = await loadConfig();
    
    await checkEnvironment();
    await fetchData();
    await createDeploymentFiles();
    await showNextSteps(config);
    
  } catch (error) {
    log(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();