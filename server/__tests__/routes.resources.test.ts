import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Express } from 'express';
import express from 'express';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import type { Resource } from '@shared/schema';
import {
  mockRequest,
  mockResponse,
  mockAuthenticatedRequest,
  mockAdminRequest,
  mockUser,
  mockAdminUser,
  createTestResource,
  expectStatus,
  expectJson,
  getJsonResponse,
} from './utils';

// Mock the storage module
vi.mock('../storage', () => ({
  storage: {
    listResources: vi.fn(),
    getResource: vi.fn(),
    createResource: vi.fn(),
    getPendingResources: vi.fn(),
    approveResource: vi.fn(),
    rejectResource: vi.fn(),
    createResourceEdit: vi.fn(),
    getUser: vi.fn(),
  },
}));

// Mock auth modules
vi.mock('../replitAuth', () => ({
  setupAuth: vi.fn(),
  isAuthenticated: vi.fn((req: any, res: any, next: any) => next()),
}));

vi.mock('../localAuth', () => ({
  setupLocalAuth: vi.fn(),
}));

// Mock other dependencies
vi.mock('../parser', () => ({
  fetchAwesomeList: vi.fn(),
}));

vi.mock('../awesome-video-parser-clean', () => ({
  fetchAwesomeVideoData: vi.fn(),
}));

vi.mock('../recommendation-engine', () => ({
  RecommendationEngine: vi.fn(),
  UserProfile: vi.fn(),
}));

vi.mock('../github-api', () => ({
  fetchAwesomeLists: vi.fn(),
  searchAwesomeLists: vi.fn(),
}));

vi.mock('../github/syncService', () => ({
  syncService: {},
}));

vi.mock('../ai/recommendationEngine', () => ({
  recommendationEngine: {},
  UserProfile: vi.fn(),
}));

vi.mock('../ai/learningPathGenerator', () => ({
  learningPathGenerator: {},
}));

vi.mock('../ai/claudeService', () => ({
  claudeService: {},
}));

vi.mock('../github/formatter', () => ({
  AwesomeListFormatter: vi.fn(),
}));

vi.mock('../validation/awesomeLint', () => ({
  validateAwesomeList: vi.fn(),
  formatValidationReport: vi.fn(),
}));

vi.mock('../validation/linkChecker', () => ({
  checkResourceLinks: vi.fn(),
  formatLinkCheckReport: vi.fn(),
}));

vi.mock('../seed', () => ({
  seedDatabase: vi.fn(),
}));

vi.mock('../ai/enrichmentService', () => ({
  enrichmentService: {},
}));

describe('Resource Routes', () => {
  describe('GET /api/resources', () => {
    it('should return paginated list of approved resources', async () => {
      const mockResources: Resource[] = [
        {
          id: 1,
          title: 'Test Resource 1',
          url: 'https://example.com/resource1',
          description: 'Description 1',
          category: 'Test Category',
          subcategory: null,
          subSubcategory: null,
          status: 'approved',
          submittedBy: 'user-1',
          approvedBy: 'admin-1',
          approvedAt: new Date(),
          githubSynced: false,
          lastSyncedAt: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          title: 'Test Resource 2',
          url: 'https://example.com/resource2',
          description: 'Description 2',
          category: 'Test Category',
          subcategory: null,
          subSubcategory: null,
          status: 'approved',
          submittedBy: 'user-1',
          approvedBy: 'admin-1',
          approvedAt: new Date(),
          githubSynced: false,
          lastSyncedAt: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(storage.listResources).mockResolvedValue({
        resources: mockResources,
        total: 2,
      });

      const req = mockRequest({
        query: { page: '1', limit: '20' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.listResources).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'approved',
      });
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.resources).toHaveLength(2);
      expect(response.total).toBe(2);
    });

    it('should handle pagination parameters', async () => {
      vi.mocked(storage.listResources).mockResolvedValue({
        resources: [],
        total: 0,
      });

      const req = mockRequest({
        query: { page: '2', limit: '10' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.listResources).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'approved',
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.listResources).mockRejectedValue(new Error('Database error'));

      const req = mockRequest({
        query: {},
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Failed to fetch resources' });
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should return a single resource by id', async () => {
      const mockResource: Resource = {
        id: 1,
        title: 'Test Resource',
        url: 'https://example.com/resource',
        description: 'Test description',
        category: 'Test Category',
        subcategory: null,
        subSubcategory: null,
        status: 'approved',
        submittedBy: 'user-1',
        approvedBy: 'admin-1',
        approvedAt: new Date(),
        githubSynced: false,
        lastSyncedAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storage.getResource).mockResolvedValue(mockResource);

      const req = mockRequest({
        params: { id: '1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.getResource).toHaveBeenCalledWith(1);
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.id).toBe(1);
      expect(response.title).toBe('Test Resource');
    });

    it('should return 404 when resource not found', async () => {
      vi.mocked(storage.getResource).mockResolvedValue(undefined);

      const req = mockRequest({
        params: { id: '999' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.getResource).toHaveBeenCalledWith(999);
      expectStatus(res, 404);
      expectJson(res, { message: 'Resource not found' });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.getResource).mockRejectedValue(new Error('Database error'));

      const req = mockRequest({
        params: { id: '1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Failed to fetch resource' });
    });
  });

  describe('POST /api/resources', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create a new resource when authenticated', async () => {
      const user = mockUser();
      const newResource: Resource = {
        id: 1,
        title: 'New Resource',
        url: 'https://example.com/new',
        description: 'New resource description',
        category: 'Test Category',
        subcategory: null,
        subSubcategory: null,
        status: 'pending',
        submittedBy: user.id,
        approvedBy: null,
        approvedAt: null,
        githubSynced: false,
        lastSyncedAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storage.createResource).mockResolvedValue(newResource);

      const req = mockAuthenticatedRequest(user, {
        body: {
          title: 'New Resource',
          url: 'https://example.com/new',
          description: 'New resource description',
          category: 'Test Category',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources' && layer.route.methods.post
      );

      if (route) {
        // Skip isAuthenticated middleware, go straight to handler
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expect(storage.createResource).toHaveBeenCalled();
      expectStatus(res, 201);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.title).toBe('New Resource');
      expect(response.status).toBe('pending');
    });

    it('should return 401 when not authenticated', async () => {
      const req = mockRequest({
        body: {
          title: 'New Resource',
          url: 'https://example.com/new',
          description: 'New resource description',
          category: 'Test Category',
        },
      });
      const res = mockResponse();

      // Mock isAuthenticated to return 401
      const { isAuthenticated } = await import('../replitAuth');
      vi.mocked(isAuthenticated).mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources' && layer.route.methods.post
      );

      if (route) {
        // Execute the middleware chain
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 401);
    });

    it('should validate resource data', async () => {
      const user = mockUser();
      const req = mockAuthenticatedRequest(user, {
        body: {
          // Missing required fields
          title: '',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expectStatus(res, 400);
    });

    it('should handle errors gracefully', async () => {
      const user = mockUser();
      vi.mocked(storage.createResource).mockRejectedValue(new Error('Database error'));

      const req = mockAuthenticatedRequest(user, {
        body: {
          title: 'New Resource',
          url: 'https://example.com/new',
          description: 'New resource description',
          category: 'Test Category',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expectStatus(res, 500);
    });
  });

  describe('GET /api/resources/pending', () => {
    it('should return pending resources for admin users', async () => {
      const adminUser = mockAdminUser();
      const mockPendingResources: Resource[] = [
        {
          id: 1,
          title: 'Pending Resource',
          url: 'https://example.com/pending',
          description: 'Pending description',
          category: 'Test Category',
          subcategory: null,
          subSubcategory: null,
          status: 'pending',
          submittedBy: 'user-1',
          approvedBy: null,
          approvedAt: null,
          githubSynced: false,
          lastSyncedAt: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(storage.getUser).mockResolvedValue(adminUser);
      vi.mocked(storage.getPendingResources).mockResolvedValue({
        resources: mockPendingResources,
        total: 1,
      });

      const req = mockAdminRequest({
        query: { page: '1', limit: '20' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/pending'
      );

      if (route) {
        // Skip middleware, go to handler
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expect(storage.getPendingResources).toHaveBeenCalled();
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.resources).toHaveLength(1);
      expect(response.resources[0].status).toBe('pending');
    });

    it('should return 403 for non-admin users', async () => {
      const regularUser = mockUser();
      vi.mocked(storage.getUser).mockResolvedValue(regularUser);

      const req = mockAuthenticatedRequest(regularUser, {
        query: {},
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/pending'
      );

      if (route) {
        // Execute isAdmin middleware
        const isAdminMiddleware = route.route.stack[route.route.stack.length - 2];
        await isAdminMiddleware.handle(req, res, () => {});
      }

      expectStatus(res, 403);
      expectJson(res, { message: 'Forbidden: Admin access required' });
    });
  });

  describe('PUT /api/resources/:id/approve', () => {
    it('should approve a resource when admin', async () => {
      const adminUser = mockAdminUser();
      const approvedResource: Resource = {
        id: 1,
        title: 'Approved Resource',
        url: 'https://example.com/approved',
        description: 'Approved description',
        category: 'Test Category',
        subcategory: null,
        subSubcategory: null,
        status: 'approved',
        submittedBy: 'user-1',
        approvedBy: adminUser.id,
        approvedAt: new Date(),
        githubSynced: false,
        lastSyncedAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storage.getUser).mockResolvedValue(adminUser);
      vi.mocked(storage.approveResource).mockResolvedValue(approvedResource);

      const req = mockAdminRequest({
        params: { id: '1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id/approve'
      );

      if (route) {
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expect(storage.approveResource).toHaveBeenCalledWith(1, adminUser.id);
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.status).toBe('approved');
    });

    it('should return 403 for non-admin users', async () => {
      const regularUser = mockUser();
      vi.mocked(storage.getUser).mockResolvedValue(regularUser);

      const req = mockAuthenticatedRequest(regularUser, {
        params: { id: '1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id/approve'
      );

      if (route) {
        const isAdminMiddleware = route.route.stack[route.route.stack.length - 2];
        await isAdminMiddleware.handle(req, res, () => {});
      }

      expectStatus(res, 403);
    });

    it('should handle errors gracefully', async () => {
      const adminUser = mockAdminUser();
      vi.mocked(storage.getUser).mockResolvedValue(adminUser);
      vi.mocked(storage.approveResource).mockRejectedValue(new Error('Database error'));

      const req = mockAdminRequest({
        params: { id: '1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id/approve'
      );

      if (route) {
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expectStatus(res, 500);
    });
  });

  describe('PUT /api/resources/:id/reject', () => {
    it('should reject a resource when admin', async () => {
      const adminUser = mockAdminUser();
      vi.mocked(storage.getUser).mockResolvedValue(adminUser);
      vi.mocked(storage.rejectResource).mockResolvedValue();

      const req = mockAdminRequest({
        params: { id: '1' },
        body: { reason: 'Does not meet quality standards' },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id/reject'
      );

      if (route) {
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expect(storage.rejectResource).toHaveBeenCalledWith(
        1,
        adminUser.id,
        'Does not meet quality standards'
      );
      expectStatus(res, 200);
    });

    it('should return 403 for non-admin users', async () => {
      const regularUser = mockUser();
      vi.mocked(storage.getUser).mockResolvedValue(regularUser);

      const req = mockAuthenticatedRequest(regularUser, {
        params: { id: '1' },
        body: { reason: 'Spam' },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id/reject'
      );

      if (route) {
        const isAdminMiddleware = route.route.stack[route.route.stack.length - 2];
        await isAdminMiddleware.handle(req, res, () => {});
      }

      expectStatus(res, 403);
    });
  });

  describe('POST /api/resources/:id/edits', () => {
    it('should submit an edit suggestion when authenticated', async () => {
      const user = mockUser();
      const mockResource: Resource = {
        id: 1,
        title: 'Original Resource',
        url: 'https://example.com/original',
        description: 'Original description',
        category: 'Test Category',
        subcategory: null,
        subSubcategory: null,
        status: 'approved',
        submittedBy: 'user-1',
        approvedBy: 'admin-1',
        approvedAt: new Date(),
        githubSynced: false,
        lastSyncedAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEdit = {
        id: 1,
        resourceId: 1,
        submittedBy: user.id,
        status: 'pending' as const,
        originalResourceUpdatedAt: mockResource.updatedAt,
        proposedChanges: {
          description: {
            old: 'Original description',
            new: 'Updated description',
          },
        },
        proposedData: {
          description: 'Updated description',
        },
        claudeMetadata: null,
        claudeAnalyzedAt: null,
        handledBy: null,
        handledAt: null,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storage.getResource).mockResolvedValue(mockResource);
      vi.mocked(storage.createResourceEdit).mockResolvedValue(mockEdit);

      const req = mockAuthenticatedRequest(user, {
        params: { id: '1' },
        body: {
          description: 'Updated description',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id/edits'
      );

      if (route) {
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expect(storage.createResourceEdit).toHaveBeenCalled();
      expectStatus(res, 201);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.status).toBe('pending');
    });

    it('should return 404 when resource not found', async () => {
      const user = mockUser();
      vi.mocked(storage.getResource).mockResolvedValue(undefined);

      const req = mockAuthenticatedRequest(user, {
        params: { id: '999' },
        body: {
          description: 'Updated description',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id/edits'
      );

      if (route) {
        await route.route.stack[route.route.stack.length - 1].handle(req, res);
      }

      expectStatus(res, 404);
    });

    it('should return 401 when not authenticated', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: {
          description: 'Updated description',
        },
      });
      const res = mockResponse();

      const { isAuthenticated } = await import('../replitAuth');
      vi.mocked(isAuthenticated).mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/resources/:id/edits'
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 401);
    });
  });
});
