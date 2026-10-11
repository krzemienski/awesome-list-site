#!/usr/bin/env tsx
/**
 * Full database backup CLI — the operator side of the admin "Full database
 * backup" card. Runbook: docs/DATABASE-BACKUP.md.
 *
 *   npm run db:backup -- list    [--environment production|development]
 *   npm run db:backup -- show    <backup-id> [--environment …]
 *   npm run db:backup -- create
 *   TARGET_DATABASE_URL=<empty db> npm run db:backup -- restore <backup-id> [--environment …]
 *
 * `create` backs up DATABASE_URL into the private App Storage bucket under the
 * current environment (development in the workspace). `restore` downloads a
 * backup, verifies its SHA-256, restores it into the EMPTY database named by
 * TARGET_DATABASE_URL (never the app's own DATABASE_URL) and compares every
 * table's row count, every sequence value and the schema inventory with the
 * manifest. Exit code 1 on any mismatch or error.
 *
 * The target URL is read from the environment, never argv, so credentials do
 * not land in shell history.
 */
import {
  DatabaseBackupError,
  assertBackupId,
  backupEnvironment,
  createDatabaseBackup,
  listDatabaseBackups,
  readBackupManifest,
  restoreDatabaseBackup,
  type BackupEnvironment,
  type BackupManifest,
} from "../server/backup/databaseBackup";

function usage(): never {
  console.error("usage: npm run db:backup -- <list|show <id>|create|restore <id>> [--environment production|development]");
  process.exit(2);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let environment: BackupEnvironment = backupEnvironment();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--environment" || arg === "--env") {
      const value = argv[++i];
      if (value !== "production" && value !== "development") usage();
      environment = value;
    } else if (arg.startsWith("--")) {
      usage();
    } else {
      positional.push(arg);
    }
  }
  return { command: positional[0], id: positional[1], environment };
}

function summary(m: BackupManifest): string {
  return `${m.id}  ${m.environment}  ${m.createdAt}  ${m.coverage.tables.length} tables  ${m.coverage.totalRows} rows  ${m.dump.bytes} bytes  sha256 ${m.dump.sha256.slice(0, 16)}…`;
}

async function main() {
  const { command, id, environment } = parseArgs(process.argv.slice(2));
  switch (command) {
    case "list": {
      const backups = await listDatabaseBackups(environment);
      if (backups.length === 0) console.log(`No ${environment} backups.`);
      for (const m of backups) console.log(summary(m));
      return;
    }
    case "show": {
      if (!id) usage();
      assertBackupId(id);
      console.log(JSON.stringify(await readBackupManifest(id, environment), null, 2));
      return;
    }
    case "create": {
      const manifest = await createDatabaseBackup({ createdBy: null });
      console.log(`Created ${summary(manifest)}`);
      return;
    }
    case "restore": {
      if (!id) usage();
      assertBackupId(id);
      const targetUrl = process.env.TARGET_DATABASE_URL;
      if (!targetUrl) {
        console.error("TARGET_DATABASE_URL must name an EMPTY database to restore into.");
        process.exit(2);
      }
      const report = await restoreDatabaseBackup({ backupId: id, targetUrl, environment, log: (line) => console.log(line) });
      const width = Math.max(...report.checks.map((c) => c.item.length));
      for (const check of report.checks) {
        console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.item.padEnd(width)}  expected ${check.expected}  actual ${check.actual}`);
      }
      const failed = report.checks.filter((c) => !c.ok).length;
      console.log(`\n${report.ok ? "RESTORE VERIFIED" : "RESTORE MISMATCH"}: backup ${report.backupId} → ${report.target}, ${report.checks.length - failed}/${report.checks.length} checks passed in ${report.durationMs} ms.`);
      if (!report.ok) process.exit(1);
      return;
    }
    default:
      usage();
  }
}

main().catch((error) => {
  console.error(error instanceof DatabaseBackupError ? `Backup error: ${error.message}` : error);
  process.exit(1);
});
