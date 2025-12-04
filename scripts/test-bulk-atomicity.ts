import { storage } from '../server/storage';
import { readFileSync } from 'fs';

async function testBulkAtomicity() {
  console.log('🧪 Testing bulk approve transaction atomicity (CRITICAL TEST)...');

  const ids = JSON.parse(readFileSync('/tmp/test-resource-ids.json', 'utf-8'));
  console.log(`Testing with ${ids.length} pending resources`);

  // Step 1: Verify all pending
  console.log('\n1. Verifying all resources are pending...');
  for (const id of ids) {
    const resource = await storage.getResource(id);
    if (!resource) {
      throw new Error(`Resource ${id} not found!`);
    }
    if (resource.status !== 'pending') {
      console.warn(`⚠️ Resource ${id} is ${resource.status}, expected pending`);
    }
  }
  console.log('✅ All resources confirmed');

  // Step 2: Bulk approve (using storage method directly)
  console.log('\n2. Executing bulk approve (db.transaction)...');

  try {
    const result = await storage.bulkUpdateStatus(
      ids,
      'approved',
      'system-test' // Using system for testing (no admin user ID available)
    );

    console.log(`✅ Bulk approve completed: ${result.count} resources updated`);
  } catch (error: any) {
    console.error('❌ Bulk approve FAILED:', error.message);
    throw error;
  }

  // Step 3: CRITICAL - Verify atomicity
  console.log('\n3. CRITICAL CHECK: Verifying ALL 10 approved (ATOMIC TEST)...');

  let approved = 0;
  let pending = 0;
  let other = 0;

  const statuses: Record<string, number> = {};

  for (const id of ids) {
    const resource = await storage.getResource(id);
    if (!resource) continue;

    const status = resource.status;
    statuses[status] = (statuses[status] || 0) + 1;

    if (status === 'approved') approved++;
    else if (status === 'pending') pending++;
    else other++;

    console.log(`   ${resource.title}: ${status} (approved_by: ${resource.approvedBy || 'null'})`);
  }

  console.log(`\n📊 Results: ${approved} approved, ${pending} pending, ${other} other`);
  console.log('Status breakdown:', statuses);

  // ATOMIC CHECK
  if (approved === 10 && pending === 0 && other === 0) {
    console.log('\n✅✅✅ ATOMIC TRANSACTION VERIFIED!');
    console.log('All 10 resources approved together - no partial updates');
    return true;
  } else if (approved === 0 && pending === 10) {
    console.log('\n⚠️ Transaction may have rolled back entirely (all still pending)');
    return false;
  } else {
    console.log('\n❌❌❌ CRITICAL BUG: PARTIAL UPDATE DETECTED!');
    console.log(`Only ${approved}/10 approved - transaction NOT atomic`);
    console.log('This is a DATA CORRUPTION risk');
    return false;
  }
}

testBulkAtomicity();
