import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../../shared/schema';

// Create PostgreSQL connection with a conservative pool.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// Add error handler for connection issues
pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export pool for connection testing
export { pool };