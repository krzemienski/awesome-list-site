import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%journey%'");
console.log('journey tables:', t.rows.map(r => r.table_name).join(', '));
for (const tbl of t.rows.map(r => r.table_name)) {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND data_type IN ('text','character varying')", [tbl]);
  const textCols = cols.rows.map(c => c.column_name);
  if (!textCols.length) continue;
  const where = textCols.map(c => `"${c}" LIKE '%__qa_test%'`).join(' OR ');
  const n = (await pool.query(`SELECT count(*)::int AS n FROM "${tbl}" WHERE ${where}`)).rows[0].n;
  console.log(`${tbl}: ${n} __qa_test rows`);
}
const u = (await pool.query("SELECT count(*)::int AS n FROM users WHERE email LIKE '%__qa_test%' OR COALESCE(first_name,'') LIKE '%__qa_test%'")).rows[0].n;
const r = (await pool.query("SELECT count(*)::int AS n FROM resources WHERE title LIKE '%__qa_test%' OR url LIKE '%__qa_test%' OR COALESCE(description,'') LIKE '%__qa_test%'")).rows[0].n;
const a = (await pool.query("SELECT count(*)::int AS n FROM resources WHERE status='approved'")).rows[0].n;
console.log(`users=${u} resources=${r} approved=${a}`);
await pool.end();
