#!/usr/bin/env node
/**
 * Focused normal-app Clerk regression reproduction.
 *
 * This is intentionally NOT a read-only-matrix replacement: it runs only
 * against the ordinary local development app at 127.0.0.1:5000, makes no
 * interception or SDK exception, and is limited to a disposable Nick identity
 * plus the app's normal sign-in, session, sign-out, and protected-route paths.
 *
 * Parent execution only:
 *
 *   CLERK_SECRET_KEY=... ADMIN_PASSWORD=... \
 *   node docs/parity/evidence/integration-shell/normal-app-auth-regression.mjs \
 *     --out /tmp/validation/task565-normal-auth-regression
 *
 * To reproduce only the token-refresh step after real setup, reload, and API
 * verification (without repeating the sign-out/protected-route journey):
 *
 *   CLERK_SECRET_KEY=... ADMIN_PASSWORD=... \
 *   node docs/parity/evidence/integration-shell/normal-app-auth-regression.mjs \
 *     --only-refresh --out /tmp/validation/task565-auth-refresh
 *
 * The identity helper is the sole identity-writing path and tears down only
 * the user it created. The browser does not visit or click any business CRUD
 * surface. Evidence retains app status/boolean assertions and sanitized Clerk
 * HTTP status/failure records only: never response bodies, tokens, cookies,
 * identity IDs, emails, or URL query values.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { launchBrowserWithLease } from "../../../../scripts/validation/playwright-launch-lease.mjs";
import {
  createDisposableAdmin,
  identityAvailability,
} from "../../../../tests/parity/identity.mjs";

const BASE = "http://127.0.0.1:5000";
const DEFAULT_OUT = "/tmp/validation/task565-normal-auth-regression";
const CLERK_HOST = /\.clerk\.accounts\.dev$/i;
const UUID_PATH_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const OPAQUE_PATH_ID = /^(?:sess(?:ion)?|client|user|usr|org|device|visitor|instance|token|jwt|sid|uid|sia)[_-][A-Za-z0-9_-]+$/i;

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, onlyRefresh: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--out") {
      const value = argv[++index];
      if (!value) throw new Error("--out requires a value");
      args.out = value;
    } else if (flag === "--only-refresh") {
      args.onlyRefresh = true;
    } else if (flag === "--help" || flag === "-h") {
      console.log("Usage: CLERK_SECRET_KEY=... ADMIN_PASSWORD=... node docs/parity/evidence/integration-shell/normal-app-auth-regression.mjs [--only-refresh] [--out /tmp/validation/task565-normal-auth-regression]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument ${flag}`);
    }
  }
  const availability = identityAvailability();
  if (!availability.ok) {
    throw new Error(`Real disposable Clerk identity is required: missing ${availability.missing.join(", ")}`);
  }
  return { ...args, out: path.resolve(args.out) };
}

function chromiumLaunchOptions() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  return {
    headless: true,
    chromiumSandbox: true,
    ...(executablePath ? { executablePath } : {}),
  };
}

function normalizedPathname(pathname) {
  return pathname
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (UUID_PATH_ID.test(segment)) return "<uuid>";
      if (OPAQUE_PATH_ID.test(segment)) {
        const separator = segment.includes("_") ? "_" : "-";
        return `${segment.slice(0, segment.indexOf(separator))}${separator}<id>`;
      }
      return segment;
    })
    .join("/") || "/";
}

function sanitizedTarget(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return { origin: url.origin, path: normalizedPathname(url.pathname) };
  } catch {
    return { origin: "<opaque>", path: "<opaque>" };
  }
}

function isClerkUrl(rawUrl) {
  try {
    return CLERK_HOST.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

function sanitizedFailure(errorText) {
  // Chromium network errors are useful diagnostic categories and do not expose
  // protocol payloads. Any unexpected text is deliberately not retained.
  const value = typeof errorText === "string" ? errorText : "";
  return /^net::[A-Z_]+$/.test(value) ? value : "requestfailed";
}

function observeClerkHttp(page, phase, records) {
  page.on("response", (response) => {
    if (!isClerkUrl(response.url())) return;
    records.push({
      phase: phase.current,
      outcome: "response",
      target: sanitizedTarget(response.url()),
      status: response.status(),
    });
  });
  page.on("requestfailed", (request) => {
    if (!isClerkUrl(request.url())) return;
    records.push({
      phase: phase.current,
      outcome: "requestfailed",
      target: sanitizedTarget(request.url()),
      error: sanitizedFailure(request.failure()?.errorText),
    });
  });
}

async function authStatus(page) {
  // `/api/auth/me` deliberately has conventional protected-route semantics:
  // 200 while signed in and 401 after Clerk sign-out. Its response body stays
  // in the browser; only the endpoint status and two contract booleans are
  // returned to the durable sanitized report.
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const body = response.ok ? await response.json().catch(() => null) : null;
    return {
      status: response.status,
      authenticated: response.ok,
      admin: body?.role === "admin",
    };
  });
}

async function waitForAuthStatus(page, predicate, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await authStatus(page);
    if (predicate(last)) return last;
    await page.waitForTimeout(400);
  }
  throw new Error(`${label}: auth endpoint did not reach the expected status`);
}

async function freshTokenWithoutRetention(page) {
  // Deliberately return no token, token metadata, user object, or error text.
  return page.evaluate(async () => {
    if (!window.Clerk?.session) return { attempted: false, completed: false };
    try {
      await window.Clerk.session.getToken({ skipCache: true });
      return { attempted: true, completed: true };
    } catch {
      return { attempted: true, completed: false };
    }
  });
}

async function waitForClerkTokenReadiness(page, timeoutMs = 30_000) {
  // The app API can accept the existing server cookie before the fresh browser
  // Clerk runtime has loaded. Waiting for the public readiness contract avoids
  // mistaking that timing gap for an absent token refresh. A timeout is a
  // failure—not an optional or bypassed refresh.
  await page.waitForFunction(
    () => Boolean(
      window.Clerk?.loaded &&
      window.Clerk?.session &&
      typeof window.Clerk.session.getToken === "function",
    ),
    undefined,
    { timeout: timeoutMs },
  );
  return { loaded: true, sessionTokenFunctionReady: true };
}

async function appLocation(page) {
  return page.evaluate(() => ({
    origin: window.location.origin,
    path: window.location.pathname,
  }));
}

async function verifyProtectedRouteSignInBehavior(page) {
  const response = await page.goto(`${BASE}/admin`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  }).catch(() => null);
  await page.waitForTimeout(500);
  const destination = await appLocation(page);
  const localSignIn = destination.origin === BASE && destination.path.startsWith("/sign-in");
  const adminLoginLink = destination.origin === BASE
    ? await page.getByTestId("link-admin-login").isVisible().catch(() => false)
    : false;
  return {
    documentStatus: response?.status() ?? null,
    final: {
      origin: destination.origin,
      path: normalizedPathname(destination.path),
    },
    localSignIn,
    adminLoginLink,
    passed: localSignIn || adminLoginLink,
  };
}

function safeError(error) {
  // The report establishes the failed phase but never serializes a possible
  // Clerk/server message containing an identity or request payload.
  return error instanceof Error ? error.name : "Error";
}

function teardownSummary(outcome) {
  return {
    attempted: true,
    completed: outcome.errors.length === 0,
    localDeleted: Boolean(outcome.localDeleted),
    clerkDeleted: Boolean(outcome.clerkDeleted),
    localQaUsersRemaining: outcome.verification?.localQaUsersRemaining?.length ?? null,
    errorCount: outcome.errors.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });
  const clerkHttp = [];
  const phase = { current: "identity-setup" };
  const steps = {};
  let identity = null;
  let teardown = { attempted: false, completed: false };
  let runError = null;
  const browser = await launchBrowserWithLease(
    chromium,
    chromiumLaunchOptions(),
    "task565-normal-app-auth-regression",
  );
  try {
    identity = await createDisposableAdmin({
      browser,
      appBase: BASE,
      secretKey: process.env.CLERK_SECRET_KEY,
      auditKey: process.env.ADMIN_PASSWORD,
      log: () => {},
      onPage: (page) => observeClerkHttp(page, phase, clerkHttp),
    });

    steps.signIn = await waitForAuthStatus(
      identity.page,
      (state) => state.status === 200 && state.authenticated && state.admin,
      "sign-in/admin access",
    );

    phase.current = "reload";
    if (args.onlyRefresh) {
      const reloadResponse = await identity.page.reload({
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      steps.reload = {
        documentStatus: reloadResponse?.status() ?? null,
        auth: await waitForAuthStatus(
          identity.page,
          (state) => state.status === 200 && state.authenticated && state.admin,
          "reload auth",
        ),
      };
    } else {
      phase.current = "admin-access";
      const adminResponse = await identity.page.goto(`${BASE}/admin`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await identity.page.getByTestId("admin-authorized").waitFor({ state: "visible", timeout: 30_000 });
      steps.adminAccess = {
        documentStatus: adminResponse?.status() ?? null,
        authorizedVisible: true,
        auth: await authStatus(identity.page),
      };

      phase.current = "reload";
      const reloadResponse = await identity.page.reload({
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await identity.page.getByTestId("admin-authorized").waitFor({ state: "visible", timeout: 30_000 });
      steps.reload = {
        documentStatus: reloadResponse?.status() ?? null,
        authorizedVisible: true,
        auth: await authStatus(identity.page),
      };
    }

    phase.current = "fresh-token";
    steps.freshToken = {
      readiness: await waitForClerkTokenReadiness(identity.page),
      tokenOperation: await freshTokenWithoutRetention(identity.page),
      auth: await waitForAuthStatus(
        identity.page,
        (state) => state.status === 200 && state.authenticated && state.admin,
        "fresh-token auth",
      ),
    };

    if (!args.onlyRefresh) {
      phase.current = "sign-out-ui";
      await identity.page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const signOut = identity.page.getByRole("button", { name: "Sign out", exact: true });
      await signOut.waitFor({ state: "visible", timeout: 30_000 });
      await signOut.click();
      await identity.page.waitForURL((url) => url.origin === BASE && url.pathname === "/", {
        timeout: 30_000,
      });
      steps.signOut = await waitForAuthStatus(
        identity.page,
        (state) => state.status === 401,
        "sign-out auth",
      );

      phase.current = "protected-route-after-sign-out";
      steps.protectedRoute = await verifyProtectedRouteSignInBehavior(identity.page);
    }
  } catch (error) {
    runError = safeError(error);
  } finally {
    if (identity) {
      try {
        teardown = teardownSummary(await identity.teardown());
      } catch (error) {
        const outcome = error?.outcome;
        teardown = outcome
          ? teardownSummary(outcome)
          : { attempted: true, completed: false, errorCount: 1 };
      }
    }
    await browser.close().catch(() => {});
  }

  const checks = {
    signInCompleted: steps.signIn?.status === 200 &&
      steps.signIn?.authenticated === true &&
      steps.signIn?.admin === true,
    reloadRetainsIdentity: steps.reload?.documentStatus === 200 &&
      (args.onlyRefresh || steps.reload?.authorizedVisible === true) &&
      steps.reload?.auth?.status === 200 &&
      steps.reload?.auth?.authenticated === true &&
      steps.reload?.auth?.admin === true,
    freshTokenRetainsIdentity: steps.freshToken?.readiness?.loaded === true &&
      steps.freshToken?.readiness?.sessionTokenFunctionReady === true &&
      steps.freshToken?.tokenOperation?.attempted === true &&
      steps.freshToken?.tokenOperation?.completed === true &&
      steps.freshToken?.auth?.status === 200 &&
      steps.freshToken?.auth?.authenticated === true &&
      steps.freshToken?.auth?.admin === true,
    teardownCompleted: teardown.completed === true,
  };
  if (!args.onlyRefresh) {
    checks.adminAccess = steps.adminAccess?.documentStatus === 200 &&
      steps.adminAccess?.authorizedVisible === true &&
      steps.adminAccess?.auth?.status === 200 &&
      steps.adminAccess?.auth?.authenticated === true &&
      steps.adminAccess?.auth?.admin === true;
    checks.signOutMakesAuthUnauthenticated = steps.signOut?.status === 401;
    checks.protectedRouteSignInBehavior = steps.protectedRoute?.passed === true;
  }
  const report = {
    schemaVersion: 1,
    purpose: args.onlyRefresh
      ? "Focused normal-app Clerk token-refresh reproduction after real setup and reload; not a read-only matrix or pixel pass"
      : "Focused normal-app authentication regression reproduction; not a read-only matrix or pixel pass",
    capturedAt: new Date().toISOString(),
    base: BASE,
    controls: {
      realDisposableNick: true,
      normalDevelopmentApp: true,
      browserInterception: "none",
      sdkExceptions: "none",
      businessCrudInteractions: "none",
      scope: args.onlyRefresh ? "setup, authenticated API, reload, Clerk readiness, forced token refresh, authenticated API, teardown" : "full focused auth journey",
      identityWrites: "existing helper only; created identity teardown only",
      retainedClerkData: "HTTP status/failure and sanitized origin/path only",
    },
    steps,
    clerkHttp,
    checks,
    teardown,
    ...(runError ? { runError, failedPhase: phase.current } : {}),
    pass: !runError && Object.values(checks).every(Boolean),
  };
  fs.writeFileSync(
    path.join(args.out, "summary.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  }
  if (runError) console.log(`FAIL run (${runError})`);
  console.log(`Report: ${path.join(args.out, "summary.json")}`);
  return report.pass ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  },
);
