/**
 * Task #243 (run25) QA fixtures — THROWAWAY data for admin-panel verification.
 * Usage: npx tsx scripts/qa/run25-task243-fixtures.ts [setup|teardown]
 * All rows are tagged __qa_test so teardown is a sweep; net-zero required.
 */
import { db } from "../../server/db";
import { users, resourceEdits, resources } from "../../shared/schema";
import { eq, like, inArray, sql } from "drizzle-orm";

const MODE = process.argv[2] || "setup";

async function setup() {
  // 1) 25 throwaway users so the Users pager (20/page) renders and sorts are testable.
  const rows = Array.from({ length: 25 }, (_, i) => ({
    id: `__qa_test_243_user_${i + 1}`,
    email: `__qa_test_243_${String(i + 1).padStart(2, "0")}@example.com`,
    firstName: `Qa${String.fromCharCode(65 + (i % 26))}`,
    lastName: `Test${25 - i}`,
    role: "user",
  }));
  for (const r of rows) {
    await db
      .insert(users)
      .values(r as any)
      .onConflictDoNothing();
  }

  // 2) One legacy-style pending edit whose proposed title is zero-width only
  //    (inserted directly — the API now rejects these) to verify the review
  //    UI visualizes invisible characters instead of a blank "+ " line.
  const [resource] = await db.select().from(resources).where(eq(resources.id, 185090));
  if (!resource) throw new Error("fixture resource 185090 missing");
  const [edit] = await db
    .insert(resourceEdits)
    .values({
      resourceId: resource.id,
      submittedBy: rows[0].id,
      status: "pending",
      originalResourceUpdatedAt: resource.updatedAt ?? new Date(),
      proposedChanges: { title: { old: resource.title, new: "\u200B\u200B\u200B" } },
      proposedData: { title: "\u200B\u200B\u200B" },
    } as any)
    .returning();
  console.log(JSON.stringify({ ok: true, users: rows.length, editId: edit.id }));
}

async function teardown() {
  const qaUsers = await db.select({ id: users.id }).from(users).where(like(users.email, "__qa_test_243_%"));
  const ids = qaUsers.map((u) => u.id);
  let editsDeleted = 0;
  if (ids.length > 0) {
    const del = await db.delete(resourceEdits).where(inArray(resourceEdits.submittedBy, ids)).returning({ id: resourceEdits.id });
    editsDeleted = del.length;
    await db.delete(users).where(inArray(users.id, ids));
  }
  // Any pending zero-width fixture edits + curl-created dup-check edits,
  // regardless of submitter:
  const stray = await db.execute(
    sql`DELETE FROM resource_edits WHERE proposed_data->>'title' = ${"\u200B\u200B\u200B"} OR proposed_data->>'title' LIKE '__qa_test_243%' RETURNING id`
  );
  const remaining = await db.select({ id: users.id }).from(users).where(like(users.email, "__qa_test_243_%"));
  console.log(JSON.stringify({ ok: true, usersDeleted: ids.length, editsDeleted, strayEdits: (stray.rows as any[]).length, remainingUsers: remaining.length }));
}

(MODE === "teardown" ? teardown() : setup())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
