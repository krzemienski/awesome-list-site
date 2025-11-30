import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateCategories() {
  console.log('📁 Migrating category hierarchy...');

  const categoriesCsv = fs.readFileSync('docs/migration/categories.csv', 'utf-8');
  const subcategoriesCsv = fs.readFileSync('docs/migration/subcategories.csv', 'utf-8');
  const subSubcategoriesCsv = fs.readFileSync('docs/migration/sub_subcategories.csv', 'utf-8');

  const categories = parse(categoriesCsv, { columns: true, skip_empty_lines: true });
  const subcategories = parse(subcategoriesCsv, { columns: true, skip_empty_lines: true });
  const subSubcategories = parse(subSubcategoriesCsv, { columns: true, skip_empty_lines: true });

  // Insert categories
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .insert(categories.map((c: any) => ({
      name: c.name,
      slug: c.slug
    })))
    .select();

  if (catError) {
    console.error('❌ Category migration failed:', catError);
    throw catError;
  }

  console.log(`✅ Migrated ${categories.length} categories`);

  // Map old integer IDs to new UUIDs
  const categoryIdMap = new Map<string, string>();
  categories.forEach((oldCat: any, index: number) => {
    categoryIdMap.set(oldCat.id, catData![index].id);
  });

  // Insert subcategories
  const { data: subData, error: subError } = await supabase
    .from('subcategories')
    .insert(subcategories.map((s: any) => ({
      name: s.name,
      slug: s.slug,
      category_id: categoryIdMap.get(s.category_id)
    })))
    .select();

  if (subError) {
    console.error('❌ Subcategory migration failed:', subError);
    throw subError;
  }

  console.log(`✅ Migrated ${subcategories.length} subcategories`);

  // Map subcategory IDs
  const subcategoryIdMap = new Map<string, string>();
  subcategories.forEach((oldSub: any, index: number) => {
    subcategoryIdMap.set(oldSub.id, subData![index].id);
  });

  // Insert sub-subcategories
  const { error: subSubError } = await supabase
    .from('sub_subcategories')
    .insert(subSubcategories.map((s: any) => ({
      name: s.name,
      slug: s.slug,
      subcategory_id: subcategoryIdMap.get(s.subcategory_id)
    })));

  if (subSubError) {
    console.error('❌ Sub-subcategory migration failed:', subSubError);
    throw subSubError;
  }

  console.log(`✅ Migrated ${subSubcategories.length} sub-subcategories`);
}

async function migrateResources() {
  console.log('\n📦 Migrating resources...');

  const csvContent = fs.readFileSync('docs/migration/replit-resources-export.csv', 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Found ${records.length} resources to migrate`);

  // Batch insert (500 at a time)
  const batchSize = 500;
  let migrated = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const supabaseRecords = batch.map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description || '',
      category: r.category,
      subcategory: r.subcategory || null,
      sub_subcategory: r.sub_subcategory || null,
      status: 'approved',
      github_synced: false,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : {},
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    const { error } = await supabase
      .from('resources')
      .insert(supabaseRecords);

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      errors.push(`Batch ${i}: ${error.message}`);
    } else {
      migrated += batch.length;
      console.log(`✅ Progress: ${migrated}/${records.length} resources migrated`);
    }

    // Rate limit: 1 batch per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Resource migration complete: ${migrated}/${records.length} migrated`);
  if (errors.length > 0) {
    console.error(`❌ ${errors.length} batches failed`);
  }

  return { migrated, total: records.length, errors };
}

async function main() {
  console.log('🚀 Starting Supabase migration...\n');

  try {
    // Step 1: Migrate hierarchy
    await migrateCategories();

    // Step 2: Migrate resources
    const result = await migrateResources();

    // Step 3: Verify counts
    const { count: resourceCount } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true });

    const { count: categoryCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Resources: ${resourceCount}`);
    console.log(`   Expected: ${result.total}`);
    console.log(`   Success: ${resourceCount === result.total ? '✅' : '⚠️'}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
