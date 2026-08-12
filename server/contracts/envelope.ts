/**
 * ============================================================================
 * CONTRACTS/ENVELOPE.TS - One safe field-level validation envelope
 * ============================================================================
 *
 * Task #303: ONE canonical shape for reporting request-validation failures,
 * byte-for-byte compatible with the shape clients already understand. The
 * existing validateBody middleware (server/validation/inputs.ts) answers 400
 * with `{ error, message, fieldErrors, errors }`; this module produces the
 * exact same envelope from any zod result so a contract-driven 400 is
 * indistinguishable from the hand-written one. No client change is required.
 *
 * Nothing here throws or sends a response by itself — callers decide what to
 * do with the envelope, keeping every code path explicit and safe.
 * ============================================================================
 */
import type { ZodError, ZodIssue, ZodSafeParseResult } from "zod";

/** The wire shape returned on a 400 validation failure. */
export interface ValidationEnvelope {
  error: "validation_failed";
  message: string;
  /** First message per top-level field (client renders these inline). */
  fieldErrors: Record<string, string>;
  /** Full zod issue list for programmatic consumers. */
  errors: ZodIssue[];
}

/**
 * Collapse a zod issue path into the field key the client keys errors on.
 * Preserves the one special-case the existing validateBody applies
 * (metadata.tags -> "tags") so nothing that currently works changes.
 */
function fieldKeyForIssue(issue: ZodIssue): string {
  let key = String(issue.path[0] ?? "form");
  if (key === "metadata" && issue.path[1] === "tags") key = "tags";
  return key;
}

/**
 * Build the canonical validation envelope from a ZodError.
 * `message` defaults to "Validation failed" to match the existing contract.
 */
export function buildValidationEnvelope(
  error: ZodError,
  message = "Validation failed",
): ValidationEnvelope {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = fieldKeyForIssue(issue);
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return {
    error: "validation_failed",
    message,
    fieldErrors,
    errors: error.issues,
  };
}

/**
 * Additively normalize an already-produced 400 JSON body to the canonical
 * validation envelope shape WITHOUT discarding or overwriting anything the
 * handler set. PURE: returns a new object; input is untouched.
 *
 *  - Non-object bodies (string/array/null) are wrapped as { message, ... }.
 *  - An existing `message` is preserved verbatim.
 *  - `error` defaults to "validation_failed" only if absent.
 *  - `fieldErrors` defaults to {} only if absent.
 *  - `errors` defaults to [] only if absent.
 *  - Every other field the handler set is carried through unchanged.
 */
export function normalizeValidationBody(body: unknown): ValidationEnvelope & Record<string, unknown> {
  const base =
    body !== null && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : { message: typeof body === "string" ? body : "Validation failed" };

  const message = typeof base.message === "string" ? base.message : "Validation failed";
  const error = typeof base.error === "string" ? base.error : "validation_failed";
  const fieldErrors =
    base.fieldErrors && typeof base.fieldErrors === "object" && !Array.isArray(base.fieldErrors)
      ? (base.fieldErrors as Record<string, string>)
      : {};
  const errors = Array.isArray(base.errors) ? (base.errors as ValidationEnvelope["errors"]) : [];

  return { ...base, error, message, fieldErrors, errors } as ValidationEnvelope & Record<string, unknown>;
}

/**
 * Run a zod safeParse result through the envelope builder.
 * Returns `{ ok: true, data }` on success, or `{ ok: false, envelope }` on
 * failure. Callers stay in control of the HTTP response.
 */
export function toEnvelope<Output>(
  result: ZodSafeParseResult<Output>,
  message?: string,
):
  | { ok: true; data: Output }
  | { ok: false; envelope: ValidationEnvelope } {
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, envelope: buildValidationEnvelope(result.error, message) };
}
