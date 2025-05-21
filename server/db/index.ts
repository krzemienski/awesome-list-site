import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../shared/schema';

// Create PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });