import { DatabaseStorage } from '../server/storage';
import { AwesomeListFormatter } from '../server/github/formatter';
import { AwesomeLintValidator } from '../server/validation/awesomeLint';

async function testMarkdownExport() {
  const storage = new DatabaseStorage();
  
  console.log('='.repeat(60));
  console.log('TESTING MARKDOWN EXPORT FROM DATABASE');
  console.log('='.repeat(60));
  
  // Get all approved resources
  const resources = await storage.getAllApprovedResources();
  console.log(`\nFound ${resources.length} approved resources in database`);
  
  // Create formatter with options
  const formatter = new AwesomeListFormatter(resources, {
    title: 'Awesome Video',
    description: 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
    includeContributing: true,
    includeLicense: true,
  });
  
  // Generate the markdown
  const markdown = formatter.generate();
  
  console.log(`\nGenerated markdown: ${markdown.length} characters`);
  console.log(`\nFirst 500 characters of markdown:`);
  console.log('-'.repeat(60));
  console.log(markdown.substring(0, 500));
  console.log('-'.repeat(60));
  
  // Now validate with awesome-lint
  console.log('\n\nVALIDATING GENERATED MARKDOWN WITH AWESOME-LINT');
  console.log('='.repeat(60));
  
  const validator = new AwesomeLintValidator(markdown);
  const result = validator.validate();
  
  console.log(`\nValidation result: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Stats: ${result.stats.totalLines} lines, ${result.stats.totalResources} resources, ${result.stats.totalCategories} categories`);
  console.log(`Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);
  
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.slice(0, 10).forEach(e => {
      console.log(`  Line ${e.line}: [${e.rule}] ${e.message}`);
    });
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more errors`);
    }
  }
  
  if (result.warnings.length > 0) {
    console.log('\nWarnings (first 5):');
    result.warnings.slice(0, 5).forEach(w => {
      console.log(`  Line ${w.line}: [${w.rule}] ${w.message}`);
    });
  }
  
  // Save the markdown to a file
  const fs = await import('fs');
  fs.writeFileSync('exported-awesome-list.md', markdown);
  console.log('\n✅ Saved markdown to exported-awesome-list.md');
  
  return result.valid;
}

testMarkdownExport().then(valid => {
  console.log(`\n\n${'='.repeat(60)}`);
  if (valid) {
    console.log('SUCCESS: Generated markdown is awesome-lint compliant!');
  } else {
    console.log('NEEDS WORK: Generated markdown has validation issues');
  }
  console.log('='.repeat(60));
  process.exit(valid ? 0 : 1);
}).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
