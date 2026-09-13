import "dotenv/config";
import {
  expect,
  test as base,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
// The parity identity module is JavaScript by design: it is also consumed by
// tests/parity/runner.mjs and is the single source of truth for disposable
// Clerk accounts and their numeric bridge ids.
// @ts-ignore The parity harness intentionally has no generated .d.ts file.
import { createDisposableAdmin } from "../parity/identity.mjs";

const configuredBaseUrl = (process.env.BASE_URL || "http://localhost:5000").trim();
export const TASK549_APP_BASE = new URL(configuredBaseUrl).origin;

type DisposableAdmin = {
  bridgeId: string;
  email: string;
  localUserId: string | null;
  page: Page;
  storageState: () => Promise<unknown>;
  teardown: (options?: { keepUser?: boolean }) => Promise<unknown>;
};

type Task549WorkerFixtures = {
  task549Admin: DisposableAdmin;
  task549Secondary: DisposableAdmin;
};

type Task549TestFixtures = {
  task549Context: BrowserContext;
  task549Page: Page;
};

function requireClerkEnvironment() {
  const missing: string[] = [];
  if (!process.env.CLERK_SECRET_KEY) missing.push("CLERK_SECRET_KEY");
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
    missing.push("ADMIN_PASSWORD (>= 8 characters)");
  }
  if (!process.env.VITE_CLERK_PUBLISHABLE_KEY) {
    missing.push("VITE_CLERK_PUBLISHABLE_KEY");
  }
  if (missing.length > 0) {
    throw new Error(
      `Task549 Clerk e2e requires ${missing.join(", ")}. ` +
        "Load the repository .env before running the targeted Playwright command.",
    );
  }
}

async function createIdentity(browser: Browser) {
  requireClerkEnvironment();
  return (await createDisposableAdmin({
    browser,
    appBase: TASK549_APP_BASE,
    secretKey: process.env.CLERK_SECRET_KEY,
    auditKey: process.env.ADMIN_PASSWORD,
    log: (message: string) => console.info(message),
  })) as DisposableAdmin;
}

async function setRole(
  identity: DisposableAdmin,
  userId: string,
  role: "user" | "moderator" | "admin",
) {
  const result = await identity.page.evaluate(
    async ({ url, role: nextRole }) => {
      const response = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.json().catch(() => null),
      };
    },
    {
      // Keep this relative to the authenticated browser page.  Using the
      // configured base URL here can turn a same-origin mutation into a
      // cross-origin request when a tester uses a forwarded/alternate host,
      // which the server correctly rejects as CSRF.
      url: `/api/admin/users/${encodeURIComponent(userId)}/role`,
      role,
    },
  );
  if (!result.ok) {
    throw new Error(
      `Task549 could not set disposable user ${userId} to ${role}: ` +
        `${result.status} ${JSON.stringify(result.body)}`,
    );
  }
}

type ReadinessResponse = {
  status: number;
  body: unknown;
};

type ReadinessProbe = {
  auth: ReadinessResponse;
  stats: ReadinessResponse;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAdminIdentity(
  body: unknown,
  expected: DisposableAdmin,
): boolean {
  if (!isRecord(body) || body.isAuthenticated !== true || !isRecord(body.user)) {
    return false;
  }
  const user = body.user;
  return (
    (typeof user.id === "string" || typeof user.id === "number") &&
    typeof user.name === "string" &&
    user.email === expected.email &&
    user.role === "admin" &&
    (expected.localUserId === null ||
      String(user.id) === expected.localUserId)
  );
}

function hasAdminStatsSchema(body: unknown): boolean {
  if (!isRecord(body)) return false;
  return [
    "users",
    "resources",
    "journeys",
    "pendingApprovals",
    "pendingEdits",
    "totalPublic",
    "totalPending",
    "totalRejected",
  ].every((field) => typeof body[field] === "number");
}

async function readAdminReadiness(page: Page): Promise<ReadinessProbe> {
  return page.evaluate(async () => {
    const readJson = async (path: string): Promise<ReadinessResponse> => {
      const response = await fetch(path, {
        credentials: "include",
        headers: { accept: "application/json" },
      });
      return {
        status: response.status,
        body: await response.json().catch(() => null),
      };
    };

    return {
      auth: await readJson("/api/auth/user"),
      stats: await readJson("/api/admin/stats"),
    };
  });
}

async function waitForAdminReadiness(
  page: Page,
  expected: DisposableAdmin,
) {
  let logged401 = false;
  await expect
    .poll(
      async () => {
        const probe = await readAdminReadiness(page);
        if (
          !logged401 &&
          (probe.auth.status === 401 || probe.stats.status === 401)
        ) {
          logged401 = true;
          console.warn(
            `[Task549] protected-query readiness observed status401 ` +
              `(auth=${probe.auth.status}, stats=${probe.stats.status})`,
          );
        }
        return (
          probe.auth.status === 200 &&
          isAdminIdentity(probe.auth.body, expected) &&
          probe.stats.status === 200 &&
          hasAdminStatsSchema(probe.stats.body)
        );
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}

/**
 * Task549's browser fixture deliberately creates a fresh Clerk identity for
 * the worker and a second fresh identity for Users-tab role coverage. The
 * parity helper gives both accounts high numeric external/local ids and its
 * teardown removes exactly those Clerk and local rows; this fixture never
 * sweeps or mutates unrelated QA identities.
 *
 * Run from a shell with the repository .env loaded:
 *   BASE_URL=http://localhost:5000 npx playwright test \
 *     tests/e2e/admin-users-audit.spec.ts tests/e2e/admin-operations.spec.ts \
 *     --project=chromium
 *
 * Playwright's configured webServer uses the repository's dev server. For
 * pinned CI Chromium, set PLAYWRIGHT_BROWSERS_PATH to the installed cache or
 * pass the executable through the normal Playwright configuration; this
 * fixture never downloads or mocks a browser/auth session.
 */
export const task549Test = base.extend<Task549TestFixtures, Task549WorkerFixtures>({
  task549Admin: [
    async ({ browser }, use) => {
      const identity = await createIdentity(browser);
      try {
        await use(identity);
      } finally {
        await identity.teardown();
      }
    },
    { scope: "worker" },
  ],

  task549Secondary: [
    async ({ task549Admin, browser }, use) => {
      const identity = await createIdentity(browser);
      try {
        if (!identity.localUserId) {
          throw new Error("Task549 secondary identity was not JIT-provisioned");
        }
        // createDisposableAdmin promotes every identity so it can provision
        // itself through the real admin path. Demote only this second account
        // before the Users-tab test changes it and restores it to user.
        await setRole(task549Admin, identity.localUserId, "user");
        await use(identity);
      } finally {
        await identity.teardown();
      }
    },
    { scope: "worker" },
  ],

  task549Context: async ({ browser, task549Admin }, use) => {
    const storageState = await task549Admin.storageState();
    const context = await browser.newContext({
      baseURL: TASK549_APP_BASE,
      locale: "en-US",
      timezoneId: "UTC",
      serviceWorkers: "block",
      storageState,
    });
    try {
      await use(context);
    } finally {
      await context.close();
    }
  },

  task549Page: async ({ task549Context, task549Admin }, use) => {
    const page = await task549Context.newPage();
    try {
      // Establish the real app origin before any protected query. The tests
      // navigate again per case, but never yield an about:blank page.
      await page.goto(`${TASK549_APP_BASE}/admin`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAdminReadiness(page, task549Admin);
      await use(page);
    } finally {
      await page.close();
    }
  },
});

export async function dismissCookieBanner(page: Page) {
  const banner = page.getByTestId("consent-banner");
  if (!(await banner.isVisible().catch(() => false))) return;

  await banner.getByTestId("consent-decline").click();
  await expect(banner).toHaveCount(0);
}

export async function expectAdminPage(page: Page) {
  await expect(page.getByTestId("admin-authorized")).toBeAttached();
  await expect(
    page.getByRole("heading", { name: /Operations dashboard/i }),
  ).toBeVisible();
  // The auth context is intentionally fresh for every worker.  Dismissing the
  // real consent banner keeps it from covering controls and from becoming an
  // unrelated axe target in the admin-panel assertions.
  await dismissCookieBanner(page);
}

export async function expectSeriousA11y(
  page: Page,
  label: string,
  scope = '[role="tabpanel"][data-state="active"]',
) {
  // Analyze the real, visible admin panel rather than the application shell.
  // This is a positive include scope (not an exclusion list): every serious
  // or critical finding in the panel remains a failure.
  const panel = page.locator(scope);
  await expect(panel).toHaveCount(1);
  await expect(panel).toBeVisible();
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const result = await new AxeBuilder({ page })
    .include(scope)
    .analyze();
  const violations = result.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    violations,
    `${label} has serious/critical accessibility violations: ${JSON.stringify(
      violations,
      null,
      2,
    )}`,
  ).toEqual([]);
}