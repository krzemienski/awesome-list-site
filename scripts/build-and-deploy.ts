#!/usr/bin/env tsx

/**
 * Local Build and Deploy Script
 * 
 * This script allows developers to:
 * 1. Build the React application locally
 * 2. Create a deployment branch with the built assets
 * 3. Push to GitHub for automatic Pages deployment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface BuildConfig {
  branchName: string;
  buildDir: string;
  publicDir: string;
  remoteUrl?: string;
}

const config: BuildConfig = {
  branchName: 'gh-pages-build',
  buildDir: 'dist',
  publicDir: 'dist/public',
};

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

function checkPrerequisites(): void {
  log('Checking prerequisites...');
  
  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch {
    throw new Error('Not in a git repository. Please run this script from the project root.');
  }
  
  // Check if we have uncommitted changes
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('You have uncommitted changes. Please commit or stash them first.', 'warn');
      throw new Error('Uncommitted changes detected');
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'Uncommitted changes detected') {
      throw new Error('Failed to check git status');
    }
    throw error;
  }
  
  log('Prerequisites check passed', 'success');
}

async function fetchAwesomeVideoData(): Promise<void> {
  log('Fetching awesome-video data...');
  execCommand('npx tsx scripts/build-static.ts', 'Building static data');
  log('Awesome-video data fetched', 'success');
}

async function buildReactApplication(): Promise<void> {
  log('Building React application...');
  
  // Set environment variables for production build
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    NODE_OPTIONS: '--max-old-space-size=8192',
    VITE_STATIC_BUILD: 'true',
    VITE_GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID || 'G-383541848',
    VITE_SITE_TITLE: 'Awesome Video Dashboard',
    VITE_SITE_DESCRIPTION: 'A curated collection of awesome video resources and tools',
    VITE_SITE_URL: 'https://krzemienski.github.io/awesome-list-site',
    VITE_DEFAULT_THEME: 'red'
  };
  
  try {
    execSync('npx vite build --mode production', { 
      env,
      stdio: 'inherit'
    });
    log('React application built successfully', 'success');
  } catch (error) {
    log('Vite build failed, this is expected locally due to dependencies', 'warn');
    log('The GitHub Actions workflow will handle the build process', 'info');
    throw error;
  }
}

function verifyBuild(): void {
  log('Verifying build output...');
  
  if (!fs.existsSync(config.publicDir)) {
    throw new Error(`Build directory not found: ${config.publicDir}`);
  }
  
  const indexPath = path.join(config.publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('index.html not found in build output');
  }
  
  log('Build verification passed', 'success');
}

function getCurrentBranch(): string {
  return execCommand('git branch --show-current', 'Getting current branch');
}

function createDeploymentBranch(): void {
  const currentBranch = getCurrentBranch();
  log(`Current branch: ${currentBranch}`);
  
  // Configure git for the deployment
  execCommand('git config user.email "action@github.com"', 'Configuring git email');
  execCommand('git config user.name "Local Build Script"', 'Configuring git name');
  
  // Create/switch to deployment branch
  try {
    execCommand(`git checkout -B ${config.branchName}`, `Creating deployment branch: ${config.branchName}`);
  } catch {
    execCommand(`git checkout ${config.branchName}`, `Switching to existing deployment branch: ${config.branchName}`);
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
  const builtFiles = fs.readdirSync(config.publicDir);
  for (const file of builtFiles) {
    const srcPath = path.join(config.publicDir, file);
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
  fs.rmSync(config.buildDir, { recursive: true, force: true });
  
  log('Deployment branch prepared', 'success');
}

function commitAndPush(): void {
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
  try {
    execCommand(`git push -f origin ${config.branchName}`, 'Pushing to remote');
    log(`Deployment branch pushed successfully`, 'success');
  } catch (error) {
    log('Failed to push to remote. Make sure you have push access to the repository.', 'error');
    throw error;
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

async function main(): Promise<void> {
  try {
    log('🚀 Starting local build and deploy process...');
    
    checkPrerequisites();
    await fetchAwesomeVideoData();
    
    try {
      await buildReactApplication();
      verifyBuild();
      createDeploymentBranch();
      commitAndPush();
      
      log('🎉 Build and deploy completed successfully!', 'success');
      log('The GitHub Actions workflow will automatically deploy from the gh-pages-build branch', 'info');
      
    } catch (buildError) {
      log('Local build failed - this is expected due to dependency complexity', 'warn');
      log('Creating deployment trigger for GitHub Actions...', 'info');
      
      // Create a simple trigger file to initiate GitHub Actions build
      const triggerContent = {
        timestamp: new Date().toISOString(),
        trigger: 'local-build-request',
        message: 'Triggered build from local script'
      };
      
      fs.writeFileSync('.build-trigger', JSON.stringify(triggerContent, null, 2));
      
      execCommand('git add .build-trigger', 'Adding build trigger');
      execCommand('git commit -m "Trigger GitHub Actions build"', 'Committing trigger');
      execCommand('git push origin main', 'Pushing trigger to main branch');
      
      log('Build trigger pushed to GitHub - Actions workflow will handle the build', 'success');
    }
    
  } catch (error) {
    log(`Build process failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    process.exit(1);
  } finally {
    switchBackToOriginalBranch();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}