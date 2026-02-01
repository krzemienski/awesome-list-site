/**
 * API Test Helper
 *
 * Provides utilities for testing API endpoints:
 * - Creating authenticated requests
 * - Mock session handling
 * - Common request patterns
 */

import type { Express } from 'express';
import request from 'supertest';
import type { User } from '../../shared/schema';

/**
 * Create an authenticated request for testing
 *
 * Note: This is a simplified version for testing.
 * In a real implementation, you might need to:
 * - Set up proper session cookies
 * - Mock passport authentication
 * - Handle JWT tokens if using token-based auth
 */
export function createAuthenticatedRequest(app: Express, user: User) {
  const agent = request.agent(app);

  // In a real test, you would authenticate here
  // For now, we'll just return the agent
  // You may need to add middleware to mock authentication

  return agent;
}

/**
 * Create a request with admin privileges
 */
export function createAdminRequest(app: Express, adminUser: User) {
  return createAuthenticatedRequest(app, adminUser);
}

/**
 * Mock session data for testing
 */
export function mockSession(userId: string, role: string = 'user') {
  return {
    passport: {
      user: {
        claims: {
          sub: userId,
        },
      },
    },
    user: {
      id: userId,
      role,
    },
  };
}

/**
 * Create a mock authenticated user in request
 */
export function mockAuthenticatedUser(user: User) {
  return {
    user: {
      claims: {
        sub: user.id,
      },
    },
    isAuthenticated: () => true,
  };
}

/**
 * Common test request patterns
 */
export const apiHelpers = {
  /**
   * Test GET endpoint
   */
  async testGet(app: Express, path: string, expectedStatus: number = 200) {
    const response = await request(app).get(path);
    return {
      response,
      data: response.body,
      status: response.status,
      expectStatus: (status: number) => {
        if (response.status !== status) {
          throw new Error(`Expected status ${status} but got ${response.status}`);
        }
      },
    };
  },

  /**
   * Test POST endpoint
   */
  async testPost(
    app: Express,
    path: string,
    body: any,
    expectedStatus: number = 200
  ) {
    const response = await request(app)
      .post(path)
      .send(body)
      .set('Content-Type', 'application/json');

    return {
      response,
      data: response.body,
      status: response.status,
      expectStatus: (status: number) => {
        if (response.status !== status) {
          throw new Error(`Expected status ${status} but got ${response.status}`);
        }
      },
    };
  },

  /**
   * Test PUT endpoint
   */
  async testPut(
    app: Express,
    path: string,
    body: any,
    expectedStatus: number = 200
  ) {
    const response = await request(app)
      .put(path)
      .send(body)
      .set('Content-Type', 'application/json');

    return {
      response,
      data: response.body,
      status: response.status,
      expectStatus: (status: number) => {
        if (response.status !== status) {
          throw new Error(`Expected status ${status} but got ${response.status}`);
        }
      },
    };
  },

  /**
   * Test DELETE endpoint
   */
  async testDelete(app: Express, path: string, expectedStatus: number = 200) {
    const response = await request(app).delete(path);

    return {
      response,
      data: response.body,
      status: response.status,
      expectStatus: (status: number) => {
        if (response.status !== status) {
          throw new Error(`Expected status ${status} but got ${response.status}`);
        }
      },
    };
  },
};

/**
 * Utility to wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility to retry an operation
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await waitFor(delayMs);
      }
    }
  }

  throw lastError;
}
