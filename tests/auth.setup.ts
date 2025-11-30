import { test as setup, expect } from '@playwright/test';

/**
 * Authentication Setup for Playwright Tests
 *
 * This runs once before all tests to inject admin session into browser.
 * Session saved to tests/fixtures/auth-state.json and reused by all tests.
 *
 * Bug #3 fix (Session 7): Playwright session persistence
 */

setup('authenticate as admin', async ({ page, context }) => {
  console.log('🔐 Setting up admin session for tests...');

  // Navigate to login page
  await page.goto('http://localhost:3000/login');

  // Wait for login form to be visible
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 10000 });

  console.log('📍 Login page loaded');

  // Fill login form
  await page.fill('input[name="email"], input[type="email"]', 'admin@test.com');
  await page.fill('input[name="password"], input[type="password"]', 'TestAdmin123!');

  console.log('📍 Credentials entered');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for successful login (redirect or dashboard visible)
  try {
    // Option 1: Wait for redirect away from /login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log('✅ Logged in successfully (redirected from /login)');
  } catch (e) {
    // Option 2: Check for error message
    const errorVisible = await page.locator('text=/error|invalid|incorrect/i').isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.locator('text=/error|invalid|incorrect/i').first().textContent();
      throw new Error(`Login failed: ${errorText}`);
    }
    console.log('⚠️  No redirect detected, but no error either');
  }

  // Navigate to admin dashboard to verify session works
  await page.goto('http://localhost:3000/admin');

  // Wait for dashboard to load
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  console.log('📍 Admin page loaded');

  // Check if we got 404 or admin dashboard
  const is404 = await page.locator('text=404').isVisible().catch(() => false);

  if (is404) {
    // Check auth state
    const authCheck = await page.evaluate(async () => {
      const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
      if (!token) return { error: 'No token in localStorage' };

      const parsed = JSON.parse(token);
      return {
        hasToken: true,
        email: parsed.user?.email,
        role: parsed.user?.user_metadata?.role,
        expiresAt: parsed.expires_at,
        now: Math.floor(Date.now() / 1000)
      };
    });

    console.error('❌ Got 404 but should be admin. Auth state:', JSON.stringify(authCheck, null, 2));
    throw new Error(`Admin dashboard shows 404 - auth failed: ${JSON.stringify(authCheck)}`);
  }

  // Wait for dashboard content (stats cards, tabs, etc.)
  try {
    await expect(
      page.locator('text=/Admin|Dashboard|Pending|Resources|Users/i').first()
    ).toBeVisible({ timeout: 10000 });
    console.log('✅ Admin dashboard content visible');
  } catch (e) {
    await page.screenshot({ path: './test-results/auth-setup-failed.png', fullPage: true });
    throw new Error('Admin dashboard did not load properly');
  }

  console.log('✅ Admin session verified');

  // Save authenticated state for all tests
  await context.storageState({ path: './tests/fixtures/auth-state.json' });

  console.log('✅ Auth state saved to tests/fixtures/auth-state.json');
});
