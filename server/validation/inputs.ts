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
