/**
 * Thin server-side glue for the shared validation primitives (Run21 R4-016/019).
 *
 * - validateBody(schema): Express middleware — parses req.body against a shared
 *   zod schema, replaces req.body with the parsed (trimmed/normalized) data,
 *   or answers 400 with per-field messages in the shape the client already
 *   understands (fieldErrors + errors, matching the submit endpoint contract).
 *
 * - sanitizeUser: field-whitelist serializer for EVERY user-returning endpoint.
 *   The DB row carries the bcrypt hash; no response may ever include it
 *   (R4-019 leaked it from the role-change endpoint). Whitelisting (not
 *   delete/destructure) means new sensitive columns are safe by default.
 */
import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        let key = String(issue.path[0] ?? "form");
        if (key === "metadata" && issue.path[1] === "tags") key = "tags";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return res.status(400).json({
        error: "validation_failed",
        message: "Validation failed",
        fieldErrors,
        errors: result.error.issues,
      });
    }
    req.body = result.data;
    next();
  };
}

/** The only user fields any API response may carry. NEVER password. */
const USER_PUBLIC_FIELDS = [
  "id",
  "email",
  "firstName",
  "lastName",
  "profileImageUrl",
  "role",
  // Run22 BUG-020: pending private deletion-request marker. Only surfaces
  // where user objects already flow (self via /api/auth/user, admins via
  // /api/admin/users) — needed so both sides can see a request is pending.
  "deletionRequestedAt",
  "createdAt",
  "updatedAt",
] as const;

/**
 * NB-008 (run23): PostgreSQL integer columns cap at 2^31−1. All-digit ids
 * beyond that (e.g. 1e20 written out) pass \d+ regexes and parseInt fine,
 * then overflow int4/int8 inside the query → 500. Every numeric id/query
 * param must go through this bound check before touching the DB.
 */
export const PG_INT_MAX = 2147483647;

/**
 * Parse a positive integer within PostgreSQL int4 range.
 * Returns null for anything else: non-numeric, negative, zero, fractional,
 * unsafe-precision, or > PG_INT_MAX values.
 */
export function parseBoundedInt(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < 1 || n > PG_INT_MAX) return null;
  return n;
}

export type SanitizedUser = Record<string, unknown>;

export function sanitizeUser<T extends Record<string, any> | null | undefined>(
  user: T,
): T extends null | undefined ? T : SanitizedUser {
  if (user === null || user === undefined) return user as any;
  const out: Record<string, unknown> = {};
  for (const field of USER_PUBLIC_FIELDS) {
    if (field in user) out[field] = (user as any)[field];
  }
  return out as any;
}
