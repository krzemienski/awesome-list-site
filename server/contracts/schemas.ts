/**
 * ============================================================================
 * CONTRACTS/SCHEMAS.TS - Reusable zod v4 primitives for API contracts
 * ============================================================================
 *
 * Task #303: shared, drift-proof primitives that every API contract composes.
 * These deliberately mirror the semantics already enforced by the hand-written
 * guards in shared/validation.ts and server/validation/inputs.ts (bounded
 * positive PostgreSQL ids, pagination, URLs, common primitive input) so that
 * declaring a contract can NEVER be looser than the existing runtime checks.
 *
 * All schemas are zod v4. They are pure data — mounting them (via the
 * observer middleware in ./middleware.ts) is opt-in and never changes an
 * existing handler's behavior on its own.
 * ============================================================================
 */
import { z } from "zod";
import {
  MAX_URL_LENGTH,
  HTTPS_URL_RE,
  WEB_URL_RE,
  isPlausiblePublicUrl,
  urlHasUserinfo,
  urlHasPortZero,
  URL_HOSTNAME_MESSAGE,
  PG_INT4_MAX,
} from "../../shared/validation";

/** PostgreSQL int4 ceiling — every id / pagination param must fit (re-exported). */
export { PG_INT4_MAX } from "../../shared/validation";

// ---------------------------------------------------------------------------
// Bounded positive PostgreSQL ids
// ---------------------------------------------------------------------------

/**
 * A bounded positive PostgreSQL int4 id as a NUMBER (for request bodies /
 * already-numeric JSON). Rejects zero, negatives, fractions, NaN, and anything
 * above int4 max — the exact bound parseBoundedInt / parseIntInRange enforce.
 */
export const pgIdSchema = z
  .number()
  .int("must be an integer")
  .min(1, "must be a positive id")
  .max(PG_INT4_MAX, "id is out of range");

/**
 * A bounded positive PostgreSQL int4 id supplied as a STRING (path/query
 * params, which are always strings on the wire). Accepts only all-digit
 * strings, coerces to a number, and applies the same int4 bound. The parsed
 * OUTPUT is a number, matching how handlers consume `req.params.id`.
 */
export const pgIdParamSchema = z
  .string()
  .regex(/^\d+$/, "must be a positive integer id")
  .transform((s) => Number(s))
  .refine(
    (n) => Number.isSafeInteger(n) && n >= 1 && n <= PG_INT4_MAX,
    "id is out of range",
  );

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * A 1-based page number from a query string. Optional; when omitted the OUTPUT
 * is the numeric default (1). Bounded to int4 so a giant `?page=1e30` never
 * reaches an OFFSET calculation. Output is always a NUMBER.
 */
export const pageQuerySchema = z
  .string()
  .regex(/^\d+$/, "page must be a positive integer")
  .optional()
  .transform((s) => (s === undefined ? DEFAULT_PAGE : Number(s)))
  .refine((n) => Number.isSafeInteger(n) && n >= 1 && n <= PG_INT4_MAX, "page is out of range");

/**
 * Items-per-page from a query string. Optional; defaults to the numeric 20,
 * capped at 100. The cap matches the documented `limit` bound in
 * server/openapi.ts. Output is always a NUMBER.
 */
export const limitQuerySchema = z
  .string()
  .regex(/^\d+$/, "limit must be a positive integer")
  .optional()
  .transform((s) => (s === undefined ? DEFAULT_PAGE_SIZE : Number(s)))
  .refine((n) => Number.isSafeInteger(n) && n >= 1 && n <= MAX_PAGE_SIZE, `limit must be 1-${MAX_PAGE_SIZE}`);

/**
 * Convenience pagination query object. Handlers that already parse `page` /
 * `limit` by hand keep working; contracts describe the same shape.
 */
export const paginationQuerySchema = z.object({
  page: pageQuerySchema,
  limit: limitQuerySchema,
});

// ---------------------------------------------------------------------------
// URLs — reuse shared/validation semantics exactly
// ---------------------------------------------------------------------------

/** Strict https-only URL (submit + admin create), mirroring httpsUrlSchema. */
export const httpsUrlContractSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
  .refine((v) => !/[\u0000-\u001F\u007F]/.test(v), "URL must not contain control characters")
  .refine((v) => !v.includes("\\"), "URL must not contain backslashes")
  .refine((v) => HTTPS_URL_RE.test(v), "Must be a valid HTTPS URL")
  .refine(isPlausiblePublicUrl, URL_HOSTNAME_MESSAGE)
  .refine((v) => !urlHasUserinfo(v), "URL must not contain embedded credentials")
  .refine((v) => !urlHasPortZero(v), "URL must not use port 0");

/** http:// or https:// web URL (edit paths), mirroring webUrlSchema (no transform). */
export const webUrlContractSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
  .refine((v) => !/[\u0000-\u001F\u007F]/.test(v), "URL must not contain control characters")
  .refine((v) => !v.includes("\\"), "URL must not contain backslashes")
  .refine((v) => WEB_URL_RE.test(v), "URL must start with http:// or https://")
  .refine(isPlausiblePublicUrl, URL_HOSTNAME_MESSAGE)
  .refine((v) => !urlHasUserinfo(v), "URL must not contain embedded credentials")
  .refine((v) => !urlHasPortZero(v), "URL must not use port 0");

// ---------------------------------------------------------------------------
// Common primitive input
// ---------------------------------------------------------------------------

/** Non-empty, trimmed, bounded free-text search term. */
export const searchQuerySchema = z
  .string()
  .trim()
  .min(1, "search must not be empty")
  .max(200, "search is too long")
  .optional();

/** A single lowercase-and-hyphen slug (mirrors SLUG_RE in shared/validation). */
export const slugParamSchema = z
  .string()
  .min(1, "slug is required")
  .max(100, "slug is too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid slug");

/** A trimmed, bounded, non-empty single-line string. */
export const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, "must not be empty")
  .max(1000, "is too long");

/** A UUID v4-ish identifier (users, api keys, etc). */
export const uuidSchema = z.string().uuid("must be a valid UUID");

/** A boolean supplied as a query string ("true"/"false"/"1"/"0"). */
export const booleanQuerySchema = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1")
  .optional();
