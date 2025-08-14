#!/usr/bin/env node

/**
 * Complete 3-Level Navigation Test Runner
 * Executes comprehensive testing of all hierarchical navigation paths
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';
const RESULTS_DIR = './test-screenshots';
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'navigation-screenshots');

class ThreeLevelTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      timestamp: new Date().toISOString(),
      testsRun: [],
      passed: 0,
      failed: 0,
      critical: {
        av1: { tested: false, passed: false },
        hevc: { tested: false, passed: false },
        vp9: { tested: false, passed: false }
      }
    };
  }

  async init() {
    console.log("🚀 Starting Complete 3-Level Navigation Testing");
    console.log("=" + "=".repeat(50));
    
    // Ensure results directories exist
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
    
    // Check if server is running
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(BASE_URL);
      if (!response.ok) throw new Error('Server not accessible');
      console.log("✅ Server is running at", BASE_URL);
    } catch (error) {
      console.error("❌ Server is not running. Please start the application first:");
      console.error("   npm run dev");
      process.exit(1);
    }
  }

  async runComprehensiveTest() {
    console.log("\n🧪 Running Comprehensive Navigation Test...");
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('node', ['./scripts/comprehensive-navigation-test.js'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log("✅ Comprehensive navigation test completed successfully");
          this.results.testsRun.push('comprehensive-navigation');
          this.results.passed++;
          resolve();
        } else {
          console.error(`❌ Comprehensive navigation test failed with code ${code}`);
          this.results.failed++;
          reject(new Error(`Test failed with code ${code}`));
        }
      });
      
      testProcess.on('error', (error) => {
        console.error('❌ Failed to start comprehensive test:', error);
        reject(error);
      });
    });
  }

  async runVisualTest() {
    console.log("\n📸 Running Visual Navigation Test...");
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('node', ['./scripts/visual-navigation-testing.js'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log("✅ Visual navigation test completed successfully");
          this.results.testsRun.push('visual-navigation');
          this.results.passed++;
          resolve();
        } else {
          console.error(`❌ Visual navigation test failed with code ${code}`);
          this.results.failed++;
          reject(new Error(`Visual test failed with code ${code}`));
        }
      });
      
      testProcess.on('error', (error) => {
        console.error('❌ Failed to start visual test:', error);
        reject(error);
      });
    });
  }

  async verifyCriticalPaths() {
    console.log("\n🎯 Verifying Critical Test Cases: AV1, HEVC, VP9...");
    
    const criticalPaths = [
      { name: 'AV1', path: '/sub-subcategory/av1', key: 'av1' },
      { name: 'HEVC', path: '/sub-subcategory/hevc', key: 'hevc' },
      { name: 'VP9', path: '/sub-subcategory/vp9', key: 'vp9' }
    ];

    try {
      const fetch = (await import('node-fetch')).default;
      
      for (const critical of criticalPaths) {
        console.log(`  Testing ${critical.name} navigation...`);
        
        try {
          const response = await fetch(`${BASE_URL}${critical.path}`);
          this.results.critical[critical.key].tested = true;
          
          if (response.ok) {
            this.results.critical[critical.key].passed = true;
            console.log(`  ✅ ${critical.name}: Navigation successful`);
          } else {
            console.log(`  ❌ ${critical.name}: HTTP ${response.status}`);
          }
        } catch (error) {
          console.log(`  ❌ ${critical.name}: ${error.message}`);
        }
      }
      
      const criticalPassed = Object.values(this.results.critical).filter(c => c.passed).length;
      console.log(`\n🎯 Critical Test Results: ${criticalPassed}/3 passed`);
      
    } catch (error) {
      console.error('❌ Critical path verification failed:', error);
    }
  }

  async generateSummary() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    const criticalPassed = Object.values(this.results.critical).filter(c => c.passed).length;
    
    console.log("\n📋 3-LEVEL NAVIGATION TEST SUMMARY");
    console.log("=" + "=".repeat(40));
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`🧪 Tests run: ${this.results.testsRun.length}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`🎯 Critical paths: ${criticalPassed}/3`);
    
    if (criticalPassed === 3) {
      console.log("\n🎉 SUCCESS: All critical navigation paths working!");
      console.log("   ✅ AV1 sub-subcategory accessible");
      console.log("   ✅ HEVC sub-subcategory accessible");
      console.log("   ✅ VP9 sub-subcategory accessible");
    } else {
      console.log("\n⚠️  WARNING: Some critical paths failed");
      Object.entries(this.results.critical).forEach(([key, result]) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${key.toUpperCase()}: ${result.passed ? 'PASS' : 'FAIL'}`);
      });
    }

    // Save summary
    const summaryPath = path.join(RESULTS_DIR, '3-level-test-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Summary saved: ${summaryPath}`);
    
    return this.results.failed === 0 && criticalPassed === 3;
  }

  async run() {
    try {
      await this.init();
      
      // Run comprehensive tests
      await this.runComprehensiveTest().catch(console.error);
      
      // Run visual tests
      await this.runVisualTest().catch(console.error);
      
      // Verify critical paths
      await this.verifyCriticalPaths();
      
      // Generate summary
      const success = await this.generateSummary();
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error("💥 Test runner failed:", error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new ThreeLevelTestRunner();
  runner.run();
}

module.exports = ThreeLevelTestRunner;