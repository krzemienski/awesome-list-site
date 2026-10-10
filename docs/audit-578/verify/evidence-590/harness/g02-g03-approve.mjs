// G02 + G03 API proof: research approval is one transaction, idempotent on
// retry, and stamps approval provenance + an audit row through the shared
// publication helper.
//
//   PROOF_DATABASE_URL=<db served by BASE_URL> BASE_URL=http://127.0.0.1:5190 \
//     node g02-g03-approve.mjs <out.json> [--before]
//
// Fixtures (prefixed __qa_test_plan_590_g02_): a completed research job with
// one discovery whose suggested taxonomy is an EXISTING category/subcategory
// plus a NEW sub-subcategory (so approval auto-creates a taxonomy node), and a
// second job with two discoveries for the bulk approve-all path.
//
// Failure injection (scratch DB only): a real CHECK constraint on
// research_discoveries that refuses status='approved' for the QA discovery, so
// the discovery-update step fails AFTER the resource insert, the publication
// transition (audit row) and the sub-subcategory insert already ran.
// --before only records what the pre-fix code does with the same fixture.
import { api, check, finish, note, sql, sqlOne, BASE_URL } from "./lib.mjs";

const out = process.argv[2];
const before = process.argv.includes("--before");
const P = "__qa_test_plan_590_g02_";
const stamp = Date.now();
const CATEGORY = "Intro & Learning";
const SUBCATEGORY = "Learning Resources";
const NODE = `${P}${stamp} node`;
const url = (n) => `https://example.com/${P}${stamp}-${n}`;
const ADMIN = sqlOne(`select id from users where email = 'admin@example.com'`).id;

function makeJob(label) {
  return sqlOne(`insert into research_jobs (status, prompt, approved_discoveries) values ('completed', '${P}${stamp} ${label}', 0) returning id`).id;
}
function makeDiscovery(jobId, n, description) {
  return sqlOne(`insert into research_discoveries (job_id, title, url, description, suggested_category, suggested_subcategory, suggested_sub_subcategory, confidence, status)
    values (${jobId}, '${P}${stamp} discovery ${n}', '${url(n)}', ${description === null ? "null" : `'${description}'`}, '${CATEGORY}', '${SUBCATEGORY}', '${NODE}', 0.9, 'pending_review') returning id`).id;
}

const jobA = makeJob("single");
const dA = makeDiscovery(jobA, "a", "QA discovery for the task 590 transactional approval proof.");
const jobB = makeJob("bulk");
// b1 has a too-short description so the publication description gate must fill it.
const dB1 = makeDiscovery(jobB, "b1", "short");
const dB2 = makeDiscovery(jobB, "b2", "Second bulk QA discovery for the task 590 provenance proof.");
note("fixtures", { jobA, dA, jobB, dB1, dB2, node: NODE, admin: ADMIN });

const state = (discoveryId, jobId, n) => sqlOne(`select
  (select count(*) from resources where url = '${url(n)}')::int as resources,
  (select status from resources where url = '${url(n)}' limit 1) as resource_status,
  (select status from research_discoveries where id = ${discoveryId}) as discovery_status,
  (select created_resource_id from research_discoveries where id = ${discoveryId}) as created_resource_id,
  (select approved_discoveries from research_jobs where id = ${jobId}) as job_counter,
  (select count(*) from sub_subcategories where name = '${NODE}')::int as taxonomy_nodes,
  (select count(*) from resource_audit_log a join resources r on r.id = a.original_resource_id where r.url = '${url(n)}')::int as audit_rows`);

function provenance(n) {
  return sqlOne(`select r.id, r.status, r.approved_at, r.approved_by, r.status_changed_at, r.description, r.sub_subcategory,
      (select json_agg(json_build_object('action', a.action, 'performed_by', a.performed_by, 'notes', a.notes, 'prev', a.changes->>'previousStatus', 'new', a.changes->>'newStatus'))
         from resource_audit_log a where a.original_resource_id = r.id) as audit
    from resources r where r.url = '${url(n)}'`);
}

try {
  sql(`alter table research_discoveries add constraint __qa_test_plan_590_block
       check (not (status = 'approved' and title like '${P}%')) not valid`);
  note("constraint", "CHECK __qa_test_plan_590_block refuses status='approved' for QA discoveries");

  const s0 = state(dA, jobA, "a");
  note("state before approve", s0);
  const failed = await api("POST", `/api/researcher/discoveries/${dA}/approve`);
  const s1 = state(dA, jobA, "a");
  note("state after approve with constraint", { status: failed.status, body: failed.json, state: s1 });

  if (before) {
    sql(`alter table research_discoveries drop constraint __qa_test_plan_590_block`);
    const retry = await api("POST", `/api/researcher/discoveries/${dA}/approve`);
    note("BEFORE retry after removing constraint", { status: retry.status, body: retry.json, state: state(dA, jobA, "a") });
    note("BEFORE provenance of the leaked resource", provenance("a"));
  } else {
    check("approve fails while the discovery update is refused", failed.status >= 400, { status: failed.status, body: failed.json });
    check("failed approve left NO resource, NO taxonomy node, NO audit row; discovery still pending; counter unchanged",
      s1.resources === 0 && s1.taxonomy_nodes === 0 && s1.audit_rows === 0 && s1.discovery_status === "pending_review" && s1.job_counter === s0.job_counter, s1);

    sql(`alter table research_discoveries drop constraint __qa_test_plan_590_block`);
    note("constraint", "dropped");
    const ok = await api("POST", `/api/researcher/discoveries/${dA}/approve`);
    const s2 = state(dA, jobA, "a");
    note("state after retry", s2);
    check("retry succeeds (200)", ok.status === 200, { status: ok.status, discovery: ok.json?.discovery?.status });
    check("exactly one approved resource, approved discovery linked to it, counter +1, one taxonomy node",
      s2.resources === 1 && s2.resource_status === "approved" && s2.discovery_status === "approved" && s2.created_resource_id != null &&
      s2.job_counter === s0.job_counter + 1 && s2.taxonomy_nodes === 1, s2);

    const again = await api("POST", `/api/researcher/discoveries/${dA}/approve`);
    const s3 = state(dA, jobA, "a");
    check("second retry is idempotent: 200, still one resource, counter not bumped again",
      again.status === 200 && JSON.stringify(s3) === JSON.stringify(s2), { status: again.status, s3 });

    // G03 provenance on the single approval.
    const pa = provenance("a");
    note("G03 single provenance", pa);
    check("G03 single: approvedAt + statusChangedAt set, approvedBy = acting admin", !!pa.approved_at && !!pa.status_changed_at && pa.approved_by === ADMIN, pa);
    check("G03 single: exactly one audit row, action approved by the admin, identifiable researcher note",
      pa.audit?.length === 1 && pa.audit[0].action === "approved" && pa.audit[0].performed_by === ADMIN && pa.audit[0].prev === "pending" &&
      pa.audit[0].notes === `AI researcher approval: discovery #${dA} (research job #${jobA})`, pa.audit);

    const adminList = await api("GET", `/api/admin/resources?search=${encodeURIComponent(`${P}${stamp} discovery a`)}&status=approved`);
    const row = (adminList.json?.resources ?? []).find((r) => r.id === pa.id);
    check("admin GET shows approvedAt and approvedBy", !!row?.approvedAt && row?.approvedBy === ADMIN, row && { approvedAt: row.approvedAt, approvedBy: row.approvedBy });
    const auditApi = await api("GET", `/api/admin/audit-logs?resourceId=${pa.id}`);
    const entries = auditApi.json?.logs ?? auditApi.json?.entries ?? auditApi.json;
    check("admin audit-logs filtered to the resource shows the researcher approval", Array.isArray(entries) && entries.length === 1 && /AI researcher approval/.test(entries[0].notes ?? ""), entries);

    const anon = await fetch(`${BASE_URL}/api/resources/${pa.id}`);
    const anonJson = await anon.json();
    check("anonymous public GET does not expose approvedBy / audit provenance",
      anon.status === 200 && !("approvedBy" in anonJson) && !("approved_by" in anonJson), { status: anon.status, keys: Object.keys(anonJson) });

    // Bulk approve-all for job B.
    const bulk = await api("POST", "/api/researcher/discoveries/approve-all", { jobId: jobB });
    note("bulk response", bulk.json);
    const pb1 = provenance("b1");
    const pb2 = provenance("b2");
    note("G03 bulk provenance", { pb1, pb2 });
    for (const [label, p, d] of [["b1", pb1, dB1], ["b2", pb2, dB2]]) {
      check(`G03 bulk ${label}: approved with approvedAt/approvedBy = admin and one researcher audit row`,
        p?.status === "approved" && !!p.approved_at && p.approved_by === ADMIN && p.audit?.length === 1 &&
        p.audit[0].performed_by === ADMIN && p.audit[0].notes === `AI researcher approval: discovery #${d} (research job #${jobB})`, p);
    }
    check("description gate filled the too-short bulk description", (pb1?.description ?? "").length > "short".length, pb1?.description);
    const sb = sqlOne(`select approved_discoveries from research_jobs where id = ${jobB}`);
    check("bulk job counter = 2", sb.approved_discoveries === 2, sb);
  }
} finally {
  sql(`alter table research_discoveries drop constraint if exists __qa_test_plan_590_block`);
  const resourceIds = sqlOne(`select coalesce(json_agg(id), '[]'::json) as ids from resources where url like '%${P}${stamp}%'`).ids;
  sql(`delete from research_discoveries where id in (${dA}, ${dB1}, ${dB2})`);
  if (resourceIds.length) {
    sql(`delete from resource_audit_log where original_resource_id in (${resourceIds.join(",")})`);
    sql(`delete from resources where id in (${resourceIds.join(",")})`);
  }
  sql(`delete from research_jobs where id in (${jobA}, ${jobB})`);
  sql(`delete from sub_subcategories where name = '${NODE}'`);
  const residue = sqlOne(`select
    (select count(*) from resources where title like '${P}%' or url like '%${P}%')::int as resources,
    (select count(*) from research_discoveries where title like '${P}%')::int as discoveries,
    (select count(*) from research_jobs where prompt like '${P}%')::int as jobs,
    (select count(*) from sub_subcategories where name like '${P}%')::int as taxonomy_nodes,
    (select count(*) from pg_constraint where conname = '__qa_test_plan_590_block')::int as constraints`);
  note("residue", residue);
  check("residue is zero", Object.values(residue).every((v) => v === 0), residue);
  finish(out);
}
