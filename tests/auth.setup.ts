import { test as setup, expect, chromium } from '@playwright/test';
import { BASE_URL } from './helpers/test-utils';

/**
 * Authentication Setup for Playwright Tests
 *
 * This runs once before all tests to create fresh auth fixtures for:
 * - Admin user (tests/fixtures/auth-state.json)
 * - User A (tests/fixtures/user-a-auth.json)
 * - User B (tests/fixtures/user-b-auth.json)
 *
 * Bug #1 fix (Wave 1): User tokens were expiring because only admin was refreshed
 * Bug #3 fix (Session 7): Playwright session persistence
 */

/**
 * Helper to authenticate a user and save their session
 */
async function authenticateUser(
  email: string,
  password: string,
  outputPath: string,
  label: string
): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Authenticating ${label}...`);

  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 10000 });

  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log(`  ${label} logged in successfully`);
  } catch (e) {
    const errorVisible = await page.locator('text=/error|invalid|incorrect/i').isVisible().catch(() => false);
    if (errorVisible) {
      throw new Error(`${label} login failed`);
    }
  }

  // Navigate to homepage to establish origin
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Save auth state
  await context.storageState({ path: outputPath });
  console.log(`  ${label} auth saved to ${outputPath}`);

  await browser.close();
}

setup('authenticate as admin', async ({ page, context }) => {
  console.log('🔐 Setting up admin session for tests...');

  // Navigate to login page
  await page.goto(`${BASE_URL}/login`);

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
  await page.goto(`${BASE_URL}/admin`);

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

  // === Also authenticate User A and User B ===
  // Bug #1 fix: User tokens were expiring, now we refresh them every test run
  console.log('\n🔐 Setting up user sessions...');

  await authenticateUser(
    'testuser-a@test.com',
    'TestUserA123!',
    './tests/fixtures/user-a-auth.json',
    'User A'
  );

  await authenticateUser(
    'testuser-b@test.com',
    'TestUserB123!',
    './tests/fixtures/user-b-auth.json',
    'User B'
  );

  console.log('✅ All auth fixtures refreshed\n');
});
