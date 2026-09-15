// `webkit` must come from the same package that runs the tests: the root
// `playwright` dependency floats to a newer release whose expected WebKit
// revision is never downloaded, so its executablePath() points at a missing
// bundle and every WebKit test fails at launch.
import { defineConfig, devices, webkit } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Browsers are installed into the workspace cache (git-ignored), which
// survives container restarts while ~/.cache does not.
const workspaceBrowserCache = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '.cache',
  'ms-playwright',
);
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(workspaceBrowserCache)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = workspaceBrowserCache;
}

const hasReplitNixWebKitRuntime = Boolean(process.env.REPLIT_LD_LIBRARY_PATH?.trim());

/*
 * The WebKitGTK bundle resolves against the Nix-provisioned ICU 74, atomic,
 * harfbuzz-icu, JPEG, and GLES sonames exposed through REPLIT_LD_LIBRARY_PATH.
 * Playwright's host check only consults ldconfig and runs in the *test
 * worker* (not the browser process), so the skip flag has to be set on this
 * process; the library path is handed to the browser. The executable is the
 * stock launcher, not a custom ABI wrapper; headless:false selects bundled
 * GTK (the headless build aborts on this host). Video capture is off for the
 * GTK build: with recordVideo on, roughly one in four browserContext.newPage
 * calls never resolves (measured 3/12 hangs vs 0/12 without), which surfaced
 * as beforeEach timeouts across the WebKit projects.
 */
if (hasReplitNixWebKitRuntime) {
  process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1';
}

// libsoup only speaks TLS through glib-networking's GIO module, which GLib
// discovers via GIO_EXTRA_MODULES rather than the library path. Without it
// every https request (Clerk's clerk.browser.js, hosted fonts) fails with
// "TLS support is not available" and the sign-in form never renders.
const gioModuleDirs = (process.env.REPLIT_LD_LIBRARY_PATH ?? '')
  .split(':')
  .filter((entry) => /glib-networking/.test(entry))
  .map((entry) => path.join(entry, 'gio', 'modules'))
  .filter((dir) => fs.existsSync(dir));

const replitWebKitLaunch = hasReplitNixWebKitRuntime
  ? {
      headless: false,
      video: 'off' as const,
      launchOptions: {
        executablePath: webkit.executablePath(),
        env: {
          ...process.env,
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS: '1',
          LD_LIBRARY_PATH: [process.env.REPLIT_LD_LIBRARY_PATH, process.env.LD_LIBRARY_PATH]
            .filter(Boolean)
            .join(':'),
          ...(gioModuleDirs.length
            ? {
                GIO_EXTRA_MODULES: [...gioModuleDirs, process.env.GIO_EXTRA_MODULES]
                  .filter(Boolean)
                  .join(':'),
              }
            : {}),
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
  // One local retry: a full five-project run on this shared host produces a
  // different single infrastructure flake almost every time (a Firefox helper
  // page failing to open, a WebKit 5 s visibility miss under load). A retried
  // pass is reported as "flaky", never silently as a clean pass.
  retries: process.env.CI ? 2 : 1,
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
