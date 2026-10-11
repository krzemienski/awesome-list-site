/**
 * PostgreSQL error classification shared by route handlers.
 *
 * A write that references a row which does not exist (a missing resource,
 * journey, ...) fails with a foreign-key violation. That is a client error
 * (the target is not found), not a server fault, so handlers map it to 404
 * instead of the generic 500.
 */
function pgCode(error: unknown): string | undefined {
  const e = error as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.code ?? e?.cause?.code;
  return typeof code === "string" ? code : undefined;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return pgCode(error) === "23503";
}

/**
 * A unique-constraint violation (23505), optionally narrowed to constraints
 * whose name contains `constraintIncludes`. Drizzle wraps the PostgreSQL
 * error in `cause` (sometimes more than once), so the whole chain is walked.
 *
 * Two admins acting at once can race a write into an existing unique value.
 * That is a conflict the admin can resolve (reload, pick another value), not
 * a server fault, so handlers map it to 409 with an actionable message — a
 * 500 body is replaced with a bare "Internal Server Error" on the wire.
 */
export function isUniqueViolation(error: unknown, constraintIncludes?: string): boolean {
  let current = error as { code?: unknown; constraint?: unknown; cause?: unknown } | null | undefined;
  for (let depth = 0; current && depth < 8; depth++) {
    if (current.code === "23505") {
      if (!constraintIncludes) return true;
      const constraint = typeof current.constraint === "string" ? current.constraint : "";
      // An unnamed violation is still a uniqueness conflict on this write.
      return constraint === "" || constraint.includes(constraintIncludes);
    }
    current = current.cause as typeof current;
  }
  return false;
}
