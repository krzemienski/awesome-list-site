/**
 * Disposable Clerk admin identity for parity captures.
 *
 * Every app row is captured as a real, freshly created Clerk user named
 * "Nick" (matching the design demonstrator) who is promoted to admin through
 * the existing admin audit-key path and deleted again at the end of the run.
 *
 * Credentials never touch the repository:
 *   - the Clerk user password is random and lives only in this process
 *   - the browser storage state (cookies) stays in memory
 *   - the admin audit key is injected per request via route interception
 *     gated on the app origin, never as a context-wide header
 *
 * Identities are recognisable by the `__qa_test_parity_` prefix on the email
 * (`__qa_test_parity_<suffix>+clerk_test@example.com`) so `--sweep`, the admin
 * users search (`q=` matches email) and the SQL proof can find leftovers.
 *
 * The bridge id (users.id / Clerk external_id) is NUMERIC on purpose: the
 * admin user endpoints validate `:id` as a bounded int4 string, so a prefixed
 * string id could be provisioned but never renamed, promoted, or deleted
 * through the audit-key path. Ids are drawn from 2 000 000 000–2 147 483 647,
 * far above the 8-digit legacy subject ids.
 */
import crypto from "node:crypto";

export const QA_PREFIX = "__qa_test_parity_";
export const CLERK_TEST_EMAIL_DOMAIN = "+clerk_test@example.com";
export const CLERK_TEST_OTP = "424242";
export const QA_BRIDGE_ID_FLOOR = 2_000_000_000;
export const QA_BRIDGE_ID_CEILING = 2_147_483_647;

export const isQaIdentity = (user) =>
  String(user?.email || "").startsWith(QA_PREFIX) ||
  (user?.email_addresses ?? []).some((entry) => String(entry.email_address).startsWith(QA_PREFIX)) ||
  String(user?.external_id || "").startsWith(QA_PREFIX) ||
  String(user?.id || "").startsWith(QA_PREFIX);

export function identityAvailability(env = process.env) {
  const missing = [];
  if (!env.CLERK_SECRET_KEY) missing.push("CLERK_SECRET_KEY");
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 8) missing.push("ADMIN_PASSWORD (>= 8 chars, the audit-key path fails closed below that)");
  return { ok: missing.length === 0, missing };
}

const clerkApi = async (secretKey, method, route, body) => {
  const response = await fetch(`https://api.clerk.com/v1${route}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.errors?.map((error) => error.message || error.code).join("; ") || response.statusText;
    const error = new Error(`Clerk ${method} ${route} -> ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  return data;
};

const deleteClerkUserIfPresent = async (secretKey, userId) => {
  try {
    await clerkApi(secretKey, "DELETE", `/users/${userId}`);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
};

/** Admin audit-key request helper (explicit header + Origin, never context-wide). */
const auditRequest = async (appBase, auditKey, method, route, body) => {
  const response = await fetch(`${appBase}${route}`, {
    method,
    headers: {
      "X-Admin-Audit-Key": auditKey,
      Origin: appBase,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`${method} ${route} -> ${response.status}: ${data?.message || response.statusText}`);
    error.status = response.status;
    throw error;
  }
  return data;
};

const findLocalQaUsers = async (appBase, auditKey) => {
  const found = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await auditRequest(appBase, auditKey, "GET", `/api/admin/users?q=${encodeURIComponent(QA_PREFIX)}&limit=100&page=${page}`);
    const users = Array.isArray(result?.users) ? result.users : [];
    found.push(...users.filter(isQaIdentity));
    if (users.length < 100) break;
  }
  return found;
};

const listClerkQaUsers = async (secretKey) => {
  const users = [];
  for (let offset = 0; offset < 1_000; offset += 100) {
    const page = await clerkApi(secretKey, "GET", `/users?limit=100&offset=${offset}&query=${encodeURIComponent(QA_PREFIX)}`);
    const items = Array.isArray(page) ? page : page?.data ?? [];
    users.push(...items);
    if (items.length < 100) break;
  }
  return users.filter(isQaIdentity);
};

/** Sign in through the real Clerk UI (password step, optional test OTP / factor chooser). */
async function signInWithClerk(page, email, password) {
  const identifier = page.locator('input[name="identifier"]');
  await identifier.waitFor({ timeout: 30_000 });
  await identifier.fill(email);
  await page.keyboard.press("Enter");
  const passwordField = page.locator('input[name="password"]');
  await passwordField.waitFor({ timeout: 30_000 });
  await passwordField.fill(password);
  await page.keyboard.press("Enter");
  const otp = page.locator('input[aria-label="Enter verification code"]');
  const emailCodeButton = page.getByRole("button", { name: /^email code to /i }).first();
  let selectedEmailCode = false;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const signedIn = await page.evaluate(() => Boolean(window.Clerk?.user)).catch(() => false);
    if (signedIn || !new URL(page.url()).pathname.startsWith("/sign-in")) return;
    if (await otp.isVisible().catch(() => false)) {
      await otp.click();
      await page.keyboard.type(CLERK_TEST_OTP, { delay: 120 });
      await page.waitForFunction(() => Boolean(window.Clerk?.user), null, { timeout: 30_000 });
      return;
    }
    if (!selectedEmailCode && await emailCodeButton.isVisible().catch(() => false)) {
      selectedEmailCode = true;
      await emailCodeButton.click();
      continue;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Clerk sign-in did not reach an authenticated session; path=${new URL(page.url()).pathname}`);
}

const pollAuthUser = async (page, predicate, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(async () => {
      const response = await fetch("/api/auth/user", { credentials: "include", headers: { accept: "application/json" } });
      return response.json().catch(() => null);
    }).catch(() => null);
    if (predicate(last)) return last;
    await page.waitForTimeout(1_000);
  }
  throw new Error(`/api/auth/user never reached the expected state; last=${JSON.stringify(last).slice(0, 300)}`);
};

/**
 * Make the privacy choice through the shipped UI, never by writing storage.
 * `appBase` may be a same-host static capture shell on a different port from
 * the API-owning setup origin; visiting it lets storageState carry the
 * origin-specific declined choice into the strict capture context.
 *
 * Only the resulting boolean leaves this helper. The stored consent value and
 * browser storage are never returned or logged.
 */
export async function declineAnalyticsConsentViaUi({ page, appBase }) {
  await page.goto(`${appBase}/privacy`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const decline = page.getByTestId("consent-decline");
  if (!await decline.isVisible().catch(() => false)) {
    // A prior choice hides the banner. Reopen it through the real Privacy UI
    // rather than dispatching the app event or altering localStorage.
    const settings = page.getByTestId("button-privacy-cookie-settings");
    await settings.waitFor({ state: "visible", timeout: 30_000 });
    await settings.click();
    await decline.waitFor({ state: "visible", timeout: 30_000 });
  }
  await decline.click();
  await page.getByTestId("consent-banner").waitFor({ state: "hidden", timeout: 30_000 });
  const consentDeclined = await page.evaluate(() => {
    try {
      return localStorage.getItem("analytics-consent") === "denied";
    } catch {
      return false;
    }
  });
  if (!consentDeclined) {
    throw new Error("Analytics consent decline was not persisted after the real consent UI action");
  }
  return consentDeclined;
}

/**
 * Create the disposable admin, sign in, promote, and return a handle whose
 * `storageState()` yields a fresh session for a new browser context.
 */
export async function createDisposableAdmin({
  browser,
  appBase,
  secretKey,
  auditKey,
  log = () => {},
  onPage = undefined,
}) {
  const suffix = `${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
  const bridgeId = String(QA_BRIDGE_ID_FLOOR + crypto.randomInt(0, QA_BRIDGE_ID_CEILING - QA_BRIDGE_ID_FLOOR + 1));
  const email = `${QA_PREFIX}${suffix}${CLERK_TEST_EMAIL_DOMAIN}`;
  const password = `Parity-${crypto.randomBytes(12).toString("base64url")}!9`;
  log(`[identity] creating disposable Clerk admin ${bridgeId}`);
  const clerkUser = await clerkApi(secretKey, "POST", "/users", {
    external_id: bridgeId,
    email_address: [email],
    password,
    first_name: "Nick",
    last_name: "Parity",
    skip_password_checks: true,
  });
  const record = { bridgeId, email, clerkUserId: clerkUser.id, localUserId: null, promoted: false };
  const emailAddressId = clerkUser.email_addresses?.[0]?.id;
  if (emailAddressId) {
    await clerkApi(secretKey, "PATCH", `/email_addresses/${emailAddressId}`, { verified: true }).catch((error) => {
      log(`[identity] could not pre-verify the test email (${error.message}); the UI OTP path will be used`);
    });
  }
  const authContext = await browser.newContext({ locale: "en-US", timezoneId: "UTC", serviceWorkers: "block" });
  authContext.setDefaultTimeout(30_000);
  const teardown = async ({ keepUser = false } = {}) => {
    const outcome = { keepUser, bridgeId, email, localDeleted: false, clerkDeleted: false, errors: [], verification: null };
    await authContext.close().catch(() => {});
    if (keepUser) return outcome;
    if (record.localUserId) {
      try {
        await auditRequest(appBase, auditKey, "DELETE", `/api/admin/users/${encodeURIComponent(record.localUserId)}`);
        outcome.localDeleted = true;
      } catch (error) {
        if (error.status === 404) outcome.localDeleted = "already-absent";
        else outcome.errors.push(`local delete: ${error.message}`);
      }
    } else {
      outcome.localDeleted = "never-provisioned";
    }
    try {
      outcome.clerkDeleted = await deleteClerkUserIfPresent(secretKey, record.clerkUserId);
    } catch (error) {
      outcome.errors.push(`clerk delete: ${error.message}`);
    }
    try {
      const leftovers = await findLocalQaUsers(appBase, auditKey);
      outcome.verification = { localQaUsersRemaining: leftovers.map((user) => ({ id: user.id, email: user.email })) };
    } catch (error) {
      outcome.errors.push(`verification: ${error.message}`);
    }
    if (outcome.errors.length) {
      const error = new Error(`identity teardown incomplete: ${outcome.errors.join(" | ")}`);
      error.outcome = outcome;
      throw error;
    }
    return outcome;
  };
  try {
    const page = await authContext.newPage();
    if (onPage) await onPage(page);
    await page.goto(`${appBase}/sign-in`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await signInWithClerk(page, email, password);
    const authUser = await pollAuthUser(page, (state) => state?.isAuthenticated === true);
    const localUserId = String(authUser.user?.id || authUser.id || bridgeId);
    if (localUserId !== bridgeId) {
      throw new Error(`JIT-provisioned user id ${localUserId} does not equal the bridge id ${bridgeId}; the Clerk session template no longer maps external_id`);
    }
    record.localUserId = localUserId;
    await auditRequest(appBase, auditKey, "PATCH", `/api/admin/users/${encodeURIComponent(localUserId)}/name`, { firstName: "Nick", lastName: null });
    await auditRequest(appBase, auditKey, "PUT", `/api/admin/users/${encodeURIComponent(localUserId)}/role`, { role: "admin" });
    record.promoted = true;
    const promoted = await pollAuthUser(page, (state) => state?.isAuthenticated === true && (state.user?.role || state.role) === "admin", 30_000);
    record.displayName = promoted.user?.name
      || [promoted.user?.firstName, promoted.user?.lastName].filter(Boolean).join(" ")
      || "";
    if (!/^nick$/i.test(record.displayName.trim())) {
      throw new Error(`Disposable admin display name is "${record.displayName}", expected "Nick" (the design demonstrator identity)`);
    }
    log(`[identity] ${bridgeId} signed in and promoted (display name "${record.displayName}")`);
    const storageState = async () => {
      await page.evaluate(async () => {
        await window.Clerk?.session?.getToken({ skipCache: true });
      });
      return authContext.storageState();
    };
    /** Same-origin credentialed JSON GET from the signed-in page (read-only admin endpoints). */
    const fetchJson = (route) => page.evaluate(async (target) => {
      const response = await fetch(target, { credentials: "include", headers: { accept: "application/json" } });
      return { ok: response.ok, status: response.status, body: await response.json().catch(() => null) };
    }, route);
    return { ...record, storageState, teardown, fetchJson, page };
  } catch (error) {
    await teardown().catch((teardownError) => log(`[identity] teardown after failure also failed: ${teardownError.message}`));
    throw error;
  }
}

/** Remove every leftover parity identity (local rows through the admin API, then Clerk). */
export async function sweepDisposableAdmins({ appBase, secretKey, auditKey, log = () => {} }) {
  const local = await findLocalQaUsers(appBase, auditKey);
  const localDeleted = [];
  const failed = [];
  for (const user of local) {
    try {
      await auditRequest(appBase, auditKey, "DELETE", `/api/admin/users/${encodeURIComponent(user.id)}`);
      localDeleted.push({ id: user.id, email: user.email });
    } catch (error) {
      // Non-numeric ids cannot pass the admin :id guard; report instead of aborting the sweep.
      failed.push({ id: user.id, email: user.email, error: error.message });
    }
  }
  const clerk = await listClerkQaUsers(secretKey);
  const clerkDeleted = [];
  for (const user of clerk) {
    try {
      if (await deleteClerkUserIfPresent(secretKey, user.id)) clerkDeleted.push(user.external_id || user.id);
    } catch (error) {
      failed.push({ id: user.id, clerk: true, error: error.message });
    }
  }
  const remaining = (await findLocalQaUsers(appBase, auditKey)).map((user) => ({ id: user.id, email: user.email }));
  const clerkRemaining = (await listClerkQaUsers(secretKey)).map((user) => ({ id: user.id, externalId: user.external_id || null }));
  const clean = remaining.length === 0 && clerkRemaining.length === 0 && failed.length === 0;
  log(`[identity] sweep removed ${localDeleted.length} local and ${clerkDeleted.length} Clerk parity identities; ${remaining.length} local + ${clerkRemaining.length} Clerk remaining, ${failed.length} failures`);
  return { localDeleted, clerkDeleted, failed, remaining, clerkRemaining, clean };
}
