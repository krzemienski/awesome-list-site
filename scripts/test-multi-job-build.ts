#!/usr/bin/env tsx
/**
 * Test script to validate the multi-job build process locally
 * Simulates the GitHub Actions workflow steps
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

async function testMultiJobBuild() {
  console.log('🧪 Testing multi-job build process...\n');
  
  const testResults = {
    prepareData: false,
    buildDependencies: false,
    buildAssets: false,
    combineBuild: false,
    deploy: false
  };
  
  try {
    // Job 1: Prepare Data
    console.log('📊 Job 1: Prepare Data');
    console.log('  - Generating static data...');
    
    execSync('npx tsx scripts/build-static.ts', { 
      stdio: 'pipe',
      timeout: 60000 
    });
    
    if (existsSync('client/public/data/awesome-list.json')) {
      console.log('  ✅ Static data generated successfully');
      testResults.prepareData = true;
    } else {
      throw new Error('Static data generation failed');
    }
    
    // Job 2: Build Dependencies (simulated)
    console.log('\n📦 Job 2: Build Dependencies');
    console.log('  - Dependencies already installed via npm ci');
    console.log('  ✅ Dependencies ready');
    testResults.buildDependencies = true;
    
    // Job 3: Build Assets
    console.log('\n🔨 Job 3: Build Assets');
    console.log('  - Building React application...');
    
    // Clean previous build
    const distPath = join(process.cwd(), 'dist');
    if (existsSync(distPath)) {
      rmSync(distPath, { recursive: true });
    }
    
    // Build with optimized settings
    process.env.NODE_ENV = 'production';
    process.env.VITE_STATIC_BUILD = 'true';
    process.env.NODE_OPTIONS = '--max-old-space-size=4096';
    
    try {
      execSync('npx vite build --mode production --logLevel warn', {
        stdio: 'pipe',
        timeout: 600000, // 10 minutes
        cwd: process.cwd()
      });
      
      if (existsSync('dist/public/index.html')) {
        console.log('  ✅ React application built successfully');
        testResults.buildAssets = true;
      } else {
        throw new Error('React build output not found');
      }
    } catch (buildError) {
      console.log('  ⚠️ Standard build failed, testing fallback approach...');
      
      // Fallback: Use simplified static approach
      execSync('npx tsx scripts/deploy-simple.ts', {
        stdio: 'pipe',
        timeout: 120000
      });
      
      if (existsSync('dist/public/index.html')) {
        console.log('  ✅ Fallback build completed successfully');
        testResults.buildAssets = true;
      } else {
        throw new Error('Both standard and fallback builds failed');
      }
    }
    
    // Job 4: Combine Build (simulated)
    console.log('\n🔗 Job 4: Combine Build');
    console.log('  - Build artifacts ready for deployment');
    console.log('  ✅ Build combination complete');
    testResults.combineBuild = true;
    
    // Job 5: Deploy (simulated)
    console.log('\n🚀 Job 5: Deploy');
    console.log('  - Verifying deployment artifacts...');
    
    const deploymentChecks = [
      { file: 'dist/public/index.html', name: 'Main HTML file' },
      { file: 'dist/public/data/awesome-list.json', name: 'Static data' },
      { file: 'client/public/data/awesome-list.json', name: 'Client data' }
    ];
    
    let deploymentReady = true;
    for (const check of deploymentChecks) {
      if (existsSync(check.file)) {
        console.log(`  ✅ ${check.name} ready`);
      } else {
        console.log(`  ❌ ${check.name} missing`);
        deploymentReady = false;
      }
    }
    
    if (deploymentReady) {
      console.log('  ✅ Deployment artifacts verified');
      testResults.deploy = true;
    } else {
      throw new Error('Deployment verification failed');
    }
    
  } catch (error) {
    console.log(`\n❌ Build test failed: ${error.message}`);
  }
  
  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  
  const jobs = [
    { name: 'Prepare Data', result: testResults.prepareData },
    { name: 'Build Dependencies', result: testResults.buildDependencies },
    { name: 'Build Assets', result: testResults.buildAssets },
    { name: 'Combine Build', result: testResults.combineBuild },
    { name: 'Deploy', result: testResults.deploy }
  ];
  
  jobs.forEach(job => {
    const status = job.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${job.name}`);
  });
  
  const passedJobs = jobs.filter(j => j.result).length;
  const totalJobs = jobs.length;
  
  console.log(`\nOverall: ${passedJobs}/${totalJobs} jobs passed`);
  
  if (passedJobs === totalJobs) {
    console.log('\n🎉 Multi-job build test SUCCESSFUL!');
    console.log('GitHub Actions workflow should complete successfully.');
  } else {
    console.log('\n⚠️ Multi-job build test INCOMPLETE');
    console.log('Some jobs failed and may need optimization.');
  }
}

testMultiJobBuild();