/**
 * Test GitHub Export & awesome-lint Validation
 *
 * This script:
 * 1. Fetches approved resources from database
 * 2. Generates awesome-list markdown
 * 3. Saves to /tmp/export-test.md
 * 4. Runs awesome-lint to validate
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { execSync } = require('child_process');

const SUPABASE_URL = 'https://jeyldoypdkgsrfdhdcmm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
  console.log('=== GitHub Export & awesome-lint Validation Test ===\n');

  // Step 1: Fetch approved resources
  console.log('Step 1: Fetching approved resources...');
  const { data: resources, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .limit(50); // Use a subset for quick testing

  if (error) {
    console.error('Error fetching resources:', error);
    process.exit(1);
  }

  console.log(`Found ${resources.length} approved resources`);

  // Step 2: Group by category
  const categoryGroups = new Map();
  for (const resource of resources) {
    const category = resource.category || 'Uncategorized';
    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }
    categoryGroups.get(category).push(resource);
  }

  // Step 3: Generate markdown
  console.log('\nStep 2: Generating awesome-list markdown...');
  const lines = [];

  // Header
  lines.push('# Awesome Video');
  lines.push('');
  lines.push('[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)');
  lines.push('');
  lines.push('> A curated list of awesome video development resources.');
  lines.push('');

  // Table of Contents
  lines.push('## Contents');
  lines.push('');
  for (const [category] of categoryGroups) {
    const anchor = category.toLowerCase().replace(/[^\\w\\s-]/g, '').replace(/\\s+/g, '-');
    lines.push(`- [${category}](#${anchor})`);
  }
  lines.push('');

  // Resources by category
  for (const [category, resources] of categoryGroups) {
    lines.push(`## ${category}`);
    lines.push('');

    for (const resource of resources.sort((a, b) => a.title.localeCompare(b.title))) {
      let title = resource.title.replace(/\\[/g, '(').replace(/\\]/g, ')');
      let url = resource.url.trim();

      // Normalize URL
      if (url.startsWith('http://') && !url.includes('localhost')) {
        url = url.replace(/^http:\\/\\//, 'https://');
      }

      let line = `- [${title}](${url})`;

      if (resource.description) {
        let desc = resource.description.trim()
          .replace(/\\[/g, '(').replace(/\\]/g, ')')
          .replace(/\\.{2,}$/g, '.');

        // Ensure ends with period
        if (!desc.endsWith('.') && !desc.endsWith('!') && !desc.endsWith('?')) {
          desc += '.';
        }

        line += ` - ${desc}`;
      }

      lines.push(line);
    }
    lines.push('');
  }

  // Contributing
  lines.push('## Contributing');
  lines.push('');
  lines.push('Please read the [contribution guidelines](CONTRIBUTING.md) first.');
  lines.push('');

  const markdown = lines.join('\\n');

  // Step 4: Save to file
  const outputPath = '/tmp/export-test.md';
  fs.writeFileSync(outputPath, markdown);
  console.log(`Saved to ${outputPath}`);
  console.log(`Total lines: ${lines.length}`);
  console.log(`Total characters: ${markdown.length}`);

  // Step 5: Run awesome-lint
  console.log('\nStep 3: Running awesome-lint validation...');
  try {
    const result = execSync(`npx awesome-lint ${outputPath} 2>&1`, { encoding: 'utf8' });
    console.log('awesome-lint output:');
    console.log(result);
    console.log('\\n=== awesome-lint PASSED ===');
    return true;
  } catch (error) {
    console.log('awesome-lint output:');
    console.log(error.stdout || error.message);
    console.log('\\n=== awesome-lint FAILED - Errors found ===');

    // Read the file and show first 50 lines for debugging
    const content = fs.readFileSync(outputPath, 'utf8');
    console.log('\\nFirst 50 lines of generated file:');
    console.log(content.split('\\n').slice(0, 50).join('\\n'));

    return false;
  }
}

test().catch(console.error);
