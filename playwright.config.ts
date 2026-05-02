import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Maximum time one test can run.
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:5000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run a production-built server before starting tests.
  //
  // We deliberately don't use `npm run dev` here: Vite's middleware-mode
  // dev server lazily compiles every ES module on first request and
  // periodically triggers full-page reloads as it discovers new
  // dependencies, which makes `page.waitForLoadState('networkidle')`
  // (used liberally throughout the spec files) effectively unreliable.
  // Building once and serving the static bundle gives the e2e suite a
  // deterministic, fast, production-shaped target — which is what we
  // actually want to verify in CI anyway.
  //
  // The server is started with NODE_ENV=test so it serves the built
  // client (server/index.ts uses `serveStatic` for any non-development
  // env) without trying to run production-only migrations on boot;
  // `db:push` is responsible for the test schema in CI.
  webServer: {
    command: 'npm run build && NODE_ENV=test node dist/index.js',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
  },
});
