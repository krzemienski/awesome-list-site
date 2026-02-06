/**
 * Integration Tests for Admin API Endpoints
 *
 * Tests the admin endpoints including:
 * - GET /api/admin/stats - Dashboard statistics
 * - GET /api/admin/users - List users with pagination
 * - PUT /api/admin/users/:id/role - Change user role
 * - GET /api/admin/pending-resources - Get pending resources for approval
 * - POST /api/admin/resources/:id/approve - Approve a pending resource
 * - POST /api/admin/resources/:id/reject - Reject a pending resource
 * - GET /api/admin/resources - Get all resources (admin view)
 * - POST /api/admin/resources - Create a new resource (admin only)
 * - PUT /api/admin/resources/:id - Update a resource (admin only)
 * - DELETE /api/admin/resources/:id - Delete a resource (admin only)
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
  closeTestDb,
} from '../../helpers/db-helper';
import { hashPassword } from '../../../server/passwordUtils';

describe('Admin API Integration Tests', () => {
  let app: Express;
  let adminAgent: request.SuperAgentTest;
  let userAgent: request.SuperAgentTest;
  let adminEmail: string;
  let adminPassword: string;
  let adminUserId: string;
  let regularUserEmail: string;
  let regularUserPassword: string;
  let regularUserId: string;

  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);

    // Create admin user
    adminEmail = `admin-${Date.now()}@example.com`;
    adminPassword = 'AdminPassword123';
    const adminHashedPassword = await hashPassword(adminPassword);
    const adminUser = await createTestAdmin({
      email: adminEmail,
      password: adminHashedPassword,
      firstName: 'Admin',
      lastName: 'User',
    });
    adminUserId = adminUser.id;

    // Create regular user
    regularUserEmail = `user-${Date.now()}@example.com`;
    regularUserPassword = 'UserPassword123';
    const userHashedPassword = await hashPassword(regularUserPassword);
    const regularUser = await createTestUser({
      email: regularUserEmail,
      password: userHashedPassword,
      firstName: 'Regular',
      lastName: 'User',
      role: 'user',
    });
    regularUserId = regularUser.id;

    // Create authenticated agents
    adminAgent = request.agent(app);
    await adminAgent
      .post('/api/auth/local/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    userAgent = request.agent(app);
    await userAgent
      .post('/api/auth/local/login')
      .send({ email: regularUserEmail, password: regularUserPassword })
      .expect(200);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('GET /api/admin/stats', () => {
    it('should return admin dashboard statistics for admin user', async () => {
      // Create some test resources
      await createTestResource({ submittedBy: regularUserId, status: 'approved' });
      await createTestResource({ submittedBy: regularUserId, status: 'pending' });
      await createTestCategory();

      const response = await adminAgent
        .get('/api/admin/stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('resources');
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('pendingResources');
      expect(response.body.users).toBeGreaterThanOrEqual(2);
      expect(response.body.resources).toBeGreaterThanOrEqual(2);
      expect(response.body.categories).toBeGreaterThanOrEqual(1);
      expect(response.body.pendingResources).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await userAgent
        .get('/api/admin/stats')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return paginated list of users for admin', async () => {
      const response = await adminAgent
        .get('/api/admin/users')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination parameters', async () => {
      const response = await adminAgent
        .get('/api/admin/users?page=1&limit=1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.users.length).toBeLessThanOrEqual(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await userAgent
        .get('/api/admin/users')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    it('should allow admin to change user role to admin', async () => {
      const response = await adminAgent
        .put(`/api/admin/users/${regularUserId}/role`)
        .send({ role: 'admin' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('admin');
      expect(response.body.user.id).toBe(regularUserId);
    });

    it('should allow admin to change user role to user', async () => {
      const response = await adminAgent
        .put(`/api/admin/users/${regularUserId}/role`)
        .send({ role: 'user' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.user.role).toBe('user');
    });

    it('should return 400 for invalid role', async () => {
      const response = await adminAgent
        .put(`/api/admin/users/${regularUserId}/role`)
        .send({ role: 'superadmin' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin user', async () => {
      const response = await userAgent
        .put(`/api/admin/users/${regularUserId}/role`)
        .send({ role: 'admin' })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}/role`)
        .send({ role: 'admin' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('GET /api/admin/pending-resources', () => {
    it('should return list of pending resources for admin', async () => {
      // Create pending resources
      const pendingResource1 = await createTestResource({
        title: 'Pending Resource 1',
        status: 'pending',
        submittedBy: regularUserId,
      });
      const pendingResource2 = await createTestResource({
        title: 'Pending Resource 2',
        status: 'pending',
        submittedBy: regularUserId,
      });
      // Create approved resource (should not appear)
      await createTestResource({
        title: 'Approved Resource',
        status: 'approved',
        submittedBy: regularUserId,
      });

      const response = await adminAgent
        .get('/api/admin/pending-resources')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.every((r: any) => r.status === 'pending')).toBe(true);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await userAgent
        .get('/api/admin/pending-resources')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/admin/pending-resources')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('POST /api/admin/resources/:id/approve', () => {
    it('should allow admin to approve a pending resource', async () => {
      const pendingResource = await createTestResource({
        title: 'Pending Resource',
        status: 'pending',
        submittedBy: regularUserId,
      });

      const response = await adminAgent
        .post(`/api/admin/resources/${pendingResource.id}/approve`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('resource');
      expect(response.body.resource.status).toBe('approved');
      expect(response.body.resource.approvedBy).toBe(adminUserId);
      expect(response.body.resource.approvedAt).toBeDefined();
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await adminAgent
        .post('/api/admin/resources/999999/approve')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin user', async () => {
      const pendingResource = await createTestResource({
        title: 'Pending Resource',
        status: 'pending',
        submittedBy: regularUserId,
      });

      const response = await userAgent
        .post(`/api/admin/resources/${pendingResource.id}/approve`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const pendingResource = await createTestResource({
        title: 'Pending Resource',
        status: 'pending',
        submittedBy: regularUserId,
      });

      const response = await request(app)
        .post(`/api/admin/resources/${pendingResource.id}/approve`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('POST /api/admin/resources/:id/reject', () => {
    it('should allow admin to reject a pending resource with reason', async () => {
      const pendingResource = await createTestResource({
        title: 'Pending Resource',
        status: 'pending',
        submittedBy: regularUserId,
      });

      const response = await adminAgent
        .post(`/api/admin/resources/${pendingResource.id}/reject`)
        .send({ reason: 'Does not meet quality standards' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('resource');
      expect(response.body.resource.status).toBe('rejected');
      expect(response.body.resource.rejectionReason).toBe('Does not meet quality standards');
      expect(response.body.resource.rejectedBy).toBe(adminUserId);
    });

    it('should reject without reason if not provided', async () => {
      const pendingResource = await createTestResource({
        title: 'Pending Resource',
        status: 'pending',
        submittedBy: regularUserId,
      });

      const response = await adminAgent
        .post(`/api/admin/resources/${pendingResource.id}/reject`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.resource.status).toBe('rejected');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await adminAgent
        .post('/api/admin/resources/999999/reject')
        .send({ reason: 'Test reason' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin user', async () => {
      const pendingResource = await createTestResource({
        title: 'Pending Resource',
        status: 'pending',
        submittedBy: regularUserId,
      });

      const response = await userAgent
        .post(`/api/admin/resources/${pendingResource.id}/reject`)
        .send({ reason: 'Test reason' })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const pendingResource = await createTestResource({
        title: 'Pending Resource',
        status: 'pending',
        submittedBy: regularUserId,
      });

      const response = await request(app)
        .post(`/api/admin/resources/${pendingResource.id}/reject`)
        .send({ reason: 'Test reason' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('GET /api/admin/resources', () => {
    it('should return paginated list of all resources for admin', async () => {
      await createTestResource({ status: 'approved', submittedBy: regularUserId });
      await createTestResource({ status: 'pending', submittedBy: regularUserId });
      await createTestResource({ status: 'rejected', submittedBy: regularUserId });

      const response = await adminAgent
        .get('/api/admin/resources')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('resources');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.resources)).toBe(true);
      expect(response.body.resources.length).toBeGreaterThanOrEqual(3);
    });

    it('should support pagination parameters', async () => {
      await createTestResource({ submittedBy: regularUserId });
      await createTestResource({ submittedBy: regularUserId });

      const response = await adminAgent
        .get('/api/admin/resources?page=1&limit=1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.resources.length).toBeLessThanOrEqual(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
    });

    it('should support status filter', async () => {
      await createTestResource({ status: 'approved', submittedBy: regularUserId });
      await createTestResource({ status: 'pending', submittedBy: regularUserId });

      const response = await adminAgent
        .get('/api/admin/resources?status=pending')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.resources.every((r: any) => r.status === 'pending')).toBe(true);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await userAgent
        .get('/api/admin/resources')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/admin/resources')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('POST /api/admin/resources', () => {
    it('should allow admin to create a new resource directly as approved', async () => {
      const newResource = {
        title: 'Admin Created Resource',
        url: 'https://example.com/admin-resource',
        description: 'A resource created by admin',
        category: 'Testing',
        status: 'approved',
      };

      const response = await adminAgent
        .post('/api/admin/resources')
        .send(newResource)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('resource');
      expect(response.body.resource.title).toBe(newResource.title);
      expect(response.body.resource.url).toBe(newResource.url);
      expect(response.body.resource.status).toBe('approved');
      expect(response.body.resource.submittedBy).toBe(adminUserId);
    });

    it('should validate required fields', async () => {
      const invalidResource = {
        title: 'Missing URL',
        description: 'This resource has no URL',
      };

      const response = await adminAgent
        .post('/api/admin/resources')
        .send(invalidResource)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate URL format', async () => {
      const invalidResource = {
        title: 'Invalid URL Resource',
        url: 'not-a-valid-url',
        description: 'This has an invalid URL',
        category: 'Testing',
      };

      const response = await adminAgent
        .post('/api/admin/resources')
        .send(invalidResource)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin user', async () => {
      const newResource = {
        title: 'User Created Resource',
        url: 'https://example.com/user-resource',
        description: 'A resource created by user',
        category: 'Testing',
      };

      const response = await userAgent
        .post('/api/admin/resources')
        .send(newResource)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const newResource = {
        title: 'Unauth Created Resource',
        url: 'https://example.com/unauth-resource',
        description: 'A resource created by unauthenticated user',
        category: 'Testing',
      };

      const response = await request(app)
        .post('/api/admin/resources')
        .send(newResource)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('PUT /api/admin/resources/:id', () => {
    it('should allow admin to update a resource', async () => {
      const resource = await createTestResource({
        title: 'Original Title',
        description: 'Original description',
        submittedBy: regularUserId,
      });

      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const response = await adminAgent
        .put(`/api/admin/resources/${resource.id}`)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('resource');
      expect(response.body.resource.title).toBe('Updated Title');
      expect(response.body.resource.description).toBe('Updated description');
    });

    it('should allow admin to change resource status', async () => {
      const resource = await createTestResource({
        status: 'pending',
        submittedBy: regularUserId,
      });

      const response = await adminAgent
        .put(`/api/admin/resources/${resource.id}`)
        .send({ status: 'approved' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.resource.status).toBe('approved');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await adminAgent
        .put('/api/admin/resources/999999')
        .send({ title: 'Updated Title' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate URL format if provided', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const response = await adminAgent
        .put(`/api/admin/resources/${resource.id}`)
        .send({ url: 'invalid-url' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin user', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const response = await userAgent
        .put(`/api/admin/resources/${resource.id}`)
        .send({ title: 'Updated Title' })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const response = await request(app)
        .put(`/api/admin/resources/${resource.id}`)
        .send({ title: 'Updated Title' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('DELETE /api/admin/resources/:id', () => {
    it('should allow admin to delete a resource', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const response = await adminAgent
        .delete(`/api/admin/resources/${resource.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify resource is deleted
      const getResponse = await adminAgent
        .get(`/api/resources/${resource.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await adminAgent
        .delete('/api/admin/resources/999999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for non-admin user', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const response = await userAgent
        .delete(`/api/admin/resources/${resource.id}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 for unauthenticated user', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const response = await request(app)
        .delete(`/api/admin/resources/${resource.id}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('Admin Access Control', () => {
    it('should consistently deny non-admin access to all admin routes', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const endpoints = [
        { method: 'get', path: '/api/admin/stats' },
        { method: 'get', path: '/api/admin/users' },
        { method: 'put', path: `/api/admin/users/${regularUserId}/role`, body: { role: 'admin' } },
        { method: 'get', path: '/api/admin/pending-resources' },
        { method: 'post', path: `/api/admin/resources/${resource.id}/approve` },
        { method: 'post', path: `/api/admin/resources/${resource.id}/reject` },
        { method: 'get', path: '/api/admin/resources' },
        { method: 'post', path: '/api/admin/resources', body: { title: 'Test', url: 'https://test.com' } },
        { method: 'put', path: `/api/admin/resources/${resource.id}`, body: { title: 'Updated' } },
        { method: 'delete', path: `/api/admin/resources/${resource.id}` },
      ];

      for (const endpoint of endpoints) {
        const req = (userAgent as any)[endpoint.method](endpoint.path);
        if (endpoint.body) {
          req.send(endpoint.body);
        }
        const response = await req;
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('Forbidden');
      }
    });

    it('should consistently deny unauthenticated access to all admin routes', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const endpoints = [
        { method: 'get', path: '/api/admin/stats' },
        { method: 'get', path: '/api/admin/users' },
        { method: 'put', path: `/api/admin/users/${regularUserId}/role`, body: { role: 'admin' } },
        { method: 'get', path: '/api/admin/pending-resources' },
        { method: 'post', path: `/api/admin/resources/${resource.id}/approve` },
        { method: 'post', path: `/api/admin/resources/${resource.id}/reject` },
        { method: 'get', path: '/api/admin/resources' },
        { method: 'post', path: '/api/admin/resources', body: { title: 'Test', url: 'https://test.com' } },
        { method: 'put', path: `/api/admin/resources/${resource.id}`, body: { title: 'Updated' } },
        { method: 'delete', path: `/api/admin/resources/${resource.id}` },
      ];

      for (const endpoint of endpoints) {
        const req = (request(app) as any)[endpoint.method](endpoint.path);
        if (endpoint.body) {
          req.send(endpoint.body);
        }
        const response = await req;
        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Unauthorized');
      }
    });
  });

  describe('Admin Edge Cases', () => {
    it('should handle concurrent admin operations', async () => {
      const resource1 = await createTestResource({ status: 'pending', submittedBy: regularUserId });
      const resource2 = await createTestResource({ status: 'pending', submittedBy: regularUserId });
      const resource3 = await createTestResource({ status: 'pending', submittedBy: regularUserId });

      const operations = [
        adminAgent.post(`/api/admin/resources/${resource1.id}/approve`),
        adminAgent.post(`/api/admin/resources/${resource2.id}/approve`),
        adminAgent.post(`/api/admin/resources/${resource3.id}/reject`).send({ reason: 'Test' }),
      ];

      const responses = await Promise.all(operations);

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[2].status).toBe(200);
      expect(responses[0].body.resource.status).toBe('approved');
      expect(responses[1].body.resource.status).toBe('approved');
      expect(responses[2].body.resource.status).toBe('rejected');
    });

    it('should handle admin updating own role', async () => {
      const response = await adminAgent
        .put(`/api/admin/users/${adminUserId}/role`)
        .send({ role: 'user' })
        .expect(200);

      expect(response.body.user.role).toBe('user');
    });

    it('should handle very long rejection reason', async () => {
      const resource = await createTestResource({ status: 'pending', submittedBy: regularUserId });
      const longReason = 'X'.repeat(10000);

      const response = await adminAgent
        .post(`/api/admin/resources/${resource.id}/reject`)
        .send({ reason: longReason });

      // Should handle gracefully (either accept or reject with validation error)
      expect([200, 400]).toContain(response.status);
    });

    it('should handle malformed resource data in update', async () => {
      const resource = await createTestResource({ submittedBy: regularUserId });

      const response = await adminAgent
        .put(`/api/admin/resources/${resource.id}`)
        .send({ invalidField: 'invalid value', title: null })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });
});
