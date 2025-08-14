#!/usr/bin/env node

/**
 * Verify Hierarchical Consistency - Ensures parent totals equal sum of children
 * This is the correct way to validate hierarchical data structure
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

class HierarchicalVerifier {
  constructor() {
    this.issues = [];
    this.totalResources = 0;
  }

  async fetchData() {
    console.log("📡 Fetching hierarchical data for consistency verification...");
    
    const response = await fetch(`${BASE_URL}/api/awesome-list`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    this.totalResources = data.resources.length;
    
    console.log(`✅ Total resources in system: ${this.totalResources}`);
    
    return data;
  }

  verifyHierarchicalConsistency(data) {
    console.log("\n🔍 VERIFYING HIERARCHICAL CONSISTENCY");
    console.log("=" + "=".repeat(50));
    
    let totalCalculatedResources = 0;
    
    data.categories.forEach(category => {
      console.log(`\n📁 ${category.name}: ${category.resources.length} resources`);
      
      let categoryCalculatedTotal = 0;
      
      if (category.subcategories && category.subcategories.length > 0) {
        // Category has subcategories
        category.subcategories.forEach(subcategory => {
          console.log(`  📂 ${subcategory.name}: ${subcategory.resources.length} resources`);
          
          let subcategoryCalculatedTotal = 0;
          
          if (subcategory.subSubcategories && subcategory.subSubcategories.length > 0) {
            // Subcategory has sub-subcategories
            subcategory.subSubcategories.forEach(subSubcategory => {
              console.log(`    📄 ${subSubcategory.name}: ${subSubcategory.resources.length} resources`);
              subcategoryCalculatedTotal += subSubcategory.resources.length;
            });
            
            // Verify subcategory total matches sum of sub-subcategories
            if (subcategory.resources.length !== subcategoryCalculatedTotal) {
              this.issues.push({
                type: 'subcategory_mismatch',
                item: subcategory.name,
                expected: subcategoryCalculatedTotal,
                actual: subcategory.resources.length,
                parent: category.name
              });
              console.log(`    ⚠️  Mismatch: ${subcategory.name} shows ${subcategory.resources.length} but sub-subcategories sum to ${subcategoryCalculatedTotal}`);
            } else {
              console.log(`    ✅ ${subcategory.name} total matches sub-subcategories sum`);
            }
            
          } else {
            // Subcategory is a leaf node - count its direct resources
            subcategoryCalculatedTotal = subcategory.resources.length;
          }
          
          categoryCalculatedTotal += subcategoryCalculatedTotal;
        });
        
        // Verify category total matches sum of subcategories
        if (category.resources.length !== categoryCalculatedTotal) {
          this.issues.push({
            type: 'category_mismatch',
            item: category.name,
            expected: categoryCalculatedTotal,
            actual: category.resources.length
          });
          console.log(`  ⚠️  Mismatch: ${category.name} shows ${category.resources.length} but subcategories sum to ${categoryCalculatedTotal}`);
        } else {
          console.log(`  ✅ ${category.name} total matches subcategories sum`);
        }
        
      } else {
        // Category is a leaf node - count its direct resources
        categoryCalculatedTotal = category.resources.length;
      }
      
      totalCalculatedResources += categoryCalculatedTotal;
    });
    
    // Verify system total
    if (totalCalculatedResources !== this.totalResources) {
      this.issues.push({
        type: 'system_total_mismatch',
        item: 'System Total',
        expected: this.totalResources,
        actual: totalCalculatedResources
      });
    }
    
    console.log(`\n📊 FINAL VERIFICATION:`);
    console.log(`   🎯 System Total: ${this.totalResources} resources`);
    console.log(`   🧮 Calculated from hierarchy: ${totalCalculatedResources} resources`);
    console.log(`   📝 Navigation items: ${this.countNavigationItems(data)} items`);
    
    return {
      isConsistent: this.issues.length === 0,
      systemTotal: this.totalResources,
      calculatedTotal: totalCalculatedResources,
      navigationItems: this.countNavigationItems(data)
    };
  }
  
  countNavigationItems(data) {
    let count = 0;
    
    data.categories.forEach(category => {
      count++; // Category itself
      
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          count++; // Subcategory itself
          
          if (subcategory.subSubcategories) {
            count += subcategory.subSubcategories.length; // All sub-subcategories
          }
        });
      }
    });
    
    return count;
  }

  generateReport(results) {
    console.log("\n📋 HIERARCHICAL CONSISTENCY REPORT");
    console.log("=" + "=".repeat(60));
    
    if (results.isConsistent) {
      console.log("✅ HIERARCHICAL STRUCTURE IS MATHEMATICALLY CONSISTENT!");
      console.log(`✅ System total (${results.systemTotal}) matches calculated total (${results.calculatedTotal})`);
      console.log(`✅ All parent totals equal sum of their children`);
      console.log(`✅ Navigation shows ${results.navigationItems} items with proper hierarchy`);
    } else {
      console.log("❌ HIERARCHICAL INCONSISTENCIES DETECTED!");
    }
    
    if (this.issues.length > 0) {
      console.log(`\n🚨 ISSUES FOUND (${this.issues.length}):`);
      console.log("-" + "-".repeat(50));
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.item}: Expected ${issue.expected}, got ${issue.actual}`);
        console.log(`   Type: ${issue.type}`);
        if (issue.parent) console.log(`   Parent: ${issue.parent}`);
      });
    } else {
      console.log(`\n🎉 PERFECT HIERARCHY - All totals are mathematically consistent!`);
    }
    
    return results;
  }

  async verify() {
    console.log("🚀 Starting Hierarchical Consistency Verification");
    
    try {
      const data = await this.fetchData();
      const results = this.verifyHierarchicalConsistency(data);
      const report = this.generateReport(results);
      
      if (!results.isConsistent) {
        console.log("\n❌ Verification failed - hierarchical inconsistencies found");
        process.exit(1);
      } else {
        console.log("\n✅ Verification passed - hierarchy is mathematically consistent");
        process.exit(0);
      }
      
    } catch (error) {
      console.error(`💥 Verification failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the verification
const verifier = new HierarchicalVerifier();
verifier.verify();