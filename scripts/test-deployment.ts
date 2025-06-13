#!/usr/bin/env tsx
/**
 * Comprehensive deployment testing script
 * Tests the complete static build and deployment pipeline
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fetchAwesomeVideoList } from '../server/awesome-video-parser';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const tests: TestResult[] = [];

function test(name: string, testFn: () => boolean | Promise<boolean>, details?: string): void {
  tests.push({ name, passed: false, details });
}

function log(level: 'info' | 'success' | 'error' | 'warn', message: string): void {
  const prefix = {
    info: '🔍',
    success: '✅',
    error: '❌',
    warn: '⚠️'
  }[level];
  console.log(`${prefix} ${message}`);
}

async function runTests(): Promise<void> {
  log('info', 'Starting comprehensive deployment tests...');
  
  try {
    // Test 1: Data fetching
    log('info', 'Testing data fetching from awesome-video...');
    const data = await fetchAwesomeVideoList();
    
    if (data && data.resources && data.resources.length > 0) {
      tests.push({
        name: 'Data Fetching',
        passed: true,
        details: `Successfully fetched ${data.resources.length} resources`
      });
      log('success', `Data fetching: ${data.resources.length} resources`);
    } else {
      tests.push({
        name: 'Data Fetching',
        passed: false,
        error: 'No resources found in fetched data'
      });
      log('error', 'Data fetching failed - no resources');
    }

    // Test 2: Static site generation
    log('info', 'Testing static site generation...');
    const { execSync } = await import('child_process');
    
    try {
      execSync('tsx scripts/build-static.ts', { stdio: 'pipe' });
      tests.push({
        name: 'Static Site Generation',
        passed: true,
        details: 'build-static.ts completed successfully'
      });
      log('success', 'Static site generation completed');
    } catch (error) {
      tests.push({
        name: 'Static Site Generation',
        passed: false,
        error: error.message
      });
      log('error', `Static site generation failed: ${error.message}`);
    }

    // Test 3: Deployment build
    log('info', 'Testing deployment build...');
    try {
      execSync('tsx scripts/deploy-simple.ts', { stdio: 'pipe' });
      tests.push({
        name: 'Deployment Build',
        passed: true,
        details: 'deploy-simple.ts completed successfully'
      });
      log('success', 'Deployment build completed');
    } catch (error) {
      tests.push({
        name: 'Deployment Build',
        passed: false,
        error: error.message
      });
      log('error', `Deployment build failed: ${error.message}`);
    }

    // Test 4: Output file validation
    log('info', 'Testing output file validation...');
    const outputDir = join(process.cwd(), 'dist', 'public');
    const indexPath = join(outputDir, 'index.html');
    const dataPath = join(outputDir, 'data', 'awesome-list.json');
    const sitemapPath = join(outputDir, 'data', 'sitemap.json');

    const fileTests = [
      { path: indexPath, name: 'index.html' },
      { path: dataPath, name: 'awesome-list.json' },
      { path: sitemapPath, name: 'sitemap.json' }
    ];

    let allFilesExist = true;
    for (const { path, name } of fileTests) {
      if (existsSync(path)) {
        const stats = statSync(path);
        log('success', `${name}: ${(stats.size / 1024).toFixed(1)}KB`);
      } else {
        log('error', `Missing file: ${name}`);
        allFilesExist = false;
      }
    }

    tests.push({
      name: 'Output File Validation',
      passed: allFilesExist,
      details: allFilesExist ? 'All required files generated' : 'Some files missing'
    });

    // Test 5: Data integrity validation
    log('info', 'Testing data integrity...');
    if (existsSync(dataPath)) {
      try {
        const jsonData = JSON.parse(readFileSync(dataPath, 'utf-8'));
        const resourceCount = jsonData.resources?.length || 0;
        
        if (resourceCount > 2000) {
          tests.push({
            name: 'Data Integrity',
            passed: true,
            details: `${resourceCount} resources in JSON data`
          });
          log('success', `Data integrity: ${resourceCount} resources`);
        } else {
          tests.push({
            name: 'Data Integrity',
            passed: false,
            error: `Only ${resourceCount} resources found, expected >2000`
          });
          log('error', `Data integrity failed: only ${resourceCount} resources`);
        }
      } catch (error) {
        tests.push({
          name: 'Data Integrity',
          passed: false,
          error: `JSON parsing failed: ${error.message}`
        });
        log('error', `Data integrity failed: ${error.message}`);
      }
    } else {
      tests.push({
        name: 'Data Integrity',
        passed: false,
        error: 'JSON data file not found'
      });
      log('error', 'Data integrity failed: JSON file not found');
    }

    // Test 6: HTML validation
    log('info', 'Testing HTML structure...');
    if (existsSync(indexPath)) {
      const htmlContent = readFileSync(indexPath, 'utf-8');
      const hasTitle = htmlContent.includes('<title>Awesome Video Dashboard</title>');
      const hasGA = htmlContent.includes('gtag');
      const hasStyles = htmlContent.includes('background: #0a0a0a');
      
      if (hasTitle && hasGA && hasStyles) {
        tests.push({
          name: 'HTML Structure',
          passed: true,
          details: 'Title, GA tracking, and styles present'
        });
        log('success', 'HTML structure validation passed');
      } else {
        tests.push({
          name: 'HTML Structure',
          passed: false,
          error: `Missing elements - Title: ${hasTitle}, GA: ${hasGA}, Styles: ${hasStyles}`
        });
        log('error', 'HTML structure validation failed');
      }
    } else {
      tests.push({
        name: 'HTML Structure',
        passed: false,
        error: 'HTML file not found'
      });
      log('error', 'HTML structure failed: file not found');
    }

  } catch (error) {
    log('error', `Test execution failed: ${error.message}`);
  }

  // Summary
  log('info', 'Test Results Summary:');
  const passed = tests.filter(t => t.passed).length;
  const total = tests.length;
  
  tests.forEach(test => {
    if (test.passed) {
      log('success', `${test.name}: ${test.details || 'PASSED'}`);
    } else {
      log('error', `${test.name}: ${test.error || 'FAILED'}`);
    }
  });

  log('info', `Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    log('success', 'All deployment tests passed! Ready for GitHub Actions');
    process.exit(0);
  } else {
    log('error', 'Some tests failed. Check issues before deployment');
    process.exit(1);
  }
}

runTests();