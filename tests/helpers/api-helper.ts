/**
 * API Test Helper
 *
 * Provides utilities for testing API endpoints:
 * - Creating real Clerk-authenticated requests
 * - Common request patterns
 */

import type { Express } from 'express';
import request from 'supertest';
import type { User } from '../../shared/schema';
import { randomUUID } from 'node:crypto';
import { clerkMiddleware } from '@clerk/express';
import { clerkUserContext } from '../../server/clerkAuth';

/**
 * Install the same Clerk verification and local-user bridge used by the
 * running server. Integration apps register routes directly, so they must
 * mount these middlewares explicitly instead of relying on server/index.ts.
 */
export function installClerkTestMiddleware(app: Express) {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!publishableKey?.startsWith('pk_test_') || publishableKey.length <= 'pk_test_'.length) {
    throw new Error('A non-empty pk_test_ Clerk publishable key is required for integration tests');
  }

  app.use(clerkMiddleware({ publishableKey }));
  app.use(clerkUserContext);
}

type ClerkSessionRecord = {
  clerkUserId: string;
  sessionId: string;
};

const CLERK_BACKEND_REQUEST_TIMEOUT_MS = 15_000;
const clerkSessionsByBridgeId = new Map<string, ClerkSessionRecord>();
const createdClerkUserIds = new Set<string>();
const testRunId = `${Date.now()}_${randomUUID().replaceAll('-', '')}`;
let identitySequence = 0;

async function clerkBackendRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith('sk_test_') || secretKey.length <= 'sk_test_'.length) {
    throw new Error(
      'CLERK_SECRET_KEY must be a non-empty Clerk development key with the sk_test_ prefix',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLERK_BACKEND_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.clerk.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Clerk ${method} ${path} failed with status ${response.status}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Create a real Clerk session for an existing local test row and return an
 * agent that sends its short-lived session JWT as a Bearer token. The token's
 * userId claim comes from the Clerk instance's session template, which maps
 * external_id to the local users.id bridge.
 */
export async function createClerkAuthenticatedAgent(
  app: Express,
  user: User,
): Promise<request.SuperAgentTest> {
  let record = clerkSessionsByBridgeId.get(user.id);
  if (!record) {
    identitySequence += 1;
    const identityLabel = `__qa_test_${testRunId}_${identitySequence}`;
    const clerkUser = await clerkBackendRequest('POST', '/users', {
      email_address: [`${identityLabel}@example.com`],
      external_id: user.id,
      first_name: user.firstName ?? undefined,
      last_name: user.lastName ?? undefined,
      skip_password_requirement: true,
    });
    if (typeof clerkUser?.id !== 'string') {
      throw new Error('Clerk user creation returned no user id');
    }
    createdClerkUserIds.add(clerkUser.id);

    const session = await clerkBackendRequest('POST', '/sessions', {
      user_id: clerkUser.id,
    });
    if (typeof session?.id !== 'string') {
      throw new Error('Clerk session creation returned no session id');
    }
    record = { clerkUserId: clerkUser.id, sessionId: session.id };
    clerkSessionsByBridgeId.set(user.id, record);
  }

  // Session tokens are intentionally minted for each scenario so tests do not
  // rely on an expired token when a sequential integration run is long.
  const token = await clerkBackendRequest(
    'POST',
    `/sessions/${record.sessionId}/tokens`,
    {},
  );
  if (typeof token?.jwt !== 'string') {
    throw new Error('Clerk session token creation returned no JWT');
  }

  return request.agent(app).set('Authorization', `Bearer ${token.jwt}`);
}

/**
 * Delete only Clerk users created by this test process. There is deliberately
 * no prefix/list sweep: an interrupted run must never risk deleting another
 * identity.
 */
export async function cleanupClerkTestUsers() {
  const ids = [...createdClerkUserIds];
  let firstError: unknown;
  for (const clerkUserId of ids) {
    try {
      await clerkBackendRequest('DELETE', `/users/${clerkUserId}`);
      createdClerkUserIds.delete(clerkUserId);
      for (const [bridgeId, record] of clerkSessionsByBridgeId) {
        if (record.clerkUserId === clerkUserId) {
          clerkSessionsByBridgeId.delete(bridgeId);
        }
      }
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) throw firstError;
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
