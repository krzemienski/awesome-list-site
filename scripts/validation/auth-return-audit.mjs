// Repeatable real-browser validation for Clerk's deep-page return contract.
// Starts logged out on /submit, follows its sign-in link, completes a real
// Clerk test login, and verifies the browser returns to /submit.
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
const OUT = "/tmp/validation/auth-return-audit";
const PREFIX = "__qa_test_auth_return_audit_";
fs.mkdirSync(OUT, { recursive: true });

if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is required for guaranteed QA teardown");
  process.exit(1);
}
if (!CLERK_SECRET_KEY) {
  console.error("FATAL: CLERK_SECRET_KEY is required to create the disposable audit account");
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
    await clerkApi("DELETE", `/users/${user.id}`).catch(() => {});
  }
}

async function findClerkUser(email) {
  const matches = await clerkApi("GET", `/users?email_address=${encodeURIComponent(email)}`);
  return (Array.isArray(matches) ? matches : matches?.data ?? []).find((user) =>
    (user.email_addresses ?? []).some((entry) => entry.email_address === email),
  );
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
  const otpNeeded = await otp.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
  if (otpNeeded) {
    await otp.click();
    await page.keyboard.type("424242", { delay: 120 });
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
let releaseGateLease;
let createdClerkUserId;

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
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await context.newPage();

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
  createdClerkUserId = createdClerkUser.id;
  const visibleClerkUser = await findClerkUser(email);
  log(
    "clerk-account:sign-in-visible",
    visibleClerkUser?.id === createdClerkUserId,
    `created=${Boolean(createdClerkUserId)} visible=${Boolean(visibleClerkUser)}`,
  );
  if (visibleClerkUser?.id !== createdClerkUserId) {
    throw new Error("Disposable Clerk account was not visible immediately after creation");
  }

  await signInWithClerk(page, email, password);

  const returnDeadline = Date.now() + 90_000;
  let authState = null;
  while (Date.now() < returnDeadline) {
    authState = await page.evaluate(async () => {
      const response = await fetch("/api/auth/user", { credentials: "include" });
      return response.json().catch(() => null);
    });
    if (new URL(page.url()).pathname === "/submit" && authState?.isAuthenticated === true) {
      break;
    }
    await page.waitForTimeout(1_000);
  }

  const returnedPath = new URL(page.url()).pathname;
  log(
    "clerk-auth:return-to-deep-page",
    returnedPath === "/submit" && authState?.isAuthenticated === true,
    `path=${returnedPath} authenticated=${authState?.isAuthenticated}`,
  );
  await page.screenshot({ path: `${OUT}/auth-return.png`, fullPage: true });
} catch (error) {
  console.error("AUDIT ERROR:", error);
  log("audit:uncaught", false, error instanceof Error ? error.message : String(error));
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  try {
    if (createdClerkUserId) {
      await clerkApi("DELETE", `/users/${createdClerkUserId}`).catch(() => {});
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