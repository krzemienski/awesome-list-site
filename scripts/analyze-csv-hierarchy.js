const fs = require('fs');

// Read and parse the CSV line by line
const csvContent = fs.readFileSync('./attached_assets/Category_Tree__All_Levels__1755147231941.csv', 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

console.log('=== CSV HIERARCHY ANALYSIS ===\n');

// Parse header and data
const headers = lines[0].split(',');
const dataLines = lines.slice(1);

// Build complete hierarchy mapping
const hierarchy = new Map();
const leafCategories = [];

dataLines.forEach(line => {
  const parts = line.split(',');
  if (parts.length < 12) return;
  
  const [, cid, title, slug, parent_cid, parent_slug, level, num_children, direct_projects, total_projects, is_top_level, path] = parts;
  
  const category = {
    cid,
    title,
    slug,
    parent_cid: parent_cid || null,
    parent_slug: parent_slug || null,
    level: parseInt(level),
    num_children: parseInt(num_children),
    direct_projects: parseInt(direct_projects),
    total_projects: parseInt(total_projects),
    is_top_level: is_top_level === 'True',
    path
  };
  
  hierarchy.set(slug, category);
  
  // Level 3 categories (leaf nodes) are what we need to map
  if (category.level === 3 || category.num_children === 0) {
    leafCategories.push(category);
  }
});

console.log('TOP-LEVEL CATEGORIES (Level 1):');
Array.from(hierarchy.values())
  .filter(cat => cat.is_top_level)
  .forEach(cat => {
    console.log(`- ${cat.title} (${cat.slug}): ${cat.total_projects} resources`);
  });

console.log('\n=== LEAF CATEGORIES THAT NEED MAPPING ===');
leafCategories.forEach(leaf => {
  // Find the top-level parent
  let current = leaf;
  while (current.parent_slug && hierarchy.has(current.parent_slug)) {
    current = hierarchy.get(current.parent_slug);
  }
  console.log(`${leaf.slug} -> ${current.slug} (${current.title})`);
});

console.log(`\nTotal leaf categories to map: ${leafCategories.length}`);
console.log(`Total hierarchy entries: ${hierarchy.size}`);