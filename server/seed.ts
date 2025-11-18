import fetch from 'node-fetch';
import { storage } from "./storage";
import { db } from "./db";
import { categories, subcategories, subSubcategories, resources, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./passwordUtils";

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
      } else if (parent && parent.parent) {
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
  if (!parent || !parent.parent) return 2;

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
    const adminPassword = "admin123";
    
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log(`ℹ️  Default admin user already exists (${adminEmail})`);
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
    console.log(`🔐 DEFAULT ADMIN USER CREATED`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`⚠️  IMPORTANT: Change this password after first login!`);
    console.log(`${'='.repeat(60)}\n`);
    
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to create admin user: ${error.message}`);
    return false;
  }
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
      } catch (error: any) {
        const errorMsg = `Failed to insert category ${cat.title}: ${error.message}`;
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
      } catch (error: any) {
        const errorMsg = `Failed to insert subcategory ${cat.title}: ${error.message}`;
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
      } catch (error: any) {
        const errorMsg = `Failed to insert sub-subcategory ${cat.title}: ${error.message}`;
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
        
        // Build category names
        const categoryName = ancestors.level1?.title || '';
        const subcategoryName = ancestors.level2?.title || null;
        const subSubcategoryName = ancestors.level3?.title || null;

        if (!categoryName) {
          skippedNoCategoryName++;
          result.errors.push(`No valid category name for "${project.title}" with deepest category: ${deepest.id}`);
          continue; // Skip if no valid category
        }

        // Check if resource already exists (by URL)
        const existing = await db.select().from(resources)
          .where(eq(resources.url, project.homepage))
          .limit(1);
        
        if (existing.length > 0) {
          skippedDuplicate++;
          continue;
        }

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
            tags: project.tags || [],
            sourceCategories: project.category,
          },
        });

        resourceCount++;
        result.resourcesInserted++;

        if (resourceCount % 100 === 0) {
          console.log(`  📊 Inserted ${resourceCount} resources...`);
        }
      } catch (error: any) {
        const errorMsg = `Failed to insert resource ${project.title}: ${error.message}`;
        console.error(`  ❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
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
  } catch (error: any) {
    console.error("❌ Database seeding failed:", error);
    result.errors.push(`Fatal error: ${error.message}`);
    throw error;
  }
}
