import { db } from "../server/db";
import { resources, categories, subcategories, subSubcategories } from "../shared/schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { mapCategoryName } from "../shared/categoryMapping";

/**
 * Comprehensive fix for all 7 critical bugs discovered in E2E testing
 * 
 * BUG #1: No foreign key constraints (requires fixing orphaned data first)
 * BUG #2: GitHub import creates orphaned resources (1,778 resources)
 * BUG #3: No unique constraint on subcategories (slug, category_id)
 * BUG #4: No unique constraint on resource URLs
 * BUG #5: awesome-lint errors (will fix in export logic separately)
 * BUG #6: Category deletion lacks protection (will fix in routes separately)
 * BUG #7: No audit trail for category/subcategory changes (will add later)
 */

async function fixAllCriticalBugs() {
  console.log('🔧 Starting comprehensive bug fix...\n');
  
  // ===================================================================
  // STEP 1: Map orphaned resources to canonical categories (BUG #2)
  // ===================================================================
  console.log('📊 STEP 1: Mapping orphaned resources to canonical categories...');
  
  // Get all unique resource categories
  const allResourceCategories = await db
    .selectDistinct({ category: resources.category })
    .from(resources);
  
  console.log(`Found ${allResourceCategories.length} unique categories in resources table`);
  
  // Map each resource category to canonical name
  let mappedCount = 0;
  let unmappedCategories: string[] = [];
  
  for (const { category } of allResourceCategories) {
    if (!category) continue;
    
    const canonicalName = mapCategoryName(category);
    
    if (canonicalName !== category) {
      // Update all resources with this variant to use canonical name
      const result = await db
        .update(resources)
        .set({ category: canonicalName, updatedAt: new Date() })
        .where(eq(resources.category, category));
      
      console.log(`  ✓ Mapped "${category}" → "${canonicalName}"`);
      mappedCount++;
    } else if (canonicalName === category) {
      // Check if this category exists in categories table
      const exists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, category))
        .limit(1);
      
      if (exists.length === 0) {
        unmappedCategories.push(category);
      }
    }
  }
  
  console.log(`\n✅ Mapped ${mappedCount} category variants to canonical names`);
  
  // ===================================================================
  // STEP 2: Create missing canonical categories
  // ===================================================================
  console.log('\n📊 STEP 2: Creating missing canonical categories...');
  
  const missingCategories = unmappedCategories.filter(cat => {
    // These are categories that exist in resources but not in categories table
    // AND are not in the mapping (so they should be canonical)
    return !['Libraries', 'Applications', 'Development tools', 'Resources', 'Registries'].includes(cat);
  });
  
  // Create canonical categories if they don't exist (check both name and slug)
  const canonicalCategories = [
    { name: 'Community & Events', slug: 'community-events' },
    { name: 'Encoding & Codecs', slug: 'encoding-codecs' },
    { name: 'General Tools', slug: 'general-tools' },
    { name: 'Infrastructure & Delivery', slug: 'infrastructure-delivery' },
    { name: 'Intro & Learning', slug: 'intro-learning' },
    { name: 'Media Tools', slug: 'media-tools' },
    { name: 'Players & Clients', slug: 'players-clients' },
    { name: 'Protocols & Transport', slug: 'protocols-transport' },
    { name: 'Standards & Industry', slug: 'standards-industry' },
  ];
  
  for (const cat of canonicalCategories) {
    // Check if category exists by name OR slug
    const existsByName = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, cat.name))
      .limit(1);
    
    const existsBySlug = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, cat.slug))
      .limit(1);
    
    if (existsByName.length === 0 && existsBySlug.length === 0) {
      await db.insert(categories).values(cat);
      console.log(`  ✓ Created category: ${cat.name}`);
    } else if (existsBySlug.length > 0 && existsByName.length === 0) {
      console.log(`  ⚠️  Category with slug "${cat.slug}" exists but with different name - skipping`);
    }
  }
  
  // ===================================================================
  // STEP 3: Handle truly unmapped categories (create as new categories)
  // ===================================================================
  console.log('\n📊 STEP 3: Creating categories for unmapped resources...');
  
  // These are Rust categories that don't map to video categories
  const rustCategories = ['Libraries', 'Applications', 'Development tools', 'Resources', 'Registries'];
  
  for (const catName of rustCategories) {
    const exists = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, catName))
      .limit(1);
    
    if (exists.length === 0) {
      const slug = catName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      await db.insert(categories).values({ name: catName, slug });
      console.log(`  ✓ Created Rust category: ${catName}`);
    }
  }
  
  // ===================================================================
  // STEP 4: Verify no orphaned resources remain
  // ===================================================================
  console.log('\n📊 STEP 4: Verifying data integrity...');
  
  const orphanedCheck = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM resources r
    LEFT JOIN categories c ON r.category = c.name
    WHERE c.id IS NULL
  `);
  
  const orphanedCount = (orphanedCheck.rows[0] as any).count;
  console.log(`Orphaned resources remaining: ${orphanedCount}`);
  
  if (orphanedCount > 0) {
    console.log('\n⚠️  WARNING: Still have orphaned resources. Listing them:');
    const orphaned = await db.execute(sql`
      SELECT r.category, COUNT(*) as count
      FROM resources r
      LEFT JOIN categories c ON r.category = c.name
      WHERE c.id IS NULL
      GROUP BY r.category
      ORDER BY count DESC
    `);
    console.table(orphaned.rows);
    throw new Error('Cannot proceed - still have orphaned resources!');
  }
  
  console.log('✅ No orphaned resources - safe to add foreign keys\n');
  
  // ===================================================================
  // STEP 5: Remove duplicate URLs (BUG #4 prep)
  // ===================================================================
  console.log('📊 STEP 5: Removing duplicate URLs...');
  
  const duplicates = await db.execute(sql`
    SELECT url, COUNT(*) as count, ARRAY_AGG(id ORDER BY id) as ids
    FROM resources
    GROUP BY url
    HAVING COUNT(*) > 1
  `);
  
  let removedDuplicates = 0;
  for (const dup of duplicates.rows as any[]) {
    // Keep the first ID, delete the rest
    const idsToDelete = dup.ids.slice(1);
    for (const id of idsToDelete) {
      await db.delete(resources).where(eq(resources.id, id));
      removedDuplicates++;
    }
    console.log(`  ✓ Removed ${idsToDelete.length} duplicate(s) for URL: ${dup.url}`);
  }
  
  console.log(`\n✅ Removed ${removedDuplicates} duplicate resources\n`);
  
  // ===================================================================
  // STEP 6: Database statistics
  // ===================================================================
  console.log('📊 STEP 6: Final database statistics...\n');
  
  const stats = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM categories) as total_categories,
      (SELECT COUNT(*) FROM subcategories) as total_subcategories,
      (SELECT COUNT(*) FROM sub_subcategories) as total_sub_subcategories,
      (SELECT COUNT(*) FROM resources) as total_resources,
      (SELECT COUNT(*) FROM resources WHERE github_synced = true) as github_synced_resources,
      (SELECT COUNT(*) FROM resources WHERE status = 'approved') as approved_resources
  `);
  
  console.table(stats.rows);
  
  console.log('\n✅ DATA CLEANUP COMPLETE!\n');
  console.log('⚠️  NEXT STEPS:');
  console.log('1. Update shared/schema.ts to add foreign key constraints');
  console.log('2. Add unique constraint on resources.url');
  console.log('3. Add unique constraint on subcategories (slug, category_id)');
  console.log('4. Run: npm run db:push --force');
  console.log('5. Fix GitHub parser to use mapCategoryName before inserting');
  console.log('6. Add delete protection in API routes\n');
  
  process.exit(0);
}

fixAllCriticalBugs().catch((error) => {
  console.error('❌ Error during fix:', error);
  process.exit(1);
});
