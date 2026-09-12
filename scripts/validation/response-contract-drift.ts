#!/usr/bin/env tsx
import "dotenv/config";
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
 *   - GET /api/resources/:id            (first resource from the list)
 *   - GET /api/auth/me                  (audit-key admin; anonymous → 401)
 *   - GET /api/admin/stats              (via X-Admin-Audit-Key header)
 *   - GET /api/journeys                 (anonymous)
 *   - GET /api/config                   (anonymous; contact destinations)
 *   - POST /api/contact                 (default-off → 404 before any work)
 *   - GET /api/admin/contact-submissions (via X-Admin-Audit-Key header)
 *   - GET /api/resources/kinds/counts   (anonymous; unscoped + first category)
 *   - GET /api/resources?kind=tools     (kind filter through ResourcesListResponse)
 *   - GET /api/public/collections/:shareId (a live published collection when
 *     this database has one, else the 404 envelope; the 200 shape is also
 *     pinned by the resource-kinds integration test through the same observer)
 *
 * Harness self-verification: a throwaway probe route deliberately returns a
 * 401 body violating the shared ErrorResponse schema. The run FAILS unless
 * exactly that one probe mismatch is observed — proving the observer is live
 * (a green run can never come from observation being silently disabled).
 */
import express from "express";
import type { AddressInfo } from "node:net";
import { clerkMiddleware } from "@clerk/express";
import { and, isNotNull, isNull } from "drizzle-orm";
import { bookmarkCollections } from "@shared/schema";
import { db } from "../../server/db";
import { registerRoutes } from "../../server/routes";
import { installApiContractRegistration } from "../../server/contracts/install";
import { registerCoreEndpointSchemas } from "../../server/contracts/endpointSchemas";
import { clerkUserContext, hasValidAuditKey } from "../../server/clerkAuth";
import { RecommendationEngine } from "../../server/ai/recommendationEngine";

const PROBE_PATH = "/api/__contract-drift-probe";
const MISMATCH_MARKER = "[contract] response mismatch";

interface CheckResult {
  label: string;
  status: number;
  ok: boolean;
  detail?: string;
}

const RETIRED_LEARNING_PATH_METHOD = "generateLearningPathRecommendations";

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
  app.set("trust proxy", 1);
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

  let server: import("node:http").Server;
  try {
    server = await registerRoutes(app);
  } catch (bootError) {
    console.warn = originalWarn;
    console.error(
      `[drift gate] server failed to start: ${bootError instanceof Error ? bootError.message : String(bootError)}`,
    );
    process.exit(1);
  }

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
  } catch (listenError) {
    console.warn = originalWarn;
    console.error(
      `[drift gate] server failed to bind: ${listenError instanceof Error ? listenError.message : String(listenError)}`,
    );
    process.exit(1);
  }

  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  const auditHeaders = {
    "X-Admin-Audit-Key": adminPassword,
    // Keep this in-process contract probe out of sibling validation gates'
    // shared ai-generation limiter bucket when the completion suite runs in
    // parallel. The production route still executes its real limiter.
    "X-Forwarded-For": `2001:db8::${(process.pid % 65535).toString(16)}`,
  };
  const checks: CheckResult[] = [];
  const retiredLearningPathInvocations: string[] = [];

  // The learning-path branch was removed from RecommendationEngine because
  // these endpoints never returned its result. Keep a runtime tripwire here:
  // if that private method is reintroduced and either route calls it again,
  // the request fails loudly instead of silently adding another AI call.
  const recommendationPrototype = RecommendationEngine.prototype as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >;
  const retiredLearningPathGenerator =
    recommendationPrototype[RETIRED_LEARNING_PATH_METHOD];
  if (typeof retiredLearningPathGenerator === "function") {
    recommendationPrototype[RETIRED_LEARNING_PATH_METHOD] = function () {
      retiredLearningPathInvocations.push(RETIRED_LEARNING_PATH_METHOD);
      throw new Error(
        `${RETIRED_LEARNING_PATH_METHOD} must not be called by recommendation routes`,
      );
    };
  }

  async function check(
    label: string,
    path: string,
    expectStatus: number,
    headers: Record<string, string> = {},
    init: RequestInit = {},
  ): Promise<void> {
    try {
      const res = await fetch(`${base}${path}`, { ...init, headers });
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

  async function checkRecommendationResponse(
    label: string,
    path: string,
    headers: Record<string, string> = {},
    init: RequestInit = {},
  ): Promise<void> {
    try {
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          ...headers,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
      });
      const rawBody = await res.text();
      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        throw new Error(`response was not valid JSON: ${rawBody.slice(0, 160)}`);
      }

      const learningPathFields: string[] = [];
      const visit = (value: unknown, path: string): void => {
        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
          if (key === "learningPaths" || key === "learningPath") {
            learningPathFields.push(`${path}.${key}`);
          }
          visit(child, `${path}.${key}`);
        }
      };
      visit(payload, "$");

      const detail =
        res.status !== 200
          ? `expected 200, got ${res.status}`
          : !Array.isArray(payload)
            ? "expected a recommendation array"
            : learningPathFields.length > 0
              ? `retired learning-path field(s) present: ${learningPathFields.join(", ")}`
              : undefined;

      checks.push({
        label,
        status: res.status,
        ok: detail === undefined,
        detail,
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
  // Resolve a real taxonomy slug first so this checks the named listing
  // response schema against an actual 24-card page rather than a 404.
  try {
    const navRes = await fetch(`${base}/api/awesome-list/nav`);
    const nav = (await navRes.json()) as { categories?: Array<{ slug?: string }> };
    const slug = nav.categories?.[0]?.slug;
    if (!slug) throw new Error("nav response had no category slug");
    await check(
      "GET /api/awesome-list/listing (first category)",
      `/api/awesome-list/listing?level=category&slug=${encodeURIComponent(slug)}&page=1`,
      200,
    );
  } catch (error) {
    checks.push({
      label: "GET /api/awesome-list/listing",
      status: 0,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  await checkRecommendationResponse("GET /api/recommendations", "/api/recommendations");
  await checkRecommendationResponse(
    "POST /api/recommendations (audit-key admin)",
    "/api/recommendations",
    auditHeaders,
    { method: "POST", body: JSON.stringify({}) },
  );
  await check(
    "GET /api/admin/pending-resources (audit-key)",
    "/api/admin/pending-resources",
    200,
    auditHeaders,
  );

  // --- Task #320: four additional endpoints ---

  // GET /api/resources/:id — resolve a real resource ID from the list first
  // so the check exercises the real handler rather than a guaranteed 404.
  let firstResourceId: number | null = null;
  try {
    const listRes = await fetch(`${base}/api/resources`);
    const listBody = (await listRes.json()) as { resources?: { id: number }[] };
    firstResourceId = listBody.resources?.[0]?.id ?? null;
  } catch {
    // leave null; the check below will record a status-mismatch failure
  }
  if (firstResourceId !== null) {
    await check(
      `GET /api/resources/:id (id=${firstResourceId})`,
      `/api/resources/${firstResourceId}`,
      200,
    );
  } else {
    checks.push({
      label: "GET /api/resources/:id",
      status: 0,
      ok: false,
      detail: "could not resolve a resource ID from /api/resources list",
    });
  }

  // GET /api/auth/me — authenticated only; anonymous returns 401 (not in schema)
  await check(
    "GET /api/auth/me (audit-key admin)",
    "/api/auth/me",
    200,
    auditHeaders,
  );

  // GET /api/admin/stats — admin-only
  await check(
    "GET /api/admin/stats (audit-key)",
    "/api/admin/stats",
    200,
    auditHeaders,
  );

  // GET /api/journeys — works for anonymous visitors
  await check("GET /api/journeys (anonymous)", "/api/journeys", 200);

  // --- Default-off contact surface (docs/CONTACT-VARIANTS.md "Backend") ---
  await check("GET /api/config (anonymous)", "/api/config", 200);
  // Disabled deployments answer 404 before validation or the origin check;
  // an enabled shell (CONTACT_ENABLED=true) hits the same-origin guard first.
  const contactDisabled = process.env.CONTACT_ENABLED !== "true";
  await check(
    `POST /api/contact (${contactDisabled ? "default-off" : "enabled, no Origin"})`,
    "/api/contact",
    contactDisabled ? 404 : 403,
    { "Content-Type": "application/json" },
    { method: "POST", body: JSON.stringify({}) },
  );
  await check(
    "GET /api/admin/contact-submissions (audit-key)",
    "/api/admin/contact-submissions?limit=5",
    200,
    auditHeaders,
  );

  // --- Resource kinds (design parity W1) ---
  // Counts are one grouped SQL statement over approved resources; the named
  // ResourceKindCountsResponse schema must match both the unscoped payload and
  // a category-scoped one. The kind filter reuses ResourcesListResponse, whose
  // resource items now REQUIRE kind + resolvedKind.
  await check("GET /api/resources/kinds/counts", "/api/resources/kinds/counts", 200);
  try {
    const navRes = await fetch(`${base}/api/awesome-list/nav`);
    const nav = (await navRes.json()) as { categories?: Array<{ slug?: string }> };
    const slug = nav.categories?.[0]?.slug;
    if (!slug) throw new Error("nav response had no category slug");
    await check(
      "GET /api/resources/kinds/counts (first category)",
      `/api/resources/kinds/counts?category=${encodeURIComponent(slug)}`,
      200,
    );
  } catch (error) {
    checks.push({
      label: "GET /api/resources/kinds/counts (first category)",
      status: 0,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  await check("GET /api/resources?kind=tools", "/api/resources?kind=tools&limit=5", 200);

  // Published bookmark collections are the one public resource surface that
  // does NOT go through the public serializer (a hand-picked projection), so
  // the named PublicCollectionResponse schema requires kind + resolvedKind
  // per item and forbids metadata. This gate never writes to the database, so
  // it exercises a real 200 only when a published collection already exists;
  // otherwise it pins the 404 envelope and says so in the label. The 200
  // shape is additionally proven by tests/integration/api/resource-kinds.test.ts,
  // which publishes a collection and asserts zero observer mismatches.
  try {
    const [live] = await db
      .select({ shareId: bookmarkCollections.shareId })
      .from(bookmarkCollections)
      .where(and(isNotNull(bookmarkCollections.publishedAt), isNull(bookmarkCollections.archivedAt)))
      .limit(1);
    if (live?.shareId) {
      await check(
        "GET /api/public/collections/:shareId (published)",
        `/api/public/collections/${encodeURIComponent(live.shareId)}`,
        200,
      );
    } else {
      await check(
        "GET /api/public/collections/:shareId (no published collection in this database; 404 envelope)",
        "/api/public/collections/contract-drift-gate-unpublished",
        404,
      );
    }
  } catch (error) {
    checks.push({
      label: "GET /api/public/collections/:shareId",
      status: 0,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

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

  if (retiredLearningPathInvocations.length > 0) {
    errors.push(
      `retired learning-path generator invoked ${retiredLearningPathInvocations.length} time(s): ${RETIRED_LEARNING_PATH_METHOD}`,
    );
  }
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
