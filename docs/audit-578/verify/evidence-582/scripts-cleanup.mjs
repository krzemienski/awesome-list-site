// Cleanup for task 582 fixtures: Clerk users first, wait, then local rows by exact id.
import fs from "node:fs";
import { loadState, q, pool, clerk, PREFIX } from "./lib.mjs";
const s = loadState();
const out = { startedAt: new Date().toISOString(), steps: [] };
const step = (label, data) => { out.steps.push({ label, ...data }); console.log(label, JSON.stringify(data)); };

const phase = process.argv[2] ?? "all";
if (phase === "clerk" || phase === "all") {
  for (const [k, u] of Object.entries(s.users)) {
    try { await clerk("DELETE", `/users/${u.clerkId}`); step(`clerk delete ${k}`, { clerkId: u.clerkId, ok: true }); }
    catch (e) { step(`clerk delete ${k}`, { clerkId: u.clerkId, error: String(e).slice(0, 200) }); }
  }
  if (phase === "all") await new Promise((r) => setTimeout(r, 90000));
}
if (phase === "db" || phase === "all") {
  const resIds = Object.values(s.resources).map((r) => r.id);
  const userIds = Object.values(s.users).map((u) => u.localId);
  const extraRes = await q(`SELECT id FROM resources WHERE (title LIKE $1 OR url LIKE $2) AND NOT (id = ANY($3::int[]))`, [PREFIX + "%", "%" + PREFIX + "%", resIds]);
  step("unexpected extra prefixed resources", { rows: extraRes });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const fks = (await client.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' AND ccu.table_name IN ('resources','users') AND ccu.column_name='id'`)).rows;
    // resource_edits first (they reference both), then other children, then parents
    const del = async (sql, params, label) => { const r = await client.query(sql, params); step(label, { deleted: r.rowCount }); };
    await del(`DELETE FROM resource_edits WHERE resource_id = ANY($1::int[]) OR submitted_by = ANY($2::text[])`, [resIds, userIds], "resource_edits");
    await del(`DELETE FROM resource_audit_log WHERE resource_id = ANY($1::int[])`, [resIds], "resource_audit_log");
    for (const fk of fks) {
      if (["resource_edits", "resource_audit_log", "resources"].includes(fk.table_name) && fk.ref_table === "resources") continue;
      if (fk.table_name === "resource_edits") continue;
      const ids = fk.ref_table === "resources" ? resIds : userIds;
      const cast = fk.ref_table === "resources" ? "int[]" : "text[]";
      await del(`DELETE FROM "${fk.table_name}" WHERE "${fk.column_name}" = ANY($1::${cast})`, [ids], `${fk.table_name}.${fk.column_name}->${fk.ref_table}`);
    }
    await del(`DELETE FROM resources WHERE id = ANY($1::int[])`, [resIds], "resources");
    await del(`DELETE FROM users WHERE id = ANY($1::text[])`, [userIds], "users");
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); step("ROLLBACK", { error: String(e).slice(0, 400) }); }
  finally { client.release(); }
  const residue = (await q(`SELECT
    (SELECT count(*) FROM users WHERE id LIKE $1 OR email LIKE $1)::int AS users,
    (SELECT count(*) FROM resources WHERE title LIKE $1 OR url LIKE $2)::int AS resources,
    (SELECT count(*) FROM resource_edits WHERE resource_id = ANY($3::int[]) OR submitted_by LIKE $1 OR proposed_data::text LIKE $2)::int AS resource_edits,
    (SELECT count(*) FROM resource_audit_log WHERE resource_id = ANY($3::int[]) OR performed_by LIKE $1)::int AS audit_rows`,
    [PREFIX + "%", "%" + PREFIX + "%", resIds]))[0];
  step("residue", residue);
}
fs.writeFileSync(`/tmp/qa582/cleanup-${phase}.json`, JSON.stringify(out, null, 2));
await pool.end();
