/**
 * Test Setup File
 *
 * This file is automatically run before every test file by Vitest (setupFiles).
 * It runs BEFORE the test file's imports are evaluated, so it is the correct
 * place to re-point DATABASE_URL at the dedicated test database. This guarantees
 * that both the app under test (server/db) and the test helpers connect to the
 * isolated test database and can never touch dev/prod data.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import dotenv from 'dotenv';
import { deriveTestDatabaseUrl, getDatabaseName, isTestDatabaseName } from './helpers/test-db-url';

// Load environment variables from .env file
dotenv.config();

// Hard-redirect every DB connection made during tests to the dedicated test
// database. deriveTestDatabaseUrl throws if DATABASE_URL is missing, so the
// suite refuses to run rather than connecting somewhere unsafe.
const testDatabaseUrl = deriveTestDatabaseUrl();
const testDbName = getDatabaseName(testDatabaseUrl);

// Final safety gate: the target MUST be a dedicated test database. If for any
// reason it is not, fail loudly instead of risking live data.
if (!isTestDatabaseName(testDbName)) {
  throw new Error(
    `Refusing to run tests: resolved database "${testDbName}" is not a dedicated ` +
      `test database. Set DATABASE_URL (or TEST_DATABASE_URL) to a database whose ` +
      `name contains "test".`,
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = 'test';

// Import AFTER DATABASE_URL is rewritten so the helper's lazy pool uses the test DB.
const { cleanupDatabase } = await import('./helpers/db-helper');

// Global test setup
beforeAll(async () => {
  console.log(`🧪 Setting up test environment (database: ${testDbName})...`);
});

// Cleanup after each test to ensure test isolation
afterEach(async () => {
  await cleanupDatabase();
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});
