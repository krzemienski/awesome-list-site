/**
 * Migration drift check.
 *
 * Fails loudly when the migrations/ folder can no longer reproduce
 * shared/schema.ts exactly, which would break a fresh production deploy.
 *
 * Steps:
 *  1. Journal integrity: every .sql file in migrations/ must have a matching
 *     entry in migrations/meta/_journal.json, and vice versa.
 *  2. Scratch database: create a throwaway DB on the same server, run the
 *     Drizzle migrator against it (same code path as server/index.ts boot),
 *     then run `drizzle-kit push` against the scratch DB and require that it
 *     reports no changes. Any reported change = drift between migrations and
 *     shared/schema.ts.
 *  3. Sequence drift (Task #282): for EVERY serial-id table in the real dev
 *     database, compare the owned sequence's next value against max(id).
 *     Imports/seeds that insert explicit ids leave the sequence behind, which
 *     later surfaces as intermittent 23505 "duplicate key" 500s on normal
 *     saves (the Task #215 resources bug — now checked for all tables).
 *
 * Usage:
 *   npx tsx scripts/check-migration-drift.ts
 *     Full check (journal + scratch-DB schema reproduction + sequence drift)
 *     against DATABASE_URL (development).
 *
 *   npx tsx scripts/check-migration-drift.ts --sequences-only [--database-url <url>]
 *     Run ONLY the read-only sequence-drift check (Step 3). Safe to point at
 *     the PRODUCTION database: it never creates/drops databases and only runs
 *     SELECTs. It reports drifted sequences with setval repair statements but
 *     NEVER applies them. The target URL comes from --database-url, else the
 *     SEQUENCE_CHECK_DATABASE_URL env var, else DATABASE_URL.
 *
 * Exit code 0 = clean, 1 = drift or error.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, 'meta', '_journal.json');
const SCRATCH_DB = 'mig_drift_check';

function fail(message: string): never {
  console.error(`\n❌ MIGRATION DRIFT CHECK FAILED\n\n${message}\n`);
  process.exit(1);
}

function checkJournal(): void {
  console.log('Step 1/3: journal integrity check...');

  if (!fs.existsSync(JOURNAL_PATH)) {
    fail(`Missing ${JOURNAL_PATH}. The migrations folder is corrupt — the boot-time migrator will not run anything without it.`);
  }

  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
  const journalTags: string[] = (journal.entries ?? []).map((e: any) => e.tag);

  const sqlFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.replace(/\.sql$/, ''));

  const orphanedFiles = sqlFiles.filter((f) => !journalTags.includes(f));
  const missingFiles = journalTags.filter((t) => !sqlFiles.includes(t));

  if (orphanedFiles.length > 0) {
    fail(
      `These .sql files exist in migrations/ but have NO entry in meta/_journal.json, so the boot-time migrator will silently skip them:\n` +
        orphanedFiles.map((f) => `  - migrations/${f}.sql`).join('\n') +
        `\n\nNever hand-drop .sql files into migrations/. Regenerate with: npx drizzle-kit generate`
    );
  }

  if (missingFiles.length > 0) {
    fail(
      `These journal entries reference .sql files that do not exist — the migrator will crash at boot:\n` +
        missingFiles.map((t) => `  - ${t} (expected migrations/${t}.sql)`).join('\n')
    );
  }

  console.log(`  ✓ ${sqlFiles.length} migration file(s), all journaled, no orphans.`);
}

function scratchUrl(baseUrl: string): string {
  const u = new URL(baseUrl);
  u.pathname = `/${SCRATCH_DB}`;
  return u.toString();
}

async function withAdminPool<T>(baseUrl: string, fn: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: baseUrl, max: 1, connectionTimeoutMillis: 15000 });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

async function checkSchemaReproduction(baseUrl: string): Promise<void> {
  console.log('Step 2/3: schema reproduction check on scratch database...');

  await withAdminPool(baseUrl, async (admin) => {
    await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${SCRATCH_DB}`);
  });
  console.log(`  ✓ Created scratch database "${SCRATCH_DB}".`);

  const scratch = scratchUrl(baseUrl);

  try {
    // Run the migrator exactly like server/index.ts does at boot.
    const pool = new Pool({ connectionString: scratch, max: 1, connectionTimeoutMillis: 15000 });
    try {
      const db = drizzle(pool);
      await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    } finally {
      await pool.end();
    }
    console.log('  ✓ Drizzle migrator ran cleanly against the scratch database.');

    // Now ask drizzle-kit to diff shared/schema.ts against the migrated scratch DB.
    const result = spawnSync('npx', ['drizzle-kit', 'push', '--force'], {
      env: { ...process.env, DATABASE_URL: scratch },
      encoding: 'utf8',
      timeout: 120000,
    });

    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    if (result.status !== 0) {
      fail(`drizzle-kit push exited with code ${result.status}:\n\n${output}`);
    }

    const noChanges = /no changes detected/i.test(output);
    if (!noChanges) {
      fail(
        `drizzle-kit push found differences between shared/schema.ts and what migrations/ produces.\n` +
          `A fresh production deploy WOULD NOT match the schema the code expects ("column does not exist" at runtime).\n\n` +
          `drizzle-kit output:\n${output}\n` +
          `Fix: run "npx drizzle-kit generate" to create the missing migration, then re-run this check.\n` +
          `Reminder: keep new migrations idempotent (prod's journal table may be empty, so the whole chain re-runs at boot; ` +
          `a non-idempotent statement now FAILS the boot loudly — see scripts/verify-boot-migration-safety.ts).`
      );
    }

    console.log('  ✓ drizzle-kit push reports no changes — migrations reproduce shared/schema.ts exactly.');
  } finally {
    await withAdminPool(baseUrl, async (admin) => {
      await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`);
    });
    console.log(`  ✓ Dropped scratch database "${SCRATCH_DB}".`);
  }
}

interface DriftedSequence {
  table: string;
  column: string;
  sequence: string;
  nextValue: number;
  maxId: number;
  repair: string;
}

async function checkSequenceDrift(baseUrl: string): Promise<void> {
  console.log('Step 3/3: id-sequence drift check (every serial-id table)...');

  await withAdminPool(baseUrl, async (pool) => {
    // Find every sequence OWNED BY a table column (covers serial/bigserial
    // and identity-backed columns) in the public schema.
    const { rows: seqs } = await pool.query(`
      SELECT seq.relname  AS sequence,
             tab.relname  AS table,
             attr.attname AS column
      FROM pg_class seq
      JOIN pg_depend d    ON d.objid = seq.oid AND d.deptype IN ('a', 'i')
      JOIN pg_class tab   ON tab.oid = d.refobjid
      JOIN pg_attribute attr ON attr.attrelid = tab.oid AND attr.attnum = d.refobjsubid
      WHERE seq.relkind = 'S'
        AND seq.relnamespace = 'public'::regnamespace
        AND tab.relkind = 'r'
      ORDER BY tab.relname
    `);

    if (seqs.length === 0) {
      fail('Found no table-owned sequences in the public schema — that is unexpected for this app.');
    }

    const drifted: DriftedSequence[] = [];

    for (const s of seqs) {
      const seqIdent = `"public"."${s.sequence}"`;
      const [{ rows: seqRows }, { rows: maxRows }] = await Promise.all([
        pool.query(`SELECT last_value, is_called FROM ${seqIdent}`),
        pool.query(`SELECT COALESCE(max("${s.column}"), 0) AS max_id FROM "public"."${s.table}"`),
      ]);
      const lastValue = Number(seqRows[0].last_value);
      const isCalled = Boolean(seqRows[0].is_called);
      const nextValue = isCalled ? lastValue + 1 : lastValue;
      const maxId = Number(maxRows[0].max_id);

      if (maxId > 0 && nextValue <= maxId) {
        drifted.push({
          table: s.table,
          column: s.column,
          sequence: s.sequence,
          nextValue,
          maxId,
          repair: `SELECT setval('${s.sequence}', (SELECT COALESCE(max("${s.column}"), 1) FROM "${s.table}"));`,
        });
      }
    }

    if (drifted.length > 0) {
      fail(
        `${drifted.length} id sequence(s) are BEHIND their table's max(id). The next insert on these tables ` +
          `will fail with 23505 duplicate-key (the intermittent-500 pattern from Task #215):\n\n` +
          drifted
            .map(
              (d) =>
                `  - ${d.table}.${d.column}: sequence ${d.sequence} would issue ${d.nextValue}, but max(${d.column}) = ${d.maxId}`,
            )
            .join('\n') +
          `\n\nRepair by running:\n` +
          drifted.map((d) => `  ${d.repair}`).join('\n') +
          `\n\nRoot cause is usually an import/seed that inserted explicit ids without resyncing the sequence afterward.`,
      );
    }

    console.log(`  ✓ ${seqs.length} serial-id sequence(s) checked — none behind max(id).`);
  });
}

function parseArgs(argv: string[]): { sequencesOnly: boolean; databaseUrl?: string } {
  let sequencesOnly = false;
  let databaseUrl: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--sequences-only') {
      sequencesOnly = true;
    } else if (arg === '--database-url') {
      databaseUrl = argv[++i];
      if (!databaseUrl) fail('--database-url requires a value.');
    } else if (arg.startsWith('--database-url=')) {
      databaseUrl = arg.slice('--database-url='.length);
    } else {
      fail(`Unknown argument: ${arg}\nSupported: --sequences-only, --database-url <url>`);
    }
  }
  if (databaseUrl && !sequencesOnly) {
    fail(
      '--database-url is only allowed with --sequences-only.\n' +
        'The full check creates and drops a scratch database, which must NEVER run against production.'
    );
  }
  return { sequencesOnly, databaseUrl };
}

async function main() {
  const { sequencesOnly, databaseUrl } = parseArgs(process.argv.slice(2));

  if (sequencesOnly) {
    const url = databaseUrl ?? process.env.SEQUENCE_CHECK_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) {
      fail('No database URL: pass --database-url, or set SEQUENCE_CHECK_DATABASE_URL or DATABASE_URL.');
    }
    const source = databaseUrl
      ? '--database-url'
      : process.env.SEQUENCE_CHECK_DATABASE_URL
        ? 'SEQUENCE_CHECK_DATABASE_URL'
        : 'DATABASE_URL';
    console.log(`Sequences-only mode (read-only) against ${source}. No schema/scratch-DB steps will run.`);
    await checkSequenceDrift(url);
    console.log('\n✅ No id-sequence drift.');
    return;
  }

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    fail('DATABASE_URL is not set.');
  }

  checkJournal();
  await checkSchemaReproduction(baseUrl);
  await checkSequenceDrift(baseUrl);

  console.log('\n✅ No migration drift: migrations/ fully reproduces shared/schema.ts, and no id-sequence drift.');
}

main().catch((err) => {
  fail(`Unexpected error: ${err?.stack ?? err}`);
});
