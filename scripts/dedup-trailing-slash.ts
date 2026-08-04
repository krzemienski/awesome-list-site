// One-off maintenance (executed Aug 4, 2026 against the dev DB): remove duplicate
// resources whose URLs differ only by trailing slash / percent-encoding.
//
// Plan (survivor/loser pairs) is committed at scripts/data/dedup-trailing-slash-plan.json;
// the journal of deleted row contents is committed at
// scripts/data/dedup-trailing-slash-journal.json. Re-running is a no-op safe failure:
// the script aborts if any loser id no longer exists (they were already deleted).
//
// Safety: strict integer validation of the plan, parameterized IN-lists via
// sql.join (no raw interpolation), all mutations in a single transaction.
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAN_PATH = path.join(HERE, "data", "dedup-trailing-slash-plan.json");
const JOURNAL_PATH = path.join(HERE, "data", "dedup-trailing-slash-journal.json");

type Pair = { survivor: number; loser: number };

function loadPlan(): Pair[] {
  const raw = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("plan must be a non-empty array");
  const survivors = new Set<number>();
  const losers = new Set<number>();
  for (const p of raw) {
    if (!Number.isSafeInteger(p?.survivor) || !Number.isSafeInteger(p?.loser) || p.survivor <= 0 || p.loser <= 0)
      throw new Error(`invalid pair: ${JSON.stringify(p)}`);
    if (p.survivor === p.loser) throw new Error(`self-referencing pair: ${p.survivor}`);
    if (losers.has(p.loser)) throw new Error(`duplicate loser: ${p.loser}`);
    survivors.add(p.survivor);
    losers.add(p.loser);
  }
  for (const l of losers) if (survivors.has(l)) throw new Error(`id ${l} is both loser and survivor`);
  return raw as Pair[];
}

const inList = (ids: number[]) => sql.join(ids.map((id) => sql`${id}`), sql`, `);

async function main() {
  const plan = loadPlan();
  const losers = plan.map((p) => p.loser);
  const survivors = plan.map((p) => p.survivor);

  await db.transaction(async (tx) => {
    // Preconditions: every loser and survivor must exist
    const found = await tx.execute(sql`SELECT count(*)::int AS n FROM resources WHERE id IN (${inList(losers)})`);
    if ((found.rows[0] as any).n !== losers.length)
      throw new Error(`only ${(found.rows[0] as any).n}/${losers.length} losers exist — already deleted or stale plan; aborting`);
    const sFound = await tx.execute(sql`SELECT count(*)::int AS n FROM resources WHERE id IN (${inList(survivors)})`);
    if ((sFound.rows[0] as any).n !== new Set(survivors).size)
      throw new Error("some survivors missing — aborting");

    // Journal full row contents before deleting
    const rows = await tx.execute(sql`SELECT row_to_json(r) AS j FROM resources r WHERE id IN (${inList(losers)})`);
    const auditRows = await tx.execute(sql`SELECT row_to_json(a) AS j FROM resource_audit_log a WHERE resource_id IN (${inList(losers)})`);
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify({ executedAt: new Date().toISOString(), plan, resources: rows.rows, auditLog: auditRows.rows }, null, 2));
    console.log(`journaled ${rows.rows.length} resource rows, ${auditRows.rows.length} audit rows -> ${JOURNAL_PATH}`);

    // Safety: no cascade / restrict children may reference losers
    for (const tbl of ["journey_steps", "resource_tags", "user_bookmarks", "user_favorites", "user_interactions", "enrichment_queue", "resource_edits"] as const) {
      const c = await tx.execute(sql`SELECT count(*)::int AS n FROM ${sql.raw(tbl)} WHERE resource_id IN (${inList(losers)})`);
      const n = (c.rows[0] as any).n;
      if (n > 0) throw new Error(`${tbl} has ${n} rows referencing losers — aborting`);
    }
    const rd = await tx.execute(sql`SELECT count(*)::int AS n FROM research_discoveries WHERE created_resource_id IN (${inList(losers)})`);
    if ((rd.rows[0] as any).n > 0) throw new Error("research_discoveries references losers — aborting");

    // Repoint audit log rows to survivors (instead of SET NULL), then delete
    for (const { survivor, loser } of plan) {
      await tx.execute(sql`UPDATE resource_audit_log SET resource_id = ${survivor} WHERE resource_id = ${loser}`);
    }
    const del = await tx.execute(sql`DELETE FROM resources WHERE id IN (${inList(losers)})`);
    if (del.rowCount !== losers.length) throw new Error(`expected to delete ${losers.length}, got ${del.rowCount} — rolling back`);
    console.log(`deleted ${del.rowCount} resources`);

    // Verify inside the transaction: survivors intact, no orphaned audit rows
    const surv = await tx.execute(sql`SELECT count(*)::int AS n FROM resources WHERE id IN (${inList(survivors)})`);
    if ((surv.rows[0] as any).n !== new Set(survivors).size) throw new Error("survivor lost — rolling back");
    const orph = await tx.execute(sql`SELECT count(*)::int AS n FROM resource_audit_log a WHERE a.resource_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM resources r WHERE r.id=a.resource_id)`);
    if ((orph.rows[0] as any).n > 0) throw new Error("orphaned audit rows — rolling back");
    console.log("verified: survivors intact, no orphaned audit rows");
  });
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
