#!/usr/bin/env node

/**
 * Verify Navigation Totals - Ensures all sidebar counts are mathematically consistent
 * and add up to the total number of resources (2,011)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

class NavigationTotalVerifier {
  constructor() {
    this.totalResources = 0;
    this.categoryTotals = [];
    this.subcategoryTotals = [];
    this.subSubcategoryTotals = [];
    this.issues = [];
  }

  async fetchNavigationData() {
    console.log("📡 Fetching navigation data for total verification...");
    
    const response = await fetch(`${BASE_URL}/api/awesome-list`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    this.totalResources = data.resources.length;
    
    console.log(`✅ Total resources in system: ${this.totalResources}`);
    
    return data;
  }

  analyzeHierarchicalTotals(data) {
    console.log("\n🔍 ANALYZING HIERARCHICAL TOTALS");
    console.log("=" + "=".repeat(50));

    let categorySum = 0;
    let subcategorySum = 0;  
    let subSubcategorySum = 0;
    
    data.categories.forEach(category => {
      const categoryTotal = category.resources.length;
      this.categoryTotals.push({
        name: category.name,
        total: categoryTotal,
        type: 'category'
      });
      
      console.log(`📁 ${category.name}: ${categoryTotal} resources`);
      
      // Calculate subcategory totals within this category
      let categorySubcategorySum = 0;
      
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          const subcategoryTotal = subcategory.resources.length;
          this.subcategoryTotals.push({
            name: subcategory.name,
            parent: category.name,
            total: subcategoryTotal,
            type: 'subcategory'
          });
          
          categorySubcategorySum += subcategoryTotal;
          console.log(`  📂 ${subcategory.name}: ${subcategoryTotal} resources`);
          
          // Calculate sub-subcategory totals within this subcategory
          let subcategorySubSum = 0;
          
          if (subcategory.subSubcategories) {
            subcategory.subSubcategories.forEach(subSubcategory => {
              const subSubTotal = subSubcategory.resources.length;
              this.subSubcategoryTotals.push({
                name: subSubcategory.name,
                parent: subcategory.name,
                grandparent: category.name,
                total: subSubTotal,
                type: 'sub-subcategory'
              });
              
              subcategorySubSum += subSubTotal;
              console.log(`    📄 ${subSubcategory.name}: ${subSubTotal} resources`);
            });
            
            // Verify subcategory total matches sum of its sub-subcategories
            if (subcategoryTotal !== subcategorySubSum) {
              this.issues.push({
                type: 'subcategory_mismatch',
                item: subcategory.name,
                expected: subcategorySubSum,
                actual: subcategoryTotal,
                message: `Subcategory "${subcategory.name}" total (${subcategoryTotal}) doesn't match sum of sub-subcategories (${subcategorySubSum})`
              });
            }
          }
        });
        
        // Verify category total matches sum of its subcategories  
        if (categoryTotal !== categorySubcategorySum) {
          this.issues.push({
            type: 'category_mismatch',
            item: category.name,
            expected: categorySubcategorySum,
            actual: categoryTotal,
            message: `Category "${category.name}" total (${categoryTotal}) doesn't match sum of subcategories (${categorySubcategorySum})`
          });
        }
      }
      
      categorySum += categoryTotal;
    });

    // Calculate totals for verification
    subcategorySum = this.subcategoryTotals.reduce((sum, sub) => sum + sub.total, 0);
    subSubcategorySum = this.subSubcategoryTotals.reduce((sum, subSub) => sum + subSub.total, 0);

    console.log("\n📊 TOTAL VERIFICATION");
    console.log("=" + "=".repeat(50));
    console.log(`🎯 System Total: ${this.totalResources} resources`);
    console.log(`📁 Category Sum: ${categorySum} resources (${this.categoryTotals.length} items)`);
    console.log(`📂 Subcategory Sum: ${subcategorySum} resources (${this.subcategoryTotals.length} items)`);
    console.log(`📄 Sub-subcategory Sum: ${subSubcategorySum} resources (${this.subSubcategoryTotals.length} items)`);
    
    // For hierarchical data, we should only count at the lowest level to avoid double counting
    // The total should equal the sum of resources at the leaf nodes (sub-subcategories where they exist, subcategories otherwise, categories otherwise)
    
    let leafNodeSum = 0;
    let leafNodeCount = 0;
    
    data.categories.forEach(category => {
      if (!category.subcategories || category.subcategories.length === 0) {
        // Category is a leaf node
        leafNodeSum += category.resources.length;
        leafNodeCount++;
      } else {
        category.subcategories.forEach(subcategory => {
          if (!subcategory.subSubcategories || subcategory.subSubcategories.length === 0) {
            // Subcategory is a leaf node
            leafNodeSum += subcategory.resources.length;
            leafNodeCount++;
          } else {
            subcategory.subSubcategories.forEach(subSubcategory => {
              // Sub-subcategory is always a leaf node
              leafNodeSum += subSubcategory.resources.length;
              leafNodeCount++;
            });
          }
        });
      }
    });
    
    console.log(`🍃 Leaf Node Sum: ${leafNodeSum} resources (${leafNodeCount} leaf nodes)`);
    
    // Verify the leaf node sum matches the total
    if (leafNodeSum !== this.totalResources) {
      this.issues.push({
        type: 'total_mismatch',
        item: 'System Total',
        expected: this.totalResources,
        actual: leafNodeSum,
        message: `Leaf node sum (${leafNodeSum}) doesn't match system total (${this.totalResources})`
      });
    }

    return {
      systemTotal: this.totalResources,
      categorySum,
      subcategorySum,
      subSubcategorySum,
      leafNodeSum,
      leafNodeCount,
      isConsistent: leafNodeSum === this.totalResources
    };
  }

  generateReport(totals) {
    console.log("\n📋 NAVIGATION TOTALS VERIFICATION REPORT");
    console.log("=" + "=".repeat(60));
    
    if (totals.isConsistent) {
      console.log("✅ ALL TOTALS ARE MATHEMATICALLY CONSISTENT!");
      console.log(`✅ System total (${totals.systemTotal}) matches leaf node sum (${totals.leafNodeSum})`);
      console.log(`✅ Navigation structure correctly accounts for all resources`);
    } else {
      console.log("❌ INCONSISTENT TOTALS DETECTED!");
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   🎯 System Total: ${totals.systemTotal} resources`);
    console.log(`   🍃 Leaf Nodes: ${totals.leafNodeCount} items with ${totals.leafNodeSum} resources`);
    console.log(`   📁 Categories: ${this.categoryTotals.length} items`);
    console.log(`   📂 Subcategories: ${this.subcategoryTotals.length} items`);
    console.log(`   📄 Sub-subcategories: ${this.subSubcategoryTotals.length} items`);
    console.log(`   📊 Total Navigation Items: ${this.categoryTotals.length + this.subcategoryTotals.length + this.subSubcategoryTotals.length}`);
    
    if (this.issues.length > 0) {
      console.log(`\n🚨 ISSUES FOUND (${this.issues.length}):`);
      console.log("-" + "-".repeat(50));
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.message}`);
        console.log(`   Type: ${issue.type}`);
        console.log(`   Expected: ${issue.expected}, Actual: ${issue.actual}`);
      });
    } else {
      console.log(`\n🎉 NO ISSUES FOUND - All totals are consistent!`);
    }
    
    return {
      isConsistent: totals.isConsistent,
      issues: this.issues,
      totals
    };
  }

  async verify() {
    console.log("🚀 Starting Navigation Totals Verification");
    
    try {
      const data = await this.fetchNavigationData();
      const totals = this.analyzeHierarchicalTotals(data);
      const report = this.generateReport(totals);
      
      if (!report.isConsistent) {
        console.log("\n❌ Verification failed - totals are inconsistent");
        process.exit(1);
      } else {
        console.log("\n✅ Verification passed - all totals are consistent");
        process.exit(0);
      }
      
    } catch (error) {
      console.error(`💥 Verification failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the verification
const verifier = new NavigationTotalVerifier();
verifier.verify();