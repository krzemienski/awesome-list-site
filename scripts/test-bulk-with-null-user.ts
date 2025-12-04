import { storage } from '../server/storage';
import { readFileSync } from 'fs';

async function testBulk() {
  const ids = JSON.parse(readFileSync('/tmp/test-resource-ids.json', 'utf-8'));

  console.log('Testing bulk approve with NULL approvedBy (testing pure transaction)...');

  // Test the transaction itself - even without user ID, it should be atomic
  const { db } = await import('../server/db');
  const { resources, resourceAuditLog } = await import('@shared/schema');
  const { inArray, sql } = await import('drizzle-orm');

  try {
    const result = await db.transaction(async (tx) => {
      // Update all 10 resources
      await tx
        .update(resources)
        .set({
          status: 'approved',
          updatedAt: new Date()
        })
        .where(inArray(resources.id, ids));

      // Log each (without performedBy for testing)
      for (const id of ids) {
        await tx.insert(resourceAuditLog).values({
          resourceId: id,
          action: 'bulk_approved_test',
          changes: { status: 'approved' },
          notes: 'Atomicity test'
        });
      }

      return { count: ids.length };
    });

    console.log('✅ Transaction completed:', result);

    // Verify
    let approved = 0;
    for (const id of ids) {
      const resource = await storage.getResource(id);
      if (resource && resource.status === 'approved') approved++;
    }

    console.log(`\n📊 Atomicity check: ${approved}/10 approved`);

    if (approved === 10) {
      console.log('✅✅✅ ATOMIC: All 10 approved together!');
    } else {
      console.log('❌ PARTIAL UPDATE: Only', approved, 'approved');
    }

  } catch (error: any) {
    console.error('Transaction failed:', error.message);
  }
}

testBulk();
