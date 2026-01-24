import type { Request, Response, NextFunction } from 'express';
import type { User } from '@shared/schema';
import { vi } from 'vitest';

/**
 * Mock Express Request object for testing
 */
export function mockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    session: {} as any,
    user: undefined,
    ...overrides,
  };
}

/**
 * Mock Express Response object for testing
 */
export function mockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Mock Express NextFunction for testing
 */
export function mockNext(): NextFunction {
  return vi.fn();
}

/**
 * Create a mock authenticated user
 */
export function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    createdAt: new Date(),
    ...overrides,
  } as User;
}

/**
 * Create a mock admin user
 */
export function mockAdminUser(overrides: Partial<User> = {}): User {
  return mockUser({
    id: 'test-admin-id',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    ...overrides,
  });
}

/**
 * Mock authenticated request (regular user)
 */
export function mockAuthenticatedRequest(
  user: User = mockUser(),
  overrides: Partial<Request> = {}
): Partial<Request> {
  return mockRequest({
    user: {
      claims: {
        sub: user.id,
      },
    },
    session: {
      user: user,
    } as any,
    ...overrides,
  });
}

/**
 * Mock authenticated request (admin user)
 */
export function mockAdminRequest(overrides: Partial<Request> = {}): Partial<Request> {
  const adminUser = mockAdminUser();
  return mockAuthenticatedRequest(adminUser, overrides);
}

/**
 * Create test resource data
 */
export function createTestResource(overrides: any = {}) {
  return {
    title: 'Test Resource',
    url: 'https://example.com/resource',
    description: 'A test resource for unit testing',
    categoryId: 1,
    status: 'approved',
    ...overrides,
  };
}

/**
 * Create test category data
 */
export function createTestCategory(overrides: any = {}) {
  return {
    name: 'Test Category',
    slug: 'test-category',
    description: 'A test category',
    ...overrides,
  };
}

/**
 * Create test subcategory data
 */
export function createTestSubcategory(overrides: any = {}) {
  return {
    name: 'Test Subcategory',
    slug: 'test-subcategory',
    categoryId: 1,
    ...overrides,
  };
}

/**
 * Wait for async operations to complete
 */
export function wait(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock storage interface for testing
 * This can be used to mock the storage layer in tests
 */
export function createMockStorage() {
  return {
    getUser: vi.fn(),
    upsertUser: vi.fn(),
    getUserByEmail: vi.fn(),
    listUsers: vi.fn(),
    updateUserRole: vi.fn(),
    listResources: vi.fn(),
    getResource: vi.fn(),
    getResourceCount: vi.fn(),
    createResource: vi.fn(),
    updateResource: vi.fn(),
    updateResourceStatus: vi.fn(),
    deleteResource: vi.fn(),
    getPendingResources: vi.fn(),
    approveResource: vi.fn(),
    rejectResource: vi.fn(),
    listCategories: vi.fn(),
    getCategory: vi.fn(),
    getCategoryByName: vi.fn(),
    getCategoryBySlug: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getCategoryResourceCount: vi.fn(),
    listSubcategories: vi.fn(),
    getSubcategory: vi.fn(),
    getSubcategoryByName: vi.fn(),
    createSubcategory: vi.fn(),
    updateSubcategory: vi.fn(),
    deleteSubcategory: vi.fn(),
    getSubcategoryResourceCount: vi.fn(),
    listSubSubcategories: vi.fn(),
    getSubSubcategory: vi.fn(),
    createSubSubcategory: vi.fn(),
    updateSubSubcategory: vi.fn(),
    deleteSubSubcategory: vi.fn(),
    listTags: vi.fn(),
    getTag: vi.fn(),
    createTag: vi.fn(),
    deleteTag: vi.fn(),
    addResourceTag: vi.fn(),
    removeResourceTag: vi.fn(),
    getResourceTags: vi.fn(),
    listLearningJourneys: vi.fn(),
    getLearningJourney: vi.fn(),
    createLearningJourney: vi.fn(),
    updateLearningJourney: vi.fn(),
    deleteLearningJourney: vi.fn(),
    addJourneyStep: vi.fn(),
    updateJourneyStep: vi.fn(),
    deleteJourneyStep: vi.fn(),
    getUserFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    getUserBookmarks: vi.fn(),
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    getUserJourneyProgress: vi.fn(),
    updateJourneyProgress: vi.fn(),
    getUserPreferences: vi.fn(),
    upsertUserPreferences: vi.fn(),
    logResourceAction: vi.fn(),
    getResourceAuditLog: vi.fn(),
    enqueueGithubSync: vi.fn(),
    getNextGithubSyncItem: vi.fn(),
    updateGithubSyncStatus: vi.fn(),
    getGithubSyncHistory: vi.fn(),
    createResourceEdit: vi.fn(),
    getPendingEdits: vi.fn(),
    approveResourceEdit: vi.fn(),
    rejectResourceEdit: vi.fn(),
    getAwesomeListFromDatabase: vi.fn(),
    createEnrichmentJob: vi.fn(),
    getEnrichmentJob: vi.fn(),
    updateEnrichmentJob: vi.fn(),
    enqueueEnrichment: vi.fn(),
    getNextEnrichmentItem: vi.fn(),
    updateEnrichmentQueueStatus: vi.fn(),
  };
}

/**
 * Assert that a response has a specific status code
 */
export function expectStatus(res: Partial<Response>, expectedStatus: number) {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
}

/**
 * Assert that a response sent JSON data
 */
export function expectJson(res: Partial<Response>, expectedData?: any) {
  expect(res.json).toHaveBeenCalled();
  if (expectedData !== undefined) {
    expect(res.json).toHaveBeenCalledWith(expectedData);
  }
}

/**
 * Extract the data sent via res.json()
 */
export function getJsonResponse(res: Partial<Response>): any {
  const jsonCalls = (res.json as any).mock.calls;
  if (jsonCalls.length === 0) {
    throw new Error('res.json() was not called');
  }
  return jsonCalls[jsonCalls.length - 1][0];
}
