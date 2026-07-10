/**
 * Boot migration safety proof.
 *
 * Proves that the production boot migrator (server/migrate.ts runMigrations —
 * the exact code path server/index.ts runs) can no longer silently skip
 * migrations:
 *
 *  Scenario A (half-applied schema, empty journal):
 *    Apply only the first half of the baseline's statements to a scratch DB
 *    (simulating the old aborted-batch failure mode), then run the boot
 *    migrator. It must COMPLETE the schema (idempotent baseline re-runs
 *    cleanly), record the journal, and pass journal verification.
 *
 *  Scenario B (full schema + a non-idempotent new migration):
 *    Scratch DB has the full baseline schema but an empty journal (like a
 *    db:push-provisioned prod DB) and the migrations folder contains a new
 *    migration whose first statement is a duplicate CREATE (no IF NOT EXISTS)
 *    followed by a new table. The boot must FAIL LOUDLY (42P07 propagates)
 *    instead of printing "schema already up to date" — and must NOT have
 *    half-started.
 *
 * Usage: npx tsx scripts/verify-boot-migration-safety.ts
 * Exit code 0 = both scenarios pass, 1 = failure.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Pool } from 'pg';
import { runMigrations } from '../server/migrate';

const SCRATCH_DB = 'boot_mig_safety';
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const BASELINE = path.join(MIGRATIONS_DIR, '0000_baseline.sql');

function fail(message: string): never {
  console.error(`\n❌ BOOT MIGRATION SAFETY PROOF FAILED\n\n${message}\n`);
  process.exit(1);
}

function scratchUrl(baseUrl: string): string {
  const u = new URL(baseUrl);
  u.pathname = `/${SCRATCH_DB}`;
  return u.toString();
}

async function withPool<T>(url: string, fn: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15000 });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

async function recreateScratch(baseUrl: string): Promise<string> {
  await withPool(baseUrl, async (admin) => {
    await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${SCRATCH_DB}`);
  });
  return scratchUrl(baseUrl);
}

function baselineStatements(): string[] {
  return fs
    .readFileSync(BASELINE, 'utf8')
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function tableExists(pool: Pool, schema: string, table: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2) as exists`,
    [schema, table]
  );
  return r.rows[0]?.exists === true;
}

async function scenarioA(baseUrl: string) {
  console.log('\n=== Scenario A: half-applied schema, empty journal ===');
  const scratch = await recreateScratch(baseUrl);

  const statements = baselineStatements();
  const half = Math.floor(statements.length / 2);
  await withPool(scratch, async (pool) => {
    for (let i = 0; i < half; i++) {
      await pool.query(statements[i]);
    }
  });
  console.log(`  Applied ${half}/${statements.length} baseline statements (partial schema, no journal).`);

  await withPool(scratch, async (pool) => {
    const idx = await pool.query(
      `SELECT COUNT(*)::int AS c FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_preferences_user_id'`
    );
    if (Number(idx.rows[0].c) !== 0) {
      fail('Setup error: final baseline index already exists — the half split did not produce a partial schema.');
    }
  });

  // Run the REAL boot migrator against the half-applied DB.
  await runMigrations(scratch);

  await withPool(scratch, async (pool) => {
    for (const t of ['users', 'user_preferences', 'resources', 'agent_events']) {
      if (!(await tableExists(pool, 'public', t))) {
        fail(`Boot migrator "succeeded" but table "${t}" is missing — schema is still partial.`);
      }
    }
    const journal = await pool.query('SELECT COUNT(*)::int AS c FROM drizzle.__drizzle_migrations');
    if (Number(journal.rows[0].c) < 1) {
      fail('Boot migrator completed but recorded nothing in drizzle.__drizzle_migrations.');
    }
    const idx = await pool.query(
      `SELECT COUNT(*)::int AS c FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_preferences_user_id'`
    );
    if (Number(idx.rows[0].c) !== 1) {
      fail('Final index of the baseline (idx_user_preferences_user_id) missing — tail statements were skipped.');
    }
  });
  console.log('  ✓ Boot COMPLETED the half-applied schema (all tables + final index present, journal recorded).');
}

async function scenarioB(baseUrl: string) {
  console.log('\n=== Scenario B: non-idempotent new migration must fail loudly ===');
  const scratch = await recreateScratch(baseUrl);

  // Full baseline schema, empty journal (mimics a db:push-provisioned prod DB).
  await withPool(scratch, async (pool) => {
    for (const stmt of baselineStatements()) {
      await pool.query(stmt);
    }
  });
  console.log('  Applied full baseline schema directly (journal table absent).');

  // Build a temp migrations folder: baseline + a bad 0001 migration whose
  // first statement duplicates an existing table (non-idempotent) and whose
  // second statement creates a genuinely new table.
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bootmig-'));
  const tmpMig = path.join(tmpRoot, 'migrations');
  fs.cpSync(MIGRATIONS_DIR, tmpMig, { recursive: true });
  fs.writeFileSync(
    path.join(tmpMig, '0001_bad_nonidempotent.sql'),
    `CREATE TABLE "users" ("id" serial PRIMARY KEY);--> statement-breakpoint\nCREATE TABLE "brand_new_table_xyz" ("id" serial PRIMARY KEY);\n`
  );
  const journalPath = path.join(tmpMig, 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
  journal.entries.push({ idx: 1, version: '7', when: Date.now(), tag: '0001_bad_nonidempotent', breakpoints: true });
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));

  // runMigrations resolves './migrations' relative to cwd first.
  const originalCwd = process.cwd();
  process.chdir(tmpRoot);
  let threw = false;
  let errMessage = '';
  try {
    await runMigrations(scratch);
  } catch (err: any) {
    threw = true;
    errMessage = String(err?.message ?? err);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  if (!threw) {
    fail(
      'Boot migrator did NOT throw on a non-idempotent migration — the old "already up to date" swallow is back. ' +
      'A prod boot would have started with a partial schema.'
    );
  }
  if (!/already exists/i.test(errMessage)) {
    fail(`Boot migrator threw, but not the expected 42P07 "already exists" error. Got: ${errMessage}`);
  }
  await withPool(scratch, async (pool) => {
    if (await tableExists(pool, 'public', 'brand_new_table_xyz')) {
      fail('The bad migration was half-applied (brand_new_table_xyz exists) — batch was not rolled back.');
    }
  });
  console.log(`  ✓ Boot FAILED LOUDLY ("${errMessage.slice(0, 60)}...") and nothing was half-applied.`);
}

async function main() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) fail('DATABASE_URL is not set.');

  try {
    await scenarioA(baseUrl);
    await scenarioB(baseUrl);
  } finally {
    await withPool(baseUrl, async (admin) => {
      await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`);
    });
  }

  console.log('\n✅ Boot migration safety proven: completes partial schemas, fails loudly on non-idempotent migrations.');
  process.exit(0);
}

main().catch((err) => {
  fail(`Unexpected error: ${err?.stack ?? err}`);
});
