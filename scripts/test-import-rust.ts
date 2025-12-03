import { syncService } from '../server/github/syncService';

async function testImport() {
  console.log('🚀 Testing awesome-rust import (dry-run)...');

  try {
    const result = await syncService.importFromGitHub(
      'https://github.com/rust-unofficial/awesome-rust',
      { dryRun: true }
    );

    console.log('✅ Dry-run complete:');
    console.log('  - Would import:', result.imported);
    console.log('  - Would update:', result.updated);
    console.log('  - Would skip:', result.skipped);
    console.log('  - Errors:', result.errors.length);

    if (result.errors.length > 0) {
      console.log('  - First 5 errors:', result.errors.slice(0, 5));
    }

    return result;
  } catch (err: any) {
    console.error('❌ Import failed:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }
}

testImport();
