import { storage } from '../server/storage';
import { syncService } from '../server/github/syncService';

/**
 * TIER 2: Dry-Run Export API Tests
 * Test export functionality without actual GitHub commits
 */

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
}

async function runDryRunTests() {
  console.log('\n=== TIER 2: Dry-Run Export API Tests ===\n');
  
  try {
    // Test 1: Check for approved resources
    console.log('Test 1: Checking for approved resources...');
    const approvedResources = await storage.getAllApprovedResources();
    addResult(
      'Approved resources available',
      approvedResources.length > 0,
      `Found ${approvedResources.length} approved resources`
    );
    
    if (approvedResources.length === 0) {
      console.log('⚠️  No approved resources to export. Skipping remaining tests.');
      return false;
    }
    
    // Test 2: Query database BEFORE dry-run export
    console.log('\nTest 2: Querying database state BEFORE dry-run export...');
    const testRepoUrl = 'https://github.com/krzemienski/awesome-video';
    
    const syncHistoryBefore = await storage.getSyncHistory();
    const syncQueueBefore = await storage.getGithubSyncQueue();
    
    console.log(`  - Sync history entries before: ${syncHistoryBefore.length}`);
    console.log(`  - Sync queue entries before: ${syncQueueBefore.length}`);
    
    // Test 3: Test dry-run export with valid repository URL
    console.log('\nTest 3: Testing dry-run export with valid repository URL...');
    
    let exportResult: any = null;
    let exportError: any = null;
    
    try {
      exportResult = await syncService.exportToGitHub(testRepoUrl, {
        dryRun: true,
        createPullRequest: false
      });
      
      addResult(
        'Dry-run export completed',
        exportResult && !exportResult.errors?.length,
        exportResult ? `Exported ${exportResult.exported} resources` : 'Failed to export'
      );
      
      // Test 4: Validate response contains required fields
      const hasExportedCount = typeof exportResult.exported === 'number';
      addResult(
        'Response includes exported count',
        hasExportedCount,
        hasExportedCount ? `exported: ${exportResult.exported}` : 'exported field missing'
      );
      
      // Test 5: Check that no commit was made (dry-run)
      const noCommitSha = !exportResult.commitSha;
      addResult(
        'No commit SHA in dry-run',
        noCommitSha,
        noCommitSha ? 'Correctly skipped GitHub commit' : 'Unexpected commit SHA found'
      );
      
      const noCommitUrl = !exportResult.commitUrl;
      addResult(
        'No commit URL in dry-run',
        noCommitUrl,
        noCommitUrl ? 'Correctly skipped GitHub commit' : 'Unexpected commit URL found'
      );
      
      // Test 6: Check for errors
      const hasErrors = exportResult.errors && exportResult.errors.length > 0;
      addResult(
        'No errors during dry-run',
        !hasErrors,
        hasErrors ? `Errors: ${exportResult.errors.join(', ')}` : 'No errors'
      );
      
    } catch (error: any) {
      exportError = error;
      addResult(
        'Dry-run export completed',
        false,
        `Error: ${error.message}`
      );
    }
    
    // Test 7: Query database AFTER dry-run export and verify no changes
    console.log('\nTest 7: Querying database state AFTER dry-run export...');
    
    const syncHistoryAfter = await storage.getSyncHistory();
    const syncQueueAfter = await storage.getGithubSyncQueue();
    
    console.log(`  - Sync history entries after: ${syncHistoryAfter.length}`);
    console.log(`  - Sync queue entries after: ${syncQueueAfter.length}`);
    
    const noNewSyncHistory = syncHistoryAfter.length === syncHistoryBefore.length;
    addResult(
      'No new sync_history entries (dry-run)',
      noNewSyncHistory,
      noNewSyncHistory 
        ? `Confirmed: ${syncHistoryBefore.length} before, ${syncHistoryAfter.length} after` 
        : `Database changed! ${syncHistoryBefore.length} before, ${syncHistoryAfter.length} after`
    );
    
    const noNewSyncQueue = syncQueueAfter.length === syncQueueBefore.length;
    addResult(
      'No new github_sync_queue entries (dry-run)',
      noNewSyncQueue,
      noNewSyncQueue 
        ? `Confirmed: ${syncQueueBefore.length} before, ${syncQueueAfter.length} after` 
        : `Queue changed! ${syncQueueBefore.length} before, ${syncQueueAfter.length} after`
    );
    
    // Test 8: Test with invalid repository URL
    console.log('\nTest 8: Testing with invalid repository URL...');
    try {
      const invalidResult = await syncService.exportToGitHub('invalid-url', {
        dryRun: true
      });
      
      const hasErrorsForInvalid = invalidResult.errors && invalidResult.errors.length > 0;
      addResult(
        'Invalid URL produces error',
        hasErrorsForInvalid,
        hasErrorsForInvalid ? `Error caught: ${invalidResult.errors[0]}` : 'No error for invalid URL'
      );
    } catch (error: any) {
      addResult(
        'Invalid URL produces error',
        true,
        `Exception caught: ${error.message}`
      );
    }
    
    // Test 9: Test export summary includes all resources
    if (exportResult && exportResult.exported) {
      const allExported = exportResult.exported === approvedResources.length;
      addResult(
        'All approved resources included',
        allExported,
        allExported 
          ? `All ${approvedResources.length} resources exported` 
          : `Only ${exportResult.exported} of ${approvedResources.length} exported`
      );
    }
    
    // Print summary
    console.log('\n=== Test Summary ===\n');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Pass Rate: ${passRate}%\n`);
    
    if (passed === total) {
      console.log('🎉 All TIER 2 tests passed! Dry-run export works correctly.\n');
    } else {
      console.log('⚠️  Some tests failed. Review the output above for details.\n');
    }
    
    // Print export details if available
    if (exportResult) {
      console.log('=== Export Result Details ===\n');
      console.log(JSON.stringify(exportResult, null, 2));
      console.log('\n');
    }
    
    return passed === total;
    
  } catch (error: any) {
    console.error('❌ Test execution failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the tests
runDryRunTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
