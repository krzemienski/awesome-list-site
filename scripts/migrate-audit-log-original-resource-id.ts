#!/usr/bin/env tsx
/**
 * Migration Script: Backfill originalResourceId in resource_audit_log table
 * 
 * This migration addresses a schema change where we added the `original_resource_id`
 * column to preserve audit log associations even after resource deletion.
 * 
 * What it does:
 * - Copies resource_id → original_resource_id for all existing audit logs
 * - Only updates rows where original_resource_id is NULL and resource_id is NOT NULL
 * - Prevents data loss when resources are deleted (foreign key uses ON DELETE SET NULL)
 * 
 * Run this migration ONCE after deploying the schema changes for originalResourceId.
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Audit Log Migration: Backfill originalResourceId     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Check current state
    console.log('Step 1: Checking current audit log state...');
    const beforeStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(original_resource_id) as logs_with_original_id,
        COUNT(resource_id) as logs_with_resource_id,
        COUNT(*) FILTER (WHERE original_resource_id IS NULL AND resource_id IS NOT NULL) as needs_backfill
      FROM resource_audit_log
    `);
    
    const before = beforeStats.rows[0] as any;
    console.log(`  Total audit logs: ${before.total_logs}`);
    console.log(`  Logs with originalResourceId: ${before.logs_with_original_id}`);
    console.log(`  Logs with resourceId: ${before.logs_with_resource_id}`);
    console.log(`  Logs needing backfill: ${before.needs_backfill}`);
    
    if (parseInt(before.needs_backfill) === 0) {
      console.log('\n✓ No backfill needed - all audit logs already have originalResourceId set.\n');
      process.exit(0);
    }

    // Perform backfill
    console.log('\nStep 2: Backfilling originalResourceId from resourceId...');
    const updateResult = await db.execute(sql`
      UPDATE resource_audit_log
      SET original_resource_id = resource_id
      WHERE original_resource_id IS NULL
        AND resource_id IS NOT NULL
    `);
    
    console.log(`  Updated ${updateResult.rowCount || 0} audit log entries\n`);

    // Verify results
    console.log('Step 3: Verifying migration results...');
    const afterStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(original_resource_id) as logs_with_original_id,
        COUNT(resource_id) as logs_with_resource_id,
        COUNT(*) FILTER (WHERE original_resource_id IS NULL AND resource_id IS NOT NULL) as still_needs_backfill
      FROM resource_audit_log
    `);
    
    const after = afterStats.rows[0] as any;
    console.log(`  Total audit logs: ${after.total_logs}`);
    console.log(`  Logs with originalResourceId: ${after.logs_with_original_id}`);
    console.log(`  Logs with resourceId: ${after.logs_with_resource_id}`);
    console.log(`  Logs still needing backfill: ${after.still_needs_backfill}`);
    
    if (parseInt(after.still_needs_backfill) === 0) {
      console.log('\n✓ Migration completed successfully!\n');
      console.log('Note: Audit logs for previously deleted resources (both fields NULL)');
      console.log('      are irrecoverable but harmless test artefacts.\n');
    } else {
      console.log('\n⚠ Warning: Some audit logs still need backfill.');
      console.log('   This is unexpected - please investigate.\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run migration
migrate();
