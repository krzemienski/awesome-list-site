#!/usr/bin/env node

/**
 * Verify Sidebar Totals - Confirms sidebar navigation totals are mathematically consistent
 * For hierarchical data, parent totals should include ALL resources within their hierarchy
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

class SidebarTotalVerifier {
  constructor() {
    this.systemTotal = 0;
    this.navigationItems = [];
  }

  async fetchData() {
    console.log("📡 Fetching data for sidebar total verification...");
    
    const response = await fetch(`${BASE_URL}/api/awesome-list`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    this.systemTotal = data.resources.length;
    
    console.log(`✅ System total: ${this.systemTotal} resources`);
    
    return data;
  }

  analyzeSidebarTotals(data) {
    console.log("\n🔍 ANALYZING SIDEBAR NAVIGATION TOTALS");
    console.log("=" + "=".repeat(50));
    
    let totalNavigationItems = 0;
    let categoryTotals = 0;
    
    data.categories.forEach(category => {
      this.navigationItems.push({
        type: 'category',
        name: category.name,
        count: category.resources.length,
        level: 1
      });
      
      categoryTotals += category.resources.length;
      totalNavigationItems++;
      
      console.log(`📁 ${category.name}: ${category.resources.length} resources`);
      
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          this.navigationItems.push({
            type: 'subcategory',
            name: subcategory.name,
            count: subcategory.resources.length,
            level: 2,
            parent: category.name
          });
          
          totalNavigationItems++;
          console.log(`  📂 ${subcategory.name}: ${subcategory.resources.length} resources`);
          
          if (subcategory.subSubcategories) {
            subcategory.subSubcategories.forEach(subSubcategory => {
              this.navigationItems.push({
                type: 'sub-subcategory',
                name: subSubcategory.name,
                count: subSubcategory.resources.length,
                level: 3,
                parent: subcategory.name,
                grandparent: category.name
              });
              
              totalNavigationItems++;
              console.log(`    📄 ${subSubcategory.name}: ${subSubcategory.resources.length} resources`);
            });
          }
        });
      }
    });
    
    console.log(`\n📊 SIDEBAR NAVIGATION SUMMARY:`);
    console.log(`   🎯 System Total: ${this.systemTotal} resources`);
    console.log(`   📁 Category Sum: ${categoryTotals} resources`);
    console.log(`   📊 Navigation Items: ${totalNavigationItems} items`);
    console.log(`   📝 Breakdown: ${data.categories.length} categories, ${this.navigationItems.filter(i => i.type === 'subcategory').length} subcategories, ${this.navigationItems.filter(i => i.type === 'sub-subcategory').length} sub-subcategories`);
    
    return {
      isConsistent: categoryTotals === this.systemTotal,
      systemTotal: this.systemTotal,
      categorySum: categoryTotals,
      navigationItems: totalNavigationItems,
      categories: data.categories.length,
      subcategories: this.navigationItems.filter(i => i.type === 'subcategory').length,
      subSubcategories: this.navigationItems.filter(i => i.type === 'sub-subcategory').length
    };
  }

  validateCriticalPaths(data) {
    console.log("\n🎯 VALIDATING CRITICAL NAVIGATION PATHS");
    console.log("-" + "-".repeat(50));
    
    const criticalPaths = [
      { name: 'AV1', type: 'sub-subcategory', expectedCount: 6 },
      { name: 'HEVC', type: 'sub-subcategory', expectedCount: 10 },
      { name: 'VP9', type: 'sub-subcategory', expectedCount: 1 },
      { name: 'FFMPEG', type: 'sub-subcategory', expectedCount: 66 }
    ];
    
    let validPaths = 0;
    
    criticalPaths.forEach(path => {
      const found = this.navigationItems.find(item => 
        item.name === path.name && item.type === path.type
      );
      
      if (found) {
        const isValid = found.count === path.expectedCount;
        console.log(`${isValid ? '✅' : '❌'} ${path.name}: ${found.count} resources (expected ${path.expectedCount})`);
        if (isValid) validPaths++;
      } else {
        console.log(`❌ ${path.name}: Not found`);
      }
    });
    
    console.log(`\n📈 Critical Paths: ${validPaths}/${criticalPaths.length} validated`);
    
    return validPaths === criticalPaths.length;
  }

  generateReport(results, criticalPathsValid) {
    console.log("\n📋 SIDEBAR TOTALS VERIFICATION REPORT");
    console.log("=" + "=".repeat(60));
    
    if (results.isConsistent && criticalPathsValid) {
      console.log("✅ SIDEBAR TOTALS ARE MATHEMATICALLY CONSISTENT!");
      console.log(`✅ System total (${results.systemTotal}) matches category sum (${results.categorySum})`);
      console.log(`✅ Navigation displays ${results.navigationItems} items correctly`);
      console.log(`✅ All critical navigation paths verified`);
      console.log(`✅ Hierarchical structure: ${results.categories} → ${results.subcategories} → ${results.subSubcategories}`);
    } else {
      console.log("❌ SIDEBAR TOTAL INCONSISTENCIES DETECTED!");
      if (!results.isConsistent) {
        console.log(`❌ System total (${results.systemTotal}) ≠ Category sum (${results.categorySum})`);
      }
      if (!criticalPathsValid) {
        console.log(`❌ Critical navigation paths validation failed`);
      }
    }
    
    console.log(`\n📊 FINAL SUMMARY:`);
    console.log(`   🎯 Total Resources: ${results.systemTotal}`);
    console.log(`   📊 Navigation Items: ${results.navigationItems}`);
    console.log(`   📁 Categories: ${results.categories}`);
    console.log(`   📂 Subcategories: ${results.subcategories}`);
    console.log(`   📄 Sub-subcategories: ${results.subSubcategories}`);
    console.log(`   ✅ Mathematical Consistency: ${results.isConsistent ? 'PASS' : 'FAIL'}`);
    console.log(`   🎯 Critical Paths: ${criticalPathsValid ? 'PASS' : 'FAIL'}`);
    
    return results.isConsistent && criticalPathsValid;
  }

  async verify() {
    console.log("🚀 Starting Sidebar Totals Verification");
    
    try {
      const data = await this.fetchData();
      const results = this.analyzeSidebarTotals(data);
      const criticalPathsValid = this.validateCriticalPaths(data);
      const success = this.generateReport(results, criticalPathsValid);
      
      if (success) {
        console.log("\n✅ Verification PASSED - Sidebar totals are consistent");
        process.exit(0);
      } else {
        console.log("\n❌ Verification FAILED - Sidebar totals are inconsistent");
        process.exit(1);
      }
      
    } catch (error) {
      console.error(`💥 Verification failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the verification
const verifier = new SidebarTotalVerifier();
verifier.verify();