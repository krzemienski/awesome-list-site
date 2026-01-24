import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Express } from 'express';
import express from 'express';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import {
  mockRequest,
  mockResponse,
  expectStatus,
  expectJson,
  getJsonResponse,
  createTestCategory,
  createTestSubcategory,
} from './utils';

// Mock the storage module
vi.mock('../storage', () => ({
  storage: {
    listCategories: vi.fn(),
    listSubcategories: vi.fn(),
    listSubSubcategories: vi.fn(),
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

describe('Category Routes', () => {
  describe('GET /api/categories', () => {
    it('should return list of categories', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Video Codecs',
          slug: 'video-codecs',
          description: 'Video codec resources',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Streaming',
          slug: 'streaming',
          description: 'Streaming resources',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(storage.listCategories).mockResolvedValue(mockCategories);

      const req = mockRequest();
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/categories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.listCategories).toHaveBeenCalled();
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response).toHaveLength(2);
      expect(response[0].name).toBe('Video Codecs');
      expect(response[1].name).toBe('Streaming');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.listCategories).mockRejectedValue(new Error('Database error'));

      const req = mockRequest();
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/categories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Failed to fetch categories' });
    });
  });

  describe('GET /api/subcategories', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return all subcategories when no filter', async () => {
      const mockSubcategories = [
        {
          id: 1,
          name: 'HEVC',
          slug: 'hevc',
          categoryId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'AV1',
          slug: 'av1',
          categoryId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(storage.listSubcategories).mockResolvedValue(mockSubcategories);

      const req = mockRequest({
        query: {},
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.listSubcategories).toHaveBeenCalledWith(undefined);
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response).toHaveLength(2);
    });

    it('should return filtered subcategories when categoryId provided', async () => {
      const mockSubcategories = [
        {
          id: 1,
          name: 'HEVC',
          slug: 'hevc',
          categoryId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(storage.listSubcategories).mockResolvedValue(mockSubcategories);

      const req = mockRequest({
        query: { categoryId: '1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.listSubcategories).toHaveBeenCalledWith(1);
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response).toHaveLength(1);
      expect(response[0].categoryId).toBe(1);
    });

    it('should handle invalid categoryId (non-numeric)', async () => {
      const req = mockRequest({
        query: { categoryId: 'invalid' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 400);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.message).toBe('Invalid categoryId parameter');
    });

    it('should handle invalid categoryId (negative number)', async () => {
      const req = mockRequest({
        query: { categoryId: '-1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 400);
      expectJson(res, { message: 'categoryId must be a positive number' });
    });

    it('should handle invalid categoryId (zero)', async () => {
      const req = mockRequest({
        query: { categoryId: '0' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 400);
      expectJson(res, { message: 'categoryId must be a positive number' });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.listSubcategories).mockRejectedValue(new Error('Database error'));

      const req = mockRequest({
        query: {},
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Failed to fetch subcategories' });
    });
  });

  describe('GET /api/sub-subcategories', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return all sub-subcategories when no filter', async () => {
      const mockSubSubcategories = [
        {
          id: 1,
          name: 'Hardware Encoders',
          slug: 'hardware-encoders',
          subcategoryId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Software Encoders',
          slug: 'software-encoders',
          subcategoryId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(storage.listSubSubcategories).mockResolvedValue(mockSubSubcategories);

      const req = mockRequest({
        query: {},
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/sub-subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.listSubSubcategories).toHaveBeenCalledWith(undefined);
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response).toHaveLength(2);
    });

    it('should return filtered sub-subcategories when subcategoryId provided', async () => {
      const mockSubSubcategories = [
        {
          id: 1,
          name: 'Hardware Encoders',
          slug: 'hardware-encoders',
          subcategoryId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(storage.listSubSubcategories).mockResolvedValue(mockSubSubcategories);

      const req = mockRequest({
        query: { subcategoryId: '1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/sub-subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.listSubSubcategories).toHaveBeenCalledWith(1);
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response).toHaveLength(1);
      expect(response[0].subcategoryId).toBe(1);
    });

    it('should handle invalid subcategoryId (non-numeric)', async () => {
      const req = mockRequest({
        query: { subcategoryId: 'invalid' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/sub-subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 400);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.message).toBe('Invalid subcategoryId parameter');
    });

    it('should handle invalid subcategoryId (negative number)', async () => {
      const req = mockRequest({
        query: { subcategoryId: '-1' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/sub-subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 400);
      expectJson(res, { message: 'subcategoryId must be a positive number' });
    });

    it('should handle invalid subcategoryId (zero)', async () => {
      const req = mockRequest({
        query: { subcategoryId: '0' },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/sub-subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 400);
      expectJson(res, { message: 'subcategoryId must be a positive number' });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.listSubSubcategories).mockRejectedValue(new Error('Database error'));

      const req = mockRequest({
        query: {},
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/sub-subcategories' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Failed to fetch sub-subcategories' });
    });
  });
});
