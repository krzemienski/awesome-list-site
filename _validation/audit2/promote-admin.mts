import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const email = process.argv[2];
const r = await pool.query("UPDATE users SET role='admin' WHERE email=$1 RETURNING id,email,role", [email]);
console.log(JSON.stringify(r.rows));
await pool.end();
