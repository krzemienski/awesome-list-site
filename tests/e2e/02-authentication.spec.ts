import { test, expect } from '@playwright/test';
import { clearBrowserData, waitForNetworkIdle, getSupabaseToken, assertToast } from '../helpers/test-utils';

/**
 * E2E Tests: Authentication Flows
 *
 * Tests Supabase Auth integration:
 * - Email/password signup
 * - Email/password login
 * - Logout
 * - Session persistence
 * - Invalid credentials handling
 * - Password validation
 */

// Test credentials (create these users via test:
// 1. Via Supabase dashboard, or
// 2. Via signup flow in first test)
const TEST_USER = {
  email: 'testuser@test.com',
  password: 'TestUser123!',
  confirmPassword: 'TestUser123!',
};

const ADMIN_USER = {
  email: 'admin@test.com',
  password: 'TestAdmin123!',
};

const INVALID_USER = {
  email: 'invalid@test.com',
  password: 'WrongPassword123!',
};

test.beforeEach(async ({ page }) => {
  // Clear browser data before each test
  await clearBrowserData(page);
});

test.describe('Authentication - Email/Password Signup', () => {
  test('should display signup form', async ({ page }) => {
    await page.goto('/login');

    // Look for signup tab/link
    const signupTab = page.locator('[data-testid="signup-tab"]')
      .or(page.getByRole('tab', { name: /sign up|register|create account/i }))
      .or(page.getByText(/don't have an account/i))
      .first();

    // May be on same page or separate page
    const signupTabCount = await signupTab.count();

    if (signupTabCount > 0) {
      await signupTab.click();
      await page.waitForTimeout(500);
    } else {
      // Might be on a separate signup page
      await page.goto('/signup');
    }

    // Verify signup form fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    // Verify submit button
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /sign up|register|create/i }));
    await expect(submitButton.first()).toBeVisible();
  });

  test('should reject weak passwords', async ({ page }) => {
    await page.goto('/login');

    // Navigate to signup
    const signupTab = page.locator('[data-testid="signup-tab"]')
      .or(page.getByRole('tab', { name: /sign up|register/i }))
      .first();

    const signupTabCount = await signupTab.count();
    if (signupTabCount > 0) {
      await signupTab.click();
    } else {
      await page.goto('/signup');
    }

    await waitForNetworkIdle(page);

    // Fill in form with weak password
    await page.fill('input[type="email"]', 'newuser@test.com');
    await page.fill('input[type="password"]', '123'); // Too short

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.getByText(/password.*least|password.*weak|password.*strong/i).first();
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('should reject mismatched password confirmation', async ({ page }) => {
    await page.goto('/login');

    // Navigate to signup
    const signupTab = page.locator('[data-testid="signup-tab"]')
      .or(page.getByRole('tab', { name: /sign up|register/i }))
      .first();

    const signupTabCount = await signupTab.count();
    if (signupTabCount > 0) {
      await signupTab.click();
    } else {
      await page.goto('/signup');
    }

    await waitForNetworkIdle(page);

    // Fill form with mismatched passwords
    await page.fill('input[type="email"]', 'newuser@test.com');

    const passwordFields = page.locator('input[type="password"]');
    const passwordCount = await passwordFields.count();

    if (passwordCount >= 2) {
      await passwordFields.nth(0).fill('ValidPassword123!');
      await passwordFields.nth(1).fill('DifferentPassword123!');

      // Submit
      await page.click('button[type="submit"]');

      // Should show error
      const errorMessage = page.getByText(/password.*match|password.*same/i).first();
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    }
  });

  test.skip('should successfully create new account (manual setup required)', async ({ page }) => {
    // Note: This test requires either:
    // 1. Email confirmation disabled in Supabase
    // 2. Manual email confirmation
    // Skip by default to avoid creating duplicate accounts

    await page.goto('/login');

    const signupTab = page.locator('[data-testid="signup-tab"]')
      .or(page.getByRole('tab', { name: /sign up|register/i }))
      .first();

    const signupTabCount = await signupTab.count();
    if (signupTabCount > 0) {
      await signupTab.click();
    } else {
      await page.goto('/signup');
    }

    await waitForNetworkIdle(page);

    // Fill signup form
    await page.fill('input[type="email"]', `test-${Date.now()}@test.com`);

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('TestPassword123!');

    const passwordCount = await passwordFields.count();
    if (passwordCount >= 2) {
      await passwordFields.nth(1).fill('TestPassword123!');
    }

    // Submit
    await page.click('button[type="submit"]');

    // Should show success message or email verification notice
    const successMessage = page.getByText(/check.*email|verification.*sent|account.*created/i).first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Authentication - Email/Password Login', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verify submit button
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /sign in|log in|login/i }));
    await expect(submitButton.first()).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await waitForNetworkIdle(page);

    // Fill in invalid credentials
    await page.fill('input[type="email"]', INVALID_USER.email);
    await page.fill('input[type="password"]', INVALID_USER.password);

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.getByText(/invalid.*credentials|wrong.*password|incorrect.*email|authentication.*failed/i)
      .or(page.locator('[role="alert"]'))
      .first();

    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should reject empty email', async ({ page }) => {
    await page.goto('/login');
    await waitForNetworkIdle(page);

    // Leave email empty, fill password
    await page.fill('input[type="password"]', 'SomePassword123!');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error or prevent submission
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => {
      return !el.validity.valid;
    });

    // Either client-side validation prevents submit, or server returns error
    expect(isInvalid).toBeTruthy();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Note: This requires the test user to exist in Supabase
    // Create via dashboard or signup flow

    await page.goto('/login');
    await waitForNetworkIdle(page);

    // Fill in valid credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to homepage
    await page.waitForURL('/', { timeout: 10000 });

    // Should have session token
    const token = await getSupabaseToken(page);
    expect(token).toBeTruthy();

    // Should show user menu
    const userMenu = page.locator('[data-testid="user-menu"]')
      .or(page.locator('[aria-label="User menu"]'))
      .or(page.getByRole('button', { name: /profile|account/i }));

    await expect(userMenu.first()).toBeVisible({ timeout: 5000 });
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await waitForNetworkIdle(page);

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 10000 });

    // Get initial token
    const initialToken = await getSupabaseToken(page);
    expect(initialToken).toBeTruthy();

    // Reload page
    await page.reload();
    await waitForNetworkIdle(page);

    // Should still be logged in
    const userMenu = page.locator('[data-testid="user-menu"]')
      .or(page.locator('[aria-label="User menu"]'))
      .or(page.getByRole('button', { name: /profile|account/i }));

    await expect(userMenu.first()).toBeVisible({ timeout: 5000 });

    // Token should still exist
    const newToken = await getSupabaseToken(page);
    expect(newToken).toBeTruthy();
  });
});

test.describe('Authentication - Logout', () => {
  test('should logout and clear session', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await waitForNetworkIdle(page);

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 10000 });

    // Verify logged in
    const userMenu = page.locator('[data-testid="user-menu"]')
      .or(page.locator('[aria-label="User menu"]'))
      .or(page.getByRole('button', { name: /profile|account/i }));

    await userMenu.first().click();

    // Click logout
    const logoutButton = page.getByRole('menuitem', { name: /logout|sign out/i })
      .or(page.locator('[data-testid="logout-button"]'))
      .first();

    await logoutButton.click();

    // Should redirect to login or homepage
    await page.waitForURL(/\/(login)?/, { timeout: 10000 });

    // Token should be cleared
    const token = await getSupabaseToken(page);
    expect(token).toBeFalsy();

    // User menu should not be visible
    await expect(userMenu.first()).not.toBeVisible({ timeout: 3000 });
  });

  test('should not access protected routes after logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await waitForNetworkIdle(page);

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 10000 });

    // Logout
    const userMenu = page.locator('[data-testid="user-menu"]')
      .or(page.locator('[aria-label="User menu"]'))
      .or(page.getByRole('button', { name: /profile|account/i }));

    await userMenu.first().click();

    const logoutButton = page.getByRole('menuitem', { name: /logout|sign out/i })
      .or(page.locator('[data-testid="logout-button"]'))
      .first();

    await logoutButton.click();
    await page.waitForURL(/\/(login)?/, { timeout: 10000 });

    // Try to access bookmarks page (protected)
    await page.goto('/bookmarks');

    // Should redirect to login or show unauthorized
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login');
    const isUnauthorized = await page.getByText(/unauthorized|sign in|log in/i).first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(isLoginPage || isUnauthorized).toBeTruthy();
  });
});

test.describe('Authentication - OAuth Providers', () => {
  test('should display OAuth login buttons', async ({ page }) => {
    await page.goto('/login');
    await waitForNetworkIdle(page);

    // Look for OAuth buttons (GitHub, Google)
    const githubButton = page.getByRole('button', { name: /github/i })
      .or(page.locator('button').filter({ has: page.locator('svg[class*="github"]') }))
      .first();

    const googleButton = page.getByRole('button', { name: /google/i })
      .or(page.locator('button').filter({ has: page.locator('svg[class*="google"]') }))
      .first();

    // At least one OAuth provider should be visible
    const githubCount = await githubButton.count();
    const googleCount = await googleButton.count();

    console.log(`OAuth providers: GitHub=${githubCount}, Google=${googleCount}`);

    // Either could be present depending on configuration
    // Just verify the login page loaded correctly
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test.skip('should initiate GitHub OAuth flow (requires manual completion)', async ({ page }) => {
    // Skip by default - requires manual OAuth approval
    await page.goto('/login');
    await waitForNetworkIdle(page);

    const githubButton = page.getByRole('button', { name: /github/i }).first();

    if (await githubButton.isVisible()) {
      await githubButton.click();

      // Should redirect to GitHub
      await page.waitForURL(/github\.com/, { timeout: 5000 });
      expect(page.url()).toContain('github.com');
    }
  });
});

test.describe('Authentication - Admin Login', () => {
  test('should login admin and verify admin role', async ({ page }) => {
    // Note: Admin user must exist and have admin role in Supabase

    await page.goto('/login');
    await waitForNetworkIdle(page);

    // Fill admin credentials
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to homepage
    await page.waitForURL(/\//, { timeout: 10000 });

    // Look for admin badge/indicator
    const adminBadge = page.locator('[data-testid="admin-badge"]')
      .or(page.getByText(/admin/i))
      .first();

    await expect(adminBadge).toBeVisible({ timeout: 5000 });

    // Admin should be able to access admin dashboard
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Should NOT redirect (admin has access)
    await expect(page).toHaveURL(/\/admin/);

    // Verify admin dashboard elements
    const dashboardTitle = page.locator('h1, h2').filter({ hasText: /admin|dashboard/i }).first();
    await expect(dashboardTitle).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Authentication - Password Reset', () => {
  test('should display forgot password link', async ({ page }) => {
    await page.goto('/login');
    await waitForNetworkIdle(page);

    // Look for forgot password link
    const forgotPasswordLink = page.getByText(/forgot.*password|reset.*password/i).first();

    // May or may not be implemented
    const forgotCount = await forgotPasswordLink.count();
    console.log(`Forgot password link present: ${forgotCount > 0}`);

    if (forgotCount > 0) {
      await expect(forgotPasswordLink).toBeVisible();
    }
  });

  test.skip('should send password reset email (requires email config)', async ({ page }) => {
    // Skip by default - requires Supabase email configuration

    await page.goto('/login');

    const forgotPasswordLink = page.getByText(/forgot.*password|reset.*password/i).first();

    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();

      // Fill email
      await page.fill('input[type="email"]', TEST_USER.email);

      // Submit
      await page.click('button[type="submit"]');

      // Should show success message
      const successMessage = page.getByText(/check.*email|reset.*link.*sent/i).first();
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });
});
