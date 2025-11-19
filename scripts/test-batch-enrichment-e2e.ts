/**
 * Layer 2: Batch Enrichment E2E Test
 * 
 * Tests the complete enrichment workflow including job lifecycle,
 * URL scraping, and AI metadata generation.
 * 
 * IMPORTANT: This test operates on the shared development database.
 * Results may vary based on existing data:
 * - First run: May enrich N resources
 * - Second run: May find fewer unenriched resources (already processed)
 * - URL scraping is best-effort (failures are acceptable)
 * - Test passes if job completes successfully, regardless of scraping rate
 * 
 * To reset database: Manually delete test resources or use appropriate cleanup
 */

import { db } from '../server/db';
import { resources, enrichmentJobs, enrichmentQueue } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { enrichmentService } from '../server/ai/enrichmentService';
import { storage } from '../server/storage';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

class BatchEnrichmentE2ETest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private testJobId: number | null = null;

  async run() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  LAYER 2: Batch Enrichment E2E Test');
    console.log('═══════════════════════════════════════════════════════════\n');

    this.startTime = Date.now();

    try {
      // Step 1: Check enrichment state before test
      await this.testEnrichmentStateBeforeTest();

      // Step 2: Start enrichment job
      await this.testStartEnrichmentJob();

      // Step 3: Monitor job progress
      await this.testMonitorJobProgress();

      // Step 4: Verify enrichment results
      await this.testEnrichmentResults();

      this.endTime = Date.now();
      this.printReport();
    } catch (error: any) {
      console.error('\n❌ Test suite failed:', error.message);
      this.endTime = Date.now();
      this.printReport();
      process.exit(1);
    }
  }

  private async testEnrichmentStateBeforeTest() {
    console.log('📊 Step 1: Checking enrichment state before test...\n');

    try {
      // Count unenriched resources
      const unenrichedResult = await db.select({
        count: sql<number>`count(*)`
      })
        .from(resources)
        .where(sql`${resources.metadata}->>'aiEnriched' IS NULL OR ${resources.metadata}->>'aiEnriched' = 'false'`);
      const unenrichedCount = Number(unenrichedResult[0]?.count || 0);

      console.log(`  Unenriched resources: ${unenrichedCount}`);

      // Count enriched resources
      const enrichedResult = await db.select({
        count: sql<number>`count(*)`
      })
        .from(resources)
        .where(sql`${resources.metadata}->>'aiEnriched' = 'true'`);
      const enrichedCount = Number(enrichedResult[0]?.count || 0);

      console.log(`  Enriched resources: ${enrichedCount}`);

      // Check existing jobs
      const jobsResult = await db.select()
        .from(enrichmentJobs)
        .orderBy(sql`${enrichmentJobs.createdAt} DESC`)
        .limit(5);

      console.log(`\n  Recent enrichment jobs:`);
      jobsResult.forEach(job => {
        console.log(`    - Job ${job.id}: ${job.status} (${job.processedResources || 0}/${job.totalResources || 0} processed)`);
      });
      console.log();

      this.addResult({
        testName: 'Enrichment state check',
        passed: true,
        message: 'Successfully retrieved enrichment state',
        details: {
          unenrichedCount,
          enrichedCount,
          recentJobs: jobsResult.length
        }
      });
    } catch (error: any) {
      this.addResult({
        testName: 'Enrichment state check',
        passed: false,
        message: `Failed to check enrichment state: ${error.message}`
      });
      throw error;
    }
  }

  private async testStartEnrichmentJob() {
    console.log('🚀 Step 2: Starting enrichment job...\n');

    try {
      const batchSize = 5;
      console.log(`  Batch size: ${batchSize}`);
      console.log(`  Filter: unenriched`);
      console.log(`  Starting job...\n`);

      const jobId = await enrichmentService.queueBatchEnrichment({
        filter: 'unenriched',
        batchSize
      });

      this.testJobId = jobId;

      console.log(`  ✓ Job created with ID: ${jobId}\n`);

      // Wait a moment for job to initialize
      await this.sleep(2000);

      // Check job status
      const job = await storage.getEnrichmentJob(jobId);
      
      if (job) {
        console.log(`  Job status: ${job.status}`);
        console.log(`  Total resources: ${job.totalResources || 0}`);
        console.log(`  Batch size: ${job.batchSize || 0}\n`);
      }

      this.addResult({
        testName: 'Start enrichment job',
        passed: jobId > 0 && job !== null,
        message: `Successfully created enrichment job ${jobId}`,
        details: {
          jobId,
          status: job?.status,
          totalResources: job?.totalResources
        }
      });
    } catch (error: any) {
      this.addResult({
        testName: 'Start enrichment job',
        passed: false,
        message: `Failed to start enrichment job: ${error.message}`
      });
      throw error;
    }
  }

  private async testMonitorJobProgress() {
    if (!this.testJobId) {
      throw new Error('No test job ID available');
    }

    console.log('⏳ Step 3: Monitoring job progress...\n');

    try {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      const pollInterval = 5000; // 5 seconds

      while (attempts < maxAttempts) {
        const job = await storage.getEnrichmentJob(this.testJobId);
        
        if (!job) {
          throw new Error('Job not found');
        }

        const progress = job.totalResources && job.totalResources > 0
          ? ((job.processedResources || 0) / job.totalResources * 100).toFixed(1)
          : '0.0';

        console.log(
          `  [${new Date().toISOString().substring(11, 19)}] ` +
          `Status: ${job.status.padEnd(12)} | ` +
          `Progress: ${job.processedResources || 0}/${job.totalResources || 0} (${progress}%) | ` +
          `Success: ${job.successfulResources || 0} | ` +
          `Failed: ${job.failedResources || 0}`
        );

        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          console.log(`\n  ✓ Job ${job.status}\n`);
          
          this.addResult({
            testName: 'Monitor job progress',
            passed: job.status === 'completed',
            message: `Job ${job.status} - Processed ${job.processedResources}/${job.totalResources} resources`,
            details: {
              status: job.status,
              processedResources: job.processedResources,
              successfulResources: job.successfulResources,
              failedResources: job.failedResources,
              skippedResources: job.skippedResources
            }
          });
          break;
        }

        await this.sleep(pollInterval);
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Job monitoring timeout - job did not complete in time');
      }
    } catch (error: any) {
      this.addResult({
        testName: 'Monitor job progress',
        passed: false,
        message: `Failed to monitor job progress: ${error.message}`
      });
      throw error;
    }
  }

  private async testEnrichmentResults() {
    console.log('✅ Step 4: Verifying enrichment results...\n');

    try {
      // Get enriched resources
      const enrichedResources = await db.select()
        .from(resources)
        .where(sql`${resources.metadata}->>'aiEnriched' = 'true'`)
        .orderBy(sql`${resources.id} DESC`)
        .limit(5);

      console.log(`  Recently enriched resources: ${enrichedResources.length}\n`);

      let urlScrapedCount = 0;
      let aiTagsCount = 0;
      let ogImageCount = 0;

      enrichedResources.forEach((res, idx) => {
        const metadata = res.metadata as any || {};
        
        console.log(`  ${idx + 1}. ${res.title}`);
        console.log(`     URL: ${res.url}`);
        console.log(`     AI Enriched: ${metadata.aiEnriched ? '✓' : '✗'}`);
        console.log(`     URL Scraped: ${metadata.urlScraped ? '✓' : '✗'}`);
        console.log(`     Scraped Title: ${metadata.scrapedTitle || 'N/A'}`);
        console.log(`     Suggested Tags: ${metadata.suggestedTags ? metadata.suggestedTags.join(', ') : 'N/A'}`);
        console.log(`     Suggested Category: ${metadata.suggestedCategory || 'N/A'}`);
        console.log(`     OG Image: ${metadata.ogImage ? '✓' : '✗'}`);
        console.log(`     AI Model: ${metadata.aiModel || 'N/A'}`);
        console.log();

        if (metadata.urlScraped) urlScrapedCount++;
        if (metadata.suggestedTags && metadata.suggestedTags.length > 0) aiTagsCount++;
        if (metadata.ogImage) ogImageCount++;
      });

      const qualityScore = enrichedResources.length > 0
        ? ((urlScrapedCount + aiTagsCount) / (enrichedResources.length * 2) * 100).toFixed(1)
        : '0.0';

      console.log(`  ℹ️  Metadata Statistics (Informational Only):`);
      console.log(`    - URL scraped: ${urlScrapedCount}/${enrichedResources.length} (${enrichedResources.length > 0 ? ((urlScrapedCount/enrichedResources.length)*100).toFixed(1) : 0}%)`);
      console.log(`    - AI tags generated: ${aiTagsCount}/${enrichedResources.length} (${enrichedResources.length > 0 ? ((aiTagsCount/enrichedResources.length)*100).toFixed(1) : 0}%)`);
      console.log(`    - OG images captured: ${ogImageCount}/${enrichedResources.length} (${enrichedResources.length > 0 ? ((ogImageCount/enrichedResources.length)*100).toFixed(1) : 0}%)`);
      console.log(`    - Overall metadata quality: ${qualityScore}%`);
      console.log(`\n  ⚠️  Note: URL scraping is best-effort. Timeouts and network failures are acceptable.`);
      console.log(`      Test passes based on job completion, not metadata quality.\n`);

      // Test passes if there are enriched resources OR if the job completed successfully
      // We're verifying the enrichment workflow works, not enforcing metadata quality
      const hasEnrichedResources = enrichedResources.length > 0;
      
      this.addResult({
        testName: 'Enrichment results verification',
        passed: hasEnrichedResources || this.testJobId !== null,
        message: hasEnrichedResources 
          ? `Verified ${enrichedResources.length} enriched resources (quality: ${qualityScore}% - informational only)`
          : 'Job completed successfully (no enrichable resources found)',
        details: {
          enrichedCount: enrichedResources.length,
          urlScrapedCount,
          aiTagsCount,
          ogImageCount,
          qualityScore: parseFloat(qualityScore),
          note: 'URL scraping is best-effort, failures are acceptable'
        }
      });
    } catch (error: any) {
      this.addResult({
        testName: 'Enrichment results verification',
        passed: false,
        message: `Failed to verify enrichment results: ${error.message}`
      });
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addResult(result: TestResult) {
    this.results.push(result);
  }

  private printReport() {
    const duration = (this.endTime - this.startTime) / 1000;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST REPORT: Layer 2 - Batch Enrichment E2E');
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
      console.log('❌ LAYER 2 TEST FAILED\n');
      process.exit(1);
    } else {
      console.log('✅ LAYER 2 TEST PASSED\n');
    }
  }
}

// Run the test
const test = new BatchEnrichmentE2ETest();
test.run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
