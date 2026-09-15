import { defineConfig, devices } from '@playwright/test';
import { webkit } from 'playwright';
import path from 'path';

const hasReplitNixWebKitRuntime = Boolean(process.env.REPLIT_LD_LIBRARY_PATH?.trim());

/*
 * The WebKitGTK 2311 bundle resolves against the Nix-provisioned ICU 74,
 * atomic, harfbuzz-icu, JPEG, and GLES sonames verified in this workspace.
 * Playwright's host check only consults ldconfig, so keep its skip flag and
 * the stock bundled executable scoped to the two WebKit projects. The
 * executable is the stock launcher, not a custom ABI wrapper;
 * headless:false selects bundled GTK.
 */
const replitWebKitLaunch = hasReplitNixWebKitRuntime
  ? {
      headless: false,
      launchOptions: {
        executablePath: webkit.executablePath(),
        env: {
          ...process.env,
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS: '1',
        },
      },
    }
  : {};

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
      use: { ...devices['Desktop Safari'], ...replitWebKitLaunch },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'], ...replitWebKitLaunch },
    },
  ],

  // Run the dev server before starting tests.
  //
  // The spec files no longer rely on `page.waitForLoadState('networkidle')`
  // — they use `'domcontentloaded'` plus explicit visibility/poll asserts —
  // so the Vite middleware-mode dev server's HMR WebSocket and on-demand
  // module compilation no longer cause `beforeEach` hooks to time out.
  // Running the dev server keeps the local feedback loop fast (no full
  // production build per `test:e2e` invocation) and matches what
  // contributors are already running locally.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
