import { sql } from "drizzle-orm";
import { db } from "./db";

/**
 * Authenticated browser sessions expire after 24 hours. The cookie and the
 * PostgreSQL session-store record use the same lifetime.
 */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Keep the current session plus the two most recently-expiring sessions.
 * Creating a fourth session revokes the oldest older session automatically.
 */
export const MAX_CONCURRENT_SESSIONS = 3;

const USER_ID_SQL = sql`(sess->'passport'->'user'->'claims'->>'sub')`;

/**
 * Enforce the concurrent-session cap after a newly authenticated session has
 * been persisted. The current session is always preserved.
 */
export async function enforceConcurrentSessionLimit(
  userId: string,
  currentSid: string,
): Promise<number> {
  const keepOlderSessions = MAX_CONCURRENT_SESSIONS - 1;
  const result = await db.execute(sql`
    DELETE FROM sessions
    WHERE ${USER_ID_SQL} = ${userId}
      AND sid <> ${currentSid}
      AND sid NOT IN (
        SELECT sid
        FROM sessions
        WHERE ${USER_ID_SQL} = ${userId}
          AND sid <> ${currentSid}
        ORDER BY expire DESC, sid DESC
        LIMIT ${keepOlderSessions}
      )
  `);
  return (result as any).rowCount ?? 0;
}

/** Revoke every server-side session belonging to one account. */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM sessions
    WHERE ${USER_ID_SQL} = ${userId}
  `);
  return (result as any).rowCount ?? 0;
}