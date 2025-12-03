import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';

async function applyMigration() {
  console.log('📦 Applying enhanced audit logging migration...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Read and execute migration
    const migrationSql = readFileSync('supabase/migrations/20251202100000_enhanced_audit_logging.sql', 'utf-8');

    console.log('Executing migration SQL...');

    // Execute as raw SQL
    await client.unsafe(migrationSql);

    console.log('✅ Migration applied successfully');

    // Verify columns exist
    const result = await client`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'resource_audit_log'
      AND column_name IN ('endpoint', 'http_method', 'session_id')
      ORDER BY column_name
    `;

    console.log('Verification - New columns:', result.map(r => r.column_name));

    await client.end();
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    await client.end();
    throw error;
  }
}

applyMigration();
