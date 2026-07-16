import fetch from 'node-fetch';
import { db } from "./db";
import { categories, subcategories, subSubcategories, resources, users, resourceEdits, tags, resourceTags } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword } from "./passwordUtils";
import { mapCategoryName } from "@shared/categoryMapping";
import { seedJourneyStepsForExisting } from "./cli/seedJourneyStepsForExisting";

/**
 * Helper function to generate slugs from category names
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Backfill the tags and resource_tags tables from resources.metadata.tags.
 * The UI renders tags straight from metadata, but the public developer API
 * (/api/public/tags) reads the tags table — which nothing populated, so it
 * always returned an empty list. Idempotent: safe to run on every boot.
 * Returns the number of rows actually inserted this run (conflict-skipped
 * rows are not counted).
 */
async function seedTagsFromResourceMetadata(): Promise<{ tagRows: number; linkRows: number }> {
  const allResources = await db
    .select({ id: resources.id, metadata: resources.metadata })
    .from(resources)
    .where(eq(resources.status, 'approved'));

  const tagNameToResourceIds = new Map<string, number[]>();
  for (const r of allResources) {
    const metaTags = (r.metadata as { tags?: unknown } | null)?.tags;
    if (!Array.isArray(metaTags)) continue;
    for (const raw of metaTags) {
      if (typeof raw !== 'string') continue;
      const name = raw.trim().toLowerCase();
      if (!name) continue;
      const ids = tagNameToResourceIds.get(name) ?? [];
      ids.push(r.id);
      tagNameToResourceIds.set(name, ids);
    }
  }

  if (tagNameToResourceIds.size === 0) return { tagRows: 0, linkRows: 0 };

  const tagValues = Array.from(tagNameToResourceIds.keys()).map((name) => ({
    name,
    slug: generateSlug(name) || name,
  }));
  // Insert in chunks to keep statements a reasonable size. `.returning()`
  // after onConflictDoNothing yields only the rows actually written, so the
  // counts we report are real inserts — not attempts that may have been
  // skipped because the row already existed.
  let insertedTagRows = 0;
  for (let i = 0; i < tagValues.length; i += 500) {
    const inserted = await db
      .insert(tags)
      .values(tagValues.slice(i, i + 500))
      .onConflictDoNothing()
      .returning({ id: tags.id });
    insertedTagRows += inserted.length;
  }

  const tagRows = await db.select({ id: tags.id, name: tags.name }).from(tags);
  const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

  const linkValues: { resourceId: number; tagId: number }[] = [];
  for (const [name, resourceIds] of tagNameToResourceIds) {
    const tagId = tagIdByName.get(name);
    if (!tagId) continue;
    for (const resourceId of resourceIds) {
      linkValues.push({ resourceId, tagId });
    }
  }
  let insertedLinkRows = 0;
  for (let i = 0; i < linkValues.length; i += 1000) {
    const inserted = await db
      .insert(resourceTags)
      .values(linkValues.slice(i, i + 1000))
      .onConflictDoNothing()
      .returning({ resourceId: resourceTags.resourceId });
    insertedLinkRows += inserted.length;
  }

  return { tagRows: insertedTagRows, linkRows: insertedLinkRows };
}

interface VideoCategory {
  id: string;
  title: string;
  parent?: string;
}

interface CategoryHierarchy {
  level1: Map<string, VideoCategory>;
  level2: Map<string, { category: VideoCategory; parentId: string }>;
  level3: Map<string, { category: VideoCategory; parentId: string }>;
}

/**
 * Build category hierarchy from JSON categories
 */
function buildCategoryHierarchy(jsonCategories: VideoCategory[]): CategoryHierarchy {
  const categoryMap = new Map<string, VideoCategory>();
  jsonCategories.forEach(cat => categoryMap.set(cat.id, cat));

  const hierarchy: CategoryHierarchy = {
    level1: new Map(),
    level2: new Map(),
    level3: new Map(),
  };

  // Classify categories by level
  for (const cat of jsonCategories) {
    if (!cat.parent) {
      // Level 1: No parent
      hierarchy.level1.set(cat.id, cat);
    } else {
      const parent = categoryMap.get(cat.parent);
      if (parent && !parent.parent) {
        // Level 2: Parent has no parent
        hierarchy.level2.set(cat.id, { category: cat, parentId: cat.parent });
      } else if (parent?.parent) {
        // Level 3: Parent has a parent
        hierarchy.level3.set(cat.id, { category: cat, parentId: cat.parent });
      }
    }
  }

  return hierarchy;
}

/**
 * Find the deepest category in a list
 */
function findDeepestCategory(
  categoryIds: string[],
  categoryMap: Map<string, VideoCategory>
): { id: string; depth: number } | null {
  let deepestId: string | null = null;
  let maxDepth = 0;

  for (const catId of categoryIds) {
    const depth = getCategoryDepth(catId, categoryMap);
    if (depth > maxDepth) {
      maxDepth = depth;
      deepestId = catId;
    }
  }

  return deepestId ? { id: deepestId, depth: maxDepth } : null;
}

/**
 * Get category depth (1, 2, or 3)
 */
function getCategoryDepth(categoryId: string, categoryMap: Map<string, VideoCategory>): number {
  const category = categoryMap.get(categoryId);
  if (!category) return 0;

  if (!category.parent) return 1;

  const parent = categoryMap.get(category.parent);
  if (!parent?.parent) return 2;

  return 3;
}

/**
 * Find all ancestor categories for a given category
 */
function findAncestors(
  categoryId: string,
  categoryMap: Map<string, VideoCategory>
): { level1?: VideoCategory; level2?: VideoCategory; level3?: VideoCategory } {
  const category = categoryMap.get(categoryId);
  if (!category) return {};

  const depth = getCategoryDepth(categoryId, categoryMap);

  if (depth === 1) {
    return { level1: category };
  } else if (depth === 2) {
    const parent = category.parent ? categoryMap.get(category.parent) : undefined;
    return { level1: parent, level2: category };
  } else if (depth === 3) {
    const parent = category.parent ? categoryMap.get(category.parent) : undefined;
    const grandparent = parent?.parent ? categoryMap.get(parent.parent) : undefined;
    return { level1: grandparent, level2: parent, level3: category };
  }

  return {};
}

export interface SeedResult {
  categoriesInserted: number;
  subcategoriesInserted: number;
  subSubcategoriesInserted: number;
  resourcesInserted: number;
  adminUserCreated: boolean;
  errors: string[];
}

async function seedAdminUser(): Promise<boolean> {
  try {
    const adminEmail = "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || adminPassword.length < 8) {
      console.warn(
        `⚠️  ADMIN_PASSWORD is not set (or is shorter than 8 characters) — skipping admin user creation. ` +
        `Set the ADMIN_PASSWORD secret to seed the local admin account (${adminEmail}).`
      );
      return false;
    }

    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log(`ℹ️  Admin user already exists (${adminEmail})`);
      return false;
    }
    
    const hashedPassword = await hashPassword(adminPassword);
    
    await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔐 ADMIN USER CREATED`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: (value of the ADMIN_PASSWORD secret — never logged)`);
    console.log(`${'='.repeat(60)}\n`);

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to create admin user: ${errorMessage}`);
    return false;
  }
}

/**
 * Boot-time admin-password reconciliation. seedAdminUser() only runs when the
 * database is empty, so on a populated deployment there is otherwise NO path
 * to rotate the local admin password (production DB is not directly writable;
 * the reset-email flow can't reach the placeholder admin inbox). This runs on
 * every boot: if the ADMIN_PASSWORD secret is set and differs from the stored
 * hash for admin@example.com, the hash is rotated. Idempotent, never logs the
 * password value. No-ops when the secret is unset/short or the user is absent.
 */
export async function syncAdminPasswordFromEnv(): Promise<void> {
  const adminEmail = "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.length < 8) return;

  const existing = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existing.length === 0) return; // creation is seedAdminUser's job

  const admin = existing[0];
  if (admin.password && (await comparePassword(adminPassword, admin.password))) {
    return; // already in sync — nothing to do
  }

  const hashedPassword = await hashPassword(adminPassword);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, admin.id));
  console.log(`🔐 Admin password rotated from ADMIN_PASSWORD secret (${adminEmail})`);
}

/**
 * Main seeding function
 * Populates the database with categories, subcategories, sub-subcategories, and resources
 */
export async function seedDatabase(options: { clearExisting?: boolean } = {}): Promise<SeedResult> {
  const result: SeedResult = {
    categoriesInserted: 0,
    subcategoriesInserted: 0,
    subSubcategoriesInserted: 0,
    resourcesInserted: 0,
    adminUserCreated: false,
    errors: [],
  };

  try {
    console.log("🌱 Starting database seeding...");
    
    result.adminUserCreated = await seedAdminUser();

    // Optional: Clear existing data
    if (options.clearExisting) {
      console.log("🗑️  Clearing existing data...");
      // Clear tables in correct order respecting foreign key constraints
      await db.delete(resourceEdits); // Must delete before resources (FK constraint)
      await db.delete(resources);
      await db.delete(subSubcategories);
      await db.delete(subcategories);
      await db.delete(categories);
      console.log("✅ Existing data cleared");
    }

    // Fetch raw JSON data directly
    console.log("📥 Fetching awesome-video data...");
    const jsonUrl = "https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json";
    const response = await fetch(jsonUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const awesomeData = await response.json() as { 
      title?: string; 
      categories?: VideoCategory[]; 
      projects?: { title: string; homepage: string; description: string; category: string[]; tags?: string[]; }[];
    };
    
    if (!awesomeData.categories || !awesomeData.projects) {
      throw new Error("Invalid data structure from awesome-video JSON");
    }

    console.log(`📊 Found ${awesomeData.categories.length} categories and ${awesomeData.projects.length} resources`);

    // Build category map and hierarchy
    const categoryMap = new Map<string, VideoCategory>();
    awesomeData.categories.forEach((cat: VideoCategory) => {
      categoryMap.set(cat.id, cat);
    });

    const hierarchy = buildCategoryHierarchy(awesomeData.categories);
    console.log(`📂 Hierarchy: ${hierarchy.level1.size} L1, ${hierarchy.level2.size} L2, ${hierarchy.level3.size} L3`);

    // Maps to track database IDs
    const categoryDbMap = new Map<string, number>(); // JSON ID -> DB ID
    const subcategoryDbMap = new Map<string, number>();
    const subSubcategoryDbMap = new Map<string, number>();

    // Insert Level 1 Categories
    console.log("📁 Inserting level 1 categories...");
    for (const [jsonId, cat] of Array.from(hierarchy.level1.entries())) {
      try {
        const slug = generateSlug(cat.title);
        
        // Check if category already exists
        const existing = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
        
        let dbId: number;
        if (existing.length > 0) {
          dbId = existing[0].id;
          console.log(`  ⏭️  Category "${cat.title}" already exists (ID: ${dbId})`);
        } else {
          const [inserted] = await db.insert(categories).values({
            name: cat.title,
            slug: slug,
          }).returning();
          dbId = inserted.id;
          result.categoriesInserted++;
          console.log(`  ✅ Inserted category: ${cat.title} (ID: ${dbId})`);
        }

        categoryDbMap.set(jsonId, dbId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorMsg = `Failed to insert category ${cat.title}: ${errorMessage}`;
        console.error(`  ❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Insert Level 2 Subcategories
    console.log("📁 Inserting level 2 subcategories...");
    for (const [jsonId, { category: cat, parentId }] of Array.from(hierarchy.level2.entries())) {
      try {
        const parentDbId = categoryDbMap.get(parentId);
        if (!parentDbId) {
          throw new Error(`Parent category not found in database: ${parentId}`);
        }

        const slug = generateSlug(cat.title);
        
        // Check if subcategory already exists
        const existing = await db.select().from(subcategories)
          .where(eq(subcategories.slug, slug))
          .limit(1);
        
        let dbId: number;
        if (existing.length > 0) {
          dbId = existing[0].id;
          console.log(`  ⏭️  Subcategory "${cat.title}" already exists (ID: ${dbId})`);
        } else {
          const [inserted] = await db.insert(subcategories).values({
            name: cat.title,
            slug: slug,
            categoryId: parentDbId,
          }).returning();
          dbId = inserted.id;
          result.subcategoriesInserted++;
          console.log(`  ✅ Inserted subcategory: ${cat.title} (ID: ${dbId})`);
        }

        subcategoryDbMap.set(jsonId, dbId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorMsg = `Failed to insert subcategory ${cat.title}: ${errorMessage}`;
        console.error(`  ❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Insert Level 3 Sub-subcategories
    console.log("📁 Inserting level 3 sub-subcategories...");
    for (const [jsonId, { category: cat, parentId }] of Array.from(hierarchy.level3.entries())) {
      try {
        const parentDbId = subcategoryDbMap.get(parentId);
        if (!parentDbId) {
          throw new Error(`Parent subcategory not found in database: ${parentId}`);
        }

        const slug = generateSlug(cat.title);
        
        // Check if sub-subcategory already exists
        const existing = await db.select().from(subSubcategories)
          .where(eq(subSubcategories.slug, slug))
          .limit(1);
        
        let dbId: number;
        if (existing.length > 0) {
          dbId = existing[0].id;
          console.log(`  ⏭️  Sub-subcategory "${cat.title}" already exists (ID: ${dbId})`);
        } else {
          const [inserted] = await db.insert(subSubcategories).values({
            name: cat.title,
            slug: slug,
            subcategoryId: parentDbId,
          }).returning();
          dbId = inserted.id;
          result.subSubcategoriesInserted++;
          console.log(`  ✅ Inserted sub-subcategory: ${cat.title} (ID: ${dbId})`);
        }

        subSubcategoryDbMap.set(jsonId, dbId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorMsg = `Failed to insert sub-subcategory ${cat.title}: ${errorMessage}`;
        console.error(`  ❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Insert Resources
    console.log("📄 Inserting resources...");
    let resourceCount = 0;
    let skippedNoCategory = 0;
    let skippedNoDeepest = 0;
    let skippedNoCategoryName = 0;
    let skippedDuplicate = 0;

    // Dedup by NORMALIZED URL (same normalization LegacyRepository uses when
    // rendering the tree: trim + lowercase + strip trailing slashes). Exact-URL
    // matching used to let near-duplicates through (e.g. trailing-slash
    // variants), which made the DB count (1949) disagree with every
    // UI-visible count (1934) derived from the deduped awesome-list tree.
    const normalizeUrl = (url: string): string =>
      (typeof url === 'string' ? url.trim().toLowerCase() : '').replace(/\/+$/, '');
    const existingUrls = await db.select({ url: resources.url }).from(resources);
    const seenNormalizedUrls = new Set<string>(
      existingUrls.map((r) => normalizeUrl(r.url)).filter((u) => u.length > 0)
    );

    for (const project of awesomeData.projects) {
      try {
        // Skip if no category
        if (!project.category || project.category.length === 0) {
          skippedNoCategory++;
          continue;
        }

        // Find the deepest category for this resource
        const deepest = findDeepestCategory(project.category, categoryMap);
        if (!deepest) {
          skippedNoDeepest++;
          result.errors.push(`No deepest category found for "${project.title}" with categories: ${project.category.join(', ')}`);
          continue;
        }

        // Get ancestors
        const ancestors = findAncestors(deepest.id, categoryMap);
        
        // Build category names with normalization to canonical names
        const rawCategoryName = ancestors.level1?.title ?? '';
        const categoryName = mapCategoryName(rawCategoryName);
        const subcategoryName = ancestors.level2?.title ?? null;
        const subSubcategoryName = ancestors.level3?.title ?? null;

        if (!categoryName) {
          skippedNoCategoryName++;
          result.errors.push(`No valid category name for "${project.title}" with deepest category: ${deepest.id} (raw: ${rawCategoryName})`);
          continue; // Skip if no valid category
        }

        // Check if resource already exists (by normalized URL)
        const normalizedUrl = normalizeUrl(project.homepage);
        if (normalizedUrl && seenNormalizedUrls.has(normalizedUrl)) {
          skippedDuplicate++;
          continue;
        }
        if (normalizedUrl) seenNormalizedUrls.add(normalizedUrl);

        // Insert resource
        await db.insert(resources).values({
          title: project.title,
          url: project.homepage,
          description: project.description || '',
          category: categoryName,
          subcategory: subcategoryName,
          subSubcategory: subSubcategoryName,
          status: 'approved',
          metadata: {
            tags: project.tags ?? [],
            sourceCategories: project.category,
          },
        });

        resourceCount++;
        result.resourcesInserted++;

        if (resourceCount % 100 === 0) {
          console.log(`  📊 Inserted ${resourceCount} resources...`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorMsg = `Failed to insert resource ${project.title}: ${errorMessage}`;
        console.error(`  ❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Populate the tags + resource_tags tables from resource metadata so the
    // public API (/api/public/tags) reflects the tags the UI renders instead
    // of returning an empty list. Idempotent via onConflictDoNothing.
    try {
      const tagsSeeded = await seedTagsFromResourceMetadata();
      console.log(`🏷️  Tags: ${tagsSeeded.tagRows} new tag rows, ${tagsSeeded.linkRows} new resource links inserted (existing rows untouched)`);
    } catch (tagErr: unknown) {
      const msg = tagErr instanceof Error ? tagErr.message : 'Unknown error';
      console.error(`  ⚠️ Tag backfill reported an issue: ${msg}`);
      result.errors.push(`Tag backfill: ${msg}`);
    }

    // Backfill canonical learning-journey steps so /journey/:id pages are
    // never empty. Idempotent — no-ops when steps are already present.
    try {
      await seedJourneyStepsForExisting();
    } catch (journeyErr: unknown) {
      const msg = journeyErr instanceof Error ? journeyErr.message : 'Unknown error';
      console.error(`  ⚠️ Journey-step backfill reported an issue: ${msg}`);
      result.errors.push(`Journey-step backfill: ${msg}`);
    }

    console.log("\n✅ Database seeding completed!");
    console.log(`📊 Summary:`);
    console.log(`  - Admin user: ${result.adminUserCreated ? 'created' : 'already exists'}`);
    console.log(`  - Categories: ${result.categoriesInserted} inserted`);
    console.log(`  - Subcategories: ${result.subcategoriesInserted} inserted`);
    console.log(`  - Sub-subcategories: ${result.subSubcategoriesInserted} inserted`);
    console.log(`  - Resources: ${result.resourcesInserted} inserted`);
    console.log(`  - Resources skipped (no category): ${skippedNoCategory}`);
    console.log(`  - Resources skipped (no deepest category): ${skippedNoDeepest}`);
    console.log(`  - Resources skipped (no category name): ${skippedNoCategoryName}`);
    console.log(`  - Resources skipped (duplicates): ${skippedDuplicate}`);
    console.log(`  - Errors: ${result.errors.length}`);

    return result;
  } catch (error: unknown) {
    console.error("❌ Database seeding failed:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Fatal error: ${errorMessage}`);
    throw error;
  }
}
