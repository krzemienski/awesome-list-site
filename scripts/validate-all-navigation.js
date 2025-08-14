#!/usr/bin/env node

/**
 * Complete Navigation Validation - Tests ALL navigation paths
 * Fetches data dynamically from API and validates every single navigation item
 */

import fetch from 'node-fetch';
import { promises as fs } from 'fs';

const BASE_URL = 'http://localhost:5000';
const RESULTS_DIR = './test-screenshots';

class NavigationValidator {
  constructor() {
    this.allItems = [];
    this.results = {
      timestamp: new Date().toISOString(),
      tested: 0,
      passed: 0,
      failed: 0,
      issues: []
    };
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/&/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async fetchAllNavigationData() {
    console.log("📡 Fetching complete navigation structure from API...");
    
    try {
      const response = await fetch(`${BASE_URL}/api/awesome-list`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Fetched ${data.resources.length} total resources`);
      console.log(`📊 Processing ${data.categories.length} categories`);
      
      this.allItems = [];
      
      // Add home page
      this.allItems.push({
        type: 'home',
        path: '/',
        name: 'Home Page',
        expected: data.resources.length
      });
      
      // Process all categories from the API response (using correct field names)
      data.categories.forEach(category => {
        const categorySlug = category.slug; // Use existing slug
        
        // Add main category
        this.allItems.push({
          type: 'category',
          path: `/category/${categorySlug}`,
          name: category.name, // Use 'name' not 'title'
          expected: category.resources.length,
          slug: category.slug
        });
        
        // Process subcategories
        if (category.subcategories) {
          category.subcategories.forEach(subcategory => {
            const subcategorySlug = subcategory.slug; // Use existing slug
            
            this.allItems.push({
              type: 'subcategory', 
              path: `/subcategory/${subcategorySlug}`,
              name: subcategory.name,
              expected: subcategory.resources.length,
              parent: category.name,
              slug: subcategory.slug
            });
            
            // Process sub-subcategories
            if (subcategory.subSubcategories && subcategory.subSubcategories.length > 0) {
              subcategory.subSubcategories.forEach(subSubcategory => {
                const subSubSlug = subSubcategory.slug;
                
                this.allItems.push({
                  type: 'sub-subcategory',
                  path: `/sub-subcategory/${subSubSlug}`,  
                  name: subSubcategory.name,
                  expected: subSubcategory.resources.length,
                  parent: subcategory.name,
                  grandparent: category.name,
                  slug: subSubcategory.slug
                });
              });
            }
          });
        }
      });
      
      console.log(`🎯 Built complete navigation structure:`);
      console.log(`   📁 ${this.allItems.filter(i => i.type === 'category').length} categories`);
      console.log(`   📂 ${this.allItems.filter(i => i.type === 'subcategory').length} subcategories`);
      console.log(`   📄 ${this.allItems.filter(i => i.type === 'sub-subcategory').length} sub-subcategories`);
      console.log(`   🏠 1 home page`);
      console.log(`   📊 TOTAL: ${this.allItems.length} navigation items to test`);
      
      return this.allItems;
      
    } catch (error) {
      console.error(`❌ Failed to fetch navigation data: ${error.message}`);
      throw error;
    }
  }

  async testNavigationPath(item, index) {
    const testName = `[${index + 1}/${this.allItems.length}] ${item.name} (${item.type})`;
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      // Test HTTP accessibility
      const response = await fetch(`${BASE_URL}${item.path}`);
      const httpOk = response.ok;
      
      if (!httpOk) {
        this.results.issues.push({
          item: item.name,
          path: item.path,
          type: item.type,
          issue: `HTTP ${response.status}: ${response.statusText}`,
          severity: 'high'
        });
        console.log(`   ❌ HTTP ${response.status} - ${item.path}`);
        return false;
      }
      
      // For non-home pages, test API filtering
      if (item.type !== 'home') {
        let apiPath = `${BASE_URL}/api/awesome-list`;
        
        // Build API query based on item type
        if (item.type === 'category') {
          apiPath += `?category=${this.generateSlug(item.name)}`;
        } else if (item.type === 'subcategory') {
          apiPath += `?subcategory=${this.generateSlug(item.name)}`;
        } else if (item.type === 'sub-subcategory') {
          apiPath += `?subSubcategory=${this.generateSlug(item.name)}`;
        }
        
        const apiResponse = await fetch(apiPath);
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          const actualCount = apiData.resources.length;
          
          // Check resource count accuracy
          if (actualCount !== item.expected) {
            this.results.issues.push({
              item: item.name,
              path: item.path,
              type: item.type,
              issue: `Resource count mismatch: expected ${item.expected}, got ${actualCount}`,
              severity: actualCount === 0 ? 'high' : 'medium'
            });
            console.log(`   ⚠️  Resource count: expected ${item.expected}, got ${actualCount}`);
          } else {
            console.log(`   ✅ Resource count correct: ${actualCount}`);
          }
        } else {
          this.results.issues.push({
            item: item.name,
            path: item.path,
            type: item.type,
            issue: `API filtering failed: ${apiResponse.status}`,
            severity: 'high'
          });
        }
      }
      
      console.log(`   ✅ Navigation path working`);
      return true;
      
    } catch (error) {
      this.results.issues.push({
        item: item.name,
        path: item.path,
        type: item.type,
        issue: `Test error: ${error.message}`,
        severity: 'high'
      });
      console.log(`   ❌ Error: ${error.message}`);
      return false;
    }
  }

  async runCompleteValidation() {
    console.log("🚀 Starting Complete Navigation Validation");
    console.log("=" + "=".repeat(60));
    
    // Ensure results directory exists
    await fs.mkdir(RESULTS_DIR, { recursive: true }).catch(() => {});
    
    // Fetch all navigation data
    await this.fetchAllNavigationData();
    
    console.log("\n🧪 Testing all navigation paths...");
    console.log("-" + "-".repeat(60));
    
    // Test each navigation item
    for (let i = 0; i < this.allItems.length; i++) {
      const item = this.allItems[i];
      this.results.tested++;
      
      const success = await this.testNavigationPath(item, i);
      if (success) {
        this.results.passed++;
      } else {
        this.results.failed++;
      }
    }
    
    // Generate final report
    await this.generateReport();
  }

  async generateReport() {
    console.log("\n📊 COMPLETE NAVIGATION VALIDATION RESULTS");
    console.log("=" + "=".repeat(60));
    console.log(`📈 Total Tested: ${this.results.tested}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Success Rate: ${((this.results.passed / this.results.tested) * 100).toFixed(1)}%`);
    
    if (this.results.issues.length > 0) {
      console.log(`\n🚨 ISSUES FOUND (${this.results.issues.length}):`);
      console.log("-" + "-".repeat(60));
      
      // Group issues by severity
      const highPriority = this.results.issues.filter(i => i.severity === 'high');
      const mediumPriority = this.results.issues.filter(i => i.severity === 'medium');
      
      if (highPriority.length > 0) {
        console.log(`\n🔴 HIGH PRIORITY (${highPriority.length}):`);
        highPriority.forEach(issue => {
          console.log(`   • ${issue.item} (${issue.type}): ${issue.issue}`);
          console.log(`     Path: ${issue.path}`);
        });
      }
      
      if (mediumPriority.length > 0) {
        console.log(`\n🟡 MEDIUM PRIORITY (${mediumPriority.length}):`);
        mediumPriority.forEach(issue => {
          console.log(`   • ${issue.item}: ${issue.issue}`);
        });
      }
      
      // Critical navigation paths that must work
      const criticalPaths = ['AV1', 'HEVC', 'VP9', 'FFMPEG'];
      const criticalIssues = this.results.issues.filter(i => 
        criticalPaths.some(critical => i.item.includes(critical))
      );
      
      if (criticalIssues.length > 0) {
        console.log(`\n🚩 CRITICAL PATH FAILURES (${criticalIssues.length}):`);
        criticalIssues.forEach(issue => {
          console.log(`   🔥 ${issue.item}: ${issue.issue}`);
        });
      }
    } else {
      console.log("\n🎉 ALL NAVIGATION PATHS WORKING CORRECTLY!");
    }
    
    // Save detailed results
    const reportPath = `${RESULTS_DIR}/complete-navigation-validation.json`;
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${reportPath}`);
    
    return this.results;
  }
}

// Run the validation
const validator = new NavigationValidator();
validator.runCompleteValidation()
  .then(results => {
    if (results.failed > 0) {
      console.log(`\n❌ Validation completed with ${results.failed} failures`);
      process.exit(1);
    } else {
      console.log(`\n✅ All navigation paths validated successfully!`);
      process.exit(0);
    }
  })
  .catch(error => {
    console.error(`💥 Validation failed: ${error.message}`);
    process.exit(1);
  });