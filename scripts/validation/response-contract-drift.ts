#!/usr/bin/env tsx
/**
 * Response-contract drift gate (sibling of openapi-drift).
 *
 * openapi-drift proves route/contract/OpenAPI COVERAGE; it never checks that
 * the named response schemas actually match real payloads. That gap let the
 * runtime observer spam "[contract] response mismatch" for months (z.json()
 * rejecting Date objects that res.json serializes fine) without any check
 * going red.
 *
 * This gate boots the real Express app in-process (same registerRoutes +
 * Clerk/audit-key middleware order as server/index.ts), exercises the key
 * endpoints, and FAILS if any "[contract] response mismatch" line is emitted:
 *
 *   - GET /api/auth/user                (anonymous AND audit-key admin)
 *   - GET /api/resources
 *   - GET /api/recommendations
 *   - GET /api/admin/pending-resources  (via X-Admin-Audit-Key header)
 *
 * Harness self-verification: a throwaway probe route deliberately returns a
 * 401 body violating the shared ErrorResponse schema. The run FAILS unless
 * exactly that one probe mismatch is observed — proving the observer is live
 * (a green run can never come from observation being silently disabled).
 */
import express from "express";
import type { AddressInfo } from "node:net";
import { clerkMiddleware } from "@clerk/express";
import { registerRoutes } from "../../server/routes";
import { installApiContractRegistration } from "../../server/contracts/install";
import { registerCoreEndpointSchemas } from "../../server/contracts/endpointSchemas";
import { clerkUserContext, hasValidAuditKey } from "../../server/clerkAuth";

const PROBE_PATH = "/api/__contract-drift-probe";
const MISMATCH_MARKER = "[contract] response mismatch";

interface CheckResult {
  label: string;
  status: number;
  ok: boolean;
  detail?: string;
}

function fail(messages: string[]): never {
  console.error("Response-contract drift detected:");
  for (const message of messages) console.error(`  - ${message}`);
  process.exit(1);
}

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    fail([
      "ADMIN_PASSWORD is unset or shorter than 8 chars — the audit-key admin checks cannot run (the server ignores short keys, fail-closed).",
    ]);
  }

  // Capture every observer report. The default reporter goes through
  // console.warn, so intercepting it sees exactly what a dev-server log would.
  const mismatches: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const line = args
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
      .join(" ");
    if (line.includes(MISMATCH_MARKER)) mismatches.push(line);
    originalWarn.apply(console, args as []);
  };

  // Mirror the server/index.ts middleware order for /api requests:
  // body parsing → Clerk verification (skipped for valid audit keys) →
  // clerkUserContext (resolves req.dbUser, incl. the audit-key admin row).
  const app = express();
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false, limit: "256kb" }));
  const clerkSession = clerkMiddleware(() => ({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }));
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) return next();
    if (hasValidAuditKey(req)) return next();
    return clerkSession(req, res, next);
  });
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) return next();
    return clerkUserContext(req, res, next);
  });

  // Observer-liveness probe. Install the contract patch first (idempotent —
  // registerRoutes' own install call becomes a no-op) so the probe flows
  // through the same patched app.get, and register it BEFORE registerRoutes
  // so the /api 404 backstop can't shadow it. The 401 body deliberately lacks
  // the required { message } field, so exactly one mismatch MUST be reported.
  //
  // Register per-endpoint structural schemas BEFORE installApiContractRegistration
  // so that inferredResponsesFor picks up the overrides when each route is
  // first declared. If called after the first registration it has no effect on
  // already-declared routes (getOrRegister is idempotent).
  registerCoreEndpointSchemas();
  installApiContractRegistration(app);
  app.get(PROBE_PATH, (_req, res) => {
    res.status(401).json({ probe: true });
  });

  const server = await registerRoutes(app);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  const auditHeaders = { "X-Admin-Audit-Key": adminPassword };
  const checks: CheckResult[] = [];

  async function check(
    label: string,
    path: string,
    expectStatus: number,
    headers: Record<string, string> = {},
  ): Promise<void> {
    try {
      const res = await fetch(`${base}${path}`, { headers });
      // Drain the body so res.json (and the observer) fully complete.
      await res.text();
      checks.push({
        label,
        status: res.status,
        ok: res.status === expectStatus,
        detail:
          res.status === expectStatus
            ? undefined
            : `expected ${expectStatus}, got ${res.status}`,
      });
    } catch (error) {
      checks.push({
        label,
        status: 0,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await check("GET /api/auth/user (anonymous)", "/api/auth/user", 200);
  await check(
    "GET /api/auth/user (audit-key admin)",
    "/api/auth/user",
    200,
    auditHeaders,
  );
  await check("GET /api/resources", "/api/resources", 200);
  await check("GET /api/recommendations", "/api/recommendations", 200);
  await check(
    "GET /api/admin/pending-resources (audit-key)",
    "/api/admin/pending-resources",
    200,
    auditHeaders,
  );
  await check(`GET ${PROBE_PATH} (observer liveness)`, PROBE_PATH, 401);

  // Give any post-response observer logging a beat to flush.
  await new Promise((resolve) => setTimeout(resolve, 250));
  console.warn = originalWarn;
  await new Promise<void>((resolve) => server.close(() => resolve()));

  const errors: string[] = [];

  for (const c of checks) {
    if (!c.ok) errors.push(`${c.label}: ${c.detail}`);
  }

  const probeMismatches = mismatches.filter((line) =>
    line.includes(PROBE_PATH),
  );
  const realMismatches = mismatches.filter(
    (line) => !line.includes(PROBE_PATH),
  );

  if (probeMismatches.length !== 1) {
    errors.push(
      `observer liveness FAILED: expected exactly 1 probe mismatch for ${PROBE_PATH}, saw ${probeMismatches.length} — response observation is not active, so a green run would be meaningless`,
    );
  }
  if (realMismatches.length > 0) {
    errors.push(
      `${realMismatches.length} "${MISMATCH_MARKER}" line(s) on real endpoints — a named response schema no longer matches the real payload:`,
    );
    for (const line of realMismatches) errors.push(`    ${line}`);
  }

  if (errors.length) fail(errors);

  for (const c of checks) console.log(`  ok  ${c.label} -> ${c.status}`);
  console.log(
    `Response-contract drift PASS: ${checks.length} endpoint checks, 0 real mismatches, observer liveness verified`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
