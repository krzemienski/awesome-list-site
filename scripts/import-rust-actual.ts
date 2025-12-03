import { syncService } from '../server/github/syncService';

async function actualImport() {
  console.log('🚀 ACTUAL awesome-rust import (dryRun=false)...');

  try {
    const result = await syncService.importFromGitHub(
      'https://github.com/rust-unofficial/awesome-rust',
      { dryRun: false }
    );

    console.log('✅ IMPORT COMPLETE:');
    console.log('  - Imported:', result.imported);
    console.log('  - Updated:', result.updated);
    console.log('  - Skipped:', result.skipped);
    console.log('  - Total resources:', result.resources.length);
    console.log('  - Errors:', result.errors.length);

    if (result.errors.length > 0) {
      console.log('  - Errors:', result.errors);
    }

    return result;
  } catch (err: any) {
    console.error('❌ Import failed:', err.message);
    throw err;
  }
}

actualImport();
