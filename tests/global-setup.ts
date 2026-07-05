/**
 * Vitest global setup
 *
 * Runs ONCE before any test file. It provisions a dedicated test database
 * (separate from the dev/prod database) and applies the current schema to it.
 * This guarantees the destructive per-test cleanup can only ever touch the
 * isolated test database, never live seeded data.
 */

import { execFileSync } from 'node:child_process';
import pkg from 'pg';
import dotenv from 'dotenv';
import {
  deriveTestDatabaseUrl,
  deriveMaintenanceUrl,
  getDatabaseName,
} from './helpers/test-db-url';

const { Client } = pkg;

export default async function globalSetup() {
  // Load .env so DATABASE_URL is available exactly like the app sees it.
  dotenv.config();

  const testDatabaseUrl = deriveTestDatabaseUrl();
  const testDbName = getDatabaseName(testDatabaseUrl);

  console.log(`🧪 Provisioning dedicated test database "${testDbName}"...`);

  // If the derived URL is the same as DATABASE_URL, the operator explicitly
  // pointed DATABASE_URL at a test database; nothing to create.
  const rawUrl = process.env.DATABASE_URL;
  if (rawUrl && testDatabaseUrl !== rawUrl) {
    const maintenanceUrl = deriveMaintenanceUrl();
    const client = new Client({ connectionString: maintenanceUrl, connectionTimeoutMillis: 15000 });
    await client.connect();
    try {
      const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDbName]);
      if (exists.rowCount === 0) {
        // Identifier cannot be parameterized; testDbName is derived from our own
        // DATABASE_URL + a fixed suffix, so it is not user-controlled input.
        await client.query(`CREATE DATABASE "${testDbName}"`);
        console.log(`🧪 Created test database "${testDbName}".`);
      }
    } finally {
      await client.end();
    }
  }

  // Apply the current schema to the test database via drizzle-kit push.
  console.log('🧪 Applying schema to test database...');
  execFileSync('npx', ['drizzle-kit', 'push', '--force'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });

  console.log('🧪 Test database is ready.');
}
