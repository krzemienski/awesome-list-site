// Repeatable real-browser validation for Clerk's sign-in, deep-page return,
// and account-recovery contracts. Starts logged out on /submit, follows its
// sign-in link, then repeats the same return check for every representative
// account entry point before signing out and completing Clerk's email-code
// recovery flow. Sign-ins use backend-minted Clerk sign-in tickets on the real
// /sign-in page (see signInWithClerkTicket) so Clerk's new-device verification
// cannot make the gate flaky; recovery still drives Clerk's email-code UI.
//
// Requires the development server on :5000, DATABASE_URL, and CLERK_SECRET_KEY.
// Evidence is written only to /tmp/validation/auth-return-audit.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";
import { acquireGateLease } from "./gate-lease.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));
const { Pool } = pg;

const BASE = process.env.AUDIT_BASE_URL || "http://localhost:5000";
const DATABASE_URL = process.env.DATABASE_URL;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const AUTH_RETURN_AUDIT_KEY = process.env.ADMIN_PASSWORD;
const OUT = "/tmp/validation/auth-return-audit";
const PREFIX = "__qa_test_auth_return_audit_";
fs.mkdirSync(OUT, { recursive: true });

function screenshotNameForRoute(route) {
  return route.replace(/[?#].*$/, "").replace(/^\/+/, "").replaceAll("/", "-");
}

// Exercise both kinds of protected entry point:
// - /profile and /admin/* are guarded by the server on a hard navigation.
// - /contributions, /notifications, and /onboarding use AuthGuard in the SPA.
// - /bookmarks intentionally remains guest-readable, but its account upgrade
//   action must still carry the page back through Clerk sign-in.
// `route` is the full deep target: path + query must survive the round trip
// exactly. Hash fragments are not audited: every guarded page is also behind
// the server guard on a hard navigation, and browsers never send a fragment
// to the server, so no redirect can carry it (AuthGuard does carry it on
// in-app navigation, where window.location.hash is readable).
const DEEP_PAGE_ROUTES = [
  { route: "/profile?tab=favorites", entry: "server redirect" },
  { route: "/admin", entry: "server redirect", admin: true },
  { route: "/admin/resources?status=pending", entry: "server redirect", admin: true },
  { route: "/contributions", entry: "client guard" },
  { route: "/bookmarks", entry: "guest sign-in action" },
  { route: "/notifications?filter=unread", entry: "client guard" },
  { route: "/onboarding", entry: "client guard" },
];
// Guest-readable pages whose sign-in action is still audited, deliberately not
// behind a guard (local-storage guest bookmarks).
const GUEST_RETURN_EXCEPTIONS = new Set(["/bookmarks"]);

// Route-inventory contract: every page guarded in the SPA (AuthGuard /
// AdminGuard) or by the server's PROTECTED_PAGE_PATTERNS must be covered by a
// DEEP_PAGE_ROUTES entry, and every entry must still be protected (or a listed
// guest exception). A new protected page without an audit entry fails here,
// by name, before any browser starts. Sources are overridable so the contract
// can be mutation-probed on /tmp copies.
function protectedRouteInventory() {
  const appSource = fs.readFileSync(
    process.env.AUTH_RETURN_APP_SOURCE || path.join(ROOT, "client/src/App.tsx"), "utf8");
  const serverSource = fs.readFileSync(
    process.env.AUTH_RETURN_SERVER_SOURCE || path.join(ROOT, "server/index.ts"), "utf8");
  const clientRoutes = [];
  const routeRe = /<Route\s+path="([^"]+)"([^>]*?)(\/?)>/g;
  for (let m; (m = routeRe.exec(appSource)); ) {
    if (m[3] === "/") {
      if (/component=\{(?:AuthGuard|AdminGuard)\b/.test(m[2])) clientRoutes.push(m[1]);
      continue;
    }
    const close = appSource.indexOf("</Route>", routeRe.lastIndex);
    if (close === -1) throw new Error(`App.tsx: unterminated <Route path="${m[1]}">`);
    const body = appSource.slice(routeRe.lastIndex, close);
    if (/<(?:AuthGuard|AdminGuard)\b/.test(body)) clientRoutes.push(m[1]);
  }
  const block = serverSource.match(/PROTECTED_PAGE_PATTERNS\s*=\s*\[([\s\S]*?)\];/);
  if (!block) throw new Error("server/index.ts: PROTECTED_PAGE_PATTERNS not found (parser rot)");
  const serverPatterns = [...block[1].matchAll(/\/((?:\\.|[^/\n])+)\/([a-z]*)\s*,/g)]
    .map((m) => new RegExp(m[1], m[2]));
  if (clientRoutes.length === 0 || serverPatterns.length === 0) {
    throw new Error(`inventory parser rot: client=${clientRoutes.length} server=${serverPatterns.length}`);
  }
  return { clientRoutes, serverPatterns };
}

function checkProtectedRouteInventory() {
  const failures = [];
  const { clientRoutes, serverPatterns } = protectedRouteInventory();
  const audited = DEEP_PAGE_ROUTES.map(({ route }) => new URL(route, "http://x").pathname);
  for (const routePath of clientRoutes) {
    const re = new RegExp(`^${routePath.replace(/:[A-Za-z]+/g, "[^/]+")}/?$`);
    if (!audited.some((p) => re.test(p))) {
      failures.push(`client-guarded route ${routePath} has no DEEP_PAGE_ROUTES entry`);
    }
  }
  for (const pattern of serverPatterns) {
    if (!audited.some((p) => pattern.test(p))) {
      failures.push(`server PROTECTED_PAGE_PATTERNS ${pattern} has no DEEP_PAGE_ROUTES entry`);
    }
  }
  for (const p of audited) {
    const guarded = serverPatterns.some((re) => re.test(p)) || clientRoutes.some((r) =>
      new RegExp(`^${r.replace(/:[A-Za-z]+/g, "[^/]+")}/?$`).test(p));
    if (!guarded && !GUEST_RETURN_EXCEPTIONS.has(p)) {
      failures.push(`DEEP_PAGE_ROUTES entry ${p} is no longer protected (stale entry)`);
    }
  }
  return { failures, clientRoutes, serverPatterns };
}

{
  const inv = checkProtectedRouteInventory();
  console.log(
    `[inventory] client-guarded: ${inv.clientRoutes.join(", ")} | server: ${inv.serverPatterns.join(" ")}`,
  );
  for (const f of inv.failures) console.log(`[FAIL] inventory: ${f}`);
  if (inv.failures.length) {
    console.log(`\nINVENTORY FAIL ${inv.failures.length}`);
    process.exit(1);
  }
  console.log(`[PASS] inventory: ${DEEP_PAGE_ROUTES.length} audited entries cover every protected route`);
  if (process.argv.includes("--inventory-only")) process.exit(0);
}

if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is required for guaranteed QA teardown");
  process.exit(1);
}
if (!CLERK_SECRET_KEY) {
  console.error("FATAL: CLERK_SECRET_KEY is required to create the disposable audit account");
  process.exit(1);
}
if (!AUTH_RETURN_AUDIT_KEY || AUTH_RETURN_AUDIT_KEY.length < 8) {
  console.error("FATAL: ADMIN_PASSWORD (>=8 chars) is required for protected document redirects");
  process.exit(1);
}

function chromePath() {
  const cache = path.join(ROOT, ".cache", "ms-playwright");
  const dir = fs.readdirSync(cache).find((entry) => /^chromium-\d+$/.test(entry));
  if (!dir) throw new Error("No cached Chromium installation");
  return path.join(cache, dir, "chrome-linux64", "chrome");
}

async function clerkApi(method, route, body) {
  const response = await fetch(`https://api.clerk.com/v1${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Clerk ${method} ${route} -> ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

async function deleteClerkUserIfPresent(userId) {
  try {
    await clerkApi("DELETE", `/users/${userId}`);
  } catch (error) {
    // Clerk test identities may already be removed by another prefix cleanup.
    // DELETE is teardown, so an explicit not-found response is success.
    if (error instanceof Error && error.message.includes("-> 404:")) return;
    throw error;
  }
}

async function purgeClerkQaUsers() {
  const users = [];
  for (let offset = 0; offset < 1_000; offset += 100) {
    const page = await clerkApi("GET", `/users?limit=100&offset=${offset}`);
    if (!Array.isArray(page)) break;
    users.push(...page);
    if (page.length < 100) break;
  }
  for (const user of users) {
    const emails = (user.email_addresses ?? []).map((entry) => entry.email_address);
    if (!emails.some((address) => address.startsWith(PREFIX))) continue;
    await deleteClerkUserIfPresent(user.id).catch(() => {});
  }
}

async function findClerkUser(email) {
  const matches = await clerkApi("GET", `/users?email_address=${encodeURIComponent(email)}`);
  return (Array.isArray(matches) ? matches : matches?.data ?? []).find((user) =>
    (user.email_addresses ?? []).some((entry) => entry.email_address === email),
  );
}

async function waitForClerkUser(email, expectedId, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const user = await findClerkUser(email);
    if (user?.id === expectedId) return user;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return undefined;
}

async function purgeQaUsers(pool) {
  const users = await pool.query("SELECT id FROM users WHERE email LIKE $1", [`${PREFIX}%`]);
  for (const { id } of users.rows) {
    await pool.query("DELETE FROM sessions WHERE sess::text LIKE $1", [`%${id}%`]);
  }
  await pool.query("DELETE FROM users WHERE email LIKE $1", [`${PREFIX}%`]);
}

async function waitForApp() {
  const deadline = Date.now() + 120_000;
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/awesome-list`, { method: "HEAD" });
      if (response.ok || response.status === 405) return;
      last = `status ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`app did not become ready within 120 seconds (${last})`);
}

async function gotoPage(page, route) {
  const deadline = Date.now() + 90_000;
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await page.goto(`${BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      const status = response?.status() ?? 0;
      if (status > 0 && status !== 429 && status !== 503) {
        return;
      }
      last = `status ${status}`;
      const retryAfter = Number(response?.headers()["retry-after"] || 1);
      await page.waitForTimeout(Math.max(1_000, Math.min(retryAfter * 1_000, 5_000)));
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      await page.waitForTimeout(1_500);
    }
  }
  throw new Error(`Unable to load ${route} for auth return audit (${last})`);
}

// Sign in through the real <SignIn> component with a backend-minted sign-in
// ticket instead of typing a password. Clerk's Client Trust feature routes
// repeated password sign-ins from this container to /sign-in/client-trust
// (new-device verification), which tests Clerk's risk state rather than the
// app's return contract. A `__clerk_ticket` on the current sign-in URL keeps
// everything the audit owns intact: the page is still /sign-in carrying the
// app-built redirect_url, and Clerk's own component completes the ticket and
// performs the redirect the audit then verifies.
async function signInWithClerkTicket(page, clerkUserId) {
  const signInUrl = new URL(page.url());
  if (!signInUrl.pathname.startsWith("/sign-in")) {
    throw new Error(`ticket sign-in must start on /sign-in; path=${signInUrl.pathname}`);
  }
  const ticket = await clerkApi("POST", "/sign_in_tokens", {
    user_id: clerkUserId,
    expires_in_seconds: 600,
  });
  signInUrl.searchParams.set("__clerk_ticket", ticket.token);
  await gotoPage(page, signInUrl.pathname + signInUrl.search);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const signedIn = await page
      .evaluate(() => Boolean(window.Clerk?.user))
      .catch(() => false);
    if (signedIn || !new URL(page.url()).pathname.startsWith("/sign-in")) return;
    await page.waitForTimeout(500);
  }
  throw new Error(
    `Clerk ticket sign-in did not reach an authenticated session; ` +
      `path=${new URL(page.url()).pathname}`,
  );
}

async function waitForAuthenticatedSession(page, expectedPath) {
  const deadline = Date.now() + 90_000;
  let authState = null;
  while (Date.now() < deadline) {
    authState = await page.evaluate(async () => {
      const response = await fetch("/api/auth/user", { credentials: "include" });
      return response.json().catch(() => null);
    });
    const pathMatches =
      expectedPath === undefined || new URL(page.url()).pathname === expectedPath;
    if (pathMatches && authState?.isAuthenticated === true) break;
    await page.waitForTimeout(1_000);
  }
  const returnedPath = new URL(page.url()).pathname;
  if (
    authState?.isAuthenticated !== true ||
    (expectedPath !== undefined && returnedPath !== expectedPath)
  ) {
    throw new Error(
      `Authenticated session did not return to ${expectedPath ?? "the current page"}; ` +
        `path=${returnedPath} authenticated=${authState?.isAuthenticated}`,
    );
  }
  return authState;
}

async function waitForSignInRedirect(page, expectedPath) {
  const deadline = Date.now() + 45_000;
  let last = new URL(page.url());
  while (Date.now() < deadline) {
    last = new URL(page.url());
    if (
      last.pathname.startsWith("/sign-in") &&
      last.searchParams.get("redirect_url") === expectedPath
    ) {
      return last;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `Expected ${expectedPath} to redirect to sign-in with redirect_url=${expectedPath}; ` +
      `got ${last.pathname}${last.search}`,
  );
}

async function newLoggedOutContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const appOrigin = new URL(BASE).origin;
  const anonymousProtectedNavigations = new Set();
  await context.route("**/*", (route) => {
    const request = route.request();
    let target;
    try {
      target = new URL(request.url());
    } catch {
      return route.continue();
    }
    const protectedDocument =
      target.origin === appOrigin &&
      request.isNavigationRequest() &&
      anonymousProtectedNavigations.delete(target.pathname);
    if (!protectedDocument) return route.continue();
    return route.continue({
      headers: {
        ...request.headers(),
        "x-auth-return-audit-key": AUTH_RETURN_AUDIT_KEY,
      },
    });
  });

  const response = await context.request.get(`${BASE}/api/auth/user`, {
    headers: { "cache-control": "no-store" },
  });
  const authState = await response.json().catch(() => null);
  if (!response.ok() || authState?.isAuthenticated !== false) {
    await context.close();
    throw new Error("Fresh browser context was not anonymous");
  }

  return {
    context,
    page: await context.newPage(),
    anonymousProtectedNavigations,
    authState,
  };
}

async function recoverWithClerk(page, email, replacementPassword) {
  await gotoPage(page, "/sign-in");
  const identifier = page.locator('input[name="identifier"]');
  await identifier.waitFor({ timeout: 30_000 });
  await identifier.fill(email);
  await page.keyboard.press("Enter");

  const passwordField = page.locator('input[name="password"]');
  await passwordField.waitFor({ timeout: 30_000 });
  await page.getByText(/forgot password/i).first().click();

  const recoveryPath = new URL(page.url()).pathname;
  const recoveryHeading = page.getByRole("heading", { name: /forgot password/i });
  const recoveryVisible = await recoveryHeading
    .waitFor({ state: "visible", timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  log(
    "clerk-recovery:canonical-entry",
    recoveryPath.startsWith("/sign-in") && recoveryVisible,
    `path=${recoveryPath} recovery_ui=${recoveryVisible}`,
  );
  await page.screenshot({ path: `${OUT}/account-recovery-entry.png`, fullPage: true });

  const emailCodeButton = page.getByRole("button", { name: /^email code to /i }).first();
  await emailCodeButton.waitFor({ state: "visible", timeout: 30_000 });
  await emailCodeButton.click();

  const otp = page.locator('input[aria-label="Enter verification code"]');
  const verificationVisible = await otp
    .waitFor({ state: "visible", timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  const verificationPath = new URL(page.url()).pathname;
  log(
    "clerk-recovery:canonical-verification",
    verificationPath.startsWith("/sign-in") && verificationVisible,
    `path=${verificationPath} code_input=${verificationVisible}`,
  );
  await page.screenshot({
    path: `${OUT}/account-recovery-verification.png`,
    fullPage: true,
  });
  if (!verificationVisible) {
    throw new Error("Clerk recovery did not expose its verification-code field");
  }

  await otp.click();
  await page.keyboard.type("424242", { delay: 120 });

  const newPassword = page.getByLabel(/new password/i).first();
  const recoveryDeadline = Date.now() + 90_000;
  while (Date.now() < recoveryDeadline) {
    const signedIn = await page
      .evaluate(() => Boolean(window.Clerk?.user))
      .catch(() => false);
    if (signedIn || await newPassword.isVisible().catch(() => false)) break;
    await page.waitForTimeout(500);
  }
  const recoveryReady =
    await page.evaluate(() => Boolean(window.Clerk?.user)).catch(() => false) ||
    await newPassword.isVisible().catch(() => false);
  if (!recoveryReady) {
    throw new Error("Clerk recovery did not reach a session or new-password step");
  }
  if (!(await page.evaluate(() => Boolean(window.Clerk?.user)))) {
    await newPassword.fill(replacementPassword);
    const confirmPassword = page.getByLabel(/confirm password/i).first();
    if (await confirmPassword.isVisible().catch(() => false)) {
      await confirmPassword.fill(replacementPassword);
    }
    await page
      .getByRole("button", { name: /^(continue|reset password)$/i })
      .first()
      .click();
    await page.waitForFunction(() => Boolean(window.Clerk?.user), null, {
      timeout: 90_000,
    });
  }
}

const pool = new Pool({ connectionString: DATABASE_URL });
const results = [];
const log = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} :: ${detail}`);
};

let browser;
let context;
let page;
let anonymousProtectedNavigations;
let releaseGateLease;
const createdClerkUserIds = new Set();

try {
  await waitForApp();
  // Sign-in JIT-provisions a database row, so this flow cannot overlap the
  // deliberate DB outage gate. Acquire db-heavy before the browser lease to
  // preserve the repository-wide lock order and avoid deadlocks.
  releaseGateLease = await acquireGateLease("db-heavy", "auth-return-audit");
  browser = await launchBrowserWithLease(
    chromium,
    {
      headless: true,
      executablePath: chromePath(),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
    "auth-return-audit",
  );
  let loggedOutState;
  ({ context, page, anonymousProtectedNavigations, authState: loggedOutState } =
    await newLoggedOutContext(browser));
  log(
    "logged-out:anonymous-session",
    loggedOutState?.isAuthenticated === false,
    `authenticated=${loggedOutState?.isAuthenticated}`,
  );

  await gotoPage(page, "/submit");
  const initialPath = new URL(page.url()).pathname;
  log("logged-out:deep-page", initialPath === "/submit", `path=${initialPath}`);

  const loginLink = page.getByTestId("link-login");
  await loginLink.waitFor({ state: "visible", timeout: 30_000 });
  const loginHref = await loginLink.getAttribute("href");
  const loginUrl = new URL(loginHref || "", BASE);
  const redirectUrl = loginUrl.searchParams.get("redirect_url");
  log(
    "sign-in-link:deep-return",
    loginUrl.pathname === "/sign-in" && redirectUrl === "/submit",
    `path=${loginUrl.pathname} redirect_url=${redirectUrl}`,
  );

  await Promise.all([
    page.waitForURL((url) => new URL(url).pathname.startsWith("/sign-in"), { timeout: 30_000 }),
    loginLink.click(),
  ]);
  const signInUrl = new URL(page.url());
  log(
    "sign-in-page:deep-return",
    signInUrl.searchParams.get("redirect_url") === "/submit",
    `path=${signInUrl.pathname} redirect_url=${signInUrl.searchParams.get("redirect_url")}`,
  );

  // Create the disposable identity only after both shared leases are held.
  // Completion validation runs browser audits in parallel; creating it before
  // the browser wait leaves it exposed to unrelated QA cleanup for minutes.
  await purgeClerkQaUsers();
  await purgeQaUsers(pool);
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const email = `${PREFIX}${suffix}+clerk_test@example.com`;
  const password = `AuthReturnAudit-${suffix}!`;
  const createdClerkUser = await clerkApi("POST", "/users", {
    email_address: [email],
    password,
    skip_password_checks: true,
  });
  createdClerkUserIds.add(createdClerkUser.id);
  const visibleClerkUser = await waitForClerkUser(email, createdClerkUser.id);
  log(
    "clerk-account:sign-in-visible",
    visibleClerkUser?.id === createdClerkUser.id,
    `created=${Boolean(createdClerkUser.id)} visible=${Boolean(visibleClerkUser)}`,
  );
  if (visibleClerkUser?.id !== createdClerkUser.id) {
    throw new Error("Disposable Clerk account was not visible immediately after creation");
  }

  await signInWithClerkTicket(page, createdClerkUser.id);

  const authState = await waitForAuthenticatedSession(page, "/submit");

  const returnedPath = new URL(page.url()).pathname;
  log(
    "clerk-auth:return-to-deep-page",
    returnedPath === "/submit" && authState?.isAuthenticated === true,
    `path=${returnedPath} authenticated=${authState?.isAuthenticated}`,
  );
  await page.screenshot({ path: `${OUT}/auth-return.png`, fullPage: true });

  await context.close();
  context = undefined;
  page = undefined;
  anonymousProtectedNavigations = undefined;

  const deepPageRoutes = DEEP_PAGE_ROUTES;

  for (const [routeIndex, { route, entry, admin = false }] of deepPageRoutes.entries()) {
    ({ context, page, anonymousProtectedNavigations, authState: loggedOutState } =
      await newLoggedOutContext(browser));
    log(
      `logged-out${route}:anonymous-session`,
      loggedOutState?.isAuthenticated === false,
      `authenticated=${loggedOutState?.isAuthenticated}`,
    );
    const routeUrl = new URL(route, BASE);
    // Hash fragments never reach the server, so a server guard can only carry
    // path+query; client guards must carry the hash as well.
    const expectedTarget = entry === "server redirect"
      ? routeUrl.pathname + routeUrl.search
      : routeUrl.pathname + routeUrl.search + routeUrl.hash;
    if (entry === "server redirect") anonymousProtectedNavigations.add(routeUrl.pathname);
    await gotoPage(page, route);

    if (route === "/bookmarks") {
      const guestSignIn = page.getByTestId("button-guest-empty-signin");
      await guestSignIn.waitFor({ state: "visible", timeout: 30_000 });
      await Promise.all([
        waitForSignInRedirect(page, expectedTarget),
        guestSignIn.click(),
      ]);
    } else {
      await waitForSignInRedirect(page, expectedTarget);
    }

    const signInUrl = new URL(page.url());
    log(
      `logged-out${route}:deep-return`,
      signInUrl.searchParams.get("redirect_url") === expectedTarget,
      `entry=${entry} path=${signInUrl.pathname} redirect_url=${signInUrl.searchParams.get("redirect_url")}`,
    );

    // One identity per route keeps the cases independent. Repeated rapid
    // sign-ins on a single Clerk identity can escalate later attempts to an
    // additional factor chooser, which tests Clerk risk state rather than the
    // route's return contract.
    // Keep the generated email's local part below the provider's 64-character
    // limit; PREFIX is intentionally verbose so route names cannot be embedded.
    const routeSuffix = `${Date.now().toString(36)}_${routeIndex}`;
    const routeEmail = `${PREFIX}${routeSuffix}+clerk_test@example.com`;
    const routePassword = `AuthReturnAudit-${routeSuffix}!`;
    const routeBridgeId = admin ? `${PREFIX}${routeSuffix}` : undefined;
    const routeClerkUser = await clerkApi("POST", "/users", {
      email_address: [routeEmail],
      password: routePassword,
      skip_password_checks: true,
      ...(routeBridgeId ? { external_id: routeBridgeId } : {}),
    });
    createdClerkUserIds.add(routeClerkUser.id);
    if (admin) {
      // The app's Clerk session template exposes external_id as claims.userId.
      // Pre-provision that exact bridge row as admin before sign-in so both the
      // document guard and the client /api/auth/user lookup resolve one identity.
      await pool.query(
        "INSERT INTO users (id, email, role) VALUES ($1, $2, 'admin')",
        [routeBridgeId, routeEmail],
      );
    }

    await signInWithClerkTicket(page, routeClerkUser.id);
    const routeAuthState = await waitForAuthenticatedSession(page, routeUrl.pathname);
    const returned = new URL(page.url());
    const returnedRoute = returned.pathname + returned.search + returned.hash;
    // The destination page may ADD its own state params after landing (e.g.
    // onboarding normalizes to ?step=1); every requested param must survive
    // with its exact value, and nothing requested may be dropped.
    const expectedUrl = new URL(expectedTarget, BASE);
    const requestedParamsKept = [...expectedUrl.searchParams].every(
      ([key, value]) => returned.searchParams.getAll(key).includes(value),
    );
    log(
      `clerk-auth${route}:return-to-deep-page`,
      returned.pathname === expectedUrl.pathname && requestedParamsKept &&
        (!expectedUrl.hash || returned.hash === expectedUrl.hash) &&
        returned.origin === new URL(BASE).origin &&
        routeAuthState?.isAuthenticated === true,
      `url=${returnedRoute} expected=${expectedTarget} authenticated=${routeAuthState?.isAuthenticated}`,
    );
    // Back must stay on this origin (no bounce to an external host) and must
    // not re-enter a sign-in loop for the now-authenticated user.
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => null);
    await page.waitForTimeout(1_500);
    const afterBack = new URL(page.url());
    log(
      `clerk-auth${route}:back-recovers`,
      afterBack.origin === new URL(BASE).origin,
      `after_back=${afterBack.pathname}${afterBack.search}`,
    );
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" }).catch(() => null);
    if (admin) {
      const adminRole = routeAuthState?.user?.role;
      // Clerk completion and the app's cached auth query settle independently.
      // Reload the returned URL with the real session (the anonymous handshake
      // bypass was one-shot) so AdminGuard resolves fresh authoritative state.
      await gotoPage(page, route);
      const reloadedAdminPath = new URL(page.url()).pathname + new URL(page.url()).search;
      const adminMarker = page.getByTestId("admin-authorized");
      const adminGuardPassed = await adminMarker
        .waitFor({ state: "attached", timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
      log(
        `clerk-auth${route}:authorized-page`,
        adminRole === "admin" && reloadedAdminPath === expectedTarget && adminGuardPassed,
        `role=${adminRole} path=${reloadedAdminPath} authorized_guard=${adminGuardPassed}`,
      );
      if (adminRole !== "admin" || reloadedAdminPath !== expectedTarget || !adminGuardPassed) {
        throw new Error(`Admin account returned to ${route} without authorized content`);
      }
    }
    await page.screenshot({
      // Keep route separators out of the filename: /admin/resources would
      // otherwise target a directory that is not created under OUT.
      path: `${OUT}/auth-return-${screenshotNameForRoute(route)}.png`,
      fullPage: true,
    });
    await context.close();
    context = undefined;
    page = undefined;
    anonymousProtectedNavigations = undefined;
    await deleteClerkUserIfPresent(routeClerkUser.id);
    createdClerkUserIds.delete(routeClerkUser.id);
  }

  ({ context, page, anonymousProtectedNavigations, authState: loggedOutState } =
    await newLoggedOutContext(browser));
  log(
    "logged-out/recovery:anonymous-session",
    loggedOutState?.isAuthenticated === false,
    `authenticated=${loggedOutState?.isAuthenticated}`,
  );
  const replacementPassword = `AuthRecoveryAudit-${suffix}!`;
  await recoverWithClerk(page, email, replacementPassword);
  const recoveryAuthState = await waitForAuthenticatedSession(page);
  const recoveryCompleted = recoveryAuthState?.isAuthenticated === true;
  log(
    "clerk-recovery:authenticated",
    recoveryCompleted,
    `path=${new URL(page.url()).pathname} authenticated=${recoveryAuthState?.isAuthenticated}`,
  );
  await page.screenshot({ path: `${OUT}/account-recovery-complete.png`, fullPage: true });
} catch (error) {
  console.error("AUDIT ERROR:", error);
  log("audit:uncaught", false, error instanceof Error ? error.message : String(error));
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  try {
    for (const clerkUserId of createdClerkUserIds) {
      await deleteClerkUserIfPresent(clerkUserId).catch(() => {});
    }
    await purgeClerkQaUsers().catch((error) => {
      log("teardown:clerk-users", false, error instanceof Error ? error.message : String(error));
    });
    await purgeQaUsers(pool);
    const residue = await pool.query("SELECT count(*)::int AS count FROM users WHERE email LIKE $1", [
      `${PREFIX}%`,
    ]);
    log("teardown:zero-qa-users", residue.rows[0].count === 0, `remaining=${residue.rows[0].count}`);
  } catch (error) {
    log("teardown:zero-qa-users", false, error instanceof Error ? error.message : String(error));
  }
  await pool.end();
  releaseGateLease?.();
}

const failed = results.filter((result) => !result.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${failed.length} (evidence: ${OUT})`);
if (failed.length) process.exit(1);