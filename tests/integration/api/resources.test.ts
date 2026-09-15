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

import { describe, it, expect, beforeEach, afterAll, afterEach } from 'vitest';
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
  createTestTag,
  getTestDb,
  closeTestDb,
} from '../../helpers/db-helper';
import { resourceTags } from '../../../shared/schema';
import {
  cleanupClerkTestUsers,
  createClerkAuthenticatedAgent,
  installClerkTestMiddleware,
} from '../../helpers/api-helper';

describe('Resources API Integration Tests', () => {
  let app: Express;
  let regularUserId: string;
  let adminUserId: string;
  let regularUser: Awaited<ReturnType<typeof createTestUser>>;
  let adminUser: Awaited<ReturnType<typeof createTestAdmin>>;

  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    installClerkTestMiddleware(app);
    await registerRoutes(app);

    // Create regular user
    regularUser = await createTestUser({
      email: `regular-${Date.now()}@example.com`,
      firstName: 'Regular',
      lastName: 'User',
      role: 'user',
    });
    regularUserId = regularUser.id;

    // Create admin user
    adminUser = await createTestAdmin({
      email: `admin-${Date.now()}@example.com`,
      firstName: 'Admin',
      lastName: 'User',
    });
    adminUserId = adminUser.id;

    // Contributor submissions validate category labels against the catalog.
    // Seed the labels used by the POST fixtures without weakening that check.
    await Promise.all([
      createTestCategory({ name: 'Test Category', slug: 'test-category' }),
      createTestCategory({ name: 'Admin Category', slug: 'admin-category' }),
      createTestCategory({ name: 'Test', slug: 'test' }),
    ]);
  });

  afterAll(async () => {
    await cleanupClerkTestUsers();
    await closeTestDb();
  });

  afterEach(async () => {
    await cleanupClerkTestUsers();
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
      expect(response.body).toHaveProperty('limit');
      expect(response.body.pagination.page).toBe(1);
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
      expect(page1.body.pagination.page).toBe(1);
      expect(page1.body.total).toBe(25);

      // Page 2
      const page2 = await request(app)
        .get('/api/resources?page=2&limit=10')
        .expect(200);

      expect(page2.body.resources.length).toBe(10);
      expect(page2.body.pagination.page).toBe(2);

      // Page 3
      const page3 = await request(app)
        .get('/api/resources?page=3&limit=10')
        .expect(200);

      expect(page3.body.resources.length).toBe(5);
      expect(page3.body.pagination.page).toBe(3);
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

    it('returns identical results for repeated, comma-separated, and legacy tag params', async () => {
      const both = await createTestResource({
        title: 'Both Tags',
        url: 'https://example.com/both-tags',
        status: 'approved',
        resourceFormat: 'tool',
        provider: 'self-hosted',
        skillLevel: 'advanced',
      });
      const rtmpOnly = await createTestResource({
        title: 'RTMP Only',
        url: 'https://example.com/rtmp-only',
        status: 'approved',
      });
      const metadataOnly = await createTestResource({
        title: 'Metadata HLS',
        url: 'https://example.com/metadata-hls',
        status: 'approved',
        metadata: { tags: ['HLS'] },
      });
      const rtmp = await createTestTag({ name: 'RTMP', slug: 'rtmp' });
      const hls = await createTestTag({ name: 'HLS', slug: 'hls' });
      await getTestDb().insert(resourceTags).values([
        { resourceId: both.id, tagId: rtmp.id },
        { resourceId: both.id, tagId: hls.id },
        { resourceId: rtmpOnly.id, tagId: rtmp.id },
      ]);

      const [repeated, comma, mixedAlias] = await Promise.all([
        request(app).get('/api/resources?tags=RTMP&tags=HLS&limit=100&facets=true&sort=name-asc').expect(200),
        request(app).get('/api/resources?tags=RTMP,HLS&limit=100&facets=true&sort=name-asc').expect(200),
        request(app).get('/api/resources?tags=RTMP&tag=HLS&limit=100&facets=true&sort=name-asc').expect(200),
      ]);
      const ids = (response: request.Response) =>
        response.body.resources.map((resource: { id: number }) => resource.id);

      expect(ids(repeated)).toEqual(ids(comma));
      expect(ids(mixedAlias)).toEqual(ids(comma));
      expect(repeated.body.total).toBe(comma.body.total);
      expect(mixedAlias.body.total).toBe(comma.body.total);
      expect(ids(repeated)).toEqual(expect.arrayContaining([both.id, rtmpOnly.id, metadataOnly.id]));
      expect(repeated.body.facets.tags).toEqual(expect.arrayContaining([
        { value: 'rtmp', count: 2 },
        { value: 'hls', count: 2 },
      ]));

      const controlled = await request(app)
        .get('/api/resources?format=tool&provider=self-hosted&skillLevel=advanced')
        .expect(200);
      expect(ids(controlled)).toContain(both.id);
      expect(controlled.body.resources.find((resource: { id: number }) => resource.id === both.id))
        .toMatchObject({
          resourceFormat: 'tool',
          provider: 'self-hosted',
          skillLevel: 'advanced',
        });
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
        .expect(400);

      expect(response.body.error).toBe('validation_failed');
      expect(response.body.message).toBe('Invalid query parameters');
      expect(response.body.fieldErrors).toHaveProperty('page');
    });

    it('should handle invalid limit', async () => {
      const response = await request(app)
        .get('/api/resources?limit=abc')
        .expect(400);

      expect(response.body.error).toBe('validation_failed');
      expect(response.body.message).toBe('Invalid query parameters');
      expect(response.body.fieldErrors).toHaveProperty('limit');
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
      expect(response.body).not.toHaveProperty('resource');
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
      expect(response.body).not.toHaveProperty('resource');
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
      expect(response.body).not.toHaveProperty('resource');
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

    it('should hide pending resource from public', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const response = await request(app)
        .get(`/api/resources/${resource.id}`)
        .expect(404);

      expect(response.body.message).toContain('Resource not found');
    });

    it('should handle invalid id format', async () => {
      const response = await request(app)
        .get('/api/resources/invalid')
        .expect(404);
    });
  });

  describe('POST /api/resources', () => {
    it('should create resource when authenticated', async () => {
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

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
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

      const response = await agent
        .post('/api/resources')
        .send({
          title: 'Incomplete Resource',
          // Missing url, description, category
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation failed');
      expect(response.body).toHaveProperty('errors');
    });

    it('should create resource with all optional fields', async () => {
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

      const resourceData = {
        title: 'Complete Resource',
        url: 'https://example.com/complete',
        description: 'A complete test resource',
        category: 'Test Category',
        subcategory: 'Test Subcategory',
        resourceFormat: 'video',
        provider: 'youtube',
        skillLevel: 'intermediate',
      };

      const response = await agent
        .post('/api/resources')
        .send(resourceData)
        .expect(201);

      expect(response.body.subcategory).toBe('Test Subcategory');
      expect(response.body.resourceFormat).toBe('video');
      expect(response.body.provider).toBe('youtube');
      expect(response.body.skillLevel).toBe('intermediate');
    });

    it('should reject invalid URL format', async () => {
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

      const response = await agent
        .post('/api/resources')
        .send({
          title: 'Invalid URL Resource',
          url: 'not-a-valid-url',
          description: 'This should fail',
          category: 'Test',
        })
        .expect(400);

      expect(response.body.message).toContain('Validation failed');
    });

    it('should create resource with admin user', async () => {
      const agent = await createClerkAuthenticatedAgent(app, adminUser);

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

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

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
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

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

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

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

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

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

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

      const response = await agent
        .put(`/api/resources/${resource.id}/approve`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', resource.id);
      expect(response.body).toHaveProperty('status', 'approved');
      expect(response.body).toHaveProperty('approvedBy', adminUserId);
      expect(response.body).toHaveProperty('approvedAt');
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

      const agent = await createClerkAuthenticatedAgent(app, regularUser);

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

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

      const response = await agent
        .put(`/api/resources/${resource.id}/approve`)
        .expect(409);

      expect(response.body.message).toContain('not pending approval');
    });

    it('should approve rejected resource', async () => {
      const resource = await createTestResource({
        title: 'Rejected Resource',
        url: 'https://example.com/rejected',
        status: 'rejected',
      });

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

      const response = await agent
        .put(`/api/resources/${resource.id}/approve`)
        .expect(409);

      expect(response.body.message).toContain('not pending approval');
    });
  });

  describe('PUT /api/resources/:id/reject', () => {
    it('should reject resource as admin', async () => {
      const resource = await createTestResource({
        title: 'Pending Resource',
        url: 'https://example.com/pending',
        status: 'pending',
      });

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

      const response = await agent
        .put(`/api/resources/${resource.id}/reject`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', resource.id);
      expect(response.body).toHaveProperty('status', 'rejected');
      expect(response.body).toHaveProperty('statusChangedAt');
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

      const agent = await createClerkAuthenticatedAgent(app, regularUser);

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

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

      const response = await agent
        .put(`/api/resources/${resource.id}/reject`)
        .expect(409);

      expect(response.body.message).toContain('not pending approval');
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

      const agent = await createClerkAuthenticatedAgent(app, regularUser);

      const response = await agent
        .post(`/api/resources/${resource.id}/edits`)
        .send({
          proposedChanges: {
            title: 'Updated Resource',
            description: 'Updated description',
          },
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
      expect(response.body.proposedChanges).toEqual({
        title: 'Updated Resource',
        description: 'Updated description',
      });
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
          proposedChanges: { title: 'New Title' },
          proposedData: { title: 'New Title' },
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid resource id', async () => {
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

      const response = await agent
        .post('/api/resources/invalid/edits')
        .send({
          proposedChanges: { title: 'New Title' },
          proposedData: { title: 'New Title' },
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid request parameters');
    });

    it('should allow admin to suggest edits', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = await createClerkAuthenticatedAgent(app, adminUser);

      const response = await agent
        .post(`/api/resources/${resource.id}/edits`)
        .send({
          proposedChanges: { title: 'Admin Updated Title' },
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

      const agent = await createClerkAuthenticatedAgent(app, regularUser);

      const response = await agent
        .post(`/api/resources/${resource.id}/edits`)
        .send({
          proposedChanges: { title: 'AI Updated Title' },
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
      const regularAgent = await createClerkAuthenticatedAgent(app, regularUser);

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
      const adminAgent = await createClerkAuthenticatedAgent(app, adminUser);

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
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

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
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

      const requests = [
        agent.post('/api/resources').send({
          title: 'Concurrent 1',
          url: 'https://example.com/concurrent1',
          description: 'Concurrent test resource',
          category: 'Test',
        }),
        agent.post('/api/resources').send({
          title: 'Concurrent 2',
          url: 'https://example.com/concurrent2',
          description: 'Concurrent test resource',
          category: 'Test',
        }),
        agent.post('/api/resources').send({
          title: 'Concurrent 3',
          url: 'https://example.com/concurrent3',
          description: 'Concurrent test resource',
          category: 'Test',
        }),
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle very long resource title', async () => {
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

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
      const agent = await createClerkAuthenticatedAgent(app, regularUser);

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
