import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Express } from 'express';
import express from 'express';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import type { User } from '@shared/schema';
import {
  mockRequest,
  mockResponse,
  mockUser,
  expectStatus,
  expectJson,
  getJsonResponse,
} from './utils';
import passport from 'passport';

// Mock the storage module
vi.mock('../storage', () => ({
  storage: {
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    upsertUser: vi.fn(),
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

// Mock passport
vi.mock('passport', () => ({
  default: {
    authenticate: vi.fn(),
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
  },
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

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/local/login', () => {
    it('should successfully login with valid credentials', async () => {
      const user = mockUser({
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      const userSession = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
      };

      vi.mocked(storage.getUser).mockResolvedValue(user);

      // Mock passport.authenticate to call the callback with success
      vi.mocked(passport.authenticate).mockImplementation(
        (strategy: string, callback: any) => {
          return (req: any, res: any, next: any) => {
            callback(null, userSession, null);
          };
        }
      );

      const req = mockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
        logIn: vi.fn((user: any, callback: any) => {
          callback(null);
        }),
        session: {
          save: vi.fn((callback: any) => {
            callback(null);
          }),
        },
        sessionID: 'test-session-id',
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) =>
          layer.route?.path === '/api/auth/local/login' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res, vi.fn());
      }

      expect(passport.authenticate).toHaveBeenCalledWith('local', expect.any(Function));
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.user).toBeDefined();
      expect(response.user.id).toBe(user.id);
      expect(response.user.email).toBe(user.email);
    });

    it('should return 401 for invalid credentials', async () => {
      // Mock passport.authenticate to call the callback with failure
      vi.mocked(passport.authenticate).mockImplementation(
        (strategy: string, callback: any) => {
          return (req: any, res: any, next: any) => {
            callback(null, false, { message: 'Invalid email or password' });
          };
        }
      );

      const req = mockRequest({
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) =>
          layer.route?.path === '/api/auth/local/login' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res, vi.fn());
      }

      expectStatus(res, 401);
      expectJson(res, { message: 'Invalid email or password' });
    });

    it('should return 401 for invalid email format', async () => {
      // Mock passport.authenticate to call the callback with validation error
      vi.mocked(passport.authenticate).mockImplementation(
        (strategy: string, callback: any) => {
          return (req: any, res: any, next: any) => {
            callback(null, false, { message: 'Invalid email format' });
          };
        }
      );

      const req = mockRequest({
        body: {
          email: 'invalid-email',
          password: 'password123',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) =>
          layer.route?.path === '/api/auth/local/login' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res, vi.fn());
      }

      expectStatus(res, 401);
      expectJson(res, { message: 'Invalid email format' });
    });

    it('should return 401 for OAuth user trying to login locally', async () => {
      // Mock passport.authenticate to call the callback with OAuth error
      vi.mocked(passport.authenticate).mockImplementation(
        (strategy: string, callback: any) => {
          return (req: any, res: any, next: any) => {
            callback(null, false, {
              message: 'This account uses OAuth. Please login with your OAuth provider.',
            });
          };
        }
      );

      const req = mockRequest({
        body: {
          email: 'oauth@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) =>
          layer.route?.path === '/api/auth/local/login' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res, vi.fn());
      }

      expectStatus(res, 401);
      expectJson(res, {
        message: 'This account uses OAuth. Please login with your OAuth provider.',
      });
    });

    it('should return 500 on authentication error', async () => {
      // Mock passport.authenticate to call the callback with error
      vi.mocked(passport.authenticate).mockImplementation(
        (strategy: string, callback: any) => {
          return (req: any, res: any, next: any) => {
            callback(new Error('Database connection failed'), null, null);
          };
        }
      );

      const req = mockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) =>
          layer.route?.path === '/api/auth/local/login' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res, vi.fn());
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Internal server error' });
    });

    it('should return 500 on session save failure', async () => {
      const user = mockUser({
        id: 'test-user-id',
        email: 'test@example.com',
      });

      const userSession = {
        claims: {
          sub: user.id,
          email: user.email,
        },
      };

      // Mock passport.authenticate to succeed
      vi.mocked(passport.authenticate).mockImplementation(
        (strategy: string, callback: any) => {
          return (req: any, res: any, next: any) => {
            callback(null, userSession, null);
          };
        }
      );

      const req = mockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
        logIn: vi.fn((user: any, callback: any) => {
          callback(null);
        }),
        session: {
          save: vi.fn((callback: any) => {
            callback(new Error('Session store error'));
          }),
        },
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) =>
          layer.route?.path === '/api/auth/local/login' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res, vi.fn());
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Failed to save session' });
    });

    it('should return 500 on login failure', async () => {
      const userSession = {
        claims: {
          sub: 'test-user-id',
          email: 'test@example.com',
        },
      };

      // Mock passport.authenticate to succeed
      vi.mocked(passport.authenticate).mockImplementation(
        (strategy: string, callback: any) => {
          return (req: any, res: any, next: any) => {
            callback(null, userSession, null);
          };
        }
      );

      const req = mockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
        logIn: vi.fn((user: any, callback: any) => {
          callback(new Error('Login error'));
        }),
      });
      const res = mockResponse();

      const app = express();
      app.use(express.json());
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) =>
          layer.route?.path === '/api/auth/local/login' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res, vi.fn());
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Login failed' });
    });
  });

  describe('GET /api/auth/user', () => {
    it('should return authenticated user with dbUser in session', async () => {
      const user = mockUser({
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      });

      const req = mockRequest({
        isAuthenticated: vi.fn(() => true),
        user: {
          claims: {
            sub: user.id,
          },
          dbUser: user,
        },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/auth/user' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.user).toBeDefined();
      expect(response.user.id).toBe(user.id);
      expect(response.user.email).toBe(user.email);
      expect(response.isAuthenticated).toBe(true);
    });

    it('should fetch user from DB when dbUser not in session', async () => {
      const user = mockUser({
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      });

      vi.mocked(storage.getUser).mockResolvedValue(user);

      const req = mockRequest({
        isAuthenticated: vi.fn(() => true),
        user: {
          claims: {
            sub: user.id,
          },
        },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/auth/user' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.getUser).toHaveBeenCalledWith(user.id);
      expectStatus(res, 200);
      expectJson(res);
      const response = getJsonResponse(res);
      expect(response.user).toBeDefined();
      expect(response.user.id).toBe(user.id);
      expect(response.isAuthenticated).toBe(true);
    });

    it('should return null for unauthenticated user', async () => {
      const req = mockRequest({
        isAuthenticated: vi.fn(() => false),
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/auth/user' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 200);
      expectJson(res, { user: null, isAuthenticated: false });
    });

    it('should return null when user not found in DB', async () => {
      vi.mocked(storage.getUser).mockResolvedValue(undefined);

      const req = mockRequest({
        isAuthenticated: vi.fn(() => true),
        user: {
          claims: {
            sub: 'nonexistent-user-id',
          },
        },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/auth/user' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(storage.getUser).toHaveBeenCalledWith('nonexistent-user-id');
      expectStatus(res, 200);
      expectJson(res, { user: null, isAuthenticated: false });
    });

    it('should return null when user claims are missing', async () => {
      const req = mockRequest({
        isAuthenticated: vi.fn(() => true),
        user: {
          claims: {},
        },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/auth/user' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 200);
      expectJson(res, { user: null, isAuthenticated: false });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.getUser).mockRejectedValue(new Error('Database error'));

      const req = mockRequest({
        isAuthenticated: vi.fn(() => true),
        user: {
          claims: {
            sub: 'test-user-id',
          },
        },
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/auth/user' && layer.route.methods.get
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Failed to fetch user' });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout user', async () => {
      const req = mockRequest({
        logout: vi.fn((callback: any) => {
          callback();
        }),
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/auth/logout' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expect(req.logout).toHaveBeenCalled();
      expectStatus(res, 200);
      expectJson(res, { success: true });
    });

    it('should handle errors gracefully', async () => {
      const req = mockRequest({
        logout: vi.fn(() => {
          throw new Error('Logout error');
        }),
      });
      const res = mockResponse();

      const app = express();
      await registerRoutes(app);

      const route = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/auth/logout' && layer.route.methods.post
      );

      if (route) {
        await route.route.stack[0].handle(req, res);
      }

      expectStatus(res, 500);
      expectJson(res, { message: 'Failed to logout' });
    });
  });
});
