#!/usr/bin/env tsx

/**
 * Project Initialization Script
 * 
 * This script provides a complete project setup experience:
 * 1. Checks if project is already configured
 * 2. Runs setup wizard for new projects
 * 3. Validates configuration
 * 4. Runs initial data fetch
 * 5. Starts development server
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warn: '\x1b[33m'     // yellow
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
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 ${title}`);
  console.log('='.repeat(60));
}

function execCommand(command: string, description: string): void {
  try {
    log(`${description}...`);
    execSync(command, { stdio: 'inherit' });
    log(`${description} completed`, 'success');
  } catch (error) {
    log(`Failed: ${description}`, 'error');
    throw error;
  }
}

async function checkExistingConfiguration(): Promise<boolean> {
  if (fs.existsSync('awesome-list.config.yaml')) {
    log('Found existing configuration file', 'info');
    
    const answer = await prompt('Configuration already exists. Reconfigure? (y/n): ');
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }
  
  return true;
}

async function runSetupWizard(): Promise<void> {
  log('Starting configuration wizard...');
  execCommand('npx tsx scripts/setup-wizard.ts', 'Running setup wizard');
}

async function validateConfiguration(): Promise<void> {
  log('Validating configuration...');
  
  if (!fs.existsSync('awesome-list.config.yaml')) {
    throw new Error('Configuration file not found after wizard');
  }
  
  try {
    const configContent = fs.readFileSync('awesome-list.config.yaml', 'utf8');
    // Basic validation - ensure it's valid YAML
    require('js-yaml').load(configContent);
    log('Configuration file is valid', 'success');
  } catch (error) {
    throw new Error(`Invalid configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetchInitialData(): Promise<void> {
  log('Fetching initial data...');
  
  try {
    execCommand('npx tsx scripts/build-static.ts', 'Building static data');
  } catch (error) {
    log('Data fetch failed - this might be due to network issues or invalid URL', 'warn');
    log('You can retry later with: npm run build:static', 'info');
  }
}

async function offerDevelopmentStart(): Promise<void> {
  const answer = await prompt('\nStart development server now? (y/n): ');
  
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    log('Starting development server...', 'info');
    log('Server will be available at http://localhost:5000', 'info');
    log('Press Ctrl+C to stop the server', 'info');
    
    // Give user a moment to read the message
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      execSync('npm run dev', { stdio: 'inherit' });
    } catch (error) {
      log('Development server stopped', 'info');
    }
  } else {
    console.log(`
Next steps:
• Run 'npm run dev' to start development server
• Run 'npx tsx scripts/build-and-deploy.ts' to deploy
• Edit 'awesome-list.config.yaml' to customize settings
    `);
  }
}

async function main(): Promise<void> {
  try {
    header('Awesome List Project Initialization');
    
    console.log(`
Welcome! This script will help you set up your awesome list project.

We'll guide you through:
• Configuration setup (if needed)
• Data fetching and validation
• Development server startup
    `);
    
    // Step 1: Check for existing configuration
    const needsConfiguration = await checkExistingConfiguration();
    
    // Step 2: Run setup wizard if needed
    if (needsConfiguration) {
      await runSetupWizard();
    } else {
      log('Using existing configuration', 'info');
    }
    
    // Step 3: Validate configuration
    await validateConfiguration();
    
    // Step 4: Fetch initial data
    await fetchInitialData();
    
    // Step 5: Offer to start development server
    await offerDevelopmentStart();
    
  } catch (error) {
    log(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    console.log(`
Troubleshooting:
• Ensure you're in the project root directory
• Check your internet connection
• Verify the awesome list URL is accessible
• Run 'npm install' if dependencies are missing
    `);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}