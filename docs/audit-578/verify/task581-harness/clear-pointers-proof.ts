// Proves LearningJourneyRepository.clearProgressPointersToResource on DEV:
// run inside the caller's transaction, then delete the resource in that same
// transaction — before the helper existed this delete threw an FK violation.
import { db, pool } from "../../server/db/index";
import { LearningJourneyRepository } from "../../server/repositories/LearningJourneyRepository";
import { resources } from "../../shared/schema";
import { eq } from "drizzle-orm";

const P = "__qa_test_plan_581_";
const q = async (text: string, params: unknown[] = []) => (await pool.query(text, params)).rows;
const repo = new LearningJourneyRepository();
const ids: { journey?: number; resource?: number; user?: string } = {};
try {
  const [r] = await q(`INSERT INTO resources (title,url,description,category,status) VALUES ($1,$2,'x','Encoding & Codecs','approved') RETURNING id`, [`${P}clear_res`, `https://example.com/${P}clear`]);
  ids.resource = r.id;
  const [j] = await q(`INSERT INTO learning_journeys (title,description,category,status) VALUES ($1,'x','Encoding & Codecs','published') RETURNING id`, [`${P}clear_journey`]);
  ids.journey = j.id;
  const other = (await q(`SELECT id FROM resources WHERE status='approved' AND id<>$1 ORDER BY id LIMIT 2`, [r.id])).map((x: any) => x.id);
  const s = async (n: number, rid: number) => (await q(`INSERT INTO journey_steps (journey_id,resource_id,step_number,title) VALUES ($1,$2,$3,$4) RETURNING id`, [j.id, rid, n, `${P}s${n}`]))[0].id;
  const a = await s(1, other[0]);
  const b = await s(2, r.id);
  const c = await s(3, other[1]);
  ids.user = `${P}clear_user_${Date.now()}`;
  await q(`INSERT INTO users (id,email,role) VALUES ($1,$2,'user')`, [ids.user, `${ids.user}@example.com`]);
  await q(`INSERT INTO user_journey_progress (user_id,journey_id,current_step_id,completed_steps) VALUES ($1,$2,$3,$4::jsonb)`, [ids.user, j.id, b, JSON.stringify([a, b])]);
  const state = async () => ({
    steps: await q(`SELECT id, step_number, resource_id FROM journey_steps WHERE journey_id=$1 ORDER BY step_number`, [j.id]),
    progress: await q(`SELECT current_step_id, completed_steps, completed_at FROM user_journey_progress WHERE journey_id=$1`, [j.id]),
  });
  console.log("BEFORE", JSON.stringify(await state()));
  // Control: deleting the resource WITHOUT the helper fails on the progress pointer.
  try {
    await db.transaction(async (tx) => { await tx.delete(resources).where(eq(resources.id, r.id)); });
    console.log("CONTROL delete without helper: succeeded (unexpected)");
  } catch (e: any) {
    console.log("CONTROL delete without helper: rejected —", e?.cause?.code ?? e?.code, e?.cause?.constraint ?? e?.constraint ?? "");
  }
  const removed = await db.transaction(async (tx) => {
    const n = await repo.clearProgressPointersToResource(tx, r.id);
    await tx.delete(resources).where(eq(resources.id, r.id));
    return n;
  });
  ids.resource = undefined;
  console.log("HELPER removed rows:", removed);
  console.log("AFTER", JSON.stringify(await state()));
} finally {
  if (ids.journey) await q(`DELETE FROM learning_journeys WHERE id=$1`, [ids.journey]);
  if (ids.resource) await q(`DELETE FROM resources WHERE id=$1`, [ids.resource]);
  if (ids.user) await q(`DELETE FROM users WHERE id=$1`, [ids.user]);
  console.log("RESIDUE", JSON.stringify(await q(`SELECT (SELECT count(*) FROM learning_journeys WHERE title LIKE $1)::int j, (SELECT count(*) FROM resources WHERE title LIKE $1)::int r, (SELECT count(*) FROM users WHERE id LIKE $2)::int u`, [`${P}clear%`, `${P}clear%`])));
  await pool.end();
}
