/**
 * Integration Tests for Auth API Endpoints
 *
 * Tests the authentication endpoints including:
 * - POST /api/auth/local/login - Local authentication login
 * - GET /api/auth/user - Get current user
 * - POST /api/auth/logout - Logout user
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '../../../server/routes';
import {
  cleanupDatabase,
  createTestUser,
  closeTestDb,
} from '../../helpers/db-helper';
import { hashPassword } from '../../../server/passwordUtils';

describe('Auth API Integration Tests', () => {
  let app: Express;
  let testUserEmail: string;
  let testUserPassword: string;
  let testUserId: string;

  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);

    // Create a test user with hashed password
    testUserEmail = `test-${Date.now()}@example.com`;
    testUserPassword = 'TestPassword123';
    const hashedPassword = await hashPassword(testUserPassword);

    const user = await createTestUser({
      email: testUserEmail,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    });

    testUserId = user.id;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('POST /api/auth/local/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', testUserId);
      expect(response.body.user).toHaveProperty('email', testUserEmail);
      expect(response.body.user).toHaveProperty('firstName', 'Test');
      expect(response.body.user).toHaveProperty('lastName', 'User');
      expect(response.body.user).toHaveProperty('role', 'user');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should return 401 with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should return 401 with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email format');
    });

    it('should return 401 with password too short', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: 'short',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Password must be at least 8 characters');
    });

    it('should return 400 with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          password: 'TestPassword123',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 with empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle case-sensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail.toUpperCase(),
          password: testUserPassword,
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject user without password (OAuth user)', async () => {
      // Create OAuth user (no password)
      const oauthUserEmail = `oauth-${Date.now()}@example.com`;
      await createTestUser({
        email: oauthUserEmail,
        password: null,
        firstName: 'OAuth',
        lastName: 'User',
        role: 'user',
      });

      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: oauthUserEmail,
          password: 'TestPassword123',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('OAuth');
    });

    it('should set session cookie on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);

      // Check that session cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);
      expect(cookies!.some((cookie: string) => cookie.includes('connect.sid'))).toBe(true);
    });
  });

  describe('GET /api/auth/user', () => {
    it('should return null when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user', null);
      expect(response.body).toHaveProperty('isAuthenticated', false);
    });

    it('should return user when authenticated', async () => {
      // Login first to get session
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);

      // Now check user endpoint with authenticated session
      const response = await agent
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('isAuthenticated', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', testUserId);
      expect(response.body.user).toHaveProperty('email', testUserEmail);
      expect(response.body.user).toHaveProperty('firstName', 'Test');
      expect(response.body.user).toHaveProperty('lastName', 'User');
      expect(response.body.user).toHaveProperty('role', 'user');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return admin role for admin users', async () => {
      // Create admin user
      const adminEmail = `admin-${Date.now()}@example.com`;
      const adminPassword = 'AdminPassword123';
      const hashedPassword = await hashPassword(adminPassword);

      await createTestUser({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      });

      // Login as admin
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(200);

      // Check user endpoint
      const response = await agent
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.user).toHaveProperty('role', 'admin');
    });

    it('should include profile image URL if set', async () => {
      // Create user with profile image
      const userEmail = `user-with-image-${Date.now()}@example.com`;
      const userPassword = 'UserPassword123';
      const hashedPassword = await hashPassword(userPassword);

      await createTestUser({
        email: userEmail,
        password: hashedPassword,
        firstName: 'Image',
        lastName: 'User',
        role: 'user',
        profileImageUrl: 'https://example.com/avatar.jpg',
      });

      // Login
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(200);

      // Check user endpoint
      const response = await agent
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.user).toHaveProperty('profileImageUrl', 'https://example.com/avatar.jpg');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      // Login first
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);

      // Logout
      const logoutResponse = await agent
        .post('/api/auth/logout')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('success', true);

      // Verify user is no longer authenticated
      const userResponse = await agent
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(userResponse.body).toHaveProperty('user', null);
      expect(userResponse.body).toHaveProperty('isAuthenticated', false);
    });

    it('should handle logout when not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should clear session on logout', async () => {
      // Login first
      const agent = request.agent(app);
      const loginResponse = await agent
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);

      // Get session cookie
      const loginCookies = loginResponse.headers['set-cookie'];
      expect(loginCookies).toBeDefined();

      // Logout
      await agent
        .post('/api/auth/logout')
        .expect(200);

      // Try to use old session - should not be authenticated
      const userResponse = await agent
        .get('/api/auth/user')
        .expect(200);

      expect(userResponse.body.isAuthenticated).toBe(false);
    });
  });

  describe('Auth Flow - Login -> Check User -> Logout', () => {
    it('should complete full authentication flow', async () => {
      const agent = request.agent(app);

      // Step 1: Verify not authenticated initially
      const initialCheck = await agent
        .get('/api/auth/user')
        .expect(200);

      expect(initialCheck.body.isAuthenticated).toBe(false);
      expect(initialCheck.body.user).toBeNull();

      // Step 2: Login
      const loginResponse = await agent
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);

      expect(loginResponse.body.user.email).toBe(testUserEmail);

      // Step 3: Verify authenticated
      const authenticatedCheck = await agent
        .get('/api/auth/user')
        .expect(200);

      expect(authenticatedCheck.body.isAuthenticated).toBe(true);
      expect(authenticatedCheck.body.user.email).toBe(testUserEmail);

      // Step 4: Logout
      await agent
        .post('/api/auth/logout')
        .expect(200);

      // Step 5: Verify not authenticated after logout
      const finalCheck = await agent
        .get('/api/auth/user')
        .expect(200);

      expect(finalCheck.body.isAuthenticated).toBe(false);
      expect(finalCheck.body.user).toBeNull();
    });
  });

  describe('Auth Security', () => {
    it('should not expose password in response', async () => {
      const agent = request.agent(app);
      const loginResponse = await agent
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);

      expect(loginResponse.body.user).not.toHaveProperty('password');

      const userResponse = await agent
        .get('/api/auth/user')
        .expect(200);

      expect(userResponse.body.user).not.toHaveProperty('password');
    });

    it('should rate limit login attempts (basic check)', async () => {
      // Make multiple failed login attempts
      const attempts = 5;
      for (let i = 0; i < attempts; i++) {
        await request(app)
          .post('/api/auth/local/login')
          .send({
            email: testUserEmail,
            password: 'WrongPassword',
          })
          .expect(401);
      }

      // Should still allow valid login (no rate limiting implemented yet)
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        });

      // This test documents current behavior
      // If rate limiting is added, this should expect 429 instead
      expect(response.status).toBe(200);
    });

    it('should handle SQL injection attempts in email', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: "admin'--",
          password: 'password',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid email format');
    });

    it('should handle XSS attempts in credentials', async () => {
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: '<script>alert("xss")</script>@example.com',
          password: '<script>alert("xss")</script>',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Auth Edge Cases', () => {
    it('should handle concurrent login attempts', async () => {
      const attempts = [
        request(app)
          .post('/api/auth/local/login')
          .send({ email: testUserEmail, password: testUserPassword }),
        request(app)
          .post('/api/auth/local/login')
          .send({ email: testUserEmail, password: testUserPassword }),
        request(app)
          .post('/api/auth/local/login')
          .send({ email: testUserEmail, password: testUserPassword }),
      ];

      const responses = await Promise.all(attempts);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe(testUserEmail);
      });
    });

    it('should handle very long email', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: longEmail,
          password: 'TestPassword123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle very long password', async () => {
      const longPassword = 'P'.repeat(10000);
      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: testUserEmail,
          password: longPassword,
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle special characters in password', async () => {
      // Create user with special character password
      const specialUserEmail = `special-${Date.now()}@example.com`;
      const specialPassword = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await hashPassword(specialPassword);

      await createTestUser({
        email: specialUserEmail,
        password: hashedPassword,
        firstName: 'Special',
        lastName: 'User',
        role: 'user',
      });

      const response = await request(app)
        .post('/api/auth/local/login')
        .send({
          email: specialUserEmail,
          password: specialPassword,
        })
        .expect(200);

      expect(response.body.user.email).toBe(specialUserEmail);
    });

    it('should handle unicode characters in name fields', async () => {
      // Create user with unicode name
      const unicodeUserEmail = `unicode-${Date.now()}@example.com`;
      const unicodePassword = 'UnicodePassword123';
      const hashedPassword = await hashPassword(unicodePassword);

      await createTestUser({
        email: unicodeUserEmail,
        password: hashedPassword,
        firstName: '测试',
        lastName: 'Tëst',
        role: 'user',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: unicodeUserEmail,
          password: unicodePassword,
        })
        .expect(200);

      const userResponse = await agent
        .get('/api/auth/user')
        .expect(200);

      expect(userResponse.body.user.firstName).toBe('测试');
      expect(userResponse.body.user.lastName).toBe('Tëst');
    });
  });
});
