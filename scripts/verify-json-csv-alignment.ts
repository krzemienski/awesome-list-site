import fs from 'fs';

async function analyzeAlignment() {
  // Fetch the JSON data
  const response = await fetch('https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json');
  const jsonData = await response.json();
  
  // CSV expected totals (from the CSV file)
  const csvExpected = [
    { category: "Community & Events", expected: 91 },
    { category: "Encoding & Codecs", expected: 392 },
    { category: "General Tools", expected: 97 },
    { category: "Infrastructure & Delivery", expected: 134 },
    { category: "Intro & Learning", expected: 229 },
    { category: "Media Tools", expected: 317 },
    { category: "Players & Clients", expected: 425 },
    { category: "Protocols & Transport", expected: 252 },
    { category: "Standards & Industry", expected: 174 }
  ];
  
  // Build category hierarchy map
  const categoryMap = new Map();
  jsonData.categories.forEach(cat => {
    categoryMap.set(cat.id, cat);
  });
  
  // Count projects by their direct category assignment
  const directCounts = new Map();
  jsonData.projects.forEach(project => {
    const catId = project.category[0];
    directCounts.set(catId, (directCounts.get(catId) || 0) + 1);
  });
  
  // Function to find top-level parent
  function findTopLevel(catId) {
    const cat = categoryMap.get(catId);
    if (!cat) return null;
    if (!cat.parent) return cat.id;
    return findTopLevel(cat.parent);
  }
  
  // Aggregate counts to top-level categories
  const topLevelCounts = new Map();
  directCounts.forEach((count, catId) => {
    const topLevel = findTopLevel(catId);
    if (topLevel) {
      topLevelCounts.set(topLevel, (topLevelCounts.get(topLevel) || 0) + count);
    }
  });
  
  console.log("=== JSON vs CSV ALIGNMENT ANALYSIS ===\n");
  console.log("Category                      | JSON Actual | CSV Expected | Difference");
  console.log("------------------------------|-------------|--------------|------------");
  
  let totalJsonCount = 0;
  let totalCsvExpected = 0;
  
  csvExpected.forEach(expected => {
    const catId = expected.category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
    const actual = topLevelCounts.get(catId) || 0;
    const diff = actual - expected.expected;
    const status = diff === 0 ? '✓' : diff > 0 ? '+' : '';
    
    totalJsonCount += actual;
    totalCsvExpected += expected.expected;
    
    console.log(`${expected.category.padEnd(29)} | ${actual.toString().padStart(11)} | ${expected.expected.toString().padStart(12)} | ${status}${diff.toString().padStart(10)}`);
  });
  
  console.log("------------------------------|-------------|--------------|------------");
  console.log(`${"TOTAL".padEnd(29)} | ${totalJsonCount.toString().padStart(11)} | ${totalCsvExpected.toString().padStart(12)} | ${(totalJsonCount - totalCsvExpected).toString().padStart(11)}`);
  
  console.log("\n=== DETAILED BREAKDOWN FOR MISMATCHED CATEGORIES ===\n");
  
  // Show detailed breakdown for Infrastructure & Delivery
  console.log("Infrastructure & Delivery breakdown:");
  ['infrastructure-delivery', 'streaming-servers', 'cloud-cdn', 'origin-servers', 'storage-solutions', 'cdn-integration', 'cloud-platforms'].forEach(catId => {
    const count = directCounts.get(catId) || 0;
    if (count > 0) {
      const cat = categoryMap.get(catId);
      console.log(`  ${cat?.title || catId}: ${count} projects`);
    }
  });
  
  console.log("\nPlayers & Clients breakdown:");
  ['players-clients', 'hardware-players', 'mobile-web-players', 'roku', 'smart-tv', 'chromecast', 'android', 'ios-tvos', 'web-players'].forEach(catId => {
    const count = directCounts.get(catId) || 0;
    if (count > 0) {
      const cat = categoryMap.get(catId);
      console.log(`  ${cat?.title || catId}: ${count} projects`);
    }
  });
}

analyzeAlignment().catch(console.error);