/**
 * Daily scheduled database backup with age-based retention.
 *
 * Called by the in-process backup scheduler (server/jobs/backupScheduler.ts).
 * Safe to call as often as wanted: it only dumps when the newest backup is
 * older than 24 h.
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
  listDatabaseBackupsDetailed,
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

/** Where a run is, so a failure names the step that threw. "dump" covers createDatabaseBackup (dump and storage upload). */
type BackupStage = "lock-connect" | "lock-query" | "list" | "dump";

interface BackupRun {
  stage: BackupStage;
  readonly startedAt: number;
}

/** The single structured line a backing-up run ends with (failures are logged by the catch in runScheduledBackupIfDue). */
function logOutcome(run: BackupRun, level: "info" | "warn", fields: Record<string, unknown>): void {
  logger[level]("Scheduled backup outcome", { durationMs: Date.now() - run.startedAt, ...fields });
}

// The scheduler ticks every 30 min and a misconfigured instance would skip on every tick: log each config skip once per process.
let loggedStorageNotConfigured = false;
let loggedDatabaseUrlNotSet = false;

/** Backups to delete: older than KEEP_DAYS and not among the newest KEEP_NEWEST. `backups` is newest first. */
function expiredBackups(backups: BackupManifest[], now: number): BackupManifest[] {
  return backups
    .slice(KEEP_NEWEST)
    .filter((b) => now - Date.parse(b.completedAt) > KEEP_DAYS * 86_400_000);
}

/** Backups with a usable completedAt; a bad one is logged and ignored rather than poisoning age maths. */
function withValidDates(backups: BackupManifest[]): BackupManifest[] {
  return backups.filter((b) => {
    if (Number.isFinite(Date.parse(b.completedAt))) return true;
    logger.warn("Ignoring backup with an invalid completedAt", { backupId: b.id });
    return false;
  });
}

async function pruneBackups(): Promise<number> {
  const { backups, unreadable } = await listDatabaseBackupsDetailed();
  if (unreadable.length > 0) {
    logger.warn("Skipping prune: some backup manifests were unreadable", { unreadable: unreadable.length });
    return 0;
  }
  const expired = expiredBackups(withValidDates(backups), Date.now());
  for (const backup of expired) await deleteDatabaseBackup(backup.id);
  return expired.length;
}

/** Returns the failure message instead of throwing or logging: the run's single outcome line carries it. */
async function recordAudit(manifest: BackupManifest): Promise<string | undefined> {
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
    return undefined;
  } catch (error) {
    return errorMessage(error);
  }
}

const errorClass = (error: unknown) => (error instanceof Error ? error.name : "unknown");
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function backupIfDue(run: BackupRun): Promise<ScheduledBackupResult> {
  run.stage = "list";
  const { backups } = await listDatabaseBackupsDetailed();
  const newest = Math.max(0, ...withValidDates(backups).map((b) => Date.parse(b.completedAt)));
  if (Date.now() - newest < DUE_AFTER_MS) return { status: "skipped" };

  let manifest: BackupManifest;
  run.stage = "dump";
  try {
    manifest = await runHeavyWork("database-backup", () => createDatabaseBackup({ createdBy: null }));
  } catch (error) {
    const busy = error instanceof ServiceUnavailableError || (error instanceof DatabaseBackupError && error.status === 409);
    if (busy) {
      logOutcome(run, "info", { outcome: "locked", reason: "backup-already-running" });
      return { status: "locked" };
    }
    throw error;
  }
  const auditError = await recordAudit(manifest);
  let pruned = 0;
  let pruneError: string | undefined;
  try {
    pruned = await pruneBackups();
  } catch (error) {
    // The new backup exists; a failed prune only delays cleanup to the next run.
    pruneError = errorMessage(error);
  }
  logOutcome(run, pruneError || auditError ? "warn" : "info", {
    outcome: "done",
    backupId: manifest.id,
    bytes: manifest.dump.bytes,
    tables: manifest.coverage.tables.length,
    rows: manifest.coverage.totalRows,
    pruned,
    ...(pruneError && { pruneError }),
    ...(auditError && { auditError }),
  });
  return { status: "created", id: manifest.id };
}

export async function runScheduledBackupIfDue(): Promise<ScheduledBackupResult> {
  const run: BackupRun = { stage: "lock-connect", startedAt: Date.now() };
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isBackupStorageConfigured()) {
    if (databaseUrl && !loggedStorageNotConfigured) {
      loggedStorageNotConfigured = true;
      logOutcome(run, "info", { outcome: "skipped", reason: "storage-not-configured" });
    } else if (!databaseUrl && !loggedDatabaseUrlNotSet) {
      loggedDatabaseUrlNotSet = true;
      logOutcome(run, "info", { outcome: "skipped", reason: "database-url-not-set" });
    }
    return { status: "skipped" };
  }

  // Session-level lock on its own connection: the in-flight flag in
  // databaseBackup.ts is per process, and another Autoscale instance may be dumping.
  const lockClient = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  lockClient.on("error", (error) => logger.error("Backup lock connection error", error, { stage: run.stage, errorClass: errorClass(error) }));
  try {
    await lockClient.connect();
    run.stage = "lock-query";
    const { rows } = await lockClient.query<{ locked: boolean }>(
      "select pg_try_advisory_lock($1, $2) as locked",
      [...BACKUP_LOCK],
    );
    if (!rows[0].locked) {
      logOutcome(run, "info", { outcome: "locked", reason: "advisory-lock-held-by-another-instance" });
      return { status: "locked" };
    }
    try {
      return await backupIfDue(run);
    } finally {
      await lockClient.query("select pg_advisory_unlock($1, $2)", [...BACKUP_LOCK]).catch(() => undefined);
    }
  } catch (error) {
    // The logger scrubs the message (connection strings, credentials, known secrets) and clips it.
    // Passing the Error is what puts err/code/cause on the line; the original call logged only errorClass.
    logger.error("Scheduled backup failed", error, {
      outcome: "error",
      stage: run.stage,
      errorName: errorClass(error),
      durationMs: Date.now() - run.startedAt,
    });
    return { status: "error" };
  } finally {
    await lockClient.end().catch(() => undefined);
  }
}
