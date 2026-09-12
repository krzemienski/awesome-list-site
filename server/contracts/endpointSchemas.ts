/**
 * ----------------------------------------------------------------------------
 * CONTRACTS/ENDPOINTSCHEMAS.TS - Per-endpoint structural 200 response schemas
 * ----------------------------------------------------------------------------
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
 * ----------------------------------------------------------------------------
 */
import { z } from "zod";
import { RESOURCE_KIND_VALUES } from "@shared/resourceKinds";
import { setRouteQuerySchema, setRouteResponseSchema } from "./install";

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
 * Resource kind fields (design parity W1). `kind` is the nullable stored
 * column; `resolvedKind` is what the read-time resolver decided
 * (stored → tag/category inference → "other"). Both are REQUIRED on every
 * public resource surface — dropping either is shape drift.
 */
const resourceKindSchema = z.enum(RESOURCE_KIND_VALUES);
const resourceKindFields = {
  kind: resourceKindSchema.nullable(),
  resolvedKind: resourceKindSchema,
} as const;

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
    ...resourceKindFields,
  })
  .passthrough();

// ---------------------------------------------------------------------------
// GET /api/resources/kinds/counts
// ---------------------------------------------------------------------------

/** Full-set counts per resolved kind over approved resources (one SQL statement). */
const resourceKindCountsResponseSchema = z.object({
  tools: z.number().int().nonnegative(),
  libraries: z.number().int().nonnegative(),
  standards: z.number().int().nonnegative(),
  events: z.number().int().nonnegative(),
  protocols: z.number().int().nonnegative(),
  other: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

const resourceKindCountsQuerySchema = z.object({
  /** Optional taxonomy scope: a category slug or exact category name. */
  category: z.string().min(1).max(200).optional(),
});

// ---------------------------------------------------------------------------
// GET /api/public/collections/:shareId
// ---------------------------------------------------------------------------

/**
 * A published bookmark collection. Its resources are a hand-picked projection
 * (CollectionRepository.getPublicCollection), not the serializer output, so
 * the kind fields are asserted here explicitly: dropping either from that
 * projection is shape drift. `metadata` must never appear (the projection
 * selects it only to resolve the kind and drops it again).
 */
const publicCollectionResourceSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    url: z.string(),
    description: z.string(),
    category: z.string(),
    subcategory: z.string().nullable(),
    subSubcategory: z.string().nullable(),
    resourceFormat: z.string(),
    provider: z.string(),
    skillLevel: z.string(),
    ...resourceKindFields,
  })
  .strict();

const publicCollectionResponseSchema = z
  .object({
    shareId: z.string(),
    name: z.string(),
    publishedAt: requiredTimestampNonNull,
    resources: z.array(publicCollectionResourceSchema),
  })
  .strict();

// ---------------------------------------------------------------------------
// PATCH /api/admin/resources/:id/kind + /featured
// ---------------------------------------------------------------------------

/**
 * Admin editing routes answer with the updated raw resource row (the admin
 * surface, not the public serializer — no `resolvedKind`, `searchTsv` may be
 * present). Only the edited columns are asserted structurally.
 */
const adminResourceRowSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    url: z.string(),
    status: z.string(),
    kind: resourceKindSchema.nullable(),
    metadata: z.union([z.record(z.string(), z.unknown()), z.null()]).optional(),
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
  search: z.object({
    mode: z.enum(["fts", "fuzzy"]),
    suggestion: z.string().optional(),
  }).optional(),
});

// ---------------------------------------------------------------------------
// GET + POST /api/recommendations
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
    ...resourceKindFields,
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

const awesomeListListingResponseSchema = z.object({
  level: z.enum(["category", "subcategory", "sub-subcategory"]),
  node: z.object({ name: z.string(), slug: z.string() }),
  page: z.number().int().positive(),
  pageSize: z.literal(24),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  totalAll: z.number().int().nonnegative(),
  generalCount: z.number().int().nonnegative(),
  scopeIntro: z.string(),
  scope: z.object({
    ignoredSubcategory: z.boolean(),
    ignoredSubSubcategory: z.boolean(),
    generalIgnored: z.boolean(),
  }),
  children: z.array(z.object({ name: z.string(), slug: z.string(), count: z.number() }).passthrough()),
  tags: z.array(z.object({ tag: z.string(), count: z.number() })),
  resources: z.array(publicResourceSchema),
}).passthrough();

const awesomeListListingQuerySchema = z.object({
  level: z.enum(["category", "subcategory", "sub-subcategory"]),
  slug: z.string().min(1).max(512),
  page: z.string().regex(/^\d+$/).optional(),
  subcategory: z.string().min(1).max(512).optional(),
  subSubcategory: z.string().min(1).max(512).optional(),
  general: z.literal("1").optional(),
});
// ---------------------------------------------------------------------------
// Contact (docs/CONTACT-VARIANTS.md "Backend"; client type ContactPublicConfig)
// ---------------------------------------------------------------------------

/** A link destination: `href` only when available, a safe reason otherwise. */
const contactDestinationSchema = z.object({
  available: z.boolean(),
  href: z.string().optional(),
  unavailableReason: z.string().optional(),
}).strict();

const contactFormConfigSchema = z.object({
  available: z.boolean(),
  persistence: z.literal("database").optional(),
  unavailableReason: z.string().optional(),
}).strict();

const publicConfigResponseSchema = z.object({
  site: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string(),
    author: z.string(),
  }).passthrough(),
  contact: z.object({
    email: contactDestinationSchema,
    issues: contactDestinationSchema,
    discussions: contactDestinationSchema,
    form: contactFormConfigSchema,
  }).strict(),
}).strict();

const contactSubmissionReceiptSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("received"),
}).strict();

/** Admin inbox row: the persisted columns; never the raw sender IP. */
const contactSubmissionRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  replyTo: z.string(),
  subject: z.string(),
  message: z.string(),
  createdAt: requiredTimestampField,
  ipHash: z.string().length(64).nullable(),
  userId: z.string().nullable(),
}).strict();

const adminContactSubmissionsResponseSchema = z.object({
  submissions: z.array(contactSubmissionRowSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
}).strict();

const adminContactSubmissionsQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});
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
  setRouteResponseSchema("post", "/api/recommendations", {
    name: "AuthenticatedRecommendationsResponse",
    description: "Authenticated array of recommendation items, each wrapping a public resource",
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

  setRouteResponseSchema("get", "/api/awesome-list/listing", {
    name: "AwesomeListListingResponse",
    description: "One deterministic, tree-ordered taxonomy page with metadata for browse controls",
    schema: awesomeListListingResponseSchema,
  });
  setRouteQuerySchema("get", "/api/awesome-list/listing", {
    name: "AwesomeListListingQuery",
    schema: awesomeListListingQuerySchema,
  });

  // --- Contact (default-off) ---

  setRouteResponseSchema("get", "/api/config", {
    name: "PublicConfigResponse",
    description: "Public site metadata plus contact destinations derived only from server config; every destination is unavailable until configured",
    schema: publicConfigResponseSchema,
  });

  setRouteResponseSchema("post", "/api/contact", {
    name: "ContactSubmissionReceipt",
    description: "Receipt for a persisted (or honeypot-discarded) contact submission; never claims email delivery",
    schema: contactSubmissionReceiptSchema,
  });

  setRouteResponseSchema("get", "/api/admin/contact-submissions", {
    name: "AdminContactSubmissionsResponse",
    description: "Newest-first page of the private contact inbox with the real total",
    schema: adminContactSubmissionsResponseSchema,
  });
  setRouteQuerySchema("get", "/api/admin/contact-submissions", {
    name: "AdminContactSubmissionsQuery",
    schema: adminContactSubmissionsQuerySchema,
  });

  // --- Resource kinds (design parity W1) ---

  setRouteResponseSchema("get", "/api/resources/kinds/counts", {
    name: "ResourceKindCountsResponse",
    description:
      "Full-set counts of approved resources per resolved kind (stored kind, else tag/category inference, else other) plus total",
    schema: resourceKindCountsResponseSchema,
  });
  setRouteQuerySchema("get", "/api/resources/kinds/counts", {
    name: "ResourceKindCountsQuery",
    schema: resourceKindCountsQuerySchema,
  });

  setRouteResponseSchema("get", "/api/public/collections/:shareId", {
    name: "PublicCollectionResponse",
    description:
      "A published bookmark collection; each resource is the public projection plus the kind fields (stored kind or null, resolved kind), never metadata",
    schema: publicCollectionResponseSchema,
  });

  setRouteResponseSchema("patch", "/api/admin/resources/:id(\\d+)/kind", {
    name: "AdminResourceKindResponse",
    description: "Updated resource row after the stored kind was set or cleared",
    schema: adminResourceRowSchema,
  });
  setRouteResponseSchema("patch", "/api/admin/resources/:id(\\d+)/featured", {
    name: "AdminResourceFeaturedResponse",
    description: "Updated resource row after metadata.featured was toggled",
    schema: adminResourceRowSchema,
  });
}
