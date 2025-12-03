import { storage } from '../server/storage';
import { writeFile } from 'fs/promises';

async function backup() {
  console.log('📊 Backing up current database state...');

  // Use Supabase client directly for raw SQL
  const supabase = (storage as any).supabase;

  if (!supabase) {
    console.log('Using storage methods instead of raw SQL...');
    const resources = await storage.listResources({ limit: 10000, status: 'approved' });
    const categories = await storage.listCategories();

    const snapshot = {
      resources_count: resources.total,
      categories_count: categories.length,
      timestamp: new Date().toISOString()
    };

    console.log('Current state:', snapshot);
    await writeFile('/tmp/db-backup-state.json', JSON.stringify(snapshot, null, 2));
    console.log('✅ Backup saved to /tmp/db-backup-state.json');
    return snapshot;
  }

  // If we have Supabase client, use raw SQL
  const { data, error } = await supabase.rpc('backup_counts', {});

  if (error) {
    throw new Error(`Backup failed: ${error.message}`);
  }

  console.log('Current state:', data);
  await writeFile('/tmp/db-backup-state.json', JSON.stringify(data, null, 2));
  console.log('✅ Backup saved to /tmp/db-backup-state.json');

  return data;
}

backup().catch(console.error);
