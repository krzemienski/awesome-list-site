/**
 * Full, restorable database backup (admin-triggered) and its restore verifier.
 *
 * WHAT A BACKUP IS
 *   A `pg_dump --format=custom` archive of the WHOLE application database —
 *   every table in every application schema (today `public` + `drizzle`, the
 *   migration journal the boot migrator reads), every row, plus all DDL:
 *   primary/unique/foreign keys, check constraints, indexes, sequences (with
 *   their current values), extensions, functions and triggers. User identity
 *   rows (`users`, keyed by the Clerk bridge id), favorites, bookmarks,
 *   journeys, contributions, audit history, AI jobs/discoveries, notification
 *   preferences and sessions are all inside because they are all tables.
 *
 *   Only `EXCLUDED_SCHEMAS` are left out: `_system` is created by the hosting
 *   platform on the managed production database and is not application data.
 *   Account credentials (passwords, OAuth links, MFA) live in Clerk, not in this
 *   database, so no database backup can contain them.
 *
 * WHERE IT IS STORED
 *   The project's private App Storage bucket (Replit Object Storage), under
 *   `<PRIVATE_OBJECT_DIR>/db-backups/<environment>/`. There is deliberately NO
 *   HTTP download route: the archive contains personal data and never travels
 *   to a browser. Each backup is two objects — `<id>.dump` and
 *   `<id>.manifest.json`; the manifest is written last, so a backup only exists
 *   (is listed / restorable) once its archive upload succeeded.
 *
 * WHY THE MANIFEST COUNTS ARE TRUSTWORTHY
 *   Per-table row counts and sequence values are read back OUT OF THE ARCHIVE
 *   (`pg_restore --data-only` stream), not from the live database, so they
 *   describe exactly what a restore will produce even while the site keeps
 *   writing during the dump. The backup fails loudly if any live table is
 *   missing from the archive.
 *
 * RESTORE
 *   `npm run db:backup -- restore <id>` with TARGET_DATABASE_URL set to
 *   an EMPTY database (see docs/DATABASE-BACKUP.md). The restore refuses a
 *   non-empty target and the app's own DATABASE_URL, verifies the archive's
 *   SHA-256, runs pg_restore in one transaction, then compares every table's
 *   row count, every sequence value and the schema inventory with the manifest.
 */
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import pg from "pg";
import { Client as ObjectStorageClient } from "@replit/object-storage";

export const BACKUP_FORMAT_VERSION = 1;
/** Platform-owned schema on the managed production database; not app data. */
export const EXCLUDED_SCHEMAS = ["_system"] as const;
const SYSTEM_SCHEMAS = ["pg_catalog", "information_schema", "pg_toast"];

export type BackupEnvironment = "production" | "development";

/** An operator-actionable backup/restore failure (message is safe to show). */
export class DatabaseBackupError extends Error {
  constructor(
    message: string,
    /** HTTP status the admin API should use (never 500 — the contract layer masks 500 bodies). */
    readonly status: 409 | 422 | 503 = 503,
  ) {
    super(message);
    this.name = "DatabaseBackupError";
  }
}

export interface SchemaInventory {
  schemas: string[];
  tables: string[];
  columns: number;
  primaryKeys: number;
  foreignKeys: number;
  uniqueConstraints: number;
  checkConstraints: number;
  indexes: number;
  sequences: number;
  views: number;
  functions: number;
  triggers: number;
  enumTypes: number;
  extensions: string[];
}

export interface BackupTableCount {
  table: string;
  rows: number;
}

export interface BackupSequenceValue {
  sequence: string;
  value: string;
  isCalled: boolean;
}

export interface BackupManifest {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  id: string;
  environment: BackupEnvironment;
  createdAt: string;
  completedAt: string;
  durationMs: number;
  createdBy: string | null;
  source: {
    database: string;
    serverVersion: string;
    pgDumpVersion: string;
  };
  dump: {
    objectName: string;
    format: "pg_dump custom";
    bytes: number;
    sha256: string;
  };
  coverage: {
    excludedSchemas: string[];
    totalRows: number;
    tables: BackupTableCount[];
    sequences: BackupSequenceValue[];
    inventory: SchemaInventory;
  };
}

// ---------------------------------------------------------------------------
// Environment + storage
// ---------------------------------------------------------------------------

export function backupEnvironment(): BackupEnvironment {
  return process.env.REPLIT_DEPLOYMENT === "1" ? "production" : "development";
}

interface BackupStorage {
  client: ObjectStorageClient;
  prefix: string;
}

export function isBackupStorageConfigured(): boolean {
  return Boolean(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID && process.env.PRIVATE_OBJECT_DIR);
}

function resolveStorage(environment: BackupEnvironment = backupEnvironment()): BackupStorage {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!bucketId || !privateDir) {
    throw new DatabaseBackupError(
      "Backup storage is not configured: the private App Storage bucket (DEFAULT_OBJECT_STORAGE_BUCKET_ID / PRIVATE_OBJECT_DIR) is missing.",
    );
  }
  // PRIVATE_OBJECT_DIR is "/<bucket>/<dir>"; object names are bucket-relative.
  const segments = privateDir.split("/").filter(Boolean);
  if (segments[0] === bucketId) segments.shift();
  if (segments.length === 0) {
    throw new DatabaseBackupError("Backup storage is misconfigured: PRIVATE_OBJECT_DIR names no private directory.");
  }
  return {
    client: new ObjectStorageClient({ bucketId }),
    prefix: `${segments.join("/")}/db-backups/${environment}/`,
  };
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message?: string } }, action: string): T {
  if (!result.ok) {
    throw new DatabaseBackupError(`Backup storage ${action} failed: ${result.error?.message ?? "unknown error"}`);
  }
  return result.value;
}

const BACKUP_ID_PATTERN = /^\d{8}T\d{6}Z-[a-f0-9]{8}$/;

export function assertBackupId(id: string): void {
  if (!BACKUP_ID_PATTERN.test(id)) {
    throw new DatabaseBackupError(`"${id}" is not a backup id (expected e.g. 20261010T120000Z-1a2b3c4d).`, 422);
  }
}

function newBackupId(now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${stamp}-${randomBytes(4).toString("hex")}`;
}

// ---------------------------------------------------------------------------
// Child processes
// ---------------------------------------------------------------------------

function runTool(command: string, args: string[], opts: { stdoutTo?: (line: string) => void } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      reject(new DatabaseBackupError(`${command} could not be started: ${(error as Error).message}`));
      return;
    }
    let stdout = "";
    let stderr = "";
    if (opts.stdoutTo) {
      const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
      lines.on("line", opts.stdoutTo);
    } else {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
    }
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 8000) stderr += chunk;
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      reject(new DatabaseBackupError(
        error.code === "ENOENT"
          ? `${command} is not installed on this server, so no backup can be taken here.`
          : `${command} failed to start: ${error.message}`,
      ));
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      // stderr can echo object names but never connection strings (they are
      // passed as --dbname and libpq does not print passwords).
      else reject(new DatabaseBackupError(`${command} exited with code ${code}: ${redact(stderr.trim()).slice(0, 1500)}`));
    });
  });
}

function redact(text: string): string {
  return text.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://<redacted>");
}

// ---------------------------------------------------------------------------
// Catalog inventory (identical query on source and restore target)
// ---------------------------------------------------------------------------

const excludedList = [...SYSTEM_SCHEMAS, ...EXCLUDED_SCHEMAS];

export async function collectSchemaInventory(client: pg.Client): Promise<SchemaInventory> {
  const ex = excludedList;
  const one = async (sql: string): Promise<number> => {
    const { rows } = await client.query<{ n: string }>(sql, [ex]);
    return Number(rows[0].n);
  };
  const schemas = (await client.query<{ nspname: string }>(
    `select nspname from pg_namespace
      where nspname <> all($1) and nspname not like 'pg\\_%'
      order by 1`, [ex])).rows.map((r) => r.nspname);
  const tables = (await client.query<{ name: string }>(
    `select n.nspname || '.' || c.relname as name
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.relkind in ('r','p') and n.nspname <> all($1) and n.nspname not like 'pg\\_%'
      order by 1`, [ex])).rows.map((r) => r.name);
  const constraintCount = (type: string) => one(
    `select count(*)::text as n from pg_constraint k join pg_namespace n on n.oid = k.connamespace
      where k.contype = '${type}' and n.nspname <> all($1) and n.nspname not like 'pg\\_%'`);
  const extensions = (await client.query<{ extname: string }>(
    "select extname from pg_extension where extname <> 'plpgsql' order by 1")).rows.map((r) => r.extname);
  return {
    schemas,
    tables,
    columns: await one(
      `select count(*)::text as n from pg_attribute a
         join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
        where c.relkind in ('r','p') and a.attnum > 0 and not a.attisdropped
          and n.nspname <> all($1) and n.nspname not like 'pg\\_%'`),
    primaryKeys: await constraintCount("p"),
    foreignKeys: await constraintCount("f"),
    uniqueConstraints: await constraintCount("u"),
    checkConstraints: await constraintCount("c"),
    indexes: await one(
      `select count(*)::text as n from pg_index i
         join pg_class c on c.oid = i.indexrelid join pg_namespace n on n.oid = c.relnamespace
        where n.nspname <> all($1) and n.nspname not like 'pg\\_%'`),
    sequences: await one(
      `select count(*)::text as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where c.relkind = 'S' and n.nspname <> all($1) and n.nspname not like 'pg\\_%'`),
    views: await one(
      `select count(*)::text as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where c.relkind in ('v','m') and n.nspname <> all($1) and n.nspname not like 'pg\\_%'`),
    functions: await one(
      `select count(*)::text as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname <> all($1) and n.nspname not like 'pg\\_%'
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')`),
    triggers: await one(
      `select count(*)::text as n from pg_trigger t join pg_class c on c.oid = t.tgrelid
         join pg_namespace n on n.oid = c.relnamespace
        where not t.tgisinternal and n.nspname <> all($1) and n.nspname not like 'pg\\_%'`),
    enumTypes: await one(
      `select count(*)::text as n from pg_type t join pg_namespace n on n.oid = t.typnamespace
        where t.typtype = 'e' and n.nspname <> all($1) and n.nspname not like 'pg\\_%'`),
    extensions,
  };
}

async function withClient<T>(connectionString: string, fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString, statement_timeout: 120_000 });
  try {
    await client.connect();
  } catch (error) {
    throw new DatabaseBackupError(`Could not connect to the database: ${redact((error as Error).message)}`);
  }
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Archive reading
// ---------------------------------------------------------------------------

function unquoteQualified(name: string): string {
  return name.replace(/"((?:[^"]|"")*)"/g, (_m, inner: string) => inner.replace(/""/g, '"'));
}

/**
 * Stream the archive's data section and count what a restore will load:
 * rows per COPY block (COPY text format escapes newlines, so one line = one
 * row) and every sequence's setval().
 */
export async function readArchiveContents(dumpPath: string): Promise<{
  tables: BackupTableCount[];
  sequences: BackupSequenceValue[];
}> {
  const tables = new Map<string, number>();
  const sequences: BackupSequenceValue[] = [];
  let current: string | null = null;
  let rows = 0;
  await runTool("pg_restore", ["--data-only", "--file=-", dumpPath], {
    stdoutTo: (line) => {
      if (current !== null) {
        if (line === "\\.") {
          tables.set(current, (tables.get(current) ?? 0) + rows);
          current = null;
        } else {
          rows++;
        }
        return;
      }
      const copy = /^COPY (.+?) (?:\(.*\) )?FROM stdin;$/.exec(line);
      if (copy) {
        current = unquoteQualified(copy[1]);
        rows = 0;
        return;
      }
      const setval = /^SELECT pg_catalog\.setval\('(.+)', (\d+), (true|false)\);$/.exec(line);
      if (setval) {
        sequences.push({
          sequence: unquoteQualified(setval[1].replace(/''/g, "'")),
          value: setval[2],
          isCalled: setval[3] === "true",
        });
      }
    },
  });
  // `current` is assigned inside the line callback, which TS's narrowing cannot see.
  const unterminated = current as string | null;
  if (unterminated !== null) throw new DatabaseBackupError(`Archive is truncated inside the data of ${unterminated}.`);
  return {
    tables: [...tables.entries()].map(([table, n]) => ({ table, rows: n })).sort((a, b) => a.table.localeCompare(b.table)),
    sequences: sequences.sort((a, b) => a.sequence.localeCompare(b.sequence)),
  };
}

function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "db-backup-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

let backupInFlight = false;

export function isBackupInFlight(): boolean {
  return backupInFlight;
}

export async function createDatabaseBackup(options: {
  databaseUrl?: string;
  createdBy: string | null;
}): Promise<BackupManifest> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new DatabaseBackupError("DATABASE_URL is not set.");
  if (backupInFlight) throw new DatabaseBackupError("A database backup is already running.", 409);
  backupInFlight = true;
  try {
    const storage = resolveStorage();
    const environment = backupEnvironment();
    const startedAt = new Date();
    const id = newBackupId(startedAt);
    const pgDumpVersion = (await runTool("pg_dump", ["--version"])).trim();

    const { database, serverVersion, inventory } = await withClient(databaseUrl, async (client) => {
      const { rows } = await client.query<{ db: string; v: string }>(
        "select current_database() as db, current_setting('server_version') as v");
      return { database: rows[0].db, serverVersion: rows[0].v, inventory: await collectSchemaInventory(client) };
    });

    return await withTempDir(async (dir) => {
      const dumpPath = join(dir, `${id}.dump`);
      await runTool("pg_dump", [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--compress=6",
        ...EXCLUDED_SCHEMAS.map((schema) => `--exclude-schema=${schema}`),
        `--file=${dumpPath}`,
        `--dbname=${databaseUrl}`,
      ]);

      const { tables, sequences } = await readArchiveContents(dumpPath);
      const archived = new Set(tables.map((t) => t.table));
      const missing = inventory.tables.filter((t) => !archived.has(t));
      if (missing.length > 0) {
        throw new DatabaseBackupError(`Backup is incomplete — tables missing from the archive: ${missing.join(", ")}. Nothing was stored.`);
      }

      const [{ size }, sha256] = await Promise.all([stat(dumpPath), sha256File(dumpPath)]);
      const objectName = `${storage.prefix}${id}.dump`;
      unwrap(await storage.client.uploadFromFilename(objectName, dumpPath), "upload");

      const completedAt = new Date();
      const manifest: BackupManifest = {
        formatVersion: BACKUP_FORMAT_VERSION,
        id,
        environment,
        createdAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        createdBy: options.createdBy,
        source: { database, serverVersion, pgDumpVersion },
        dump: { objectName, format: "pg_dump custom", bytes: size, sha256 },
        coverage: {
          excludedSchemas: [...EXCLUDED_SCHEMAS],
          totalRows: tables.reduce((sum, t) => sum + t.rows, 0),
          tables,
          sequences,
          inventory,
        },
      };
      // Manifest last: its presence is the commit marker for the backup.
      unwrap(
        await storage.client.uploadFromText(`${storage.prefix}${id}.manifest.json`, JSON.stringify(manifest, null, 2)),
        "manifest upload",
      );
      return manifest;
    });
  } finally {
    backupInFlight = false;
  }
}

// ---------------------------------------------------------------------------
// List / read
// ---------------------------------------------------------------------------

export async function listDatabaseBackups(environment: BackupEnvironment = backupEnvironment()): Promise<BackupManifest[]> {
  const storage = resolveStorage(environment);
  const objects = unwrap(await storage.client.list({ prefix: storage.prefix }), "list");
  const manifestNames = objects.map((o) => o.name).filter((name) => name.endsWith(".manifest.json"));
  const manifests = await Promise.all(manifestNames.map(async (name) =>
    JSON.parse(unwrap(await storage.client.downloadAsText(name), "read")) as BackupManifest));
  return manifests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readBackupManifest(id: string, environment: BackupEnvironment = backupEnvironment()): Promise<BackupManifest> {
  assertBackupId(id);
  const storage = resolveStorage(environment);
  const name = `${storage.prefix}${id}.manifest.json`;
  const exists = unwrap(await storage.client.exists(name), "lookup");
  if (!exists) throw new DatabaseBackupError(`No ${environment} backup with id ${id}.`, 422);
  return JSON.parse(unwrap(await storage.client.downloadAsText(name), "read")) as BackupManifest;
}

// ---------------------------------------------------------------------------
// Restore + verify
// ---------------------------------------------------------------------------

function databaseIdentity(url: string): string {
  const parsed = new URL(url);
  return `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}/${decodeURIComponent(parsed.pathname.replace(/^\//, ""))}`;
}

export interface RestoreCheck {
  item: string;
  expected: string;
  actual: string;
  ok: boolean;
}

export interface RestoreReport {
  backupId: string;
  target: string;
  durationMs: number;
  checks: RestoreCheck[];
  ok: boolean;
}

export async function restoreDatabaseBackup(options: {
  backupId: string;
  targetUrl: string;
  environment?: BackupEnvironment;
  log?: (line: string) => void;
}): Promise<RestoreReport> {
  const log = options.log ?? (() => undefined);
  const started = Date.now();
  const environment = options.environment ?? backupEnvironment();

  if (process.env.DATABASE_URL && databaseIdentity(options.targetUrl) === databaseIdentity(process.env.DATABASE_URL)) {
    throw new DatabaseBackupError("Refusing to restore into this app's own DATABASE_URL. Restore into a new, empty database.", 422);
  }

  // The target must be empty: a restore never merges into existing data.
  await withClient(options.targetUrl, async (client) => {
    const inventory = await collectSchemaInventory(client);
    if (inventory.tables.length > 0) {
      throw new DatabaseBackupError(
        `Target database is not empty (${inventory.tables.length} tables, e.g. ${inventory.tables.slice(0, 3).join(", ")}). Restore only into an empty database.`,
        409,
      );
    }
  });

  return withTempDir(async (dir) => {
    const manifest = await readBackupManifest(options.backupId, environment);
    const storage = resolveStorage(environment);
    const dumpPath = join(dir, `${manifest.id}.dump`);
    log(`Downloading ${manifest.dump.objectName} (${manifest.dump.bytes} bytes)…`);
    unwrap(await storage.client.downloadToFilename(manifest.dump.objectName, dumpPath), "download");
    // The manifest is untrusted JSON: its type says 1, the object may not.
    const formatVersion = manifest.formatVersion as number;
    if (formatVersion !== BACKUP_FORMAT_VERSION) {
      throw new DatabaseBackupError(`Unsupported backup format version ${formatVersion}.`, 422);
    }

    const sha256 = await sha256File(dumpPath);
    if (sha256 !== manifest.dump.sha256) {
      throw new DatabaseBackupError(`Archive checksum mismatch (expected ${manifest.dump.sha256}, got ${sha256}). The archive is corrupt; nothing was restored.`, 422);
    }
    log("Checksum verified. Restoring (single transaction)…");

    await runTool("pg_restore", [
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      "--single-transaction",
      `--dbname=${options.targetUrl}`,
      dumpPath,
    ]);
    log("Restore finished. Verifying against the manifest…");

    const checks: RestoreCheck[] = [];
    await withClient(options.targetUrl, async (client) => {
      const inventory = await collectSchemaInventory(client);
      const expectedInventory = manifest.coverage.inventory;
      checks.push({
        item: "table set",
        expected: `${expectedInventory.tables.length} tables`,
        actual: `${inventory.tables.length} tables`,
        ok: JSON.stringify(inventory.tables) === JSON.stringify(expectedInventory.tables),
      });
      for (const key of ["columns", "primaryKeys", "foreignKeys", "uniqueConstraints", "checkConstraints", "indexes", "sequences", "views", "functions", "triggers", "enumTypes"] as const) {
        checks.push({
          item: `schema: ${key}`,
          expected: String(expectedInventory[key]),
          actual: String(inventory[key]),
          ok: expectedInventory[key] === inventory[key],
        });
      }
      checks.push({
        item: "schema: extensions",
        expected: expectedInventory.extensions.join(",") || "(none)",
        actual: inventory.extensions.join(",") || "(none)",
        ok: expectedInventory.extensions.every((e) => inventory.extensions.includes(e)),
      });
      for (const { table, rows } of manifest.coverage.tables) {
        const [schema, name] = table.split(/\.(.+)/);
        const ident = `${client.escapeIdentifier(schema)}.${client.escapeIdentifier(name)}`;
        const { rows: result } = await client.query<{ n: string }>(`select count(*)::text as n from ${ident}`);
        const actual = Number(result[0].n);
        checks.push({ item: `rows: ${table}`, expected: String(rows), actual: String(actual), ok: actual === rows });
      }
      for (const seq of manifest.coverage.sequences) {
        const [schema, name] = seq.sequence.split(/\.(.+)/);
        const ident = `${client.escapeIdentifier(schema)}.${client.escapeIdentifier(name)}`;
        const { rows: result } = await client.query<{ last_value: string; is_called: boolean }>(
          `select last_value::text, is_called from ${ident}`);
        const actual = `${result[0].last_value}${result[0].is_called ? "" : " (not called)"}`;
        const expected = `${seq.value}${seq.isCalled ? "" : " (not called)"}`;
        checks.push({ item: `sequence: ${seq.sequence}`, expected, actual, ok: actual === expected });
      }
    });

    let target = "target";
    try { target = databaseIdentity(options.targetUrl).replace(/^[^/]*\//, "<host>/"); } catch { /* keep generic */ }
    return {
      backupId: manifest.id,
      target,
      durationMs: Date.now() - started,
      checks,
      ok: checks.every((c) => c.ok),
    };
  });
}
