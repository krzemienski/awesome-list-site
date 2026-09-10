import {
  contactSubmissions,
  type ContactSubmission,
  type InsertContactSubmission,
} from "@shared/schema";
import { db } from "../db";
import { config } from "../config";
import { sql } from "drizzle-orm";

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

export class ContactRepository {
  async createSubmission(
    submission: Pick<InsertContactSubmission, "name" | "replyTo" | "subject" | "message">,
  ): Promise<ContactSubmission> {
    const [created] = await db
      .insert(contactSubmissions)
      .values(submission)
      .returning();
    return created;
  }
}