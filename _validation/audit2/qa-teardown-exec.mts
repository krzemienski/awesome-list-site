import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
try {
  await c.query('BEGIN');
  const users = await c.query(`SELECT id FROM users WHERE email LIKE '__qa_test_%'`);
  const uids = users.rows.map(u => u.id);
  const res = await c.query(`SELECT id FROM resources WHERE title LIKE '__qa_test_%' OR url LIKE '%__qa_test%' OR submitted_by = ANY($1)`, [uids]);
  const rids = res.rows.map(r => r.id);

  // resource children with NO ACTION
  console.log('resource_edits del:', (await c.query(`DELETE FROM resource_edits WHERE resource_id = ANY($1) OR submitted_by = ANY($2) OR handled_by = ANY($2)`, [rids, uids])).rowCount);
  console.log('research_discoveries nulled:', (await c.query(`UPDATE research_discoveries SET created_resource_id = NULL WHERE created_resource_id = ANY($1)`, [rids])).rowCount);
  // delete resources (audit_log SET NULL, rest CASCADE)
  console.log('resources del:', (await c.query(`DELETE FROM resources WHERE id = ANY($1)`, [rids])).rowCount);
  // user refs with NO ACTION
  console.log('resources.approved_by nulled:', (await c.query(`UPDATE resources SET approved_by = NULL WHERE approved_by = ANY($1)`, [uids])).rowCount);
  console.log('enrichment_jobs nulled:', (await c.query(`UPDATE enrichment_jobs SET started_by = NULL WHERE started_by = ANY($1)`, [uids])).rowCount);
  console.log('research_jobs nulled:', (await c.query(`UPDATE research_jobs SET started_by = NULL WHERE started_by = ANY($1)`, [uids])).rowCount);
  console.log('github_sync nulled:', (await c.query(`UPDATE github_sync_history SET performed_by = NULL WHERE performed_by = ANY($1)`, [uids])).rowCount);
  console.log('users del:', (await c.query(`DELETE FROM users WHERE id = ANY($1)`, [uids])).rowCount);
  await c.query('COMMIT');
} catch (e) {
  await c.query('ROLLBACK');
  console.error('ROLLED BACK:', e);
  process.exit(1);
} finally { c.release(); }

// verify net-zero
const v1 = await pool.query(`SELECT count(*)::int AS n FROM users WHERE email LIKE '__qa_test_%'`);
const v2 = await pool.query(`SELECT count(*)::int AS n FROM resources WHERE title LIKE '__qa_test_%' OR url LIKE '%__qa_test%'`);
const v3 = await pool.query(`SELECT count(*)::int AS n FROM resources WHERE status='approved'`);
const v4 = await pool.query(`SELECT count(*)::int AS n FROM resource_edits re LEFT JOIN resources r ON re.resource_id = r.id WHERE r.id IS NULL AND re.resource_id IS NOT NULL`);
console.log(`VERIFY: qa_users=${v1.rows[0].n} qa_resources=${v2.rows[0].n} approved=${v3.rows[0].n} orphan_edits=${v4.rows[0].n}`);
await pool.end();
