/**
 * Integration Tests for Categories API Endpoints
 *
 * Tests the category hierarchy endpoints including:
 * - GET /api/categories - List all categories
 * - GET /api/subcategories - List subcategories (optionally filtered by categoryId)
 * - GET /api/sub-subcategories - List sub-subcategories (optionally filtered by subcategoryId)
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '../../../server/routes';
import {
  cleanupDatabase,
  createTestCategory,
  createTestSubcategory,
  closeTestDb,
  getTestDb,
} from '../../helpers/db-helper';
import * as schema from '../../../shared/schema';

describe('Categories API Integration Tests', () => {
  let app: Express;

  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('GET /api/categories', () => {
    it('should return all categories', async () => {
      // Create test categories
      await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
        description: 'Web frameworks',
      });

      await createTestCategory({
        name: 'Libraries',
        slug: 'libraries',
        description: 'Useful libraries',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('slug');
      expect(response.body[0]).toHaveProperty('id');
    });

    it('should return empty array when no categories exist', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return categories with all fields', async () => {
      await createTestCategory({
        name: 'Testing Category',
        slug: 'testing-category',
        description: 'A test category',
        icon: '🧪',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body[0].name).toBe('Testing Category');
      expect(response.body[0].slug).toBe('testing-category');
      expect(response.body[0].description).toBe('A test category');
      expect(response.body[0].icon).toBe('🧪');
    });

    it('should return multiple categories in order', async () => {
      const cat1 = await createTestCategory({
        name: 'Alpha',
        slug: 'alpha',
      });

      const cat2 = await createTestCategory({
        name: 'Beta',
        slug: 'beta',
      });

      const cat3 = await createTestCategory({
        name: 'Gamma',
        slug: 'gamma',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.length).toBe(3);
      const ids = response.body.map((c: any) => c.id);
      expect(ids).toContain(cat1.id);
      expect(ids).toContain(cat2.id);
      expect(ids).toContain(cat3.id);
    });

    it('should handle database errors gracefully', async () => {
      // Close the database connection to force an error
      await closeTestDb();

      const response = await request(app)
        .get('/api/categories')
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to fetch categories');

      // Recreate app for subsequent tests
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
      await registerRoutes(app);
    });
  });

  describe('GET /api/subcategories', () => {
    it('should return all subcategories', async () => {
      const category = await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
      });

      await createTestSubcategory(category.id, {
        name: 'React',
        slug: 'react',
      });

      await createTestSubcategory(category.id, {
        name: 'Vue',
        slug: 'vue',
      });

      const response = await request(app)
        .get('/api/subcategories')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('slug');
      expect(response.body[0]).toHaveProperty('categoryId');
    });

    it('should filter subcategories by categoryId', async () => {
      const category1 = await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
      });

      const category2 = await createTestCategory({
        name: 'Libraries',
        slug: 'libraries',
      });

      await createTestSubcategory(category1.id, {
        name: 'React',
        slug: 'react',
      });

      await createTestSubcategory(category1.id, {
        name: 'Vue',
        slug: 'vue',
      });

      await createTestSubcategory(category2.id, {
        name: 'Lodash',
        slug: 'lodash',
      });

      const response = await request(app)
        .get(`/api/subcategories?categoryId=${category1.id}`)
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body.every((sub: any) => sub.categoryId === category1.id)).toBe(true);
      const names = response.body.map((s: any) => s.name);
      expect(names).toContain('React');
      expect(names).toContain('Vue');
      expect(names).not.toContain('Lodash');
    });

    it('should return empty array when no subcategories exist', async () => {
      const response = await request(app)
        .get('/api/subcategories')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return empty array when filtering by non-existent categoryId', async () => {
      const category = await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
      });

      await createTestSubcategory(category.id, {
        name: 'React',
        slug: 'react',
      });

      const response = await request(app)
        .get('/api/subcategories?categoryId=99999')
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should return 400 for invalid categoryId format', async () => {
      const response = await request(app)
        .get('/api/subcategories?categoryId=invalid')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid categoryId parameter');
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for negative categoryId', async () => {
      const response = await request(app)
        .get('/api/subcategories?categoryId=-1')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('categoryId must be a positive number');
    });

    it('should return 400 for zero categoryId', async () => {
      const response = await request(app)
        .get('/api/subcategories?categoryId=0')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('categoryId must be a positive number');
    });

    it('should return subcategories with all fields', async () => {
      const category = await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
      });

      await createTestSubcategory(category.id, {
        name: 'React',
        slug: 'react',
        description: 'React framework',
        icon: '⚛️',
      });

      const response = await request(app)
        .get('/api/subcategories')
        .expect(200);

      expect(response.body[0].name).toBe('React');
      expect(response.body[0].slug).toBe('react');
      expect(response.body[0].description).toBe('React framework');
      expect(response.body[0].icon).toBe('⚛️');
      expect(response.body[0].categoryId).toBe(category.id);
    });

    it('should handle database errors gracefully', async () => {
      // Close the database connection to force an error
      await closeTestDb();

      const response = await request(app)
        .get('/api/subcategories')
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to fetch subcategories');

      // Recreate app for subsequent tests
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
      await registerRoutes(app);
    });
  });

  describe('GET /api/sub-subcategories', () => {
    it('should return all sub-subcategories', async () => {
      const db = getTestDb();
      const category = await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
      });

      const subcategory = await createTestSubcategory(category.id, {
        name: 'React',
        slug: 'react',
      });

      // Create sub-subcategories directly
      const [subSub1] = await db.insert(schema.subSubcategories).values({
        name: 'Hooks',
        slug: 'hooks',
        subcategoryId: subcategory.id,
      }).returning();

      const [subSub2] = await db.insert(schema.subSubcategories).values({
        name: 'Components',
        slug: 'components',
        subcategoryId: subcategory.id,
      }).returning();

      const response = await request(app)
        .get('/api/sub-subcategories')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('slug');
      expect(response.body[0]).toHaveProperty('subcategoryId');
    });

    it('should filter sub-subcategories by subcategoryId', async () => {
      const db = getTestDb();
      const category = await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
      });

      const subcategory1 = await createTestSubcategory(category.id, {
        name: 'React',
        slug: 'react',
      });

      const subcategory2 = await createTestSubcategory(category.id, {
        name: 'Vue',
        slug: 'vue',
      });

      // Create sub-subcategories for React
      await db.insert(schema.subSubcategories).values({
        name: 'Hooks',
        slug: 'hooks',
        subcategoryId: subcategory1.id,
      }).returning();

      await db.insert(schema.subSubcategories).values({
        name: 'Components',
        slug: 'components',
        subcategoryId: subcategory1.id,
      }).returning();

      // Create sub-subcategory for Vue
      await db.insert(schema.subSubcategories).values({
        name: 'Composition API',
        slug: 'composition-api',
        subcategoryId: subcategory2.id,
      }).returning();

      const response = await request(app)
        .get(`/api/sub-subcategories?subcategoryId=${subcategory1.id}`)
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body.every((sub: any) => sub.subcategoryId === subcategory1.id)).toBe(true);
      const names = response.body.map((s: any) => s.name);
      expect(names).toContain('Hooks');
      expect(names).toContain('Components');
      expect(names).not.toContain('Composition API');
    });

    it('should return empty array when no sub-subcategories exist', async () => {
      const response = await request(app)
        .get('/api/sub-subcategories')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return empty array when filtering by non-existent subcategoryId', async () => {
      const db = getTestDb();
      const category = await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
      });

      const subcategory = await createTestSubcategory(category.id, {
        name: 'React',
        slug: 'react',
      });

      await db.insert(schema.subSubcategories).values({
        name: 'Hooks',
        slug: 'hooks',
        subcategoryId: subcategory.id,
      }).returning();

      const response = await request(app)
        .get('/api/sub-subcategories?subcategoryId=99999')
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should return 400 for invalid subcategoryId format', async () => {
      const response = await request(app)
        .get('/api/sub-subcategories?subcategoryId=invalid')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid subcategoryId parameter');
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for negative subcategoryId', async () => {
      const response = await request(app)
        .get('/api/sub-subcategories?subcategoryId=-1')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('subcategoryId must be a positive number');
    });

    it('should return 400 for zero subcategoryId', async () => {
      const response = await request(app)
        .get('/api/sub-subcategories?subcategoryId=0')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('subcategoryId must be a positive number');
    });

    it('should return sub-subcategories with all fields', async () => {
      const db = getTestDb();
      const category = await createTestCategory({
        name: 'Frameworks',
        slug: 'frameworks',
      });

      const subcategory = await createTestSubcategory(category.id, {
        name: 'React',
        slug: 'react',
      });

      await db.insert(schema.subSubcategories).values({
        name: 'Hooks',
        slug: 'hooks',
        subcategoryId: subcategory.id,
        description: 'React Hooks',
        icon: '🪝',
      }).returning();

      const response = await request(app)
        .get('/api/sub-subcategories')
        .expect(200);

      expect(response.body[0].name).toBe('Hooks');
      expect(response.body[0].slug).toBe('hooks');
      expect(response.body[0].description).toBe('React Hooks');
      expect(response.body[0].icon).toBe('🪝');
      expect(response.body[0].subcategoryId).toBe(subcategory.id);
    });

    it('should handle database errors gracefully', async () => {
      // Close the database connection to force an error
      await closeTestDb();

      const response = await request(app)
        .get('/api/sub-subcategories')
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to fetch sub-subcategories');

      // Recreate app for subsequent tests
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
      await registerRoutes(app);
    });
  });

  describe('Categories API - Hierarchical Relationships', () => {
    it('should maintain correct category hierarchy', async () => {
      const db = getTestDb();

      // Create full hierarchy
      const category = await createTestCategory({
        name: 'Web Development',
        slug: 'web-development',
      });

      const subcategory = await createTestSubcategory(category.id, {
        name: 'Frontend Frameworks',
        slug: 'frontend-frameworks',
      });

      const [subSubcategory] = await db.insert(schema.subSubcategories).values({
        name: 'State Management',
        slug: 'state-management',
        subcategoryId: subcategory.id,
      }).returning();

      // Verify each level
      const categories = await request(app).get('/api/categories').expect(200);
      expect(categories.body.length).toBe(1);
      expect(categories.body[0].id).toBe(category.id);

      const subcategories = await request(app)
        .get(`/api/subcategories?categoryId=${category.id}`)
        .expect(200);
      expect(subcategories.body.length).toBe(1);
      expect(subcategories.body[0].id).toBe(subcategory.id);

      const subSubcategories = await request(app)
        .get(`/api/sub-subcategories?subcategoryId=${subcategory.id}`)
        .expect(200);
      expect(subSubcategories.body.length).toBe(1);
      expect(subSubcategories.body[0].id).toBe(subSubcategory.id);
    });

    it('should handle multiple hierarchies independently', async () => {
      const db = getTestDb();

      // Create first hierarchy
      const cat1 = await createTestCategory({
        name: 'Category 1',
        slug: 'category-1',
      });

      const sub1 = await createTestSubcategory(cat1.id, {
        name: 'Subcategory 1',
        slug: 'subcategory-1',
      });

      await db.insert(schema.subSubcategories).values({
        name: 'Sub-Subcategory 1',
        slug: 'sub-subcategory-1',
        subcategoryId: sub1.id,
      });

      // Create second hierarchy
      const cat2 = await createTestCategory({
        name: 'Category 2',
        slug: 'category-2',
      });

      const sub2 = await createTestSubcategory(cat2.id, {
        name: 'Subcategory 2',
        slug: 'subcategory-2',
      });

      await db.insert(schema.subSubcategories).values({
        name: 'Sub-Subcategory 2',
        slug: 'sub-subcategory-2',
        subcategoryId: sub2.id,
      });

      // Verify they're independent
      const allCategories = await request(app).get('/api/categories').expect(200);
      expect(allCategories.body.length).toBe(2);

      const cat1Subs = await request(app)
        .get(`/api/subcategories?categoryId=${cat1.id}`)
        .expect(200);
      expect(cat1Subs.body.length).toBe(1);
      expect(cat1Subs.body[0].name).toBe('Subcategory 1');

      const cat2Subs = await request(app)
        .get(`/api/subcategories?categoryId=${cat2.id}`)
        .expect(200);
      expect(cat2Subs.body.length).toBe(1);
      expect(cat2Subs.body[0].name).toBe('Subcategory 2');
    });
  });

  describe('Categories API - Edge Cases', () => {
    it('should handle unicode in category names', async () => {
      await createTestCategory({
        name: 'Frameworks 中文 العربية',
        slug: 'frameworks-unicode',
        description: 'Testing unicode 🚀',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body[0].name).toContain('中文');
      expect(response.body[0].description).toContain('🚀');
    });

    it('should handle very long category names', async () => {
      const longName = 'A'.repeat(200);
      await createTestCategory({
        name: longName,
        slug: 'long-category',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body[0].name).toBe(longName);
    });

    it('should handle special characters in slugs', async () => {
      await createTestCategory({
        name: 'Test Category',
        slug: 'test-category-123_special',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body[0].slug).toBe('test-category-123_special');
    });

    it('should handle categoryId with leading zeros', async () => {
      const category = await createTestCategory({
        name: 'Test',
        slug: 'test',
      });

      await createTestSubcategory(category.id, {
        name: 'Sub Test',
        slug: 'sub-test',
      });

      // Leading zeros should still parse correctly
      const response = await request(app)
        .get(`/api/subcategories?categoryId=0${category.id}`)
        .expect(200);

      expect(response.body.length).toBe(1);
    });

    it('should handle very large categoryId values', async () => {
      const response = await request(app)
        .get('/api/subcategories?categoryId=999999999')
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should handle decimal categoryId', async () => {
      const response = await request(app)
        .get('/api/subcategories?categoryId=1.5')
        .expect(400);

      expect(response.body.message).toContain('Invalid categoryId parameter');
    });
  });
});
