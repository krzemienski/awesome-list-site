/**
 * Test Setup File
 *
 * This file is automatically run before all tests by Vitest.
 * It sets up the test environment, database connections, and global utilities.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { cleanupDatabase } from './helpers/db-helper';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Ensure we're using a test database
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Warn if not using a test database (safety check)
if (!databaseUrl.includes('test') && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  WARNING: Not using a test database. Set NODE_ENV=test or use a database URL containing "test"');
}

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
});

// Cleanup after each test to ensure test isolation
afterEach(async () => {
  await cleanupDatabase();
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});
