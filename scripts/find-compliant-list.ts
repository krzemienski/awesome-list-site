import { GitHubSyncService } from '../server/github/syncService';
import { DatabaseStorage } from '../server/storage';

const storage = new DatabaseStorage();
const syncService = new GitHubSyncService(storage);

// Known lists that should be awesome-lint compliant
const potentiallyCompliantLists = [
  'https://github.com/sindresorhus/awesome', // The original awesome list
  'https://github.com/sdras/awesome-actions', // Known to use awesome-lint
  'https://github.com/MunGell/awesome-for-beginners', // Popular beginner list
];

async function testValidation() {
  for (const url of potentiallyCompliantLists) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${url}`);
    console.log('='.repeat(60));
    
    try {
      const result = await syncService.importFromGitHub(url, { dryRun: true });
      
      if (result.validationPassed) {
        console.log(`✅ VALIDATION PASSED!`);
        console.log(`   Resources detected: ${result.imported + result.updated + result.skipped}`);
        console.log(`   Warnings: ${result.warnings?.length || 0}`);
        console.log(`\n🎉 This list can be imported!`);
      } else {
        console.log(`❌ Validation failed`);
        console.log(`   Errors: ${result.validationErrors?.length || 0}`);
        if (result.validationErrors) {
          result.validationErrors.slice(0, 3).forEach((e: any) => {
            console.log(`   - ${e.rule}: ${e.message} (line ${e.line})`);
          });
        }
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testValidation().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
