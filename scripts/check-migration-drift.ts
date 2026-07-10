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
 *
 * Usage: npx tsx scripts/check-migration-drift.ts
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
  console.log('Step 1/2: journal integrity check...');

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
  console.log('Step 2/2: schema reproduction check on scratch database...');

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

async function main() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    fail('DATABASE_URL is not set.');
  }

  checkJournal();
  await checkSchemaReproduction(baseUrl);

  console.log('\n✅ No migration drift: migrations/ fully reproduces shared/schema.ts.');
}

main().catch((err) => {
  fail(`Unexpected error: ${err?.stack ?? err}`);
});
