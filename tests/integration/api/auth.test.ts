/**
 * Integration tests for the current Clerk-backed auth contract.
 *
 * Clerk owns credentials, sessions, sign-in, and sign-out. These tests do not
 * exercise the removed local password endpoint; authenticated requests use a
 * real Clerk backend session whose external_id bridges to the local user row.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '../../../server/routes';
import {
  cleanupDatabase,
  createTestAdmin,
  createTestUser,
  closeTestDb,
} from '../../helpers/db-helper';
import {
  cleanupClerkTestUsers,
  createClerkAuthenticatedAgent,
  installClerkTestMiddleware,
} from '../../helpers/api-helper';

describe('Auth API Integration Tests', () => {
  let app: Express;
  let testUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    await cleanupDatabase();

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    installClerkTestMiddleware(app);
    await registerRoutes(app);

    testUser = await createTestUser({
      email: `auth-user-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    });
  });

  afterEach(async () => {
    await cleanupClerkTestUsers();
  });

  afterAll(async () => {
    await cleanupClerkTestUsers();
    await closeTestDb();
  });

  describe('GET /api/auth/user', () => {
    it('returns the anonymous current-auth contract when no Clerk session is present', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        user: null,
        isAuthenticated: false,
      });
    });

    it('resolves a real Clerk session to the bridged local user row', async () => {
      const agent = await createClerkAuthenticatedAgent(app, testUser);
      const response = await agent
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('isAuthenticated', true);
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        name: 'Test User',
        avatar: null,
        role: 'user',
        deletionRequestedAt: null,
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('reflects the local role for a Clerk-authenticated admin', async () => {
      const admin = await createTestAdmin({
        email: `auth-admin-${Date.now()}@example.com`,
        firstName: 'Admin',
        lastName: 'User',
      });
      const agent = await createClerkAuthenticatedAgent(app, admin);
      const response = await agent
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: admin.id,
        email: admin.email,
        name: 'Admin User',
        role: 'admin',
      });
    });
  });

  describe('deprecated auth aliases', () => {
    it('keeps the status probe honest for anonymous and authenticated requests', async () => {
      const anonymous = await request(app)
        .get('/api/auth/status')
        .expect('Content-Type', /json/)
        .expect(200);
      expect(anonymous.body).toEqual({ authenticated: false });

      const agent = await createClerkAuthenticatedAgent(app, testUser);
      const authenticated = await agent
        .get('/api/auth/status')
        .expect('Content-Type', /json/)
        .expect(200);
      expect(authenticated.body).toEqual({ authenticated: true });
    });

    it('requires a Clerk session for the deprecated /api/auth/me alias', async () => {
      const anonymous = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);
      expect(anonymous.body).toEqual({ message: 'Unauthorized' });

      const agent = await createClerkAuthenticatedAgent(app, testUser);
      const authenticated = await agent
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(200);
      expect(authenticated.body).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        name: 'Test User',
        role: 'user',
      });
      expect(authenticated.body).not.toHaveProperty('password');
    });
  });

  describe('Clerk session lifecycle', () => {
    it('revokes the caller sessions through logout-all', async () => {
      const agent = await createClerkAuthenticatedAgent(app, testUser);
      const response = await agent
        .post('/api/auth/logout-all')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Signed out everywhere',
      });
      expect(response.body.sessionsRevoked).toBeGreaterThanOrEqual(1);
    });

    it('does not expose the removed local password-login route', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({ email: testUser.email, password: 'not-used-by-clerk' })
        .expect(404);

      expect(response.body).not.toHaveProperty('user');
    });

    it('does not expose the removed legacy logout route', async () => {
      await request(app).post('/api/auth/logout').expect(404);
    });
  });
});