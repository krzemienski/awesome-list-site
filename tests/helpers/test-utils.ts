import { Page, expect } from '@playwright/test';

/**
 * Test Utilities for E2E Testing
 *
 * Provides helper functions for common test operations:
 * - Authentication (login as admin/user)
 * - Test data creation/cleanup
 * - Common assertions
 */

/**
 * Admin credentials (must exist in Supabase Auth)
 * Create this user via Supabase dashboard and promote to admin:
 *
 * UPDATE auth.users
 * SET raw_user_meta_data = jsonb_set(
 *   COALESCE(raw_user_meta_data, '{}'::jsonb),
 *   '{role}',
 *   '"admin"'
 * )
 * WHERE email = 'admin@test.com';
 */
const ADMIN_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'TestAdmin123!',
};

/**
 * Regular test user credentials
 */
const USER_CREDENTIALS = {
  email: 'testuser@test.com',
  password: 'TestUser123!',
};

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { state: 'visible' });

  // Fill in credentials
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/(admin)?/, { timeout: 10000 });

  // Verify admin badge/indicator exists
  await expect(page.locator('[data-testid="admin-badge"]').or(page.getByText('Admin'))).toBeVisible({ timeout: 5000 });
}

/**
 * Login as regular user
 */
export async function loginAsUser(page: Page, email?: string, password?: string): Promise<void> {
  const loginEmail = email || USER_CREDENTIALS.email;
  const loginPassword = password || USER_CREDENTIALS.password;

  await page.goto('/login');

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { state: 'visible' });

  // Fill in credentials
  await page.fill('input[type="email"]', loginEmail);
  await page.fill('input[type="password"]', loginPassword);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 10000 });

  // Verify user menu or profile icon exists
  await expect(
    page.locator('[data-testid="user-menu"]')
      .or(page.locator('[aria-label="User menu"]'))
      .or(page.getByRole('button', { name: /profile|account/i }))
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu
  const userMenu = page.locator('[data-testid="user-menu"]')
    .or(page.locator('[aria-label="User menu"]'))
    .or(page.getByRole('button', { name: /profile|account/i }));

  await userMenu.first().click();

  // Click logout
  await page.getByRole('menuitem', { name: /logout|sign out/i }).click();

  // Wait for redirect to homepage or login
  await page.waitForURL(/\/(login)?/, { timeout: 10000 });
}

/**
 * Create a test resource via API
 */
export async function createTestResource(page: Page): Promise<{ id: string; title: string; url: string }> {
  const testResource = {
    title: `Test Resource ${Date.now()}`,
    url: `https://github.com/test/resource-${Date.now()}`,
    description: 'This is a test resource for E2E testing',
    category: 'Encoding & Codecs',
    subcategory: 'Codecs',
    sub_subcategory: 'AV1',
  };

  // Submit via API
  const response = await page.request.post('/api/resources', {
    data: testResource,
  });

  expect(response.ok()).toBeTruthy();
  const resource = await response.json();

  return {
    id: resource.id,
    title: testResource.title,
    url: testResource.url,
  };
}

/**
 * Delete test resources by title pattern
 */
export async function cleanupTestResources(page: Page, titlePattern: string = 'Test Resource'): Promise<void> {
  // Get all resources
  const response = await page.request.get('/api/admin/resources');

  if (!response.ok()) {
    console.warn('Failed to fetch resources for cleanup');
    return;
  }

  const resources = await response.json();

  // Filter test resources
  const testResources = resources.filter((r: any) => r.title.includes(titlePattern));

  // Delete each test resource
  for (const resource of testResources) {
    await page.request.delete(`/api/resources/${resource.id}`);
  }
}

/**
 * Wait for API response with specific status
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  status: number = 200
): Promise<void> {
  await page.waitForResponse(
    response => {
      const matchesUrl = typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url());
      return matchesUrl && response.status() === status;
    },
    { timeout: 10000 }
  );
}

/**
 * Check if element exists (returns boolean, doesn't throw)
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.locator(selector).first();
    return await element.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Scroll to element and ensure it's visible
 */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded();
  await expect(element).toBeVisible();
}

/**
 * Take a full page screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Wait for network idle (no requests for 500ms)
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Get Supabase session token from localStorage
 */
export async function getSupabaseToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const session = localStorage.getItem('supabase.auth.token');
    if (!session) return null;
    try {
      const parsed = JSON.parse(session);
      return parsed.currentSession?.access_token || null;
    } catch {
      return null;
    }
  });
}

/**
 * Clear all local storage and cookies
 */
export async function clearBrowserData(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Assert toast notification appears
 */
export async function assertToast(page: Page, message: string | RegExp): Promise<void> {
  const toast = page.locator('[data-testid="toast"]').or(page.locator('[role="status"]'));

  if (typeof message === 'string') {
    await expect(toast.filter({ hasText: message })).toBeVisible({ timeout: 5000 });
  } else {
    await expect(toast.filter({ hasText: message })).toBeVisible({ timeout: 5000 });
  }
}

/**
 * Retry an action until it succeeds or max attempts reached
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Retry action failed');
}

/**
 * Get viewport size category
 */
export function getViewportCategory(page: Page): 'mobile' | 'tablet' | 'desktop' {
  const viewport = page.viewportSize();
  if (!viewport) return 'desktop';

  if (viewport.width < 768) return 'mobile';
  if (viewport.width < 1024) return 'tablet';
  return 'desktop';
}
