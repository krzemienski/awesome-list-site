import { expect, Page } from '@playwright/test';

/**
 * Custom Playwright Assertions for Integration Tests
 *
 * Domain-specific assertions that make tests more readable and provide better error messages.
 */

/**
 * Assert resource card is visible on page
 */
export async function expectResourceVisible(page: Page, resourceTitle: string) {
  const resource = page.locator(`[data-testid*="resource"], .resource-card, article, .card`).filter({ hasText: resourceTitle });

  await expect(resource.first()).toBeVisible({
    timeout: 5000
  });
}

/**
 * Assert resource is NOT visible on page
 */
export async function expectResourceNotVisible(page: Page, resourceTitle: string) {
  const resource = page.locator(`text=${resourceTitle}`);

  await expect(resource).not.toBeVisible();
}

/**
 * Assert user is authenticated (checks UI indicators)
 */
export async function expectAuthenticated(page: Page) {
  // Check for logout button or user menu (indicates logged in)
  const authIndicator = page.locator('button:has-text("Logout"), button:has-text("Profile"), [data-testid="user-menu"]');

  await expect(authIndicator.first()).toBeVisible({
    timeout: 3000
  });
}

/**
 * Assert user is on login page (not authenticated)
 */
export async function expectNotAuthenticated(page: Page) {
  expect(page.url()).toContain('/login');
}

/**
 * Assert page shows 404
 */
export async function expect404(page: Page) {
  const notFound = page.locator('text=/404|not found/i');

  await expect(notFound.first()).toBeVisible({
    timeout: 3000
  });
}

/**
 * Assert admin dashboard is accessible
 */
export async function expectAdminDashboard(page: Page) {
  // Look for admin-specific UI elements
  const adminIndicators = page.locator(
    'text=/Admin Dashboard|Pending Approvals|Resources Management/i, [data-testid*="admin"]'
  );

  await expect(adminIndicators.first()).toBeVisible({
    timeout: 10000
  });
}

/**
 * Assert toast notification appears
 */
export async function expectToast(page: Page, messagePattern: string | RegExp) {
  const toast = page.locator('[data-testid="toast"], [role="status"], .toast').filter({
    hasText: messagePattern
  });

  await expect(toast.first()).toBeVisible({
    timeout: 5000
  });
}

/**
 * Assert table has N rows
 */
export async function expectTableRowCount(page: Page, tableSelector: string, expectedCount: number) {
  const rows = page.locator(`${tableSelector} tbody tr`);

  await expect(rows).toHaveCount(expectedCount, {
    timeout: 5000
  });
}

/**
 * Assert element count
 */
export async function expectElementCount(page: Page, selector: string, expectedCount: number) {
  const elements = page.locator(selector);

  await expect(elements).toHaveCount(expectedCount, {
    timeout: 5000
  });
}

/**
 * Assert page redirected to URL pattern
 */
export async function expectRedirectedTo(page: Page, urlPattern: string | RegExp) {
  await page.waitForURL(urlPattern, { timeout: 10000 });
  expect(page.url()).toMatch(urlPattern);
}

/**
 * Assert localStorage has key with value
 */
export async function expectLocalStorageValue(page: Page, key: string, expectedValue: any) {
  const actualValue = await page.evaluate((k) => localStorage.getItem(k), key);

  if (typeof expectedValue === 'object') {
    expect(JSON.parse(actualValue || '{}')).toEqual(expectedValue);
  } else {
    expect(actualValue).toBe(expectedValue);
  }
}

/**
 * Assert API request was made
 */
export async function expectAPIRequestMade(page: Page, urlPattern: string | RegExp, method: string = 'GET') {
  const requests: any[] = [];

  page.on('request', request => {
    if (request.url().match(urlPattern) && request.method() === method) {
      requests.push(request);
    }
  });

  // Wait briefly for requests to be captured
  await page.waitForTimeout(1000);

  expect(requests.length).toBeGreaterThan(0);
}

/**
 * Assert network response status
 */
export async function expectResponseStatus(page: Page, urlPattern: string | RegExp, expectedStatus: number) {
  let responseStatus: number | null = null;

  page.on('response', response => {
    if (response.url().match(urlPattern)) {
      responseStatus = response.status();
    }
  });

  await page.waitForTimeout(1000);

  expect(responseStatus).toBe(expectedStatus);
}

/**
 * Assert no console errors
 */
export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.waitForTimeout(500);

  expect(errors).toHaveLength(0);
}
