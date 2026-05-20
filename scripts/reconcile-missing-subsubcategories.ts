#!/usr/bin/env node
/**
 * Task #55 reconciliation: 241 resources are tagged with a sub_subcategory text
 * whose row doesn't exist under the resource's subcategory. They render on
 * their own /resource/:id URL but never appear in any category drilldown.
 *
 * Strategy: for every distinct (category, subcategory, sub_subcategory) tuple
 * where the subcategory matches a row but the sub_subcategory does not, create
 * the missing sub_subcategories row under that subcategory. The resource's
 * existing text-tags are preserved and the hierarchy walker now finds them.
 *
 * Idempotent: re-running creates no duplicates (uniqueness on slug+subcat).
 */
import { db } from '../server/db';
import { categories, subcategories, subSubcategories, resources } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const missing = await db.execute(sql`
  WITH approved AS (
    SELECT id, category, subcategory, sub_subcategory FROM resources WHERE status='approved'
  )
  SELECT a.category, a.subcategory, a.sub_subcategory, s.id AS subcategory_id, COUNT(*) AS resource_count
  FROM approved a
  JOIN categories c ON c.name = a.category
  JOIN subcategories s ON s.category_id = c.id AND s.name = a.subcategory
  LEFT JOIN sub_subcategories ss ON ss.subcategory_id = s.id AND ss.name = a.sub_subcategory
  WHERE a.sub_subcategory IS NOT NULL AND ss.id IS NULL
  GROUP BY a.category, a.subcategory, a.sub_subcategory, s.id
  ORDER BY a.category, a.subcategory, a.sub_subcategory;
`);

const rows = missing.rows ?? missing;
console.log(`Found ${rows.length} (subcategory, sub_subcategory) pairs needing creation`);

let created = 0;
let skipped = 0;
let totalResources = 0;
for (const row of rows) {
  const subcategoryId = Number(row.subcategory_id);
  const name = String(row.sub_subcategory);
  totalResources += Number(row.resource_count);
  const slug = generateSlug(name);

  // Check by name OR slug under this subcategory (idempotent)
  const existing = await db
    .select()
    .from(subSubcategories)
    .where(and(eq(subSubcategories.subcategoryId, subcategoryId), eq(subSubcategories.slug, slug)))
    .limit(1);
  if (existing.length) {
    skipped++;
    console.log(`  skip (already exists): ${row.category} → ${row.subcategory} → ${name}`);
    continue;
  }
  await db.insert(subSubcategories).values({ name, slug, subcategoryId });
  created++;
  console.log(`  + ${row.category} → ${row.subcategory} → ${name}  [+${row.resource_count} resources]`);
}

console.log(`\nCreated ${created} sub_subcategories, skipped ${skipped}. Resources reconciled: ${totalResources}.`);
process.exit(0);
