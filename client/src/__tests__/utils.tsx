import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { vi } from 'vitest';
import type { User } from '@shared/schema';

/**
 * Create a new QueryClient for each test to ensure isolation
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Mock user data for testing
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
 * Mock admin user data for testing
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
 * Mock the useAuth hook
 */
export function mockUseAuth(authenticated = false, user: User | null = null) {
  return {
    user,
    isAuthenticated: authenticated,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
  };
}

/**
 * Mock the useAnalytics hook
 */
export function mockUseAnalytics() {
  return vi.fn();
}

/**
 * Mock the useSessionAnalytics hook
 */
export function mockUseSessionAnalytics() {
  return {
    incrementSearchesPerformed: vi.fn(),
    incrementResourcesViewed: vi.fn(),
    trackTimeSpent: vi.fn(),
    endSession: vi.fn(),
  };
}

/**
 * All providers wrapper for testing
 */
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialRoute?: string;
}

function AllProviders({ children, queryClient, initialRoute = '/' }: AllProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <Router base={initialRoute}>
        {children}
      </Router>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with all providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient,
    initialRoute = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const testQueryClient = queryClient || createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AllProviders queryClient={testQueryClient} initialRoute={initialRoute}>
        {children}
      </AllProviders>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
}

/**
 * Create test awesome list data
 */
export function createTestAwesomeList() {
  return {
    title: 'Awesome Test List',
    description: 'A test awesome list',
    categories: [
      {
        id: 1,
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category',
        subcategories: [
          {
            id: 1,
            name: 'Test Subcategory',
            slug: 'test-subcategory',
            categoryId: 1,
            resources: [],
          },
        ],
      },
    ],
    resources: [],
  };
}

/**
 * Create test resource data
 */
export function createTestResource(overrides: any = {}) {
  return {
    id: 1,
    title: 'Test Resource',
    url: 'https://example.com/resource',
    description: 'A test resource for unit testing',
    categoryId: 1,
    subcategoryId: 1,
    status: 'approved',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test category data
 */
export function createTestCategory(overrides: any = {}) {
  return {
    id: 1,
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
    id: 1,
    name: 'Test Subcategory',
    slug: 'test-subcategory',
    categoryId: 1,
    ...overrides,
  };
}

/**
 * Wait for async operations to complete
 */
export function waitFor(callback: () => void, options?: { timeout?: number }) {
  return new Promise((resolve) => {
    const timeout = options?.timeout || 1000;
    const interval = setInterval(() => {
      try {
        callback();
        clearInterval(interval);
        resolve(true);
      } catch (error) {
        // Keep waiting
      }
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      resolve(false);
    }, timeout);
  });
}

/**
 * Mock fetch responses for API calls
 */
export function mockFetchResponse(data: any, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;

  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  });
}

/**
 * Mock fetch error
 */
export function mockFetchError(message = 'Network error') {
  return vi.fn().mockRejectedValue(new Error(message));
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
