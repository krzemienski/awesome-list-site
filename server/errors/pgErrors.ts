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
