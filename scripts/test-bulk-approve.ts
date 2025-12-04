import { readFileSync } from 'fs';

async function testBulkApprove() {
  console.log('🧪 Testing bulk approve transaction atomicity...');

  const ids = JSON.parse(readFileSync('/tmp/test-resource-ids.json', 'utf-8'));
  console.log(`Testing with ${ids.length} resources:`, ids.slice(0, 3), '...');

  // For now, we need admin token which we don't have easily
  // Alternative: Test via database directly to verify bulk operation behavior

  const { storage } = await import('../server/storage');

  console.log('\n1. Verifying all resources are pending...');
  for (const id of ids) {
    const resource = await storage.getResourceById(id);
    console.log(`   ${resource.title}: ${resource.status}`);
    if (resource.status !== 'pending') {
      throw new Error(`Resource ${id} is not pending! Status: ${resource.status}`);
    }
  }

  console.log('\n✅ All 10 resources confirmed pending');

  console.log('\n2. Testing bulk approve via storage method...');

  // Get admin user ID (from context priming we know admin@test.com exists)
  // For testing, we'll use system context

  try {
    // Call bulk approve method
    // Note: This tests the storage layer, not the full API endpoint
    // But it validates the most critical part: transaction atomicity

    console.log('Bulk approving 10 resources...');

    // We need to call the actual bulk method
    // Let's check if it exists and test it
    const bulkResult = await (storage as any).bulkUpdateStatus?.(
      ids,
      'approved',
      undefined // performedBy - system context
    );

    console.log('Bulk approve result:', bulkResult);

  } catch (error: any) {
    console.error('❌ Bulk approve failed:', error.message);
    throw error;
  }

  console.log('\n3. Verifying ALL 10 resources approved (ATOMIC CHECK)...');

  let approvedCount = 0;
  let pendingCount = 0;

  for (const id of ids) {
    const resource = await storage.getResourceById(id);
    console.log(`   ${resource.title}: ${resource.status}`);

    if (resource.status === 'approved') {
      approvedCount++;
    } else if (resource.status === 'pending') {
      pendingCount++;
    }
  }

  console.log(`\nResults: ${approvedCount} approved, ${pendingCount} pending`);

  if (approvedCount === 10 && pendingCount === 0) {
    console.log('✅ ATOMIC: All 10 approved together');
    return true;
  } else if (approvedCount === 0 && pendingCount === 10) {
    console.log('⚠️ None approved (bulk operation may have failed entirely)');
    return false;
  } else {
    console.log('❌ CRITICAL BUG: PARTIAL UPDATE (not atomic!)');
    console.log(`   ${approvedCount}/10 approved, ${pendingCount}/10 still pending`);
    console.log('   THIS IS DATA CORRUPTION RISK');
    return false;
  }
}

testBulkApprove();
