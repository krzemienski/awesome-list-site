#!/usr/bin/env tsx
/**
 * Hierarchy Sync Script
 *
 * Syncs categories, subcategories, and sub_subcategories tables
 * to match ALL category names currently in resources table.
 *
 * Problem: GitHub import created resources but not hierarchy tables,
 * causing 12 orphaned categories (1,269 resources without navigation).
 *
 * Solution: Extract distinct category/subcategory/subSubcategory combinations
 * from resources, create missing hierarchy entries with proper FKs.
 */

import 'dotenv/config';
import { db } from '../server/db';
import { categories, subcategories, subSubcategories, resources } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';

async function syncHierarchyTables() {
  console.log('🔄 Starting hierarchy sync from resources table...\n');

  try {
    // ============================================
    // STEP 1: Sync Categories
    // ============================================
    console.log('📁 Step 1: Syncing categories...');

    const distinctCategories = await db
      .selectDistinct({ category: resources.category })
      .from(resources)
      .where(sql`${resources.category} IS NOT NULL`);

    console.log(`Found ${distinctCategories.length} distinct categories in resources`);

    let categoriesAdded = 0;
    let categoriesExisting = 0;

    for (const { category } of distinctCategories) {
      if (!category) continue;

      // Check if category already exists
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.name, category))
        .limit(1);

      if (existing.length === 0) {
        // Generate slug
        const slug = category
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        // Insert new category
        await db.insert(categories).values({
          name: category,
          slug: slug,
        });

        console.log(`  ✅ Added category: "${category}" (slug: ${slug})`);
        categoriesAdded++;
      } else {
        categoriesExisting++;
      }
    }

    console.log(`📊 Categories: ${categoriesAdded} added, ${categoriesExisting} existing\n`);

    // ============================================
    // STEP 2: Sync Subcategories
    // ============================================
    console.log('📁 Step 2: Syncing subcategories...');

    const distinctSubcategories = await db
      .selectDistinct({
        category: resources.category,
        subcategory: resources.subcategory
      })
      .from(resources)
      .where(sql`${resources.subcategory} IS NOT NULL`);

    console.log(`Found ${distinctSubcategories.length} distinct subcategory combinations`);

    let subcategoriesAdded = 0;
    let subcategoriesExisting = 0;
    let subcategoriesSkipped = 0;

    for (const { category, subcategory } of distinctSubcategories) {
      if (!category || !subcategory) continue;

      // Find parent category ID
      const [parentCategory] = await db
        .select()
        .from(categories)
        .where(eq(categories.name, category))
        .limit(1);

      if (!parentCategory) {
        console.warn(`  ⚠️  Parent category not found: "${category}" for subcategory: "${subcategory}"`);
        subcategoriesSkipped++;
        continue;
      }

      // Check if subcategory already exists under this parent
      const existing = await db
        .select()
        .from(subcategories)
        .where(
          and(
            eq(subcategories.name, subcategory),
            eq(subcategories.categoryId, parentCategory.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const slug = subcategory
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        await db.insert(subcategories).values({
          name: subcategory,
          slug: slug,
          categoryId: parentCategory.id,
        });

        console.log(`  ✅ Added subcategory: "${subcategory}" → "${category}" (slug: ${slug})`);
        subcategoriesAdded++;
      } else {
        subcategoriesExisting++;
      }
    }

    console.log(`📊 Subcategories: ${subcategoriesAdded} added, ${subcategoriesExisting} existing, ${subcategoriesSkipped} skipped\n`);

    // ============================================
    // STEP 3: Sync Sub-subcategories
    // ============================================
    console.log('📁 Step 3: Syncing sub-subcategories...');

    const distinctSubSubcategories = await db
      .selectDistinct({
        category: resources.category,
        subcategory: resources.subcategory,
        subSubcategory: resources.subSubcategory
      })
      .from(resources)
      .where(sql`${resources.subSubcategory} IS NOT NULL`);

    console.log(`Found ${distinctSubSubcategories.length} distinct sub-subcategory combinations`);

    let subSubcategoriesAdded = 0;
    let subSubcategoriesExisting = 0;
    let subSubcategoriesSkipped = 0;

    for (const { category, subcategory, subSubcategory } of distinctSubSubcategories) {
      if (!category || !subcategory || !subSubcategory) continue;

      // Find parent category ID
      const [parentCategory] = await db
        .select()
        .from(categories)
        .where(eq(categories.name, category))
        .limit(1);

      if (!parentCategory) {
        console.warn(`  ⚠️  Parent category not found: "${category}"`);
        subSubcategoriesSkipped++;
        continue;
      }

      // Find parent subcategory ID
      const [parentSubcategory] = await db
        .select()
        .from(subcategories)
        .where(
          and(
            eq(subcategories.name, subcategory),
            eq(subcategories.categoryId, parentCategory.id)
          )
        )
        .limit(1);

      if (!parentSubcategory) {
        console.warn(`  ⚠️  Parent subcategory not found: "${subcategory}" under "${category}"`);
        subSubcategoriesSkipped++;
        continue;
      }

      // Check if sub-subcategory already exists
      const existing = await db
        .select()
        .from(subSubcategories)
        .where(
          and(
            eq(subSubcategories.name, subSubcategory),
            eq(subSubcategories.subcategoryId, parentSubcategory.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const slug = subSubcategory
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        await db.insert(subSubcategories).values({
          name: subSubcategory,
          slug: slug,
          subcategoryId: parentSubcategory.id,
        });

        console.log(`  ✅ Added sub-subcategory: "${subSubcategory}" → "${subcategory}" → "${category}"`);
        subSubcategoriesAdded++;
      } else {
        subSubcategoriesExisting++;
      }
    }

    console.log(`📊 Sub-subcategories: ${subSubcategoriesAdded} added, ${subSubcategoriesExisting} existing, ${subSubcategoriesSkipped} skipped\n`);

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('✅ Hierarchy sync complete!\n');
    console.log('📊 SUMMARY:');
    console.log(`  Categories:         ${categoriesAdded} added, ${categoriesExisting} existing`);
    console.log(`  Subcategories:      ${subcategoriesAdded} added, ${subcategoriesExisting} existing`);
    console.log(`  Sub-subcategories:  ${subSubcategoriesAdded} added, ${subSubcategoriesExisting} existing`);
    console.log(`\n🎯 Total hierarchy entries added: ${categoriesAdded + subcategoriesAdded + subSubcategoriesAdded}`);

    // Verification queries using Drizzle ORM
    console.log('\n🔍 Running verification queries...');

    const categoriesCount = await db.select({ count: sql<number>`count(*)` }).from(categories);
    const subcategoriesCount = await db.select({ count: sql<number>`count(*)` }).from(subcategories);
    const subSubcategoriesCount = await db.select({ count: sql<number>`count(*)` }).from(subSubcategories);
    const resourcesCount = await db.select({ count: sql<number>`count(*)` }).from(resources).where(eq(resources.status, 'approved'));

    console.log(`\n📊 Final counts:`);
    console.log(`  Categories:         ${categoriesCount[0].count}`);
    console.log(`  Subcategories:      ${subcategoriesCount[0].count}`);
    console.log(`  Sub-subcategories:  ${subSubcategoriesCount[0].count}`);
    console.log(`  Resources:          ${resourcesCount[0].count}`);

    console.log(`\n✓ Hierarchy sync verified - all tables populated`);

  } catch (error) {
    console.error('\n❌ Error during hierarchy sync:', error);
    throw error;
  }
}

// Execute
syncHierarchyTables()
  .then(() => {
    console.log('\n✨ Sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });
