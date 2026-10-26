/**
 * PostgreSQL error classification shared by route handlers.
 *
 * A write that references a row which does not exist (a missing resource,
 * journey, ...) fails with a foreign-key violation. That is a client error
 * (the target is not found), not a server fault, so handlers map it to 404
 * instead of the generic 500.
 */

/** The fields node-postgres sets on an error the server reported. */
interface PgDatabaseError {
  code: string;
  severity: string;
  message: string;
  table?: string;
  constraint?: string;
  column?: string;
  detail?: string;
}

const MAX_CAUSE_DEPTH = 8;

/** `error` and its `cause`s, outermost first. Drizzle wraps more than once. */
function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  for (let current = error; current != null && chain.length < MAX_CAUSE_DEPTH;
    current = (current as { cause?: unknown }).cause) {
    chain.push(current);
  }
  return chain;
}

// Node errnos (EPIPE, ECONNRESET) also carry a 5-character `code`; only an
// error the server reported has `severity`.
function isPgDatabaseError(value: unknown): value is PgDatabaseError {
  const e = value as { code?: unknown; severity?: unknown } | null;
  return typeof e?.severity === "string" && typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code);
}

function findPgError(error: unknown): PgDatabaseError | undefined {
  return causeChain(error).find(isPgDatabaseError);
}

export function isForeignKeyViolation(error: unknown): boolean {
  return findPgError(error)?.code === "23503";
}

/**
 * One line naming the failure behind `error`, safe for logs and sync
 * history. A PostgreSQL error gives its SQLSTATE, table and constraint or
 * column, and message. Anything else (a connection timeout, ECONNRESET)
 * gives the innermost cause's code and message. Drizzle's own message is
 * the SQL text plus every bound parameter, so it is never returned.
 */
export function describeDbError(error: unknown): string {
  const pg = findPgError(error);
  if (pg) {
    const target = [pg.table, pg.constraint ?? pg.column].filter(Boolean).join(".");
    // "Key (url)=(...)" names the conflicting value. Other details, such as
    // "Failing row contains (...)" on 23502/23514, list every column.
    const detail = pg.detail?.startsWith("Key (") ? ` ${pg.detail}` : "";
    return `database error ${pg.code}${target ? ` on ${target}` : ""}: ${pg.message}${detail}`;
  }
  const innermost = causeChain(error).at(-1);
  if (!(innermost instanceof Error)) return String(innermost);
  return [(innermost as NodeJS.ErrnoException).code, innermost.message].filter(Boolean).join(": ");
}

/**
 * A unique-constraint violation (23505), optionally narrowed to constraints
 * whose name contains `constraintIncludes`.
 *
 * Two admins acting at once can race a write into an existing unique value.
 * That is a conflict the admin can resolve (reload, pick another value), not
 * a server fault, so handlers map it to 409 with an actionable message — a
 * 500 body is replaced with a bare "Internal Server Error" on the wire.
 */
export function isUniqueViolation(error: unknown, constraintIncludes?: string): boolean {
  const pg = findPgError(error);
  if (pg?.code !== "23505") return false;
  // An unnamed violation is still a uniqueness conflict on this write.
  return !constraintIncludes || !pg.constraint || pg.constraint.includes(constraintIncludes);
}
