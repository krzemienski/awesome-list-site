#!/usr/bin/env tsx
/**
 * Comprehensive deployment testing script
 * Tests the complete static build and deployment pipeline
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, testFn: () => boolean | Promise<boolean>, details?: string): void {
  try {
    const result = testFn();
    if (result instanceof Promise) {
      result.then(passed => {
        results.push({ name, passed, details });
      }).catch(error => {
        results.push({ name, passed: false, error: error.message });
      });
    } else {
      results.push({ name, passed: result, details });
    }
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

function log(level: 'info' | 'success' | 'error' | 'warn', message: string): void {
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warn: '⚠️'
  }[level];
  console.log(`${prefix} ${message}`);
}

async function runTests(): Promise<void> {
  log('info', 'Starting comprehensive deployment tests...');

  // Test 1: Check required files exist
  test('Required files exist', () => {
    const requiredFiles = [
      'scripts/build-static.ts',
      '.github/workflows/deploy.yml',
      'awesome-list.config.yaml',
      'client/src/lib/static-data.ts',
      'DEPLOYMENT.md',
      'FORK-SETUP.md'
    ];
    
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Missing required file: ${file}`);
      }
    }
    return true;
  }, 'All deployment infrastructure files present');

  // Test 2: Static data generation
  test('Static data generation', () => {
    try {
      execSync('tsx scripts/build-static.ts', { stdio: 'pipe' });
      
      const dataFile = 'client/public/data/awesome-list.json';
      const sitemapFile = 'client/public/data/sitemap.json';
      
      if (!existsSync(dataFile) || !existsSync(sitemapFile)) {
        return false;
      }
      
      const data = JSON.parse(readFileSync(dataFile, 'utf8'));
      const sitemap = JSON.parse(readFileSync(sitemapFile, 'utf8'));
      
      return data.resources?.length > 2000 && sitemap.totalResources > 2000;
    } catch {
      return false;
    }
  }, 'Successfully generates static data with 2000+ resources');

  // Test 3: Check static data structure
  test('Static data structure', () => {
    const dataFile = 'client/public/data/awesome-list.json';
    if (!existsSync(dataFile)) return false;
    
    const data = JSON.parse(readFileSync(dataFile, 'utf8'));
    
    const hasRequiredFields = (
      data.title &&
      data.description &&
      data.repoUrl &&
      Array.isArray(data.resources) &&
      data.resources.length > 0
    );
    
    if (!hasRequiredFields) return false;
    
    // Check resource structure
    const resource = data.resources[0];
    return (
      resource.id &&
      resource.title &&
      resource.url &&
      resource.description &&
      resource.category
    );
  }, 'Static data has correct structure and required fields');

  // Test 4: Configuration validation
  test('Configuration validation', () => {
    const configFile = 'awesome-list.config.yaml';
    if (!existsSync(configFile)) return false;
    
    const config = readFileSync(configFile, 'utf8');
    const requiredSections = ['site:', 'source:', 'analytics:', 'features:'];
    
    return requiredSections.every(section => config.includes(section));
  }, 'Configuration file has all required sections');

  // Test 5: GitHub Actions workflow validation
  test('GitHub Actions workflow', () => {
    const workflowFile = '.github/workflows/deploy.yml';
    if (!existsSync(workflowFile)) return false;
    
    const workflow = readFileSync(workflowFile, 'utf8');
    const requiredSteps = [
      'actions/checkout@v4',
      'actions/setup-node@v4',
      'tsx scripts/build-static.ts',
      'npm run build',
      'actions/deploy-pages@v4'
    ];
    
    return requiredSteps.every(step => workflow.includes(step));
  }, 'GitHub Actions workflow has all required steps');

  // Test 6: Environment variable handling
  test('Environment variables', () => {
    const workflowFile = '.github/workflows/deploy.yml';
    const workflow = readFileSync(workflowFile, 'utf8');
    
    const requiredEnvVars = [
      'VITE_STATIC_BUILD',
      'VITE_GA_MEASUREMENT_ID',
      'VITE_SITE_TITLE',
      'VITE_SITE_DESCRIPTION',
      'VITE_SITE_URL'
    ];
    
    return requiredEnvVars.every(envVar => workflow.includes(envVar));
  }, 'Workflow correctly sets environment variables');

  // Test 7: Static data loading mechanism
  test('Static data loading', () => {
    const staticDataFile = 'client/src/lib/static-data.ts';
    if (!existsSync(staticDataFile)) return false;
    
    const content = readFileSync(staticDataFile, 'utf8');
    return (
      content.includes('fetchStaticAwesomeList') &&
      content.includes('VITE_STATIC_BUILD') &&
      content.includes('/data/awesome-list.json')
    );
  }, 'Static data loading mechanism properly implemented');

  // Test 8: Documentation completeness
  test('Documentation', () => {
    const deployDoc = 'DEPLOYMENT.md';
    const forkDoc = 'FORK-SETUP.md';
    
    if (!existsSync(deployDoc) || !existsSync(forkDoc)) return false;
    
    const deployContent = readFileSync(deployDoc, 'utf8');
    const forkContent = readFileSync(forkDoc, 'utf8');
    
    const deploySections = [
      'Prerequisites',
      'Configuration',
      'GitHub Pages Setup',
      'Troubleshooting'
    ];
    
    const forkSections = [
      'Quick Fork Setup',
      'Configure for Your Awesome List',
      'Customization Options'
    ];
    
    const deployComplete = deploySections.every(section => deployContent.includes(section));
    const forkComplete = forkSections.every(section => forkContent.includes(section));
    
    return deployComplete && forkComplete;
  }, 'Complete documentation with all required sections');

  // Wait for any async tests to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Print results
  log('info', '\n=== Test Results ===');
  
  let passed = 0;
  let failed = 0;
  
  results.forEach(result => {
    if (result.passed) {
      log('success', `${result.name}${result.details ? ` - ${result.details}` : ''}`);
      passed++;
    } else {
      log('error', `${result.name}${result.error ? ` - ${result.error}` : ''}`);
      failed++;
    }
  });
  
  log('info', `\nTotal: ${results.length} tests`);
  log('success', `Passed: ${passed}`);
  if (failed > 0) {
    log('error', `Failed: ${failed}`);
  }
  
  if (failed === 0) {
    log('success', '\n🎉 All tests passed! Deployment system is ready.');
    log('info', 'Next steps:');
    log('info', '1. Set repository variables and secrets in GitHub');
    log('info', '2. Enable GitHub Pages in repository settings');
    log('info', '3. Push to main branch to trigger deployment');
  } else {
    log('error', '\n💥 Some tests failed. Please fix issues before deploying.');
    process.exit(1);
  }
}

runTests().catch(error => {
  log('error', `Test runner failed: ${error.message}`);
  process.exit(1);
});