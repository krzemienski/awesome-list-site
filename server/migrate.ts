import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Boot-time migration runner (used by server/index.ts in production).
 *
 * There is deliberately NO catch for Postgres 42P07 ("relation already
 * exists") here. A single migration file can batch many statements, so one
 * duplicate CREATE early in a file used to abort the whole batch while the
 * boot log claimed "schema already up to date" — silently skipping every
 * later statement (new columns/tables) and crashing later with "column does
 * not exist". All migrations must be idempotent (IF NOT EXISTS /
 * duplicate_object guards); a 42P07 now means a non-idempotent migration and
 * the boot fails loudly so it gets fixed instead of starting with a partial
 * schema.
 */
export async function runMigrations(databaseUrl: string = process.env.DATABASE_URL ?? '') {
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL is required');
  }

  // Check multiple possible migration folder locations
  const possiblePaths = [
    './migrations',
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '..', 'migrations'),
    path.join(process.cwd(), 'migrations'),
  ];

  let migrationsFolder: string | null = null;
  for (const p of possiblePaths) {
    const journalPath = path.join(p, 'meta', '_journal.json');
    if (fs.existsSync(journalPath)) {
      migrationsFolder = p;
      console.log(`Found migrations at: ${p}`);
      break;
    }
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  pool.on('error', (err) => {
    console.error('Database pool error during migration:', err.message);
  });

  // If no migrations folder found, verify database is already set up
  if (!migrationsFolder) {
    console.log('⚠️ No migrations folder found, checking if database is already configured...');
    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'resources'
        ) as exists
      `);
      client.release();
      await pool.end();

      if (result.rows[0]?.exists) {
        console.log('✓ Database schema already exists (configured via db:push)');
        return;
      } else {
        throw new Error('Migrations folder not found and database schema is missing. Please run db:push or ensure migrations are included in build.');
      }
    } catch (error: any) {
      await pool.end();
      throw error;
    }
  }

  try {
    const db = drizzle(pool);
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder });
    console.log('✓ Migrations completed successfully');

    // Belt-and-suspenders: prove the drizzle journal table actually recorded
    // every migration from migrations/meta/_journal.json. If migrate() ever
    // "succeeds" without recording everything (or a future change
    // reintroduces an error-swallowing path), we fail the boot instead of
    // starting with a possibly partial schema.
    await verifyMigrationJournal(pool, migrationsFolder);
    await pool.end();
  } catch (error: any) {
    await pool.end();
    if (error?.code === '42P07' || (error?.message?.includes('already exists') && error?.message?.includes('relation'))) {
      console.error(
        'Migration failed with "already exists" (42P07). This means a migration is NOT idempotent — ' +
        'the rest of its batched statements were rolled back and the schema may be incomplete. ' +
        'Fix the migration to use IF NOT EXISTS / duplicate_object guards. Refusing to start with a partial schema.'
      );
    }
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function verifyMigrationJournal(pool: InstanceType<typeof Pool>, migrationsFolder: string) {
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
  const entries: Array<{ tag: string; when: number }> = journal.entries ?? [];
  if (entries.length === 0) return;

  const lastWhen = Math.max(...entries.map((e) => e.when));

  const client = await pool.connect();
  try {
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
      ) as exists
    `);
    if (!tableExists.rows[0]?.exists) {
      throw new Error(
        'Migration journal table drizzle.__drizzle_migrations is missing after migrate() — ' +
        'the migrator did not record its work. Refusing to start with an unverified schema.'
      );
    }

    const result = await client.query(
      'SELECT COUNT(*)::int AS count, COALESCE(MAX(created_at), 0)::bigint AS max_created FROM drizzle.__drizzle_migrations'
    );
    const recordedCount = Number(result.rows[0]?.count ?? 0);
    const maxCreated = Number(result.rows[0]?.max_created ?? 0);

    if (recordedCount < entries.length || maxCreated < lastWhen) {
      throw new Error(
        `Migration journal is incomplete: migrations/meta/_journal.json has ${entries.length} entr(y/ies) ` +
        `(latest timestamp ${lastWhen}) but drizzle.__drizzle_migrations recorded ${recordedCount} ` +
        `(latest ${maxCreated}). Some migrations were skipped — refusing to start with a partial schema.`
      );
    }

    console.log(`✓ Migration journal verified: ${recordedCount} recorded, all ${entries.length} journal entr(y/ies) applied`);
  } finally {
    client.release();
  }
}
