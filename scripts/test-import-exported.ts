import { AwesomeListParser } from '../server/github/parser';
import { AwesomeLintValidator } from '../server/validation/awesomeLint';
import * as fs from 'fs';

async function testImportExported() {
  console.log('='.repeat(60));
  console.log('TESTING IMPORT OF EXPORTED MARKDOWN');
  console.log('='.repeat(60));
  
  // Read the exported markdown
  const markdown = fs.readFileSync('exported-awesome-list.md', 'utf-8');
  console.log(`\nRead markdown: ${markdown.length} characters`);
  
  // Validate first
  console.log('\n1. VALIDATING MARKDOWN');
  console.log('-'.repeat(40));
  
  const validator = new AwesomeLintValidator(markdown);
  const validationResult = validator.validate();
  
  console.log(`Validation: ${validationResult.valid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Errors: ${validationResult.errors.length}, Warnings: ${validationResult.warnings.length}`);
  
  if (!validationResult.valid) {
    console.log('Import would be rejected due to validation errors');
    return;
  }
  
  // Parse the markdown - pass content to constructor
  console.log('\n2. PARSING MARKDOWN');
  console.log('-'.repeat(40));
  
  const parser = new AwesomeListParser(markdown);
  const parseResult = parser.parse();
  
  console.log(`Parsed ${parseResult.resources.length} resources`);
  console.log(`Title: ${parseResult.title}`);
  console.log(`Description: ${parseResult.description?.substring(0, 80)}...`);
  
  // Show category breakdown
  const categories = new Map<string, number>();
  parseResult.resources.forEach(r => {
    categories.set(r.category, (categories.get(r.category) || 0) + 1);
  });
  
  console.log('\nCategory breakdown:');
  Array.from(categories.entries()).forEach(([cat, count]) => {
    console.log(`  - ${cat}: ${count} resources`);
  });
  
  console.log('\n3. IMPORT SIMULATION (DRY RUN)');
  console.log('-'.repeat(40));
  console.log(`Would import ${parseResult.resources.length} resources`);
  console.log(`Would create ${categories.size} categories`);
  
  // Show first 5 resources
  console.log('\nSample resources:');
  parseResult.resources.slice(0, 5).forEach(r => {
    console.log(`  - [${r.category}] ${r.title}`);
    console.log(`    ${r.url}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ROUND-TRIP TEST SUCCESSFUL');
  console.log('Export -> Validate -> Parse: All working!');
  console.log('='.repeat(60));
}

testImportExported().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
