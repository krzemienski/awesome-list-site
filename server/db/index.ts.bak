import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../../shared/schema';

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is required');
}

// Create PostgreSQL connection with limited pool for Neon serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Increased for better concurrency with Neon
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000, // Extended timeout for Neon cold starts
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

// Add error handler for connection issues
pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export pool for connection testing
export { pool };
