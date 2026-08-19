/**
 * ============================================================================
 * CONTRACTS/ENDPOINTSCHEMAS.TS - Per-endpoint structural 200 response schemas
 * ============================================================================
 *
 * Task #319: adds real, field-level zod schemas for the four high-traffic
 * endpoints so the response-contract observer catches genuine shape drift
 * (renamed fields, missing keys) — not just "is the body JSON-serializable".
 *
 * Task #320: extends coverage to four more client-critical endpoints:
 * GET /api/resources/:id, GET /api/auth/me, GET /api/admin/stats,
 * GET /api/journeys.
 *
 * Call `registerCoreEndpointSchemas()` once, before
 * `installApiContractRegistration` processes any routes (i.e. before
 * `registerRoutes(app)` in the server and before the equivalent setup in
 * any CI validation script).
 *
 * Schemas intentionally use `.passthrough()` on the resource/item objects so
 * columns added in the future don't immediately trigger false mismatches.
 * The required top-level keys ARE structurally enforced — missing or
 * renamed keys WILL fire a "[contract] response mismatch" warning.
 * ============================================================================
 */
import { z } from "zod";
import { setRouteResponseSchema } from "./install";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/**
 * A "pre-serialization" timestamp: the server passes a Date object (or null/
 * undefined) to res.json() and Express serializes it to an ISO string.  The
 * schema sees the pre-serialization value, so we accept both shapes to avoid
 * false positives when the column is fetched as a Date from Drizzle/pg.
 *
 * `timestampField`         — nullable+optional; use for fields that may be
 *                            absent from the payload (e.g. internal-only cols
 *                            that passthrough surfaces on some rows).
 * `requiredTimestampField` — present-but-nullable; dropping the key from the
 *                            response will fail the contract check.
 * `requiredTimestampNonNull` — always present AND non-null (e.g. createdAt).
 */
const timestampField = z.union([z.date(), z.string(), z.null(), z.undefined()]);
const requiredTimestampField = z.union([z.date(), z.string(), z.null()]);
const requiredTimestampNonNull = z.union([z.date(), z.string()]);

/**
 * A public resource row after `stripInternalResourceFields`. We only assert
 * the stable, client-critical keys; extra columns are allowed via passthrough.
 */
const publicResourceSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    url: z.string(),
    status: z.string(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// GET /api/auth/user
// ---------------------------------------------------------------------------

const clientUserSchema = z
  .object({
    // `id` is the DB primary key — numeric for regular users but a UUID string
    // for the seeded audit-key admin row (the `users.id` column is actually a
    // UUID in the schema; regular rows may arrive as either type depending on
    // driver coercion, so accept both).
    id: z.union([z.string(), z.number()]),
    email: z.string().nullable().optional(),
    name: z.string(),
    // `avatar` maps to `profileImageUrl` which can be null/undefined in the DB
    avatar: z.string().nullable().optional(),
    role: z.string(),
    createdAt: timestampField,
    deletionRequestedAt: timestampField,
  })
  .passthrough();

const authUserResponseSchema = z.object({
  isAuthenticated: z.boolean(),
  user: z.union([clientUserSchema, z.null()]),
});

// ---------------------------------------------------------------------------
// GET /api/resources
// ---------------------------------------------------------------------------

const resourcesListResponseSchema = z.object({
  resources: z.array(publicResourceSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  // nextOffset / nextCursor can be a number or null
  nextOffset: z.union([z.number(), z.null()]),
  nextCursor: z.union([z.number(), z.null()]),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
});

// ---------------------------------------------------------------------------
// GET /api/recommendations
// ---------------------------------------------------------------------------

/**
 * Each recommendation item wraps a public resource in a `resource` field.
 * We assert `resource` is present and structurally valid; all other fields
 * on the item (score, reason, etc.) are allowed via passthrough.
 */
const recommendationItemSchema = z
  .object({
    resource: publicResourceSchema,
  })
  .passthrough();

const recommendationsResponseSchema = z.array(recommendationItemSchema);

// ---------------------------------------------------------------------------
// GET /api/admin/pending-resources
// ---------------------------------------------------------------------------

/**
 * Admin pending queue: an object with `resources` array and a `total` count.
 * Individual resource rows include internal fields (submittedByEmail etc.)
 * that are stripped on the public surface but kept here for the admin UI.
 */
const adminPendingResourceSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    url: z.string(),
    status: z.string(),
  })
  .passthrough();

const adminPendingResourcesResponseSchema = z.object({
  resources: z.array(adminPendingResourceSchema),
  total: z.number(),
});

// ---------------------------------------------------------------------------
// GET /api/resources/:id
// ---------------------------------------------------------------------------

/**
 * Single public resource after `toPublicResource` / `stripInternalResourceFields`.
 * We assert the stable client-critical keys; all other columns pass through.
 */
const singleResourceResponseSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    url: z.string(),
    status: z.string(),
    category: z.string().nullable().optional(),
    subcategory: z.string().nullable().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// GET /api/auth/me  (deprecated alias of /api/auth/user — authenticated only)
// ---------------------------------------------------------------------------

/**
 * /api/auth/me returns the user object directly (no isAuthenticated wrapper)
 * for authenticated requests, and 401 for anonymous visitors.  The contract
 * gate exercises it with an audit-key so only the 200 success shape matters
 * here.
 */
const authMeResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    email: z.string().nullable().optional(),
    name: z.string(),
    avatar: z.string().nullable().optional(),
    role: z.string(),
    // Required fields — dropping either key must fail the contract check.
    createdAt: requiredTimestampNonNull,
    deletionRequestedAt: requiredTimestampField,
  })
  .passthrough();

// ---------------------------------------------------------------------------
// GET /api/admin/stats
// ---------------------------------------------------------------------------

/**
 * Admin dashboard statistics.  All counts are numbers; extra future fields
 * pass through.
 */
const adminStatsResponseSchema = z
  .object({
    users: z.number(),
    resources: z.number(),
    journeys: z.number(),
    pendingApprovals: z.number(),
    pendingEdits: z.number(),
    totalPublic: z.number(),
    totalPending: z.number(),
    totalRejected: z.number(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// GET /api/journeys
// ---------------------------------------------------------------------------

/**
 * Each journey item spreads the raw DB row and appends stepCount,
 * completedStepCount, isEnrolled, and nextStepNumber (Task #330: the first
 * incomplete logical step the listing CTA deep-links to; null when the
 * journey is fully complete or has no steps).  We assert those derived
 * fields plus the core identity fields; everything else passes through.
 */
const journeyItemSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    status: z.string(),
    stepCount: z.number(),
    completedStepCount: z.number(),
    isEnrolled: z.boolean(),
    nextStepNumber: z.number().nullable(),
  })
  .passthrough();

const journeysListResponseSchema = z.array(journeyItemSchema);

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register structural 200 schemas for all key endpoints. Must be called
 * before `installApiContractRegistration` so that when the auto-installer
 * calls `inferredResponsesFor` for each route it picks up the override
 * instead of the generic `JsonResponse` (JSON-serializable-only) schema.
 *
 * Idempotent: calling it multiple times in the same process is safe (the
 * override map is simply overwritten with the same values).
 */
export function registerCoreEndpointSchemas(): void {
  // --- Task #319 endpoints ---

  setRouteResponseSchema("get", "/api/auth/user", {
    name: "AuthUserResponse",
    description: "Canonical identity response: always 200 with user=null for anonymous visitors",
    schema: authUserResponseSchema,
  });

  setRouteResponseSchema("get", "/api/resources", {
    name: "ResourcesListResponse",
    description: "Paginated list of approved public resources with pagination metadata",
    schema: resourcesListResponseSchema,
  });

  setRouteResponseSchema("get", "/api/recommendations", {
    name: "RecommendationsResponse",
    description: "Array of recommendation items, each wrapping a public resource",
    schema: recommendationsResponseSchema,
  });

  setRouteResponseSchema("get", "/api/admin/pending-resources", {
    name: "AdminPendingResourcesResponse",
    description: "Pending-approval resource queue for admin review",
    schema: adminPendingResourcesResponseSchema,
  });

  // --- Task #320 endpoints ---

  setRouteResponseSchema("get", "/api/resources/:id(\\d+)", {
    name: "SingleResourceResponse",
    description: "Single public resource by ID after field stripping",
    schema: singleResourceResponseSchema,
  });

  setRouteResponseSchema("get", "/api/auth/me", {
    name: "AuthMeResponse",
    description: "Deprecated /me alias: returns the authenticated user object directly",
    schema: authMeResponseSchema,
  });

  setRouteResponseSchema("get", "/api/admin/stats", {
    name: "AdminStatsResponse",
    description: "Admin dashboard aggregate counts",
    schema: adminStatsResponseSchema,
  });

  setRouteResponseSchema("get", "/api/journeys", {
    name: "JourneysListResponse",
    description: "Full journey list with per-journey step and enrolment counts",
    schema: journeysListResponseSchema,
  });
}
