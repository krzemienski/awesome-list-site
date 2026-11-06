/**
 * DOMAIN ROUTER: QA-row cleanup (#77)
 *
 *   GET    /api/admin/qa-rows              rows whose title starts with QA_PREFIX
 *   DELETE /api/admin/qa-rows/:table/:id   delete ONE such row (resources,
 *                                          resource_edits, bookmark_collections)
 *
 * Every guard is server-side and none can be widened by a client:
 *   1. the caller's user id is in env QA_CLEANUP_USER_IDS (comma list);
 *   2. the row's submitter/owner is in the same list;
 *   3. inside the delete transaction the row is locked FOR UPDATE and its title
 *      must start with QA_PREFIX and equal the request's `expectedTitle`;
 *   4. `backupSha256` must equal the newest database backup's dump sha256 and
 *      that backup must have completed less than QA_BACKUP_MAX_AGE_MS ago.
 * There is no bulk delete and no prefix parameter. Audit-log and bookmark rows
 * are listed but never deletable (the log is append-only; a bookmark has no title).
 */
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import {
  bookmarkCollections,
  resourceAuditLog,
  resourceEdits,
  resources,
  userBookmarks,
} from "@shared/schema";
import { asyncHandler } from "../../middleware/asyncHandler";
import { invalidatePublicCache } from "../../cache/publicCache";
import { listDatabaseBackups, isBackupStorageConfigured } from "../../backup/databaseBackup";
import type { LearningJourneyRepository } from "../../repositories/LearningJourneyRepository";

export const QA_PREFIX = "[QA-";
export const QA_BACKUP_MAX_AGE_MS = 10 * 60 * 1000;
const LIST_LIMIT = 500;

interface QaCleanupContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
  learningJourneyRepo: LearningJourneyRepository;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
interface Refusal { ok: false; status: number; message: string }
type AuthedRequest = Parameters<RequestHandler>[0];

interface LockedRow { title: string; owner: string | null }
interface DeletableTable {
  lock(tx: Tx, id: number): Promise<LockedRow | undefined>;
  remove(tx: Tx, id: number): Promise<unknown>;
  /** Rows of users outside the allowlist that the delete would also remove, per table. */
  foreignRows?(tx: Tx, id: number, allowed: string[]): Promise<Record<string, number>>;
}

const FOREIGN_ROW_SOURCES: [table: string, resourceColumn: string, userColumn: string | null][] = [
  ["user_bookmarks", "resource_id", "user_id"],
  ["user_favorites", "resource_id", "user_id"],
  ["bookmark_collection_items", "resource_id", "user_id"],
  ["user_interactions", "resource_id", "user_id"],
  ["user_recommendation_feedback", "resource_id", "user_id"],
  ["resource_link_reports", "resource_id", "user_id"],
  ["resource_edits", "resource_id", "submitted_by"],
  ["journey_steps", "resource_id", null],
];

const deleteBodySchema = z.object({
  expectedTitle: z.string().min(1),
  backupSha256: z.string().regex(/^[0-9a-f]{64}$/i),
}).strict();

function allowedUserIds(): Set<string> {
  return new Set((process.env.QA_CLEANUP_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

const startsWithPrefix = (column: unknown): SQL => sql`starts_with(${column}, ${QA_PREFIX})`;

function callerId(req: AuthedRequest): string {
  return String(req.dbUser?.id ?? "");
}

function refuse(status: number, message: string): Refusal {
  return { ok: false, status, message };
}

/** The newest backup's dump hash, or a refusal when it is missing, stale or different. */
async function checkBackup(backupSha256: string): Promise<Refusal | null> {
  if (!isBackupStorageConfigured()) return refuse(503, "Backup storage is not configured, so no backup can be verified.");
  let newest: Awaited<ReturnType<typeof listDatabaseBackups>>[number] | undefined;
  try {
    [newest] = await listDatabaseBackups();
  } catch {
    return refuse(409, "Backup check unavailable. Nothing was deleted.");
  }
  if (!newest) return refuse(409, "No database backup exists. Take one first.");
  const ageMs = Date.now() - new Date(newest.completedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > QA_BACKUP_MAX_AGE_MS) {
    return refuse(409, "The newest database backup is older than 10 minutes. Take a fresh one.");
  }
  if (newest.dump.sha256.toLowerCase() !== backupSha256.toLowerCase()) {
    return refuse(409, "backupSha256 does not match the newest database backup.");
  }
  return null;
}

export function registerQaCleanupRoutes(app: Express, ctx: QaCleanupContext): void {
  const { isAuthenticated, isAdmin, learningJourneyRepo } = ctx;

  const deletable: Record<string, DeletableTable> = {
    resources: {
      async lock(tx, id) {
        const [row] = await tx
          .select({ title: resources.title, owner: resources.submittedBy })
          .from(resources).where(eq(resources.id, id)).for("update");
        return row;
      },
      async foreignRows(tx, id, allowed) {
        const counts: Record<string, number> = {};
        for (const [table, resourceColumn, userColumn] of FOREIGN_ROW_SOURCES) {
          const others = userColumn
            ? sql`AND ${sql.identifier(userColumn)} NOT IN (${sql.join(allowed.map((a) => sql`${a}`), sql`, `)})`
            : sql``;
          const result = await tx.execute(sql`SELECT count(*)::int AS n FROM ${sql.identifier(table)} WHERE ${sql.identifier(resourceColumn)} = ${id} ${others}`);
          const n = Number((result.rows[0] as { n?: number } | undefined)?.n ?? 0);
          if (n > 0) counts[table] = n;
        }
        return counts;
      },
      async remove(tx, id) {
        await tx.delete(resourceEdits).where(eq(resourceEdits.resourceId, id));
        await tx.execute(sql`UPDATE research_discoveries SET created_resource_id = NULL WHERE created_resource_id = ${id}`);
        await learningJourneyRepo.clearProgressPointersToResource(tx, id);
        const [row] = await tx.delete(resources).where(eq(resources.id, id)).returning();
        return row;
      },
    },
    resource_edits: {
      async lock(tx, id) {
        const [row] = await tx
          .select({ title: resources.title, owner: resourceEdits.submittedBy })
          .from(resourceEdits)
          .innerJoin(resources, eq(resources.id, resourceEdits.resourceId))
          .where(eq(resourceEdits.id, id)).for("update");
        return row;
      },
      async remove(tx, id) {
        const [row] = await tx.delete(resourceEdits).where(eq(resourceEdits.id, id)).returning();
        return row;
      },
    },
    bookmark_collections: {
      async lock(tx, id) {
        const [row] = await tx
          .select({ title: bookmarkCollections.name, owner: bookmarkCollections.userId })
          .from(bookmarkCollections).where(eq(bookmarkCollections.id, id)).for("update");
        return row;
      },
      async remove(tx, id) {
        const [row] = await tx.delete(bookmarkCollections).where(eq(bookmarkCollections.id, id)).returning();
        return row;
      },
    },
  };

  app.get("/api/admin/qa-rows", isAuthenticated, isAdmin, asyncHandler(async (req: AuthedRequest, res) => {
    const allowed = allowedUserIds();
    if (!allowed.has(callerId(req))) return res.status(403).json({ message: "Not an authorised QA cleanup account" });

    const [resourceRows, editRows, bookmarkRows, collectionRows, auditRows] = await Promise.all([
      db.select({
        id: resources.id, title: resources.title, status: resources.status,
        submittedBy: resources.submittedBy, createdAt: resources.createdAt,
      }).from(resources).where(startsWithPrefix(resources.title)).orderBy(desc(resources.id)).limit(LIST_LIMIT),
      db.select({
        id: resourceEdits.id, resourceId: resourceEdits.resourceId, title: resources.title,
        status: resourceEdits.status, submittedBy: resourceEdits.submittedBy, createdAt: resourceEdits.createdAt,
      }).from(resourceEdits).innerJoin(resources, eq(resources.id, resourceEdits.resourceId))
        .where(startsWithPrefix(resources.title)).orderBy(desc(resourceEdits.id)).limit(LIST_LIMIT),
      db.select({
        userId: userBookmarks.userId, resourceId: userBookmarks.resourceId, createdAt: userBookmarks.createdAt,
      }).from(userBookmarks).where(startsWithPrefix(userBookmarks.notes)).limit(LIST_LIMIT),
      db.select({
        id: bookmarkCollections.id, title: bookmarkCollections.name,
        submittedBy: bookmarkCollections.userId, createdAt: bookmarkCollections.createdAt,
      }).from(bookmarkCollections).where(startsWithPrefix(bookmarkCollections.name))
        .orderBy(desc(bookmarkCollections.id)).limit(LIST_LIMIT),
      db.select({
        id: resourceAuditLog.id, action: resourceAuditLog.action,
        originalResourceId: resourceAuditLog.originalResourceId, createdAt: resourceAuditLog.createdAt,
      }).from(resourceAuditLog)
        .where(sql`position(${QA_PREFIX} in coalesce(${resourceAuditLog.notes}, '') || coalesce(${resourceAuditLog.changes}::text, '')) > 0`)
        .orderBy(desc(resourceAuditLog.id)).limit(LIST_LIMIT),
    ]);

    const mark = <T extends { submittedBy: string | null }>(rows: T[]) =>
      rows.map((row) => ({ ...row, deletable: row.submittedBy !== null && allowed.has(row.submittedBy) }));
    const rows = {
      resources: mark(resourceRows),
      resource_edits: mark(editRows),
      bookmark_collections: mark(collectionRows),
      user_bookmarks: bookmarkRows.map((row) => ({ ...row, deletable: false })),
      resource_audit_log: auditRows.map((row) => ({ ...row, deletable: false })),
    };
    const counts = Object.fromEntries(Object.entries(rows).map(([table, list]) => [table, list.length]));
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ prefix: QA_PREFIX, generatedAt: new Date().toISOString(), counts, rows });
  }));

  app.delete("/api/admin/qa-rows/:table/:id", isAuthenticated, isAdmin, asyncHandler(async (req: AuthedRequest, res) => {
    const allowed = allowedUserIds();
    if (!allowed.has(callerId(req))) return res.status(403).json({ message: "Not an authorised QA cleanup account" });

    const tableName = req.params.table;
    const target = Object.hasOwn(deletable, tableName) ? deletable[tableName] : undefined;
    if (!target) return res.status(404).json({ message: "This table is not deletable here" });
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== req.params.id) {
      return res.status(400).json({ message: "id must be a positive integer" });
    }
    const body = deleteBodySchema.safeParse(req.body ?? {});
    if (!body.success) return res.status(400).json({ message: "Body must be {expectedTitle, backupSha256}" });
    const { expectedTitle, backupSha256 } = body.data;

    const backupRefusal = await checkBackup(backupSha256);
    if (backupRefusal) return res.status(backupRefusal.status).json({ message: backupRefusal.message });

    const outcome = await db.transaction(async (tx): Promise<Refusal | { ok: true; deleted: unknown }> => {
      const row = await target.lock(tx, id);
      if (!row) return refuse(404, "Row not found");
      if (row.owner === null || !allowed.has(row.owner)) return refuse(403, "Row does not belong to a QA cleanup account");
      if (!row.title.startsWith(QA_PREFIX)) return refuse(409, `Title no longer starts with ${QA_PREFIX}`);
      if (row.title !== expectedTitle) return refuse(409, "expectedTitle does not match the stored title");
      const foreign = await target.foreignRows?.(tx, id, [...allowed]);
      if (foreign && Object.keys(foreign).length > 0) {
        return refuse(409, `Other users' data depends on this row; nothing was deleted: ${JSON.stringify(foreign)}`);
      }
      await tx.insert(resourceAuditLog).values({
        originalResourceId: tableName === "resources" ? id : null,
        action: "qa_cleanup",
        performedBy: callerId(req),
        changes: { table: tableName, id, title: row.title },
        notes: `QA cleanup deleted ${tableName} #${id}: ${row.title}`,
      });
      return { ok: true, deleted: await target.remove(tx, id) };
    });
    if (!outcome.ok) return res.status(outcome.status).json({ message: outcome.message });

    invalidatePublicCache("resource-mutation");
    res.json({ table: tableName, deleted: outcome.deleted });
  }));
}
