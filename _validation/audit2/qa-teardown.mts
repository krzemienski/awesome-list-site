import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = (sql: string, params?: any[]) => pool.query(sql, params);

// FK map: who references users / resources, and their delete rules
const fks = await q(`
  SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name IN ('users','resources')
  ORDER BY ccu.table_name, tc.table_name`);
console.log('FK MAP:');
for (const r of fks.rows) console.log(` ${r.ref_table} <- ${r.table_name}.${r.column_name} [${r.delete_rule}]`);

const users = await q(`SELECT id, email FROM users WHERE email LIKE '__qa_test_%'`);
console.log('\nQA USERS:', JSON.stringify(users.rows));
const res = await q(`SELECT id, title, status, submitted_by FROM resources WHERE title LIKE '__qa_test_%' OR url LIKE '%__qa_test%' OR submitted_by = ANY($1)`, [users.rows.map(u => u.id)]);
console.log('QA RESOURCES:', JSON.stringify(res.rows));
const approvedBefore = await q(`SELECT count(*)::int AS n FROM resources WHERE status='approved'`);
console.log('approved count (pre-teardown):', approvedBefore.rows[0].n);
await pool.end();
