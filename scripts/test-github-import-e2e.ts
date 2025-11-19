/**
 * Layer 1: GitHub Import E2E Test
 * 
 * Tests the complete GitHub import workflow from repository to database.
 * Uses krzemienski/awesome-video as test repository.
 */

import { db } from '../server/db';
import { resources, githubSyncHistory } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { syncService } from '../server/github/syncService';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

class GitHubImportE2ETest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  async run() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  LAYER 1: GitHub Import E2E Test');
    console.log('═══════════════════════════════════════════════════════════\n');

    this.startTime = Date.now();

    try {
      // Step 1: Check database state before import
      await this.testDatabaseStateBeforeImport();

      // Step 2: Trigger GitHub import
      await this.testGitHubImport();

      // Step 3: Verify import results
      await this.testImportResults();

      // Step 4: Test error handling
      await this.testErrorHandling();

      this.endTime = Date.now();
      this.printReport();
    } catch (error: any) {
      console.error('\n❌ Test suite failed:', error.message);
      this.endTime = Date.now();
      this.printReport();
      process.exit(1);
    }
  }

  private async testDatabaseStateBeforeImport() {
    console.log('📊 Step 1: Checking database state before import...\n');

    try {
      // Count total resources
      const totalResult = await db.select({
        count: sql<number>`count(*)`
      }).from(resources);
      const totalResources = Number(totalResult[0]?.count || 0);

      console.log(`  Total resources in database: ${totalResources}`);

      // Count GitHub synced resources
      const githubResult = await db.select({
        count: sql<number>`count(*)`
      }).from(resources).where(eq(resources.githubSynced, true));
      const githubResources = Number(githubResult[0]?.count || 0);

      console.log(`  GitHub synced resources: ${githubResources}`);

      // Check sync history
      const syncHistoryResult = await db.select({
        count: sql<number>`count(*)`
      }).from(githubSyncHistory);
      const syncHistoryCount = Number(syncHistoryResult[0]?.count || 0);

      console.log(`  Sync history entries: ${syncHistoryCount}\n`);

      this.addResult({
        testName: 'Database state check',
        passed: true,
        message: 'Successfully retrieved database state',
        details: {
          totalResources,
          githubResources,
          syncHistoryCount
        }
      });
    } catch (error: any) {
      this.addResult({
        testName: 'Database state check',
        passed: false,
        message: `Failed to check database state: ${error.message}`
      });
      throw error;
    }
  }

  private async testGitHubImport() {
    console.log('🔄 Step 2: Triggering GitHub import...\n');

    const repoUrl = 'https://github.com/krzemienski/awesome-video';
    console.log(`  Repository: ${repoUrl}`);
    console.log(`  Starting import process...\n`);

    try {
      const result = await syncService.importFromGitHub(repoUrl, {
        forceOverwrite: false
      });

      console.log(`  ✓ Import completed`);
      console.log(`    - Imported: ${result.imported}`);
      console.log(`    - Updated: ${result.updated}`);
      console.log(`    - Skipped: ${result.skipped}`);
      console.log(`    - Errors: ${result.errors.length}\n`);

      if (result.errors.length > 0) {
        console.log('  ⚠️  Import errors:');
        result.errors.slice(0, 5).forEach(err => console.log(`    - ${err}`));
        if (result.errors.length > 5) {
          console.log(`    ... and ${result.errors.length - 5} more errors\n`);
        }
      }

      const totalProcessed = result.imported + result.updated + result.skipped;
      const successRate = totalProcessed > 0
        ? ((result.imported + result.updated) / totalProcessed * 100).toFixed(2)
        : 0;

      this.addResult({
        testName: 'GitHub import execution',
        passed: result.imported > 0 || result.updated > 0,
        message: `Import processed ${totalProcessed} resources with ${successRate}% success rate`,
        details: result
      });
    } catch (error: any) {
      this.addResult({
        testName: 'GitHub import execution',
        passed: false,
        message: `Import failed: ${error.message}`
      });
      throw error;
    }
  }

  private async testImportResults() {
    console.log('✅ Step 3: Verifying import results...\n');

    try {
      // Count GitHub synced resources after import
      const githubResult = await db.select({
        count: sql<number>`count(*)`
      }).from(resources).where(eq(resources.githubSynced, true));
      const githubResources = Number(githubResult[0]?.count || 0);

      console.log(`  GitHub synced resources: ${githubResources}`);

      // Check category distribution
      const categoryDist = await db.select({
        category: resources.category,
        count: sql<number>`count(*)`
      })
        .from(resources)
        .where(eq(resources.githubSynced, true))
        .groupBy(resources.category);

      console.log(`\n  Category distribution:`);
      categoryDist.forEach(cat => {
        console.log(`    - ${cat.category}: ${cat.count}`);
      });

      // Check latest sync history
      const latestSync = await db.select()
        .from(githubSyncHistory)
        .orderBy(sql`${githubSyncHistory.createdAt} DESC`)
        .limit(1);

      console.log(`\n  Latest sync entry:`);
      if (latestSync.length > 0) {
        const sync = latestSync[0];
        console.log(`    - Direction: ${sync.direction}`);
        console.log(`    - Resources added: ${sync.resourcesAdded}`);
        console.log(`    - Resources updated: ${sync.resourcesUpdated}`);
        console.log(`    - Total resources: ${sync.totalResources}`);
        console.log(`    - Created at: ${sync.createdAt}\n`);
      }

      // Sample imported resources
      const sampleResources = await db.select()
        .from(resources)
        .where(eq(resources.githubSynced, true))
        .limit(3);

      console.log(`  Sample imported resources:`);
      sampleResources.forEach((res, idx) => {
        console.log(`    ${idx + 1}. ${res.title}`);
        console.log(`       URL: ${res.url}`);
        console.log(`       Category: ${res.category}`);
        console.log(`       Subcategory: ${res.subcategory || 'N/A'}`);
      });
      console.log();

      this.addResult({
        testName: 'Import results verification',
        passed: githubResources > 0 && categoryDist.length > 0,
        message: `Found ${githubResources} GitHub-synced resources across ${categoryDist.length} categories`,
        details: {
          githubResources,
          categories: categoryDist.length,
          sampleResources: sampleResources.length
        }
      });
    } catch (error: any) {
      this.addResult({
        testName: 'Import results verification',
        passed: false,
        message: `Failed to verify import results: ${error.message}`
      });
      throw error;
    }
  }

  private async testErrorHandling() {
    console.log('🔧 Step 4: Testing error handling...\n');

    try {
      // Test invalid repository URL
      console.log('  Testing invalid repository URL...');
      const invalidResult = await syncService.importFromGitHub(
        'https://github.com/invalid/repo-does-not-exist-12345',
        { forceOverwrite: false }
      );

      const hasErrors = invalidResult.errors.length > 0;
      console.log(`  ${hasErrors ? '✓' : '✗'} Invalid repo error handling: ${hasErrors ? 'PASS' : 'FAIL'}`);

      if (hasErrors) {
        console.log(`    Error: ${invalidResult.errors[0].substring(0, 100)}...\n`);
      }

      this.addResult({
        testName: 'Error handling - invalid repository',
        passed: hasErrors,
        message: hasErrors
          ? 'Correctly handled invalid repository URL'
          : 'Failed to handle invalid repository URL',
        details: { errors: invalidResult.errors }
      });
    } catch (error: any) {
      // Some errors are expected
      this.addResult({
        testName: 'Error handling - invalid repository',
        passed: true,
        message: `Correctly threw error for invalid repository: ${error.message}`
      });
    }
  }

  private addResult(result: TestResult) {
    this.results.push(result);
  }

  private printReport() {
    const duration = (this.endTime - this.startTime) / 1000;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST REPORT: Layer 1 - GitHub Import E2E');
    console.log('═══════════════════════════════════════════════════════════\n');

    this.results.forEach((result, idx) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} Test ${idx + 1}: ${result.testName}`);
      console.log(`   ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log();
    });

    console.log('───────────────────────────────────────────────────────────');
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log('───────────────────────────────────────────────────────────\n');

    if (failed > 0) {
      console.log('❌ LAYER 1 TEST FAILED\n');
      process.exit(1);
    } else {
      console.log('✅ LAYER 1 TEST PASSED\n');
    }
  }
}

// Run the test
const test = new GitHubImportE2ETest();
test.run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
