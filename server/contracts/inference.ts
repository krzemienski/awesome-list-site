/**
 * ============================================================================
 * CONTRACTS/INFERENCE.TS - Pure inference helpers for auto-registration
 * ============================================================================
 *
 * Task #303 integration: pure, side-effect-free helpers that turn a concrete
 * Express route (method + path + middleware chain) into a stable contract
 * declaration. Everything here is deterministic and unit-testable in
 * isolation — no Express, no zod parsing, no I/O.
 *
 * Design constraints that keep auto-registration NON-BREAKING:
 *  - Param and query validators are VALIDATE-ONLY (no transforms). Handlers
 *    keep receiving the raw string values they always got (e.g. they still
 *    call parseBoundedInt(req.params.id) themselves). We only REJECT malformed
 *    input before the handler; we never rewrite req.
 *  - The body validator preserves values exactly; it only rejects structurally
 *    abusive payloads (control chars, excessive depth/breadth/size).
 * ============================================================================
 */
import { z } from "zod";
import type { ZodTypeAny } from "zod";
import { PG_INT4_MAX } from "../../shared/validation";

// ---------------------------------------------------------------------------
// Path parsing / normalization (handles Express regex params like :id(\d+))
// ---------------------------------------------------------------------------

export interface ParsedParam {
  /** Bare parameter name (e.g. "id" from ":id(\\d+)"). */
  name: string;
  /** Inline regex constraint if present (e.g. "\\d+" from ":id(\\d+)"). */
  pattern?: string;
  /** True when the param is optional (":id?"). */
  optional: boolean;
}

/**
 * Extract every param from an Express path, including regex-constrained forms
 * like `:id(\d+)`, optional `:slug?`, and repeated `:parts*`/`:p+` modifiers.
 * The returned pattern strips only the surrounding parens.
 */
export function parsePathParams(path: string): ParsedParam[] {
  const params: ParsedParam[] = [];
  // :name  optionally followed by (regex) and/or a ? + * modifier.
  const re = /:([A-Za-z0-9_]+)(\(((?:\\.|[^\\()])*)\))?([?+*])?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    params.push({
      name: m[1],
      pattern: m[3] ? m[3] : undefined,
      optional: m[4] === "?" || m[4] === "*",
    });
  }
  return params;
}

/**
 * Normalize an Express path to a clean OpenAPI path: strip inline regex
 * constraints and modifiers, convert `:name` to `{name}`, collapse duplicate
 * slashes, and drop any trailing slash (except root). Idempotent.
 *
 *   "/api/x/:id(\\d+)"  -> "/api/x/{id}"
 *   "/api/x/:slug?"     -> "/api/x/{slug}"
 */
export function toOpenApiPath(path: string): string {
  let p = path.replace(
    /:([A-Za-z0-9_]+)(\((?:\\.|[^\\()])*\))?[?+*]?/g,
    (_full, name: string) => `{${name}}`,
  );
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

/**
 * Canonicalize an Express path for drift/dedup comparison: same as
 * toOpenApiPath but every param collapses to `{param}` so `:id` and
 * `:resourceId` compare structurally.
 */
export function canonicalizePath(path: string): string {
  const withoutRegex = path.replace(
    /:([A-Za-z0-9_]+)(\((?:\\.|[^\\()])*\))?[?+*]?/g,
    "{param}",
  );
  let p = withoutRegex.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

// ---------------------------------------------------------------------------
// Naming: derive a stable, human-readable contract name from method + path
// ---------------------------------------------------------------------------

/**
 * Build a stable contract name like "get:/api/public/resources/{id}".
 * Deterministic across runs so drift and dedup are reliable.
 */
export function deriveContractName(method: string, path: string): string {
  return `${method.toLowerCase()}:${toOpenApiPath(path)}`;
}

// ---------------------------------------------------------------------------
// Metadata inference from path + middleware names
// ---------------------------------------------------------------------------

/** True when a path segment / param name denotes a numeric database id. */
export function isIdParamName(name: string): boolean {
  // shareId is an opaque public token, not a PostgreSQL integer id.
  if (name === "shareId") return false;
  return name === "id" || /Id$/.test(name) || /_id$/.test(name);
}

/** Infer a coarse domain grouping from the API path. */
export function inferDomain(path: string): string | undefined {
  const clean = toOpenApiPath(path);
  const segments = clean.split("/").filter(Boolean);
  // segments[0] === "api"
  if (segments[0] !== "api") return segments[0];
  const rest = segments.slice(1).filter((s) => !s.startsWith("{"));
  return rest[0];
}

const AUTH_MW_RE =
  /(isauthenticated|requireauth|ensureauth|authenticated|authguard|requireapikey)/i;
const ADMIN_MW_RE = /(isadmin|requireadmin|adminonly|ensureadmin)/i;
const RATELIMIT_MW_RE = /(limiter|ratelimit|throttle|backstop|burst)/i;

/**
 * Infer auth / admin / rate-limit metadata from the NAMES of the middleware in
 * the chain. Middleware supplied anonymously (name === "") is ignored for
 * classification but still recorded in `middleware`.
 */
export function inferMetaFromMiddleware(
  path: string,
  middlewareNames: string[],
): {
  domain?: string;
  requiresAuth: boolean;
  requiresAdmin: boolean;
  rateLimiters: string[];
  middleware: string[];
} {
  const names = middlewareNames.filter(Boolean);
  const requiresAuth = names.some((n) => AUTH_MW_RE.test(n));
  const requiresAdmin = names.some((n) => ADMIN_MW_RE.test(n));
  const rateLimiters = names.filter((n) => RATELIMIT_MW_RE.test(n));
  return {
    domain: inferDomain(path),
    requiresAuth: requiresAuth || requiresAdmin,
    requiresAdmin,
    rateLimiters,
    middleware: middlewareNames,
  };
}

// ---------------------------------------------------------------------------
// Param schema inference (VALIDATE-ONLY: never transforms req.params values)
// ---------------------------------------------------------------------------

/** Max length for a non-id path/query segment before we consider it abusive. */
export const MAX_PARAM_LENGTH = 512;

/** Bounded positive int4 id, validated AS A STRING (no transform to number). */
export const boundedIntStringSchema = z
  .string()
  .regex(/^\d+$/, "must be a positive integer id")
  .refine((s) => {
    const n = Number(s);
    return Number.isSafeInteger(n) && n >= 1 && n <= PG_INT4_MAX;
  }, "id is out of range");

/** A bounded, control-char-free, non-empty string param (validate-only). */
export const boundedSafeStringSchema = z
  .string()
  .min(1, "must not be empty")
  .max(MAX_PARAM_LENGTH, `must be at most ${MAX_PARAM_LENGTH} characters`)
  .refine((s) => !/[\u0000-\u001F\u007F]/.test(s), "must not contain control characters");

/**
 * Build the params object schema for a path. Numeric *id/*Id params get
 * bounded positive int4 string validation; every other param gets bounded
 * safe-string validation. Optional params are marked `.optional()`.
 *
 * When a param carries an inline regex constraint (`:id(\d+)`) we apply the id
 * validator for the common digit patterns and otherwise fall back to a plain
 * regex check layered on the safe-string base.
 */
export function inferParamsSchema(
  path: string,
  method?: string,
): ZodTypeAny | undefined {
  const params = parsePathParams(path);
  if (params.length === 0) return undefined;

  const shape: Record<string, ZodTypeAny> = {};
  for (const p of params) {
    let schema: ZodTypeAny;
    const digitPattern = p.pattern && /^\\d\+?$|^\[0-9\]\+?$/.test(p.pattern);
    if (
      method?.toLowerCase() === "post" &&
      path === "/api/bookmarks/:resourceId" &&
      p.name === "resourceId"
    ) {
      // This legacy route intentionally delegates the reserved literal to the
      // later /api/bookmarks/bulk route via next("route").
      schema = z.union([boundedIntStringSchema, z.literal("bulk")]);
    } else if (isIdParamName(p.name) || digitPattern) {
      schema = boundedIntStringSchema;
    } else if (p.pattern) {
      // Honor an explicit inline regex, layered on the safe-string base.
      let inline: RegExp | null = null;
      try {
        inline = new RegExp(`^(?:${p.pattern})$`);
      } catch {
        inline = null;
      }
      schema = inline
        ? boundedSafeStringSchema.refine((s) => inline!.test(s), "does not match the required format")
        : boundedSafeStringSchema;
    } else {
      schema = boundedSafeStringSchema;
    }
    shape[p.name] = p.optional ? schema.optional() : schema;
  }
  // passthrough: Express may expose extra params (e.g. from parent routers);
  // never reject a request just because an unexpected param key appears.
  return z.object(shape).passthrough();
}

// ---------------------------------------------------------------------------
// Generic query schema (VALIDATE-ONLY, no transforms)
// ---------------------------------------------------------------------------

/** Query keys that must be bounded integers when present. */
export const PAGINATION_INT_KEYS = ["page", "limit", "offset"] as const;

/** Bounded non-negative int4 as a STRING (no transform). */
const boundedNonNegIntString = z
  .string()
  .regex(/^\d+$/, "must be a non-negative integer")
  .refine((s) => {
    const n = Number(s);
    return Number.isSafeInteger(n) && n >= 0 && n <= PG_INT4_MAX;
  }, "is out of range");

/** A page/limit is one-based; zero is never a valid value. */
const boundedPositiveIntString = z
  .string()
  .regex(/^\d+$/, "must be a positive integer")
  .refine((s) => {
    const n = Number(s);
    return Number.isSafeInteger(n) && n >= 1 && n <= PG_INT4_MAX;
  }, "is out of range");

/** A bounded opaque cursor string. */
const boundedCursorString = z
  .string()
  .min(1, "cursor must not be empty")
  .max(MAX_PARAM_LENGTH, `cursor must be at most ${MAX_PARAM_LENGTH} characters`)
  .refine((s) => !/[\u0000-\u001F\u007F]/.test(s), "cursor must not contain control characters");

/**
 * A single query value may be a string OR an array of strings (Express parses
 * repeated keys, e.g. ?tag=a&tag=b, into arrays). Each element must be a
 * bounded, control-char-free string.
 */
const genericQueryValue = z.union([
  boundedSafeStringSchema,
  z.string().max(0), // allow empty-string values (?q=)
  z.array(
    z
      .string()
      .max(MAX_PARAM_LENGTH, `must be at most ${MAX_PARAM_LENGTH} characters`)
      .refine((s) => !/[\u0000-\u001F\u007F]/.test(s), "must not contain control characters"),
  ),
]);

/**
 * Generic query schema: pagination keys (page/limit/offset/cursor) are
 * validated with their bounded rules; every OTHER key is allowed but bounded.
 * Nothing is transformed — the handler still reads the original string values.
 */
export function buildGenericQuerySchema(): ZodTypeAny {
  return z
    .object({
      page: boundedPositiveIntString.optional(),
      limit: boundedPositiveIntString.optional(),
      offset: boundedNonNegIntString.optional(),
      afterSeq: boundedNonNegIntString.optional(),
      jobId: boundedPositiveIntString.optional(),
      resourceId: boundedPositiveIntString.optional(),
      categoryId: boundedPositiveIntString.optional(),
      subcategoryId: boundedPositiveIntString.optional(),
      per_page: boundedPositiveIntString
        .refine((s) => Number(s) <= 100, "must be between 1 and 100")
        .optional(),
      cursor: boundedCursorString.optional(),
    })
    .catchall(genericQueryValue);
}

/** Shared instance (query schemas are stateless). */
export const genericQuerySchema = buildGenericQuerySchema();
