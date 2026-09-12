import {
  contactSubmissions,
  type ContactSubmission,
  type InsertContactSubmission,
} from "@shared/schema";
import { db } from "../db";
import { config } from "../config";
import { desc, sql } from "drizzle-orm";

/**
 * Delete submissions older than config.contact.retention_days in bounded
 * batches. NOT scheduled anywhere yet (see docs/parity/assumptions/contact-api.md);
 * kept as the single retention primitive for the follow-up that wires it into
 * the background scheduler.
 */
export async function purgeExpiredContactSubmissions(limit = 500): Promise<number> {
  const configuredRetentionDays = Number(config.contact.retention_days);
  const retentionDays = Number.isFinite(configuredRetentionDays)
    ? Math.max(1, Math.min(3650, Math.floor(configuredRetentionDays)))
    : 180;
  const boundedLimit = Math.max(1, Math.min(2_000, Math.floor(limit)));
  const result = await db.execute(sql`
    DELETE FROM ${contactSubmissions}
    WHERE ${contactSubmissions.id} IN (
      SELECT ${contactSubmissions.id}
      FROM ${contactSubmissions}
      WHERE ${contactSubmissions.createdAt} < now() - (${retentionDays} * interval '1 day')
      ORDER BY ${contactSubmissions.createdAt} ASC
      LIMIT ${boundedLimit}
    )
    RETURNING ${contactSubmissions.id}
  `);
  return result.rowCount ?? result.rows.length;
}

export type NewContactSubmission = Pick<
  InsertContactSubmission,
  "name" | "replyTo" | "subject" | "message" | "ipHash" | "userId"
>;

export class ContactRepository {
  async createSubmission(submission: NewContactSubmission): Promise<ContactSubmission> {
    const [created] = await db
      .insert(contactSubmissions)
      .values(submission)
      .returning();
    return created;
  }

  /** Newest first; the admin inbox pages through this with limit/offset. */
  async listSubmissions(limit: number, offset: number): Promise<ContactSubmission[]> {
    return db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt), desc(contactSubmissions.id))
      .limit(limit)
      .offset(offset);
  }

  async countSubmissions(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactSubmissions);
    return row?.count ?? 0;
  }
}
