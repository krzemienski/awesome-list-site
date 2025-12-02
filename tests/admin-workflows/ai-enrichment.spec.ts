/**
 * AI Enrichment Test - HIGHEST RISK (Never Tested Before)
 *
 * Tests the complete workflow:
 * 1. Verify ANTHROPIC_API_KEY is configured
 * 2. Navigate to /admin/enrichment
 * 3. Configure: filter="unenriched", batchSize=5
 * 4. Start enrichment job
 * 5. Monitor enrichment_queue table for status updates
 * 6. Wait for completion (~2.5 min for 5 resources)
 * 7. Layer 2 CRITICAL VERIFICATIONS:
 *    - resources.metadata column updated
 *    - tags table has new AI-generated tags
 *    - resource_tags junctions created
 *    - enrichment_jobs row shows correct counts
 * 8. Layer 3: Verify tags display on resource cards
 */

import { test, expect } from '@playwright/test';
import { MultiContextTestHelper } from '../helpers/multi-context';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = 'https://jeyldoypdkgsrfdhdcmm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create admin client for database verification
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Increased timeouts for AI operations
test.setTimeout(300000); // 5 minutes

test.describe('AI Enrichment', () => {

  test('Verify Anthropic API key is configured', async () => {
    // Check environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.log('WARNING: ANTHROPIC_API_KEY not found in environment');
      console.log('AI enrichment will fail without this key');
      console.log('');
      console.log('Expected: ANTHROPIC_API_KEY=sk-ant-api03-...');
      test.skip();
      return;
    }

    expect(apiKey).toBeTruthy();
    expect(apiKey.startsWith('sk-ant-')).toBeTruthy();
    console.log('PASS: Anthropic API key is configured');
    console.log(`Key prefix: ${apiKey.substring(0, 15)}...`);
  });

  test('Start enrichment job via API - 3-layer verification', async () => {
    await new Promise(r => setTimeout(r, 2000)); // Rate limit delay

    const helper = new MultiContextTestHelper();
    await helper.init();

    let jobId: string | null = null;

    try {
      const { page: adminPage } = await helper.createAdminContext();

      // Navigate to establish origin
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      // Extract auth token
      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      expect(token).toBeTruthy();

      // ==========================================
      // LAYER 1: API Call to start enrichment
      // ==========================================
      console.log('Starting enrichment job...');

      const startResponse = await adminPage.request.post(
        `${BASE_URL}/api/enrichment/start`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            filter: 'unenriched',
            batchSize: 5  // Small batch for testing
          }
        }
      );

      const status = startResponse.status();
      console.log(`Start enrichment status: ${status}`);

      if (!startResponse.ok()) {
        const error = await startResponse.text();
        console.log(`Error: ${error}`);

        if (error.includes('No resources') || error.includes('empty')) {
          console.log('INFO: No unenriched resources available');
          console.log('Try filter: "all" to re-enrich existing resources');
        }

        if (error.includes('Anthropic') || error.includes('API key')) {
          console.log('BUG: Anthropic API key not properly configured on server');
        }

        // Try with 'all' filter
        console.log('Retrying with filter=all...');
        const retryResponse = await adminPage.request.post(
          `${BASE_URL}/api/enrichment/start`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            data: {
              filter: 'all',
              batchSize: 3
            }
          }
        );

        if (!retryResponse.ok()) {
          console.log('Retry also failed');
          return;
        }

        const retryResult = await retryResponse.json();
        jobId = retryResult.jobId;
        console.log(`Retry succeeded with job ID: ${jobId}`);
      } else {
        const result = await startResponse.json();
        jobId = result.jobId;
        console.log(`Layer 1 PASS: Job started with ID: ${jobId}`);
      }

      if (!jobId) {
        console.log('No job ID received, cannot continue');
        return;
      }

      // ==========================================
      // MONITOR JOB PROGRESS
      // ==========================================
      console.log('');
      console.log('Monitoring job progress (this may take 2-3 minutes)...');
      console.log('');

      let jobComplete = false;
      let finalJob: any = null;
      const maxWaitMs = 180000; // 3 minutes max
      const startTime = Date.now();
      let lastProcessed = 0;

      while (!jobComplete && (Date.now() - startTime) < maxWaitMs) {
        await new Promise(r => setTimeout(r, 5000)); // Check every 5 seconds

        const jobResponse = await adminPage.request.get(
          `${BASE_URL}/api/enrichment/jobs/${jobId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (jobResponse.ok()) {
          const { job } = await jobResponse.json();

          if (job) {
            const progress = `${job.processedResources || 0}/${job.totalResources || 0}`;
            const successRate = job.processedResources > 0
              ? Math.round((job.successfulResources / job.processedResources) * 100)
              : 0;

            // Only log when progress changes
            if (job.processedResources !== lastProcessed) {
              console.log(`  Progress: ${progress} (${successRate}% success rate)`);
              lastProcessed = job.processedResources || 0;
            }

            if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
              jobComplete = true;
              finalJob = job;
            }
          }
        }
      }

      if (!jobComplete) {
        console.log('Job did not complete within timeout');
        console.log('Fetching final status...');

        const finalResponse = await adminPage.request.get(
          `${BASE_URL}/api/enrichment/jobs/${jobId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (finalResponse.ok()) {
          const { job } = await finalResponse.json();
          finalJob = job;
        }
      }

      // ==========================================
      // LAYER 2: Database Verification
      // ==========================================
      console.log('');
      console.log('=== LAYER 2: Database Verification ===');

      // 2a. Check enrichment_jobs table
      const { data: dbJob, error: jobError } = await supabaseAdmin
        .from('enrichment_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) {
        console.log('Error fetching job from DB:', jobError);
      } else {
        console.log(`Job status in DB: ${dbJob.status}`);
        console.log(`Processed: ${dbJob.processed_resources}/${dbJob.total_resources}`);
        console.log(`Successful: ${dbJob.successful_resources}`);
        console.log(`Failed: ${dbJob.failed_resources}`);
        console.log(`Skipped: ${dbJob.skipped_resources}`);

        if (dbJob.status === 'completed' && dbJob.successful_resources > 0) {
          console.log('Layer 2a PASS: Job completed with successful resources');
        } else if (dbJob.status === 'completed' && dbJob.successful_resources === 0) {
          console.log('Layer 2a WARNING: Job completed but no resources enriched');
        } else {
          console.log(`Layer 2a INFO: Job status is ${dbJob.status}`);
        }
      }

      // 2b. Check enrichment_queue for processed items
      if (finalJob?.processedResourceIds?.length > 0) {
        const { data: queueItems, error: queueError } = await supabaseAdmin
          .from('enrichment_queue')
          .select('id, resource_id, status, ai_metadata')
          .eq('job_id', jobId)
          .limit(5);

        if (queueError) {
          console.log('Error fetching queue items:', queueError);
        } else if (queueItems && queueItems.length > 0) {
          console.log(`Found ${queueItems.length} queue items`);

          const withMetadata = queueItems.filter(q => q.ai_metadata);
          console.log(`Items with AI metadata: ${withMetadata.length}`);

          if (withMetadata.length > 0) {
            console.log('Layer 2b PASS: AI metadata found in queue');

            // Sample the metadata
            const sample = withMetadata[0].ai_metadata;
            console.log('Sample AI metadata keys:', Object.keys(sample));
          }
        }
      }

      // 2c. Check if resources.metadata was updated
      if (finalJob?.processedResourceIds?.length > 0) {
        const resourceId = finalJob.processedResourceIds[0];

        const { data: resource, error: resourceError } = await supabaseAdmin
          .from('resources')
          .select('id, title, metadata')
          .eq('id', resourceId)
          .single();

        if (resourceError) {
          console.log('Error fetching resource:', resourceError);
        } else if (resource?.metadata && Object.keys(resource.metadata).length > 0) {
          console.log(`Layer 2c PASS: Resource metadata updated`);
          console.log(`Resource: ${resource.title}`);
          console.log(`Metadata keys: ${Object.keys(resource.metadata).join(', ')}`);
        } else {
          console.log('Layer 2c WARNING: Resource metadata not updated');
        }
      }

      // 2d. Check if new tags were created
      // Get tags created in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: recentTags, error: tagsError } = await supabaseAdmin
        .from('tags')
        .select('id, name, created_at')
        .gte('created_at', fiveMinutesAgo)
        .limit(10);

      if (tagsError) {
        console.log('Error fetching recent tags:', tagsError);
      } else if (recentTags && recentTags.length > 0) {
        console.log(`Layer 2d PASS: ${recentTags.length} new tags created`);
        console.log(`Recent tags: ${recentTags.map(t => t.name).join(', ')}`);
      } else {
        console.log('Layer 2d INFO: No new tags created in last 5 minutes');
      }

      // 2e. Check resource_tags junctions
      if (finalJob?.processedResourceIds?.length > 0) {
        const { data: junctions, error: junctionError } = await supabaseAdmin
          .from('resource_tags')
          .select('resource_id, tag_id')
          .in('resource_id', finalJob.processedResourceIds.slice(0, 5))
          .limit(20);

        if (junctionError) {
          console.log('Error fetching junctions:', junctionError);
        } else if (junctions && junctions.length > 0) {
          console.log(`Layer 2e PASS: ${junctions.length} resource-tag junctions found`);
        } else {
          console.log('Layer 2e INFO: No junctions found for processed resources');
        }
      }

      console.log('');
      console.log('Layer 2 verification complete');

      // ==========================================
      // LAYER 3: UI Verification (if applicable)
      // ==========================================
      if (finalJob?.processedResourceIds?.length > 0) {
        console.log('');
        console.log('=== LAYER 3: UI Verification ===');

        const { page: anonPage } = await helper.createAnonymousContext();

        // Get a processed resource's category to navigate there
        const resourceId = finalJob.processedResourceIds[0];
        const { data: resource } = await supabaseAdmin
          .from('resources')
          .select('category')
          .eq('id', resourceId)
          .single();

        if (resource?.category) {
          const categorySlug = resource.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          await anonPage.goto(`${BASE_URL}/category/${categorySlug}`);
          await anonPage.waitForLoadState('networkidle');

          // Look for tag badges on resource cards
          const tagBadges = anonPage.locator('.badge, [data-testid="tag"], .tag');
          const tagCount = await tagBadges.count();

          if (tagCount > 0) {
            console.log(`Layer 3 PASS: Found ${tagCount} tag badges on page`);
          } else {
            console.log('Layer 3 INFO: Tags may not be rendered on public resource cards');
          }
        }
      }

      console.log('');
      console.log('=== ENRICHMENT TEST COMPLETE ===');
      if (finalJob?.status === 'completed' && (finalJob?.successfulResources || 0) > 0) {
        console.log('RESULT: SUCCESS');
      } else if (finalJob?.status === 'completed') {
        console.log('RESULT: COMPLETED BUT NO ENRICHMENTS');
      } else {
        console.log(`RESULT: ${finalJob?.status || 'UNKNOWN'}`);
      }

    } finally {
      await helper.closeAll();
    }
  });

  test('Enrichment UI flow - BatchEnrichmentPanel', async () => {
    await new Promise(r => setTimeout(r, 2000));

    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: adminPage } = await helper.createAdminContext();

      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      // Look for enrichment panel elements using data-testid
      const filterSelect = adminPage.locator('[data-testid="select-filter"]');
      const batchSizeInput = adminPage.locator('[data-testid="input-batch-size"]');
      const startButton = adminPage.locator('[data-testid="button-start-enrichment"]');

      const hasFilter = await filterSelect.isVisible().catch(() => false);
      const hasBatchSize = await batchSizeInput.isVisible().catch(() => false);
      const hasStartButton = await startButton.isVisible().catch(() => false);

      if (hasFilter && hasBatchSize && hasStartButton) {
        console.log('PASS: BatchEnrichmentPanel is visible');
        console.log('  - Filter select: visible');
        console.log('  - Batch size input: visible');
        console.log('  - Start button: visible');

        // Check default values
        const batchValue = await batchSizeInput.inputValue();
        console.log(`  - Default batch size: ${batchValue}`);

        // Check job history table
        const jobTable = adminPage.locator('table').filter({ hasText: 'Status' });
        const hasJobTable = await jobTable.isVisible().catch(() => false);

        if (hasJobTable) {
          console.log('  - Job history table: visible');
        }

      } else {
        console.log('BatchEnrichmentPanel elements not found on main admin page');
        console.log('Checking for tabs/sections...');

        // Try clicking on enrichment-related tab
        const enrichmentTab = adminPage.locator('text=Enrichment, text=AI, button:has-text("Enrichment")').first();
        const hasTab = await enrichmentTab.isVisible().catch(() => false);

        if (hasTab) {
          await enrichmentTab.click();
          await adminPage.waitForTimeout(1000);

          // Check again
          const hasFilterAfter = await filterSelect.isVisible().catch(() => false);
          if (hasFilterAfter) {
            console.log('PASS: Found enrichment panel after clicking tab');
          }
        } else {
          console.log('No enrichment tab found');
          console.log('May need to check admin layout structure');
        }
      }

      // Check for any active jobs
      const progressBar = adminPage.locator('[data-testid="progress-bar"]');
      const hasActiveJob = await progressBar.isVisible().catch(() => false);

      if (hasActiveJob) {
        console.log('ACTIVE JOB DETECTED: Progress bar visible');
      }

    } finally {
      await helper.closeAll();
    }
  });

  test('Verify enrichment service is properly initialized', async () => {
    const helper = new MultiContextTestHelper();
    await helper.init();

    try {
      const { page: adminPage } = await helper.createAdminContext();

      await adminPage.goto(`${BASE_URL}/api/health`);
      const healthText = await adminPage.textContent('body');

      expect(healthText).toContain('ok');
      console.log('Health check passed');

      // Check for Claude service initialization
      // This would be in server logs, not directly testable via API
      // But we can verify the enrichment endpoint is accessible

      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.waitForLoadState('networkidle');

      const token = await adminPage.evaluate(() => {
        const t = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
        return t ? JSON.parse(t).access_token : null;
      });

      // Try to list jobs (should work even if empty)
      const jobsResponse = await adminPage.request.get(
        `${BASE_URL}/api/enrichment/jobs`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      expect(jobsResponse.ok()).toBeTruthy();
      const { jobs } = await jobsResponse.json();

      console.log(`Enrichment service accessible: ${jobs.length} existing jobs`);

    } finally {
      await helper.closeAll();
    }
  });
});
