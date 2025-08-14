#!/usr/bin/env node

/**
 * Generate Complete Tree Structure
 * Shows all categories, subcategories, and sub-subcategories with counts and slugs
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

class TreeStructureGenerator {
  constructor() {
    this.data = null;
    this.totalItems = 0;
  }

  async fetchData() {
    console.log("📡 Fetching complete navigation data...");
    
    const response = await fetch(`${BASE_URL}/api/awesome-list`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    this.data = await response.json();
    console.log(`✅ Fetched ${this.data.resources.length} total resources`);
    console.log(`📊 Found ${this.data.categories.length} top-level categories\n`);
    
    return this.data;
  }

  generateCompleteTree() {
    console.log("🌳 COMPLETE NAVIGATION TREE STRUCTURE");
    console.log("=" + "=".repeat(80));
    console.log("Format: Name (Count resources) → slug → /route");
    console.log("=" + "=".repeat(80));
    
    let categoryCount = 0;
    let subcategoryCount = 0;
    let subSubcategoryCount = 0;
    let totalResourceCount = 0;
    
    this.data.categories.forEach((category, categoryIndex) => {
      categoryCount++;
      totalResourceCount += category.resources.length;
      
      // Category level (Level 1)
      console.log(`📁 ${category.name} (${category.resources.length} resources) → ${category.slug} → /category/${category.slug}`);
      
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach((subcategory, subIndex) => {
          subcategoryCount++;
          
          // Subcategory level (Level 2)
          const isLastSubcategory = subIndex === category.subcategories.length - 1;
          const subPrefix = isLastSubcategory ? "└──" : "├──";
          console.log(`${subPrefix} 📂 ${subcategory.name} (${subcategory.resources.length} resources) → ${subcategory.slug} → /subcategory/${subcategory.slug}`);
          
          if (subcategory.subSubcategories && subcategory.subSubcategories.length > 0) {
            subcategory.subSubcategories.forEach((subSubcategory, subSubIndex) => {
              subSubcategoryCount++;
              
              // Sub-subcategory level (Level 3)
              const isLastSubSub = subSubIndex === subcategory.subSubcategories.length - 1;
              const subSubPrefix = isLastSubcategory 
                ? (isLastSubSub ? "    └──" : "    ├──")
                : (isLastSubSub ? "│   └──" : "│   ├──");
              console.log(`${subSubPrefix} 📄 ${subSubcategory.name} (${subSubcategory.resources.length} resources) → ${subSubcategory.slug} → /sub-subcategory/${subSubcategory.slug}`);
            });
          }
        });
      }
      
      // Add spacing between top-level categories (except last one)
      if (categoryIndex < this.data.categories.length - 1) {
        console.log("");
      }
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("📊 NAVIGATION STRUCTURE SUMMARY");
    console.log("=".repeat(80));
    console.log(`🎯 Total Resources: ${this.data.resources.length}`);
    console.log(`📁 Categories: ${categoryCount}`);
    console.log(`📂 Subcategories: ${subcategoryCount}`);
    console.log(`📄 Sub-subcategories: ${subSubcategoryCount}`);
    console.log(`🧮 Total Navigation Items: ${categoryCount + subcategoryCount + subSubcategoryCount}`);
    console.log(`✅ Resource Count Verification: ${totalResourceCount} (should equal ${this.data.resources.length})`);
    
    // Generate slug reference table
    console.log("\n" + "=".repeat(80));
    console.log("📝 COMPLETE SLUG REFERENCE TABLE");
    console.log("=".repeat(80));
    
    // Categories
    console.log("\n🏷️ CATEGORY SLUGS:");
    this.data.categories.forEach(category => {
      console.log(`   ${category.slug} → ${category.name} (${category.resources.length})`);
    });
    
    // Subcategories
    console.log("\n🏷️ SUBCATEGORY SLUGS:");
    this.data.categories.forEach(category => {
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          console.log(`   ${subcategory.slug} → ${subcategory.name} (${subcategory.resources.length}) [parent: ${category.name}]`);
        });
      }
    });
    
    // Sub-subcategories
    console.log("\n🏷️ SUB-SUBCATEGORY SLUGS:");
    this.data.categories.forEach(category => {
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          if (subcategory.subSubcategories) {
            subcategory.subSubcategories.forEach(subSubcategory => {
              console.log(`   ${subSubcategory.slug} → ${subSubcategory.name} (${subSubcategory.resources.length}) [parent: ${subcategory.name}]`);
            });
          }
        });
      }
    });
    
    return {
      categories: categoryCount,
      subcategories: subcategoryCount,
      subSubcategories: subSubcategoryCount,
      totalItems: categoryCount + subcategoryCount + subSubcategoryCount,
      totalResources: this.data.resources.length
    };
  }

  async run() {
    try {
      await this.fetchData();
      const summary = this.generateCompleteTree();
      
      console.log(`\n✅ Generated complete tree structure with ${summary.totalItems} navigation items`);
      return summary;
      
    } catch (error) {
      console.error(`💥 Failed to generate tree structure: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the tree structure generator
const generator = new TreeStructureGenerator();
generator.run();