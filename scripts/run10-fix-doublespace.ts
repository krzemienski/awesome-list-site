// BUG-052 (run10): collapse runs of 2+ spaces in resource descriptions (dev DB).
// Prod counterpart requires admin API access (admin credentials via ADMIN_PASSWORD secret).
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const before = await db.execute(
    sql`SELECT COUNT(*)::int AS cnt FROM resources WHERE description LIKE '%  %'`
  );
  console.log("before:", JSON.stringify(before.rows));

  const updated = await db.execute(
    sql`UPDATE resources
        SET description = regexp_replace(description, '  +', ' ', 'g')
        WHERE description LIKE '%  %'
        RETURNING id`
  );
  console.log("updated ids:", updated.rows.map((r: any) => r.id).join(", "));

  const after = await db.execute(
    sql`SELECT COUNT(*)::int AS cnt FROM resources WHERE description LIKE '%  %'`
  );
  console.log("after:", JSON.stringify(after.rows));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
