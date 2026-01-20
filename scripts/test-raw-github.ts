import { AwesomeListParser } from '../server/github/parser';
import { AwesomeLintValidator } from '../server/validation/awesomeLint';

async function testRawGithub() {
  console.log('='.repeat(60));
  console.log('TESTING RAW GITHUB MARKDOWN FETCH');
  console.log('='.repeat(60));
  
  // Fetch raw README from sindresorhus/awesome
  const rawUrl = 'https://raw.githubusercontent.com/sindresorhus/awesome/main/readme.md';
  console.log(`\nFetching: ${rawUrl}`);
  
  const response = await fetch(rawUrl);
  if (!response.ok) {
    console.log(`❌ Failed to fetch: ${response.status}`);
    return;
  }
  
  const markdown = await response.text();
  console.log(`✅ Fetched ${markdown.length} characters`);
  
  // Validate
  console.log('\n1. VALIDATING');
  const validator = new AwesomeLintValidator(markdown);
  const result = validator.validate();
  
  console.log(`Validation: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Stats: ${result.stats.totalResources} resources, ${result.stats.totalCategories} categories`);
  console.log(`Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);
  
  if (result.errors.length > 0) {
    console.log('\nFirst 5 errors:');
    result.errors.slice(0, 5).forEach(e => {
      console.log(`  Line ${e.line}: [${e.rule}] ${e.message}`);
    });
  }
  
  // Parse
  console.log('\n2. PARSING');
  const parser = new AwesomeListParser(markdown);
  const parseResult = parser.parse();
  console.log(`Parsed ${parseResult.resources.length} resources`);
  console.log(`Title: ${parseResult.title}`);
}

testRawGithub().catch(e => console.error('Error:', e));
