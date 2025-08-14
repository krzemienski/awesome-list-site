#!/usr/bin/env node

/**
 * Investigate Category Assignment Discrepancies
 * Compare JSON category structure with CSV taxonomy expectations
 */

import fetch from 'node-fetch';

async function investigateDiscrepancies() {
  console.log("🔍 INVESTIGATING JSON vs CSV CATEGORY ASSIGNMENT DISCREPANCIES");
  console.log("=" + "=".repeat(70));
  
  // Fetch the raw JSON data
  const jsonUrl = "https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json";
  console.log(`📡 Fetching JSON from: ${jsonUrl}`);
  
  const response = await fetch(jsonUrl);
  const data = await response.json();
  
  console.log(`✅ Found ${data.categories?.length} categories and ${data.projects?.length} projects\n`);
  
  // Build category map
  const categoryMap = new Map();
  data.categories?.forEach(cat => {
    categoryMap.set(cat.id, cat);
  });
  
  // Investigate specific problem cases
  console.log("🚨 INVESTIGATING PROBLEM CASES:");
  console.log("-".repeat(50));
  
  // 1. Smart TV resources
  console.log("1️⃣ Smart TV Resources:");
  const smartTVResources = data.projects?.filter(project => 
    project.title.toLowerCase().includes('smart tv') ||
    project.title.toLowerCase().includes('samsung') ||
    project.title.toLowerCase().includes('lg tv') ||
    project.description?.toLowerCase().includes('smart tv')
  ) || [];
  
  console.log(`   Found ${smartTVResources.length} potential Smart TV resources:`);
  smartTVResources.slice(0, 5).forEach(resource => {
    console.log(`   • "${resource.title}" -> Categories: ${JSON.stringify(resource.category)}`);
  });
  
  // 2. iOS/tvOS resources  
  console.log("\n2️⃣ iOS/tvOS Resources:");
  const iOSResources = data.projects?.filter(project => 
    project.title.toLowerCase().includes('ios') ||
    project.title.toLowerCase().includes('tvos') ||
    project.title.toLowerCase().includes('iphone') ||
    project.title.toLowerCase().includes('ipad')
  ) || [];
  
  console.log(`   Found ${iOSResources.length} potential iOS/tvOS resources:`);
  iOSResources.slice(0, 5).forEach(resource => {
    console.log(`   • "${resource.title}" -> Categories: ${JSON.stringify(resource.category)}`);
  });
  
  // 3. HLS resources (over-assigned)
  console.log("\n3️⃣ HLS Resources (Over-assigned):");
  const hlsResources = data.projects?.filter(project => 
    project.title.toLowerCase().includes('hls') ||
    project.description?.toLowerCase().includes('hls')
  ) || [];
  
  console.log(`   Found ${hlsResources.length} HLS-related resources:`);
  hlsResources.slice(0, 3).forEach(resource => {
    console.log(`   • "${resource.title}" -> Categories: ${JSON.stringify(resource.category)}`);
  });
  
  // 4. Check category structure for Hardware Players
  console.log("\n4️⃣ Hardware Players Category Structure:");
  const hardwareCategories = data.categories?.filter(cat => 
    cat.title.toLowerCase().includes('hardware') ||
    cat.title.toLowerCase().includes('player') ||
    cat.title.toLowerCase().includes('smart') ||
    cat.title.toLowerCase().includes('roku') ||
    cat.title.toLowerCase().includes('tv')
  ) || [];
  
  console.log(`   Found ${hardwareCategories.length} hardware-related categories:`);
  hardwareCategories.forEach(cat => {
    console.log(`   • ${cat.id}: "${cat.title}" -> Parent: ${cat.parent || 'none'}`);
  });
  
  // 5. Check if slug mapping is the issue
  console.log("\n5️⃣ Slug Mapping Analysis:");
  console.log("   Checking for slug mismatches...");
  
  // Look for Smart TV category with different slug
  const smartTVCategory = data.categories?.find(cat => 
    cat.title.toLowerCase().includes('smart') && cat.title.toLowerCase().includes('tv')
  );
  console.log(`   Smart TV category found: ${smartTVCategory ? JSON.stringify(smartTVCategory) : 'NOT FOUND'}`);
  
  // Look for iOS category
  const iOSCategory = data.categories?.find(cat => 
    cat.title.toLowerCase().includes('ios') || cat.title.toLowerCase().includes('tvos')
  );
  console.log(`   iOS/tvOS category found: ${iOSCategory ? JSON.stringify(iOSCategory) : 'NOT FOUND'}`);
  
  console.log("\n📊 SUMMARY:");
  console.log(`   🎯 Smart TV resources in JSON: ${smartTVResources.length}`);
  console.log(`   🎯 iOS resources in JSON: ${iOSResources.length}`);  
  console.log(`   🎯 HLS resources in JSON: ${hlsResources.length}`);
  console.log(`   📁 Hardware categories in JSON: ${hardwareCategories.length}`);
  
  console.log("\n💡 ROOT CAUSE HYPOTHESIS:");
  console.log("   The JSON structure may use different category IDs/slugs than CSV expects");
  console.log("   Resources exist but are not properly mapped to the expected sub-subcategory slugs");
}

investigateDiscrepancies().catch(console.error);