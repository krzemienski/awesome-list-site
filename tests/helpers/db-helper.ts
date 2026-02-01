/**
 * Database Test Helper
 *
 * Provides utilities for managing test database state:
 * - Creating test data
 * - Cleaning up after tests
 * - Seeding common test scenarios
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../../shared/schema';
import { sql } from 'drizzle-orm';

// Create a separate pool for tests
let testPool: pkg.Pool | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create test database connection
 */
export function getTestDb() {
  if (!testDb) {
    testPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    testDb = drizzle(testPool, { schema });
  }
  return testDb;
}

/**
 * Get test database pool
 */
export function getTestPool() {
  if (!testPool) {
    getTestDb(); // Initialize if not already done
  }
  return testPool!;
}

/**
 * Clean up database after tests
 * Deletes all data from tables in the correct order to respect foreign keys
 */
export async function cleanupDatabase() {
  const db = getTestDb();

  try {
    // Delete in order that respects foreign key constraints
    // Start with junction tables and dependent tables
    await db.delete(schema.resourceTags);
    await db.delete(schema.userFavorites);
    await db.delete(schema.userBookmarks);
    await db.delete(schema.userInteractions);
    await db.delete(schema.userJourneyProgress);
    await db.delete(schema.journeySteps);
    await db.delete(schema.learningJourneys);
    await db.delete(schema.enrichmentQueue);
    await db.delete(schema.enrichmentJobs);
    await db.delete(schema.resourceEdits);
    await db.delete(schema.resourceAuditLog);
    await db.delete(schema.githubSyncQueue);
    await db.delete(schema.githubSyncHistory);
    await db.delete(schema.userPreferences);
    await db.delete(schema.resources);
    await db.delete(schema.subSubcategories);
    await db.delete(schema.subcategories);
    await db.delete(schema.categories);
    await db.delete(schema.tags);
    await db.delete(schema.awesomeLists);
    await db.delete(schema.sessions);
    await db.delete(schema.users);
  } catch (error) {
    console.error('Error cleaning up database:', error);
    throw error;
  }
}

/**
 * Close test database connection
 */
export async function closeTestDb() {
  if (testPool) {
    await testPool.end();
    testPool = null;
    testDb = null;
  }
}

/**
 * Create a test user
 */
export async function createTestUser(overrides: Partial<schema.UpsertUser> = {}) {
  const db = getTestDb();

  const defaultUser: schema.UpsertUser = {
    email: `test-${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    password: 'hashed_password_here', // In real tests, use bcrypt
    ...overrides,
  };

  const [user] = await db.insert(schema.users).values(defaultUser).returning();
  return user;
}

/**
 * Create a test admin user
 */
export async function createTestAdmin(overrides: Partial<schema.UpsertUser> = {}) {
  return createTestUser({ role: 'admin', ...overrides });
}

/**
 * Create a test resource
 */
export async function createTestResource(overrides: Partial<schema.InsertResource> = {}) {
  const db = getTestDb();

  const defaultResource: schema.InsertResource = {
    title: `Test Resource ${Date.now()}`,
    url: `https://example.com/resource-${Date.now()}`,
    description: 'A test resource for unit tests',
    category: 'Test Category',
    status: 'approved',
    ...overrides,
  };

  const [resource] = await db.insert(schema.resources).values(defaultResource).returning();
  return resource;
}

/**
 * Create a test category
 */
export async function createTestCategory(overrides: Partial<schema.InsertCategory> = {}) {
  const db = getTestDb();

  const timestamp = Date.now();
  const defaultCategory: schema.InsertCategory = {
    name: `Test Category ${timestamp}`,
    slug: `test-category-${timestamp}`,
    ...overrides,
  };

  const [category] = await db.insert(schema.categories).values(defaultCategory).returning();
  return category;
}

/**
 * Create a test subcategory
 */
export async function createTestSubcategory(
  categoryId: number,
  overrides: Partial<schema.InsertSubcategory> = {}
) {
  const db = getTestDb();

  const timestamp = Date.now();
  const defaultSubcategory: schema.InsertSubcategory = {
    name: `Test Subcategory ${timestamp}`,
    slug: `test-subcategory-${timestamp}`,
    categoryId,
    ...overrides,
  };

  const [subcategory] = await db.insert(schema.subcategories).values(defaultSubcategory).returning();
  return subcategory;
}

/**
 * Create a test tag
 */
export async function createTestTag(overrides: Partial<schema.InsertTag> = {}) {
  const db = getTestDb();

  const timestamp = Date.now();
  const defaultTag: schema.InsertTag = {
    name: `Test Tag ${timestamp}`,
    slug: `test-tag-${timestamp}`,
    ...overrides,
  };

  const [tag] = await db.insert(schema.tags).values(defaultTag).returning();
  return tag;
}

/**
 * Seed test database with common test data
 * Returns created entities for use in tests
 */
export async function seedTestData() {
  const db = getTestDb();

  // Create test users
  const regularUser = await createTestUser({
    email: 'user@test.com',
    firstName: 'Regular',
    lastName: 'User',
  });

  const adminUser = await createTestAdmin({
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
  });

  // Create test categories
  const category = await createTestCategory({
    name: 'Frameworks',
    slug: 'frameworks',
  });

  const subcategory = await createTestSubcategory(category.id, {
    name: 'React',
    slug: 'react',
  });

  // Create test resources
  const resource1 = await createTestResource({
    title: 'React Tutorial',
    url: 'https://react.dev/learn',
    description: 'Learn React from the official documentation',
    category: 'Frameworks',
    subcategory: 'React',
    submittedBy: regularUser.id,
  });

  const resource2 = await createTestResource({
    title: 'React Hooks Guide',
    url: 'https://react.dev/reference/react',
    description: 'Complete guide to React Hooks',
    category: 'Frameworks',
    subcategory: 'React',
    submittedBy: regularUser.id,
  });

  return {
    users: {
      regular: regularUser,
      admin: adminUser,
    },
    categories: {
      category,
      subcategory,
    },
    resources: {
      resource1,
      resource2,
    },
  };
}
