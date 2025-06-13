#!/usr/bin/env tsx

/**
 * Interactive Build and Deploy Script
 * 
 * This script provides an interactive deployment experience:
 * 1. Validates configuration and environment
 * 2. Confirms settings with user
 * 3. Builds the React application
 * 4. Creates deployment branch
 * 5. Handles all git operations
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import yaml from 'js-yaml';

interface BuildConfig {
  branchName: string;
  buildDir: string;
  publicDir: string;
  remoteUrl?: string;
}

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
    refresh_interval?: number;
  };
  theme: {
    default: string;
    primary_color: string;
  };
  features: {
    ai_tags?: boolean;
    ai_descriptions?: boolean;
    ai_categories?: boolean;
    search?: boolean;
    categories?: boolean;
    analytics_dashboard?: boolean;
  };
  analytics?: {
    google_analytics?: string;
  };
}

interface EnvironmentCheck {
  name: string;
  value?: string;
  required: boolean;
  description: string;
  status: 'found' | 'missing' | 'invalid';
}

const DEFAULT_CONFIG: BuildConfig = {
  branchName: 'gh-pages-build',
  buildDir: 'dist',
  publicDir: 'dist/public',
};

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

function section(title: string): void {
  console.log('\n' + '-'.repeat(40));
  console.log(`📋 ${title}`);
  console.log('-'.repeat(40));
}

function execCommand(command: string, description: string): string {
  try {
    log(`${description}...`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return result.trim();
  } catch (error) {
    log(`Failed: ${description}`, 'error');
    throw error;
  }
}

async function loadAwesomeListConfig(): Promise<AwesomeListConfig> {
  const configPath = 'awesome-list.config.yaml';
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent) as AwesomeListConfig;
    return config;
  } catch (error) {
    throw new Error(`Failed to parse configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function checkEnvironmentVariables(): Promise<EnvironmentCheck[]> {
  const checks: EnvironmentCheck[] = [
    {
      name: 'ANTHROPIC_API_KEY',
      value: process.env.ANTHROPIC_API_KEY,
      required: false,
      description: 'AI-powered tagging and categorization',
      status: 'missing'
    },
    {
      name: 'VITE_GA_MEASUREMENT_ID',
      value: process.env.VITE_GA_MEASUREMENT_ID,
      required: false,
      description: 'Google Analytics tracking',
      status: 'missing'
    },
    {
      name: 'NODE_ENV',
      value: process.env.NODE_ENV,
      required: true,
      description: 'Node.js environment',
      status: 'missing'
    }
  ];
  
  for (const check of checks) {
    if (check.value) {
      if (check.name === 'ANTHROPIC_API_KEY' && !check.value.startsWith('sk-ant-')) {
        check.status = 'invalid';
      } else if (check.name === 'VITE_GA_MEASUREMENT_ID' && !check.value.startsWith('G-')) {
        check.status = 'invalid';
      } else {
        check.status = 'found';
      }
    } else {
      check.status = 'missing';
    }
  }
  
  return checks;
}

function validateAwesomeListUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'raw.githubusercontent.com' || 
           parsedUrl.hostname === 'github.com';
  } catch {
    return false;
  }
}

async function confirmConfiguration(config: AwesomeListConfig, buildConfig: BuildConfig): Promise<boolean> {
  section('Configuration Review');
  
  console.log(`📄 Site Title: ${config.site.title}`);
  console.log(`🌐 Site URL: ${config.site.url}`);
  console.log(`📝 Description: ${config.site.description}`);
  console.log(`👤 Author: ${config.site.author}`);
  console.log(`📊 Source URL: ${config.source.url}`);
  console.log(`📋 Format: ${config.source.format}`);
  console.log(`🎨 Theme: ${config.theme.default} (${config.theme.primary_color})`);
  console.log(`🌿 Deploy Branch: ${buildConfig.branchName}`);
  
  if (config.features.ai_tags || config.features.ai_descriptions) {
    console.log(`🤖 AI Features: Enabled (requires ANTHROPIC_API_KEY)`);
  }
  
  const answer = await prompt('\n❓ Continue with this configuration? (y/n): ');
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function checkPrerequisites(): Promise<void> {
  section('Prerequisites Check');
  
  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    log('Git repository detected', 'success');
  } catch {
    throw new Error('Not in a git repository. Please run this script from the project root.');
  }
  
  // Check if awesome-list.config.yaml exists
  if (!fs.existsSync('awesome-list.config.yaml')) {
    throw new Error('Configuration file awesome-list.config.yaml not found');
  }
  log('Configuration file found', 'success');
  
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found. Please run from project root.');
  }
  log('Package configuration found', 'success');
  
  // Check for uncommitted changes
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('Uncommitted changes detected:', 'warn');
      console.log(status);
      const answer = await prompt('❓ Continue anyway? (y/n): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        throw new Error('Deployment cancelled due to uncommitted changes');
      }
    } else {
      log('Working directory clean', 'success');
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'Deployment cancelled due to uncommitted changes') {
      throw new Error('Failed to check git status');
    }
    throw error;
  }
}

async function fetchAwesomeListData(): Promise<void> {
  section('Data Fetching');
  log('Fetching awesome list data...');
  execCommand('npx tsx scripts/build-static.ts', 'Building static data');
  log('Data fetched successfully', 'success');
}

async function buildReactApplication(config: AwesomeListConfig, buildConfig: BuildConfig): Promise<void> {
  section('Building React Application');
  
  // Set environment variables for production build
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    NODE_OPTIONS: '--max-old-space-size=8192',
    VITE_STATIC_BUILD: 'true',
    VITE_GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID || config.analytics?.google_analytics || '',
    VITE_SITE_TITLE: config.site.title,
    VITE_SITE_DESCRIPTION: config.site.description,
    VITE_SITE_URL: config.site.url,
    VITE_DEFAULT_THEME: config.theme.default,
    // AI features (optional - requires API key)
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ''
  };
  
  log('Starting React build (this may take several minutes)...');
  
  try {
    execSync('npx vite build --mode production', { 
      env,
      stdio: 'inherit'
    });
    log('React application built successfully', 'success');
  } catch (error) {
    log('Vite build failed - this is expected locally due to dependency complexity', 'warn');
    log('GitHub Actions will handle the build process with extended timeout', 'info');
    throw error;
  }
}

function verifyBuild(buildConfig: BuildConfig): void {
  log('Verifying build output...');
  
  if (!fs.existsSync(buildConfig.publicDir)) {
    throw new Error(`Build directory not found: ${buildConfig.publicDir}`);
  }
  
  const indexPath = path.join(buildConfig.publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('index.html not found in build output');
  }
  
  log('Build verification passed', 'success');
}

function getCurrentBranch(): string {
  return execCommand('git branch --show-current', 'Getting current branch');
}

async function createDeploymentBranch(buildConfig: BuildConfig): Promise<void> {
  section('Creating Deployment Branch');
  
  const currentBranch = getCurrentBranch();
  log(`Current branch: ${currentBranch}`);
  
  // Configure git for the deployment
  execCommand('git config user.email "deploy-script@local"', 'Configuring git email');
  execCommand('git config user.name "Deployment Script"', 'Configuring git name');
  
  // Create/switch to deployment branch
  try {
    execCommand(`git checkout -B ${buildConfig.branchName}`, `Creating deployment branch: ${buildConfig.branchName}`);
  } catch {
    execCommand(`git checkout ${buildConfig.branchName}`, `Switching to existing deployment branch: ${buildConfig.branchName}`);
  }
  
  // Remove everything except dist, .git, and specific files
  const keepFiles = ['.git', 'dist', '.gitignore', 'README.md'];
  const allFiles = fs.readdirSync('.');
  
  for (const file of allFiles) {
    if (!keepFiles.includes(file)) {
      try {
        if (fs.statSync(file).isDirectory()) {
          fs.rmSync(file, { recursive: true, force: true });
        } else {
          fs.unlinkSync(file);
        }
      } catch (error) {
        log(`Warning: Could not remove ${file}`, 'warn');
      }
    }
  }
  
  // Move built files to root
  const builtFiles = fs.readdirSync(buildConfig.publicDir);
  for (const file of builtFiles) {
    const srcPath = path.join(buildConfig.publicDir, file);
    const destPath = file;
    
    if (fs.existsSync(destPath)) {
      if (fs.statSync(destPath).isDirectory()) {
        fs.rmSync(destPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(destPath);
      }
    }
    
    fs.renameSync(srcPath, destPath);
  }
  
  // Clean up empty dist directory
  fs.rmSync(buildConfig.buildDir, { recursive: true, force: true });
  
  log('Deployment branch prepared', 'success');
}

async function commitAndPush(buildConfig: BuildConfig): Promise<void> {
  section('Committing and Pushing');
  
  // Stage all files
  execCommand('git add -A', 'Staging files');
  
  // Check if there are changes to commit
  try {
    execSync('git diff --staged --quiet', { stdio: 'pipe' });
    log('No changes to commit', 'info');
    return;
  } catch {
    // There are changes, proceed with commit
  }
  
  // Commit changes
  const timestamp = new Date().toISOString();
  const commitMessage = `Deploy built assets [${timestamp}]`;
  execCommand(`git commit -m "${commitMessage}"`, 'Committing changes');
  
  // Push to remote
  const answer = await prompt(`❓ Push to origin/${buildConfig.branchName}? (y/n): `);
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    try {
      execCommand(`git push -f origin ${buildConfig.branchName}`, 'Pushing to remote');
      log(`Deployment branch pushed successfully`, 'success');
    } catch (error) {
      log('Failed to push to remote. Make sure you have push access to the repository.', 'error');
      throw error;
    }
  } else {
    log('Push skipped by user', 'info');
  }
}

function switchBackToOriginalBranch(): void {
  try {
    execCommand('git checkout main', 'Switching back to main branch');
  } catch {
    try {
      execCommand('git checkout master', 'Switching back to master branch');
    } catch {
      log('Could not switch back to main/master branch', 'warn');
    }
  }
}

async function getBuildConfiguration(): Promise<BuildConfig> {
  section('Build Configuration');
  
  const defaultBranch = DEFAULT_CONFIG.branchName;
  const branchAnswer = await prompt(`🌿 Deploy branch name (default: ${defaultBranch}): `);
  const branchName = branchAnswer.trim() || defaultBranch;
  
  log(`Deploy branch set to: ${branchName}`, 'info');
  
  return {
    ...DEFAULT_CONFIG,
    branchName
  };
}

async function displayEnvironmentStatus(envChecks: EnvironmentCheck[]): Promise<void> {
  section('Environment Variables');
  
  for (const check of envChecks) {
    const statusIcon = check.status === 'found' ? '✅' : 
                      check.status === 'invalid' ? '❌' : '⚠️';
    const statusText = check.status === 'found' ? 'Found' :
                      check.status === 'invalid' ? 'Invalid' : 'Missing';
    
    console.log(`${statusIcon} ${check.name}: ${statusText}`);
    console.log(`   ${check.description}`);
    
    if (check.status === 'invalid') {
      console.log(`   Current value: ${check.value?.substring(0, 20)}...`);
    }
  }
  
  const missingRequired = envChecks.filter(c => c.required && c.status !== 'found');
  const invalidVars = envChecks.filter(c => c.status === 'invalid');
  
  if (missingRequired.length > 0 || invalidVars.length > 0) {
    log('Some environment variables need attention', 'warn');
    
    if (missingRequired.length > 0) {
      log('Missing required variables will use defaults', 'warn');
    }
    
    if (invalidVars.length > 0) {
      log('Invalid variables detected - please check format', 'error');
      const answer = await prompt('❓ Continue anyway? (y/n): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        throw new Error('Deployment cancelled due to invalid environment variables');
      }
    }
  }
}

async function createTriggerFile(): Promise<void> {
  section('Creating GitHub Actions Trigger');
  
  const triggerContent = {
    timestamp: new Date().toISOString(),
    trigger: 'local-deployment-request',
    message: 'Triggered build from interactive deployment script',
    user: process.env.USER || 'unknown'
  };
  
  fs.writeFileSync('.build-trigger', JSON.stringify(triggerContent, null, 2));
  
  execCommand('git add .build-trigger', 'Adding build trigger');
  execCommand('git commit -m "Trigger GitHub Actions build and deploy"', 'Committing trigger');
  
  const answer = await prompt('❓ Push trigger to main branch? (y/n): ');
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    execCommand('git push origin main', 'Pushing trigger to main branch');
    log('Build trigger pushed - GitHub Actions will handle the build', 'success');
  } else {
    log('Trigger created locally but not pushed', 'info');
  }
}

async function main(): Promise<void> {
  let buildConfig: BuildConfig;
  let config: AwesomeListConfig;
  
  try {
    header('Interactive Awesome List Deployment');
    
    // Step 1: Prerequisites check
    await checkPrerequisites();
    
    // Step 2: Load and validate configuration
    config = await loadAwesomeListConfig();
    buildConfig = await getBuildConfiguration();
    
    // Step 3: Environment variables check
    const envChecks = await checkEnvironmentVariables();
    await displayEnvironmentStatus(envChecks);
    
    // Step 4: Validate awesome list URL
    if (!validateAwesomeListUrl(config.source.url)) {
      log('Invalid awesome list URL format', 'warn');
      const answer = await prompt('❓ Continue anyway? (y/n): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        throw new Error('Deployment cancelled due to invalid URL');
      }
    }
    
    // Step 5: Configuration confirmation
    const confirmed = await confirmConfiguration(config, buildConfig);
    if (!confirmed) {
      log('Deployment cancelled by user', 'info');
      return;
    }
    
    // Step 6: Fetch data
    await fetchAwesomeListData();
    
    // Step 7: Attempt local build or create trigger
    try {
      await buildReactApplication(config, buildConfig);
      verifyBuild(buildConfig);
      await createDeploymentBranch(buildConfig);
      await commitAndPush(buildConfig);
      
      log('🎉 Local build and deploy completed successfully!', 'success');
      log(`Deployment branch ${buildConfig.branchName} is ready for GitHub Pages`, 'info');
      
    } catch (buildError) {
      log('Local build failed - using GitHub Actions fallback', 'warn');
      await createTriggerFile();
    }
    
  } catch (error) {
    log(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    process.exit(1);
  } finally {
    switchBackToOriginalBranch();
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}