import { db } from '../server/storage';
import { sql } from 'drizzle-orm';

async function validateRustImport() {
  try {
    console.log('🔍 Validating awesome-rust import...\n');

    // Check for Rust-specific categories
    const rustCategories = await db.execute(sql`
      SELECT name, slug, id,
        (SELECT COUNT(*) FROM resources WHERE category = categories.name AND status = 'approved') as resource_count
      FROM categories
      WHERE name IN ('Applications', 'Development tools', 'Libraries', 'Registries', 'Resources')
      ORDER BY name
    `);

    console.log('📊 Rust Categories Found:');
    rustCategories.rows.forEach((cat: any) => {
      console.log(`   ${cat.name}: ${cat.resource_count} resources`);
    });

    // Check metadata section issue
    const metadataCategories = await db.execute(sql`
      SELECT name,
        (SELECT COUNT(*) FROM resources WHERE category = categories.name) as count
      FROM categories
      WHERE name IN ('Registries', 'Resources', 'License')
    `);

    console.log('\n⚠️  Metadata Sections Imported as Categories:');
    metadataCategories.rows.forEach((cat: any) => {
      console.log(`   ${cat.name}: ${cat.count} resources (SHOULD NOT BE A CATEGORY!)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

validateRustImport();
