// Deterministic true race: the approval's duplicate pre-check runs while a
// competing write holds B's URL change uncommitted, so the pre-check passes and
// the UPDATE then fails on the resources.url unique index (PostgreSQL 23505).
import { api, q, pool, loadState, saveState, record, flush } from "./lib.mjs";
const s = loadState();
const { submitter: A, admin: ADM } = s.users;
const R = s.resources;
const target = `https://example.com/${s.run}_uncommitted_race2`;
const e = await api(A, "POST", `/api/resources/${R.race.id}/edits`, { proposedData: { url: target, title: `${R.race.title} race title 2` } });
record("C05-23505 proposal", { status: e.status, id: e.body?.id });
const before = (await q(`SELECT title, url FROM resources WHERE id=$1`, [R.race.id]))[0];
const competitor = await pool.connect();
await competitor.query("BEGIN");
await competitor.query(`UPDATE resources SET url=$1 WHERE id=$2`, [target, R.url_b.id]);
const pending = api(ADM, "POST", `/api/admin/resource-edits/${e.body?.id}/approve`, {});
await new Promise(r => setTimeout(r, 1200));
await competitor.query("COMMIT");
competitor.release();
const ap = await pending;
record("C05-23505 approve while competitor commits", { status: ap.status, body: ap.body });
record("C05-23505 after", {
  before,
  after: (await q(`SELECT title, url FROM resources WHERE id=$1`, [R.race.id]))[0],
  b: (await q(`SELECT url FROM resources WHERE id=$1`, [R.url_b.id]))[0],
  edit: (await q(`SELECT status FROM resource_edits WHERE id=$1`, [e.body?.id]))[0],
});
s.edits.race23505b = e.body?.id;
saveState(s);
flush("/tmp/qa582/race23505.json");
await pool.end();
