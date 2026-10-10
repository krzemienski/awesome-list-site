// D09 proof: resource deletion is all-or-nothing.
//
//   PROOF_DATABASE_URL=<db served by BASE_URL> BASE_URL=http://127.0.0.1:5190 \
//     node d09-delete.mjs <out.json> [--blocker] [--bulk]
//
// Fixtures (all prefixed __qa_test_plan_590_d09_): a QA user, an approved
// resource, a PENDING edit suggestion, a draft journey with three logical steps
// (step 1 linked to the resource), QA progress whose current_step_id points at
// the linked step, plus a favorite and a bookmark of the resource.
//
// --blocker adds a real FK refusal on the scratch DB (a QA table referencing
// resources(id) with no ON DELETE action) so the delete's FINAL statement
// fails after edits/steps/progress/audit were already written in the
// transaction. The request must answer 409 with everything unchanged. The
// blocker is then dropped and the delete retried: it must succeed with one
// audit row, children cleaned up and the surviving progress valid.
// Without --blocker this is the original audit recipe (used for the BEFORE run
// against the pre-fix code).
import { api, check, finish, note, sql, sqlOne } from "./lib.mjs";

const out = process.argv[2];
const blocker = process.argv.includes("--blocker");
const bulk = process.argv.includes("--bulk");
const P = "__qa_test_plan_590_d09_";
const stamp = Date.now();
const userId = `${P}${stamp}_user`;

function fixtures() {
  sql(`insert into users (id, email, first_name, role) values ('${userId}', '${P}${stamp}@example.com', '${P}user', 'user')`);
  const r = sqlOne(`insert into resources (title, url, description, category, status)
    values ('${P}${stamp} target', 'https://example.com/${P}${stamp}', 'QA delete target for task 590', 'Encoding & Codecs', 'approved') returning id`);
  const resourceId = r.id;
  const edit = sqlOne(`insert into resource_edits (resource_id, submitted_by, status, original_resource_updated_at, proposed_changes, proposed_data)
    values (${resourceId}, '${userId}', 'pending', now(), '{"title":{"old":"a","new":"b"}}', '{"title":"${P}edited"}') returning id`);
  const j = sqlOne(`insert into learning_journeys (title, description, category, status)
    values ('${P}${stamp} journey', 'QA journey for task 590', 'Encoding & Codecs', 'draft') returning id`);
  const s1 = sqlOne(`insert into journey_steps (journey_id, step_number, title, resource_id) values (${j.id}, 1, '${P}step1 linked', ${resourceId}) returning id`);
  const s2 = sqlOne(`insert into journey_steps (journey_id, step_number, title) values (${j.id}, 2, '${P}step2') returning id`);
  const s3 = sqlOne(`insert into journey_steps (journey_id, step_number, title) values (${j.id}, 3, '${P}step3') returning id`);
  const prog = sqlOne(`insert into user_journey_progress (user_id, journey_id, current_step_id, completed_steps)
    values ('${userId}', ${j.id}, ${s1.id}, '[${s1.id}, ${s2.id}]'::jsonb) returning id`);
  sql(`insert into user_favorites (user_id, resource_id) values ('${userId}', ${resourceId})`);
  sql(`insert into user_bookmarks (user_id, resource_id) values ('${userId}', ${resourceId})`);
  return { resourceId, editId: edit.id, journeyId: j.id, steps: [s1.id, s2.id, s3.id], progressId: prog.id };
}

function snapshot(f) {
  return sqlOne(`select
    (select count(*) from resources where id = ${f.resourceId})::int as resource_rows,
    (select count(*) from resource_edits where resource_id = ${f.resourceId})::int as edit_rows,
    (select count(*) from resource_edits where id = ${f.editId} and status = 'pending')::int as pending_edit_rows,
    (select count(*) from resource_audit_log where original_resource_id = ${f.resourceId} and action = 'deleted')::int as deleted_audit_rows,
    (select json_agg(json_build_object('id', id, 'n', step_number, 'res', resource_id) order by id) from journey_steps where journey_id = ${f.journeyId}) as steps,
    (select json_build_object('current_step_id', current_step_id, 'completed_steps', completed_steps, 'completed_at', completed_at) from user_journey_progress where id = ${f.progressId}) as progress,
    (select count(*) from user_favorites where user_id = '${userId}')::int as favorites,
    (select count(*) from user_bookmarks where user_id = '${userId}')::int as bookmarks`);
}

const invariant = (s) => !(s.resource_rows === 1 && (s.edit_rows === 0 || s.deleted_audit_rows > 0));

const f = fixtures();
note("fixtures", f);
const before = snapshot(f);
note("snapshot before DELETE", before);

async function doDelete() {
  return bulk
    ? api("POST", "/api/admin/resources/bulk/delete", { ids: [f.resourceId] })
    : api("DELETE", `/api/admin/resources/${f.resourceId}`);
}

try {
  if (blocker) {
    sql(`create table if not exists __qa_test_plan_590_blocker (id serial primary key, resource_id integer references resources(id))`);
    sql(`insert into __qa_test_plan_590_blocker (resource_id) values (${f.resourceId})`);
    note("blocker", "QA table __qa_test_plan_590_blocker references the resource with no ON DELETE action");
    const refused = await doDelete();
    const afterRefusal = snapshot(f);
    note("snapshot after refused DELETE", afterRefusal);
    check("refused delete answers 409", refused.status === 409, { status: refused.status, body: refused.json });
    const msg = JSON.stringify(refused.json);
    check("409 message names the blocking table and says nothing changed",
      msg.includes("__qa_test_plan_590_blocker") && /Nothing was changed/i.test(msg), refused.json);
    check("refused delete changed NOTHING (resource, pending edit, steps, progress, favorites, bookmarks, no deleted audit)",
      JSON.stringify(afterRefusal) === JSON.stringify(before), { before, afterRefusal });
    check("invariant: never a surviving resource plus a deleted edit / false deleted audit", invariant(afterRefusal), afterRefusal);
    sql(`drop table __qa_test_plan_590_blocker`);
    note("blocker", "dropped");
  }

  const res = await doDelete();
  const after = snapshot(f);
  note("snapshot after DELETE", after);
  check("invariant: never a surviving resource plus a deleted edit / false deleted audit", invariant(after), after);
  if (blocker) {
    check("successful delete answers 200", res.status === 200, { status: res.status, body: res.json });
    check("resource gone", after.resource_rows === 0);
    check("edit suggestions cleaned up", after.edit_rows === 0);
    check("exactly one deleted audit row", after.deleted_audit_rows === 1);
    check("favorites and bookmarks cascaded", after.favorites === 0 && after.bookmarks === 0, after);
    const [, s2, s3] = f.steps;
    check("linked step removed, remaining steps renumbered 1..2",
      JSON.stringify(after.steps) === JSON.stringify([{ id: s2, n: 1, res: null }, { id: s3, n: 2, res: null }]), after.steps);
    check("progress survives with no dangling pointer (current_step_id null, completed keeps step2 only)",
      after.progress && after.progress.current_step_id === null && JSON.stringify(after.progress.completed_steps) === JSON.stringify([s2]) && after.progress.completed_at === null,
      after.progress);
    const audit = sqlOne(`select action, performed_by, resource_id, original_resource_id, changes->'cleanup' as cleanup, notes
      from resource_audit_log where original_resource_id = ${f.resourceId} and action = 'deleted'`);
    note("deleted audit row", audit);
    check("audit row records actor and cleanup counts",
      !!audit?.performed_by && audit.cleanup?.removedEdits === 1 && audit.cleanup?.removedPendingEdits === 1 && audit.cleanup?.removedJourneySteps === 1, audit);
  } else {
    note("BEFORE-run outcome", { status: res.status, body: res.json, invariantHeld: invariant(after) });
  }
} finally {
  // Exact-id teardown (resource first if it survived; edits block it).
  sql(`drop table if exists __qa_test_plan_590_blocker`);
  sql(`delete from resource_edits where resource_id = ${f.resourceId}`);
  sql(`delete from user_journey_progress where id = ${f.progressId}`);
  sql(`delete from journey_steps where journey_id = ${f.journeyId}`);
  sql(`delete from learning_journeys where id = ${f.journeyId}`);
  sql(`delete from user_favorites where user_id = '${userId}'`);
  sql(`delete from user_bookmarks where user_id = '${userId}'`);
  sql(`delete from resources where id = ${f.resourceId}`);
  sql(`delete from resource_audit_log where original_resource_id = ${f.resourceId}`);
  sql(`delete from users where id = '${userId}'`);
  const residue = sqlOne(`select
    (select count(*) from resources where title like '${P}%' or url like '%${P}%')::int as resources,
    (select count(*) from resource_edits where submitted_by like '${P}%')::int as edits,
    (select count(*) from learning_journeys where title like '${P}%')::int as journeys,
    (select count(*) from journey_steps where title like '${P}%')::int as steps,
    (select count(*) from user_journey_progress where user_id like '${P}%')::int as progress,
    (select count(*) from users where id like '${P}%')::int as users,
    (select count(*) from information_schema.tables where table_name = '__qa_test_plan_590_blocker')::int as blocker_table`);
  note("residue", residue);
  check("residue is zero", Object.values(residue).every((v) => v === 0), residue);
  finish(out);
}
