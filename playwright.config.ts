import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Awesome Video Resources E2E Tests
 *
 * Test Strategy:
 * - Sequential execution (no parallelization) for database consistency
 * - Each test cleans up after itself
 * - Tests use real Supabase database (NO MOCKS)
 * - Screenshots on failure, traces on first retry
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests sequentially to maintain database consistency
  fullyParallel: false,
  workers: 1,

  // Fail build on .only() in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 1,

  // Test timeout: 30 seconds per test
  timeout: 30 * 1000,

  // Global timeout for entire test run: 10 minutes
  globalTimeout: 10 * 60 * 1000,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],

  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout: 10 seconds
    actionTimeout: 10 * 1000,

    // Navigation timeout: 15 seconds
    navigationTimeout: 15 * 1000,
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 13 Pro'],
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
