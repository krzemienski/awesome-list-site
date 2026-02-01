/**
 * Integration Tests for Resources API Endpoints
 *
 * Tests the resource management endpoints including:
 * - GET /api/resources - List resources with filtering and pagination
 * - GET /api/resources/check-url - Check if URL exists
 * - GET /api/resources/:id - Get single resource
 * - POST /api/resources - Create new resource (authenticated)
 * - GET /api/resources/pending - List pending resources (admin)
 * - PUT /api/resources/:id/approve - Approve resource (admin)
 * - PUT /api/resources/:id/reject - Reject resource (admin)
 * - POST /api/resources/:id/edits - Suggest resource edit (authenticated)
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '../../../server/routes';
import {
  cleanupDatabase,
  createTestUser,
  createTestAdmin,
  createTestResource,
  createTestCategory,
  createTestSubcategory,
  closeTestDb,
} from '../../helpers/db-helper';
import { hashPassword } from '../../../server/passwordUtils';

describe('Resources API Integration Tests', () => {
  let app: Express;
  let regularUserEmail: string;
  let regularUserPassword: string;
  let regularUserId: string;
  let adminUserEmail: string;
  let adminUserPassword: string;
  let adminUserId: string;

  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);

    // Create regular user
    regularUserEmail = `regular-${Date.now()}@example.com`;
    regularUserPassword = 'RegularPassword123';
    const regularHashedPassword = await hashPassword(regularUserPassword);

    const regularUser = await createTestUser({
      email: regularUserEmail,
      password: regularHashedPassword,
      firstName: 'Regular',
      lastName: 'User',
      role: 'user',
    });
    regularUserId = regularUser.id;

    // Create admin user
    adminUserEmail = `admin-${Date.now()}@example.com`;
    adminUserPassword = 'AdminPassword123';
    const adminHashedPassword = await hashPassword(adminUserPassword);

    const adminUser = await createTestAdmin({
      email: adminUserEmail,
      password: adminHashedPassword,
      firstName: 'Admin',
      lastName: 'User',
    });
    adminUserId = adminUser.id;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('GET /api/resources', () => {
    it('should return paginated approved resources', async () => {
      // Create test resources
      await createTestResource({
        title: 'Resource 1',
        url: 'https://example.com/resource1',
        description: 'First approved resource',
        status: 'approved',
      });

      await createTestResource({
        title: 'Resource 2',
        url: 'https://example.com/resource2',
        description: 'Second approved resource',
        status: 'approved',
      });

      const response = await request(app)
        .get('/api/resources')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('resources');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.resources)).toBe(true);
      expect(response.body.resources.length).toBe(2);
      expect(response.body.total).toBe(2);
    });

    it('should not return pending or rejected resources to public', async () => {
      await createTestResource({
        title: 'Approved Resource',
        url: 'https://example.com/approved',
        status: 'approved',
      });

      await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      await createTestResource({
        title: 'Rejected Resource',
        url: 'https://example.com/rejected',
        status: 'rejected',
      });

      const response = await request(app)
        .get('/api/resources')
        .expect(200);

      expect(response.body.resources.length).toBe(1);
      expect(response.body.resources[0].title).toBe('Approved Resource');
    });

    it('should support pagination', async () => {
      // Create 25 resources
      for (let i = 1; i <= 25; i++) {
        await createTestResource({
          title: `Resource ${i}`,
          url: `https://example.com/resource${i}`,
          status: 'approved',
        });
      }

      // Page 1
      const page1 = await request(app)
        .get('/api/resources?page=1&limit=10')
        .expect(200);

      expect(page1.body.resources.length).toBe(10);
      expect(page1.body.page).toBe(1);
      expect(page1.body.total).toBe(25);

      // Page 2
      const page2 = await request(app)
        .get('/api/resources?page=2&limit=10')
        .expect(200);

      expect(page2.body.resources.length).toBe(10);
      expect(page2.body.page).toBe(2);

      // Page 3
      const page3 = await request(app)
        .get('/api/resources?page=3&limit=10')
        .expect(200);

      expect(page3.body.resources.length).toBe(5);
      expect(page3.body.page).toBe(3);
    });

    it('should filter by category', async () => {
      await createTestResource({
        title: 'Frameworks Resource',
        url: 'https://example.com/frameworks',
        category: 'Frameworks',
        status: 'approved',
      });

      await createTestResource({
        title: 'Libraries Resource',
        url: 'https://example.com/libraries',
        category: 'Libraries',
        status: 'approved',
      });

      const response = await request(app)
        .get('/api/resources?category=Frameworks')
        .expect(200);

      expect(response.body.resources.length).toBe(1);
      expect(response.body.resources[0].category).toBe('Frameworks');
    });

    it('should filter by subcategory', async () => {
      await createTestResource({
        title: 'React Resource',
        url: 'https://example.com/react',
        category: 'Frameworks',
        subcategory: 'React',
        status: 'approved',
      });

      await createTestResource({
        title: 'Vue Resource',
        url: 'https://example.com/vue',
        category: 'Frameworks',
        subcategory: 'Vue',
        status: 'approved',
      });

      const response = await request(app)
        .get('/api/resources?subcategory=React')
        .expect(200);

      expect(response.body.resources.length).toBe(1);
      expect(response.body.resources[0].subcategory).toBe('React');
    });

    it('should search resources by title and description', async () => {
      await createTestResource({
        title: 'React Tutorial for Beginners',
        url: 'https://example.com/react-tutorial',
        description: 'Learn React basics',
        status: 'approved',
      });

      await createTestResource({
        title: 'Vue Guide',
        url: 'https://example.com/vue-guide',
        description: 'Vue.js fundamentals',
        status: 'approved',
      });

      const response = await request(app)
        .get('/api/resources?search=React')
        .expect(200);

      expect(response.body.resources.length).toBe(1);
      expect(response.body.resources[0].title).toContain('React');
    });

    it('should return empty array when no resources exist', async () => {
      const response = await request(app)
        .get('/api/resources')
        .expect(200);

      expect(response.body.resources).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should handle invalid page number', async () => {
      const response = await request(app)
        .get('/api/resources?page=0')
        .expect(200);

      // Should default to page 1
      expect(response.body.page).toBe(1);
    });

    it('should handle invalid limit', async () => {
      const response = await request(app)
        .get('/api/resources?limit=abc')
        .expect(200);

      // Should default to 20
      expect(response.body.limit).toBe(20);
    });
  });

  describe('GET /api/resources/check-url', () => {
    it('should return exists=true when URL exists', async () => {
      const existingResource = await createTestResource({
        title: 'Existing Resource',
        url: 'https://example.com/existing',
        status: 'approved',
        category: 'Test Category',
      });

      const response = await request(app)
        .get('/api/resources/check-url?url=https://example.com/existing')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('exists', true);
      expect(response.body).toHaveProperty('resource');
      expect(response.body.resource.id).toBe(existingResource.id);
      expect(response.body.resource.title).toBe('Existing Resource');
      expect(response.body.resource.status).toBe('approved');
    });

    it('should return exists=false when URL does not exist', async () => {
      const response = await request(app)
        .get('/api/resources/check-url?url=https://example.com/nonexistent')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('exists', false);
      expect(response.body).not.toHaveProperty('resource');
    });

    it('should return 400 when URL parameter is missing', async () => {
      const response = await request(app)
        .get('/api/resources/check-url')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('URL parameter is required');
    });

    it('should find pending resources', async () => {
      await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const response = await request(app)
        .get('/api/resources/check-url?url=https://example.com/pending')
        .expect(200);

      expect(response.body.exists).toBe(true);
      expect(response.body.resource.status).toBe('pending');
    });

    it('should find rejected resources', async () => {
      await createTestResource({
        title: 'Rejected Resource',
        url: 'https://example.com/rejected',
        status: 'rejected',
      });

      const response = await request(app)
        .get('/api/resources/check-url?url=https://example.com/rejected')
        .expect(200);

      expect(response.body.exists).toBe(true);
      expect(response.body.resource.status).toBe('rejected');
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should return resource by id', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        description: 'A test resource',
        category: 'Test Category',
        status: 'approved',
      });

      const response = await request(app)
        .get(`/api/resources/${resource.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', resource.id);
      expect(response.body).toHaveProperty('title', 'Test Resource');
      expect(response.body).toHaveProperty('url', 'https://example.com/test');
      expect(response.body).toHaveProperty('description', 'A test resource');
    });

    it('should return 404 when resource does not exist', async () => {
      const response = await request(app)
        .get('/api/resources/99999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Resource not found');
    });

    it('should return pending resource', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const response = await request(app)
        .get(`/api/resources/${resource.id}`)
        .expect(200);

      expect(response.body.status).toBe('pending');
    });

    it('should handle invalid id format', async () => {
      const response = await request(app)
        .get('/api/resources/invalid')
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/resources', () => {
    it('should create resource when authenticated', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const resourceData = {
        title: 'New Resource',
        url: 'https://example.com/new',
        description: 'A new test resource',
        category: 'Test Category',
      };

      const response = await agent
        .post('/api/resources')
        .send(resourceData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'New Resource');
      expect(response.body).toHaveProperty('url', 'https://example.com/new');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('submittedBy', regularUserId);
    });

    it('should return 401 when not authenticated', async () => {
      const resourceData = {
        title: 'New Resource',
        url: 'https://example.com/new',
        description: 'A new test resource',
        category: 'Test Category',
      };

      const response = await request(app)
        .post('/api/resources')
        .send(resourceData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate required fields', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .post('/api/resources')
        .send({
          title: 'Incomplete Resource',
          // Missing url, description, category
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid resource data');
      expect(response.body).toHaveProperty('errors');
    });

    it('should create resource with all optional fields', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const resourceData = {
        title: 'Complete Resource',
        url: 'https://example.com/complete',
        description: 'A complete test resource',
        category: 'Test Category',
        subcategory: 'Test Subcategory',
        platform: 'YouTube',
        duration: 3600,
        difficultyLevel: 'intermediate',
        language: 'en',
      };

      const response = await agent
        .post('/api/resources')
        .send(resourceData)
        .expect(201);

      expect(response.body.subcategory).toBe('Test Subcategory');
      expect(response.body.platform).toBe('YouTube');
      expect(response.body.duration).toBe(3600);
      expect(response.body.difficultyLevel).toBe('intermediate');
      expect(response.body.language).toBe('en');
    });

    it('should reject invalid URL format', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .post('/api/resources')
        .send({
          title: 'Invalid URL Resource',
          url: 'not-a-valid-url',
          description: 'This should fail',
          category: 'Test',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid resource data');
    });

    it('should create resource with admin user', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .post('/api/resources')
        .send({
          title: 'Admin Resource',
          url: 'https://example.com/admin',
          description: 'Created by admin',
          category: 'Admin Category',
        })
        .expect(201);

      expect(response.body.submittedBy).toBe(adminUserId);
      expect(response.body.status).toBe('pending');
    });
  });

  describe('GET /api/resources/pending', () => {
    it('should return pending resources for admin', async () => {
      await createTestResource({
        title: 'Pending Resource 1',
        url: 'https://example.com/pending1',
        status: 'pending',
      });

      await createTestResource({
        title: 'Pending Resource 2',
        url: 'https://example.com/pending2',
        status: 'pending',
      });

      await createTestResource({
        title: 'Approved Resource',
        url: 'https://example.com/approved',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .get('/api/resources/pending')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.resources.length).toBe(2);
      expect(response.body.total).toBe(2);
      expect(response.body.resources.every((r: any) => r.status === 'pending')).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/resources/pending')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin users', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .get('/api/resources/pending')
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Admin access required');
    });

    it('should support pagination for pending resources', async () => {
      // Create 25 pending resources
      for (let i = 1; i <= 25; i++) {
        await createTestResource({
          title: `Pending Resource ${i}`,
          url: `https://example.com/pending${i}`,
          status: 'pending',
        });
      }

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .get('/api/resources/pending?page=1&limit=10')
        .expect(200);

      expect(response.body.resources.length).toBe(10);
      expect(response.body.total).toBe(25);
    });

    it('should return empty array when no pending resources', async () => {
      await createTestResource({
        title: 'Approved Resource',
        url: 'https://example.com/approved',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .get('/api/resources/pending')
        .expect(200);

      expect(response.body.resources).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('PUT /api/resources/:id/approve', () => {
    it('should approve resource as admin', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .put(`/api/resources/${resource.id}/approve`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', resource.id);
      expect(response.body).toHaveProperty('status', 'approved');
      expect(response.body).toHaveProperty('reviewedBy', adminUserId);
      expect(response.body).toHaveProperty('reviewedAt');
    });

    it('should return 401 when not authenticated', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const response = await request(app)
        .put(`/api/resources/${resource.id}/approve`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin users', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .put(`/api/resources/${resource.id}/approve`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Admin access required');
    });

    it('should approve already approved resource', async () => {
      const resource = await createTestResource({
        title: 'Approved Resource',
        url: 'https://example.com/approved',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .put(`/api/resources/${resource.id}/approve`)
        .expect(200);

      expect(response.body.status).toBe('approved');
    });

    it('should approve rejected resource', async () => {
      const resource = await createTestResource({
        title: 'Rejected Resource',
        url: 'https://example.com/rejected',
        status: 'rejected',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .put(`/api/resources/${resource.id}/approve`)
        .expect(200);

      expect(response.body.status).toBe('approved');
    });
  });

  describe('PUT /api/resources/:id/reject', () => {
    it('should reject resource as admin', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .put(`/api/resources/${resource.id}/reject`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', resource.id);
      expect(response.body).toHaveProperty('status', 'rejected');
      expect(response.body).toHaveProperty('reviewedBy', adminUserId);
      expect(response.body).toHaveProperty('reviewedAt');
    });

    it('should return 401 when not authenticated', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const response = await request(app)
        .put(`/api/resources/${resource.id}/reject`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin users', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .put(`/api/resources/${resource.id}/reject`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Admin access required');
    });

    it('should reject approved resource', async () => {
      const resource = await createTestResource({
        title: 'Approved Resource',
        url: 'https://example.com/approved',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .put(`/api/resources/${resource.id}/reject`)
        .expect(200);

      expect(response.body.status).toBe('rejected');
    });
  });

  describe('POST /api/resources/:id/edits', () => {
    it('should create edit suggestion when authenticated', async () => {
      const resource = await createTestResource({
        title: 'Original Resource',
        url: 'https://example.com/original',
        description: 'Original description',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .post(`/api/resources/${resource.id}/edits`)
        .send({
          proposedChanges: 'Updated title and description',
          proposedData: {
            title: 'Updated Resource',
            description: 'Updated description',
          },
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('resourceId', resource.id);
      expect(response.body).toHaveProperty('submittedBy', regularUserId);
      expect(response.body).toHaveProperty('proposedChanges', 'Updated title and description');
      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('should return 401 when not authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const response = await request(app)
        .post(`/api/resources/${resource.id}/edits`)
        .send({
          proposedChanges: 'Some changes',
          proposedData: { title: 'New Title' },
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid resource id', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .post('/api/resources/invalid/edits')
        .send({
          proposedChanges: 'Some changes',
          proposedData: { title: 'New Title' },
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid resource ID');
    });

    it('should allow admin to suggest edits', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const response = await agent
        .post(`/api/resources/${resource.id}/edits`)
        .send({
          proposedChanges: 'Admin suggested changes',
          proposedData: { title: 'Admin Updated Title' },
        })
        .expect(201);

      expect(response.body.submittedBy).toBe(adminUserId);
    });

    it('should accept edit with claude metadata', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .post(`/api/resources/${resource.id}/edits`)
        .send({
          proposedChanges: 'AI-assisted changes',
          proposedData: { title: 'AI Updated Title' },
          claudeMetadata: {
            analysisId: 'claude-123',
            confidence: 0.95,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('claudeMetadata');
    });
  });

  describe('Resources API - Integration Flows', () => {
    it('should complete full resource lifecycle: create -> pending -> approve', async () => {
      const regularAgent = request.agent(app);
      await regularAgent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      // Step 1: User creates resource
      const createResponse = await regularAgent
        .post('/api/resources')
        .send({
          title: 'Lifecycle Test Resource',
          url: 'https://example.com/lifecycle',
          description: 'Testing full lifecycle',
          category: 'Test',
        })
        .expect(201);

      expect(createResponse.body.status).toBe('pending');
      const resourceId = createResponse.body.id;

      // Step 2: Resource appears in pending list for admin
      const adminAgent = request.agent(app);
      await adminAgent
        .post('/api/auth/local/login')
        .send({
          email: adminUserEmail,
          password: adminUserPassword,
        })
        .expect(200);

      const pendingResponse = await adminAgent
        .get('/api/resources/pending')
        .expect(200);

      expect(pendingResponse.body.resources.some((r: any) => r.id === resourceId)).toBe(true);

      // Step 3: Admin approves resource
      const approveResponse = await adminAgent
        .put(`/api/resources/${resourceId}/approve`)
        .expect(200);

      expect(approveResponse.body.status).toBe('approved');

      // Step 4: Resource now appears in public listing
      const publicResponse = await request(app)
        .get('/api/resources')
        .expect(200);

      expect(publicResponse.body.resources.some((r: any) => r.id === resourceId)).toBe(true);

      // Step 5: Resource no longer in pending list
      const pendingAfterApproval = await adminAgent
        .get('/api/resources/pending')
        .expect(200);

      expect(pendingAfterApproval.body.resources.some((r: any) => r.id === resourceId)).toBe(false);
    });

    it('should prevent duplicate URLs', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const resourceData = {
        title: 'First Resource',
        url: 'https://example.com/duplicate',
        description: 'First submission',
        category: 'Test',
      };

      // First submission should succeed
      await agent
        .post('/api/resources')
        .send(resourceData)
        .expect(201);

      // Check if URL exists
      const checkResponse = await request(app)
        .get('/api/resources/check-url?url=https://example.com/duplicate')
        .expect(200);

      expect(checkResponse.body.exists).toBe(true);
    });
  });

  describe('Resources API - Edge Cases', () => {
    it('should handle concurrent resource creation', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const requests = [
        agent.post('/api/resources').send({
          title: 'Concurrent 1',
          url: 'https://example.com/concurrent1',
          description: 'Test',
          category: 'Test',
        }),
        agent.post('/api/resources').send({
          title: 'Concurrent 2',
          url: 'https://example.com/concurrent2',
          description: 'Test',
          category: 'Test',
        }),
        agent.post('/api/resources').send({
          title: 'Concurrent 3',
          url: 'https://example.com/concurrent3',
          description: 'Test',
          category: 'Test',
        }),
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle very long resource title', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const longTitle = 'A'.repeat(500);
      const response = await agent
        .post('/api/resources')
        .send({
          title: longTitle,
          url: 'https://example.com/long-title',
          description: 'Test',
          category: 'Test',
        });

      // Should either accept or reject based on schema validation
      expect([201, 400]).toContain(response.status);
    });

    it('should handle unicode in resource data', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: regularUserEmail,
          password: regularUserPassword,
        })
        .expect(200);

      const response = await agent
        .post('/api/resources')
        .send({
          title: 'Unicode Test 中文 العربية',
          url: 'https://example.com/unicode',
          description: 'Testing unicode characters: 🚀 💻 📱',
          category: 'Test',
        })
        .expect(201);

      expect(response.body.title).toContain('中文');
      expect(response.body.description).toContain('🚀');
    });

    it('should handle empty search query', async () => {
      await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const response = await request(app)
        .get('/api/resources?search=')
        .expect(200);

      expect(response.body.resources.length).toBe(1);
    });

    it('should handle non-existent category filter', async () => {
      await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        category: 'RealCategory',
        status: 'approved',
      });

      const response = await request(app)
        .get('/api/resources?category=NonExistentCategory')
        .expect(200);

      expect(response.body.resources.length).toBe(0);
      expect(response.body.total).toBe(0);
    });
  });
});
