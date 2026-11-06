/**
 * Daily scheduled database backup with age-based retention.
 *
 * Called by POST /api/ops/run-due-jobs (every 15 min). Safe to call as often as
 * wanted: it only dumps when the newest backup is older than 24 h.
 *
 * Advisory lock ids in use: 5116/7 link health (linkHealthService),
 * 5117/1 this backup, hashtext('enrichment_job_admission'),
 * hashtext('research_job_admission').
 */
import pg from "pg";
import { createLogger } from "../lib/logger";
import { ServiceUnavailableError } from "../middleware/errors";
import { runHeavyWork } from "../ops/heavyWork";
import { AuditRepository } from "../repositories";
import {
  createDatabaseBackup,
  DatabaseBackupError,
  deleteDatabaseBackup,
  isBackupStorageConfigured,
  listDatabaseBackups,
  type BackupManifest,
} from "./databaseBackup";

const logger = createLogger("scheduled-backup");

const BACKUP_LOCK = [5117, 1] as const;
const DUE_AFTER_MS = 24 * 3_600_000;
const KEEP_DAYS = 14;
const KEEP_NEWEST = 3;

export interface ScheduledBackupResult {
  status: "created" | "skipped" | "locked" | "error";
  id?: string;
}

/** Backups to delete: older than KEEP_DAYS and not among the newest KEEP_NEWEST. `backups` is newest first. */
function expiredBackups(backups: BackupManifest[], now: number): BackupManifest[] {
  return backups
    .slice(KEEP_NEWEST)
    .filter((b) => now - Date.parse(b.completedAt) > KEEP_DAYS * 86_400_000);
}

async function pruneBackups(): Promise<number> {
  const expired = expiredBackups(await listDatabaseBackups(), Date.now());
  for (const backup of expired) await deleteDatabaseBackup(backup.id);
  return expired.length;
}

async function recordAudit(manifest: BackupManifest): Promise<void> {
  try {
    await new AuditRepository().logResourceAudit(
      null,
      "database.backed_up",
      undefined,
      {
        backupId: manifest.id,
        environment: manifest.environment,
        tables: manifest.coverage.tables.length,
        rows: manifest.coverage.totalRows,
        bytes: manifest.dump.bytes,
        sha256: manifest.dump.sha256,
        scheduled: true,
      },
      `Scheduled full database backup (${manifest.coverage.tables.length} tables, ${manifest.coverage.totalRows} rows) into private storage`,
    );
  } catch (error) {
    logger.error("Scheduled backup audit row failed", { backupId: manifest.id, errorClass: errorClass(error) });
  }
}

const errorClass = (error: unknown) => (error instanceof Error ? error.name : "unknown");

async function backupIfDue(): Promise<ScheduledBackupResult> {
  const backups = await listDatabaseBackups();
  const newest = Math.max(0, ...backups.map((b) => Date.parse(b.completedAt)));
  if (Date.now() - newest < DUE_AFTER_MS) return { status: "skipped" };

  let manifest: BackupManifest;
  try {
    manifest = await runHeavyWork("database-backup", () => createDatabaseBackup({ createdBy: null }));
  } catch (error) {
    const busy = error instanceof ServiceUnavailableError || (error instanceof DatabaseBackupError && error.status === 409);
    if (busy) return { status: "locked" };
    throw error;
  }
  await recordAudit(manifest);
  try {
    const pruned = await pruneBackups();
    if (pruned > 0) logger.info("Pruned expired backups", { pruned });
  } catch (error) {
    // The new backup exists; a failed prune only delays cleanup to the next run.
    logger.error("Backup prune failed", { errorClass: errorClass(error) });
  }
  return { status: "created", id: manifest.id };
}

export async function runScheduledBackupIfDue(): Promise<ScheduledBackupResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isBackupStorageConfigured()) return { status: "skipped" };

  // Session-level lock on its own connection: the in-flight flag in
  // databaseBackup.ts is per process, and another Autoscale instance may be dumping.
  const lockClient = new pg.Client({ connectionString: databaseUrl });
  lockClient.on("error", (error) => logger.error("Backup lock connection error", { errorClass: errorClass(error) }));
  try {
    await lockClient.connect();
    const { rows } = await lockClient.query<{ locked: boolean }>(
      "select pg_try_advisory_lock($1, $2) as locked",
      [...BACKUP_LOCK],
    );
    if (!rows[0].locked) return { status: "locked" };
    try {
      return await backupIfDue();
    } finally {
      await lockClient.query("select pg_advisory_unlock($1, $2)", [...BACKUP_LOCK]).catch(() => undefined);
    }
  } catch (error) {
    logger.error("Scheduled backup failed", { errorClass: errorClass(error) });
    return { status: "error" };
  } finally {
    await lockClient.end().catch(() => undefined);
  }
}
