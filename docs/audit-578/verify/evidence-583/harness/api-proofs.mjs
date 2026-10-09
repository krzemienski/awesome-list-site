// Executed API proofs for D02-D05, D07, D08, D10 (API half), D11, D12 on DEV.
import { api, sql, sqlJson, expect, mkTree, mkResource, residue, flush, base, P, RUN } from "./lib.mjs";

const OUT = process.argv[2] || "/tmp/p583/out";
const created = { resources: [], leaves: [], subs: [], cats: [], edits: [] };
const track = (t) => { created.cats.push(t.cat.id); created.subs.push(t.sub.id); created.leaves.push(t.leaf.id); return t; };
const MIN_DESC = 60;

async function cleanup(item) {
  if (created.edits.length) sql(item, "delete QA edit rows by exact id", `delete from resource_edits where id in (${created.edits.join(",")})`);
  for (const id of created.resources) await api(item, "cleanup resource", "DELETE", `/api/admin/resources/${id}`);
  for (const id of created.leaves) await api(item, "cleanup leaf", "DELETE", `/api/admin/sub-subcategories/${id}`);
  for (const id of created.subs) await api(item, "cleanup subcategory", "DELETE", `/api/admin/subcategories/${id}`);
  for (const id of created.cats) await api(item, "cleanup category", "DELETE", `/api/admin/categories/${id}`);
}

const taxSnapshot = (item, label, ids) => sqlJson(item, label, `
  select 'cat' lvl, id, name, slug, null::int parent from categories where id in (${ids.cats.join(",")})
  union all select 'sub', id, name, slug, category_id from subcategories where id in (${ids.subs.join(",")})
  union all select 'leaf', id, name, slug, subcategory_id from sub_subcategories where id in (${ids.leaves.join(",")})
  order by 1, 2`);

async function d02_d03_d04() {
  const A = track(await mkTree("D02", "a"));
  const B = track(await mkTree("D02", "b"));
  // second siblings under A's category/subcategory
  const s2 = await api("D02", "fixture sibling subcategory", "POST", "/api/admin/subcategories",
    { name: `${P}a_sub2_${RUN}`, slug: `qa-583-a-sub2-${RUN}`, categoryId: A.cat.id });
  created.subs.push(s2.json.id);
  const l2 = await api("D02", "fixture sibling leaf", "POST", "/api/admin/sub-subcategories",
    { name: `${P}a_leaf2_${RUN}`, slug: `qa-583-a-leaf2-${RUN}`, subcategoryId: A.sub.id });
  created.leaves.unshift(l2.json.id);
  const ids = { cats: [A.cat.id, B.cat.id], subs: [A.sub.id, B.sub.id, s2.json.id], leaves: [A.leaf.id, B.leaf.id, l2.json.id] };

  // ---- D02
  const before = taxSnapshot("D02", "taxonomy BEFORE duplicate attempts", ids);
  let r = await api("D02", "POST duplicate category NAME with distinct slug", "POST", "/api/admin/categories",
    { name: A.cat.name, slug: `qa-583-dupname-${RUN}` });
  expect("D02", r.status === 409 && /already exists/i.test(r.json.message), "duplicate category name -> 409 with actionable message");
  if (r.status === 201) created.cats.push(r.json.id);
  r = await api("D02", "PATCH category B slug := category A slug", "PATCH", `/api/admin/categories/${B.cat.id}`, { slug: A.cat.slug });
  expect("D02", r.status === 409 && r.json.fieldErrors, "category slug collision -> 409 + fieldErrors");
  r = await api("D02", "PATCH subcategory 2 slug := sibling slug", "PATCH", `/api/admin/subcategories/${s2.json.id}`, { slug: A.sub.slug });
  expect("D02", r.status === 409 && r.json.fieldErrors, "subcategory sibling slug collision -> 409 + fieldErrors");
  r = await api("D02", "PATCH leaf 2 slug := sibling leaf slug", "PATCH", `/api/admin/sub-subcategories/${l2.json.id}`, { slug: A.leaf.slug });
  expect("D02", r.status === 409 && r.json.fieldErrors, "leaf sibling slug collision -> 409 + fieldErrors");
  r = await api("D02", "POST duplicate leaf name (create)", "POST", "/api/admin/sub-subcategories",
    { name: A.leaf.name, slug: `qa-583-dupleaf-${RUN}`, subcategoryId: B.sub.id });
  expect("D02", r.status === 409, "duplicate leaf create -> 409");
  if (r.status === 201) created.leaves.unshift(r.json.id);
  const after = taxSnapshot("D02", "taxonomy AFTER duplicate attempts", ids);
  expect("D02", JSON.stringify(before) === JSON.stringify(after), "SQL taxonomy rows unchanged by every rejected write");

  // ---- D03
  const b3 = taxSnapshot("D03", "BEFORE leaf rename attempts", ids);
  r = await api("D03", "PATCH leaf2 name := leaf1 name (same parent, own slug)", "PATCH", `/api/admin/sub-subcategories/${l2.json.id}`, { name: A.leaf.name });
  expect("D03", r.status === 409, "same-parent duplicate leaf rename -> 409");
  r = await api("D03", "PATCH leaf2 name := leaf1 name (case-variant)", "PATCH", `/api/admin/sub-subcategories/${l2.json.id}`, { name: A.leaf.name.toUpperCase() });
  expect("D03", r.status === 409, "case-insensitive duplicate leaf rename -> 409");
  r = await api("D03", "PATCH leaf2 name := B leaf name + move under B sub", "PATCH", `/api/admin/sub-subcategories/${l2.json.id}`, { name: B.leaf.name, subcategoryId: B.sub.id });
  expect("D03", r.status === 409, "cross-parent duplicate leaf rename+move -> 409");
  const a3 = taxSnapshot("D03", "AFTER rejected leaf renames", ids);
  expect("D03", JSON.stringify(b3) === JSON.stringify(a3), "rows unchanged after rejected renames");
  r = await api("D03", "PATCH leaf2 unique rename", "PATCH", `/api/admin/sub-subcategories/${l2.json.id}`, { name: `${P}a_leaf2_renamed_${RUN}` });
  expect("D03", r.status === 200 && r.json.name === `${P}a_leaf2_renamed_${RUN}`, "unique leaf rename -> 200");
  r = await api("D03", "PATCH leaf2 keep own name, change only slug", "PATCH", `/api/admin/sub-subcategories/${l2.json.id}`, { slug: `qa-583-a-leaf2b-${RUN}` });
  expect("D03", r.status === 200, "editing own row without changing name is not a self-conflict -> 200");

  // ---- D04
  const b4 = taxSnapshot("D04", "BEFORE null-parent attempts", ids);
  r = await api("D04", "PATCH subcategory {categoryId:null}", "PATCH", `/api/admin/subcategories/${A.sub.id}`, { categoryId: null });
  expect("D04", r.status === 400 && r.json.fieldErrors?.categoryId, "null categoryId -> 400 with fieldErrors.categoryId");
  r = await api("D04", "PATCH leaf {subcategoryId:null}", "PATCH", `/api/admin/sub-subcategories/${A.leaf.id}`, { subcategoryId: null });
  expect("D04", r.status === 400 && r.json.fieldErrors?.subcategoryId, "null subcategoryId -> 400 with fieldErrors.subcategoryId");
  r = await api("D04", "PATCH subcategory {categoryId:0}", "PATCH", `/api/admin/subcategories/${A.sub.id}`, { categoryId: 0 });
  expect("D04", r.status === 400, "non-positive categoryId -> 400");
  r = await api("D04", "PATCH subcategory {categoryId:2147480000} (missing)", "PATCH", `/api/admin/subcategories/${A.sub.id}`, { categoryId: 2147480000 });
  expect("D04", r.status === 404, "nonexistent parent -> 404");
  const a4 = taxSnapshot("D04", "AFTER null-parent attempts", ids);
  expect("D04", JSON.stringify(b4) === JSON.stringify(a4), "parent ids unchanged in SQL");
  r = await api("D04", "valid move: subcategory 2 -> category B", "PATCH", `/api/admin/subcategories/${s2.json.id}`, { categoryId: B.cat.id });
  expect("D04", r.status === 200 && r.json.categoryId === B.cat.id, "valid parent move still works -> 200");
  sql("D04", "detached nodes anywhere (must be 0)", "select (select count(*) from subcategories where category_id is null) + (select count(*) from sub_subcategories where subcategory_id is null)");
}

async function d05() {
  const C1 = track(await mkTree("D05", "c1"));
  const C2 = await api("D05", "fixture category 2", "POST", "/api/admin/categories", { name: `${P}c2_cat_${RUN}`, slug: `qa-583-c2-cat-${RUN}` });
  created.cats.push(C2.json.id);
  const twin = await api("D05", "SAME-NAME subcategory under category 2", "POST", "/api/admin/subcategories",
    { name: C1.sub.name, slug: `qa-583-c2-twin-${RUN}`, categoryId: C2.json.id });
  expect("D05", twin.status === 201, "same-name subcategory under a different parent is allowed (201)");
  created.subs.push(twin.json.id);
  for (const i of [1, 2, 3]) {
    const res = await mkResource("D05", `d05_${i}`, { category: C1.cat.name, subcategory: C1.sub.name, subSubcategory: i === 1 ? C1.leaf.name : undefined, status: i === 3 ? "pending" : "approved", description: "QA fixture resource used to verify parent-scoped taxonomy display counts in the admin." });
    created.resources.push(res.id);
  }
  const l1 = await api("D05", "admin listing filtered to category 1", "GET", `/api/admin/subcategories?categoryId=${C1.cat.id}`);
  const l2 = await api("D05", "admin listing filtered to category 2", "GET", `/api/admin/subcategories?categoryId=${C2.json.id}`);
  const truth = sqlJson("D05", "SQL ground truth grouped by category+subcategory", `
    select category, subcategory, count(*)::int n from resources where category in ('${C1.cat.name}','${C2.json.name}') group by 1,2 order by 1`);
  const pop = l1.json.find((s) => s.id === C1.sub.id), empty = l2.json.find((s) => s.id === twin.json.id);
  expect("D05", pop?.resourceCount === 3, `populated sibling shows only its own count (got ${pop?.resourceCount}, SQL 3)`);
  expect("D05", empty?.resourceCount === 0, `empty same-name sibling shows 0 (got ${empty?.resourceCount})`);
  const leaves = await api("D05", "admin leaf listing filtered to subcategory 1", "GET", `/api/admin/sub-subcategories?subcategoryId=${C1.sub.id}`);
  const lf = leaves.json.find((l) => l.id === C1.leaf.id);
  expect("D05", lf?.resourceCount === 1, `leaf count chain-scoped (got ${lf?.resourceCount}, SQL 1)`);
}

async function d07() {
  const bad = [
    ["script tag", { tags: ["<script>alert(1)</script>"] }],
    ["img onerror", { tags: ['<img src=x onerror=alert(1)>'] }],
    ["numeric tag", { tags: [42] }],
    ["31 tags", { tags: Array.from({ length: 31 }, (_, i) => `qa-${i}`) }],
    ["unknown metadata key", { tags: ["ok"], extra: "<b>x</b>" }],
    ["tags not array", { tags: "qa-1" }],
  ];
  for (const [label, metadata] of bad) {
    const r = await api("D07", `CREATE with ${label}`, "POST", "/api/admin/resources",
      { category: base.category, title: `${P}d07_bad_${RUN}`, url: `https://example.com/${P}d07_bad_${RUN}`, description: "QA fixture resource for strict admin metadata validation of tags.", metadata });
    const onlyMeta = r.json?.fieldErrors && Object.keys(r.json.fieldErrors).every((k) => k !== "category" && k !== "title" && k !== "url" && k !== "description");
    expect("D07", r.status === 400 && onlyMeta, `create ${label} -> 400 (metadata-only field errors: ${JSON.stringify(r.json?.fieldErrors)})`);
    if (r.status === 201) created.resources.push(r.json.id);
  }
  sql("D07", "no bad fixture was stored", `select count(*) from resources where title = '${P}d07_bad_${RUN}'`);
  const ok = await mkResource("D07", "d07_ok", { description: "QA fixture resource for strict admin metadata validation of tags.", metadata: { tags: ["qa-alpha", "qa-beta"] } });
  created.resources.push(ok.id);
  const beforeMeta = sql("D07", "metadata BEFORE bad updates", `select metadata::text from resources where id = ${ok.id}`);
  for (const [label, metadata] of bad) {
    const r = await api("D07", `PUT with ${label}`, "PUT", `/api/admin/resources/${ok.id}`, { metadata });
    expect("D07", r.status === 400, `update ${label} -> 400`);
  }
  const afterMeta = sql("D07", "metadata AFTER bad updates", `select metadata::text from resources where id = ${ok.id}`);
  expect("D07", beforeMeta === afterMeta, "stored metadata unchanged by rejected updates");
  const good = await api("D07", "PUT legitimate tags", "PUT", `/api/admin/resources/${ok.id}`, { metadata: { tags: ["qa-gamma"] } });
  expect("D07", good.status === 200, "legitimate tag update -> 200");
  sql("D07", "metadata after legitimate update", `select metadata->'tags' from resources where id = ${ok.id}`);
}

async function d08() {
  const p1 = await mkResource("D08", "d08_p1", { status: "pending", description: "QA fixture resource for strict bulk id validation in moderation." });
  const p2 = await mkResource("D08", "d08_p2", { status: "pending", description: "QA fixture resource for strict bulk id validation in moderation." });
  created.resources.push(p1.id, p2.id);
  const snap = () => sql("D08", "fixture state + audit count", `select string_agg(id||':'||status||':'||updated_at, ',' order by id) || ' audit=' || (select count(*) from resource_audit_log where resource_id in (${p1.id},${p2.id})) from resources where id in (${p1.id},${p2.id})`);
  const before = snap();
  const malformed = [
    ["negative", [-1]], ["huge 1e100", [1e100]], ["fractional", [1.5]], ["suffixed string", [`${p1.id}abc`]],
    ["numeric string", [String(p1.id)]], ["above int4", [2147483648]], ["empty", []], ["duplicate", [p1.id, p1.id]],
    ["valid mixed with negative", [p1.id, -1]],
  ];
  for (const op of ["approve", "reject", "delete"]) {
    for (const [label, ids] of malformed) {
      const body = op === "reject" ? { ids, reason: "QA rejection reason long enough" } : { ids };
      const r = await api("D08", `bulk ${op} ${label}`, "POST", `/api/admin/resources/bulk/${op}`, body);
      expect("D08", r.status === 400, `bulk ${op} ${label} -> 400`);
    }
  }
  const r0 = await api("D08", "bulk approve ids not an array", "POST", "/api/admin/resources/bulk/approve", { ids: "1,2" });
  expect("D08", r0.status === 400, "non-array ids -> 400");
  const after = snap();
  expect("D08", before === after, "zero mutations after every malformed request (status/updated_at/audit count identical)");
  const missing = 2147480001;
  let r = await api("D08", "bulk approve all-missing", "POST", "/api/admin/resources/bulk/approve", { ids: [missing] });
  expect("D08", r.status === 409 && r.json.succeeded === 0 && r.json.failures?.[0]?.id === missing, "all-failed -> 409 with failures, not 200");
  r = await api("D08", "bulk approve mixed valid+missing", "POST", "/api/admin/resources/bulk/approve", { ids: [p1.id, missing] });
  expect("D08", r.status === 207 && r.json.succeeded === 1 && r.json.failed === 1, "mixed -> 207 partial with per-item failure");
  r = await api("D08", "bulk reject mixed (p1 now approved, p2 pending)", "POST", "/api/admin/resources/bulk/reject", { ids: [p1.id, p2.id], reason: "QA rejection reason long enough" });
  expect("D08", r.status === 207 && r.json.failures?.some((f) => f.id === p1.id), "reject non-pending row reported as failure, pending row rejected");
  const del = await mkResource("D08", "d08_del", { status: "pending", description: "QA fixture resource for strict bulk id validation in moderation." });
  r = await api("D08", "bulk delete mixed valid+missing", "POST", "/api/admin/resources/bulk/delete", { ids: [del.id, missing] });
  expect("D08", r.status === 207 && r.json.succeeded === 1 && r.json.failures?.[0]?.reason === "Resource not found", "delete mixed -> 207 with 'Resource not found'");
  sql("D08", "final fixture statuses", `select string_agg(id||':'||status, ',' order by id) from resources where id in (${p1.id},${p2.id},${del.id})`);
}

async function d10() {
  const res = await mkResource("D10", "d10", { status: "pending", description: "QA fixture resource for status transition bookkeeping through the editor." });
  created.resources.push(res.id);
  const row = (label) => sqlJson("D10", label, `select status, status_changed_at, approved_by, approved_at, contributor_rejection_reason from resources where id = ${res.id}`)[0];
  const r0 = row("initial (pending)");
  const adminId = sql("D10", "audit-key admin id", "select id from users where role = 'admin' order by created_at limit 1");
  await new Promise((r) => setTimeout(r, 1100));
  let r = await api("D10", "PUT status approved", "PUT", `/api/admin/resources/${res.id}`, { status: "approved" });
  const r1 = row("after approved");
  expect("D10", r.status === 200 && r1.status === "approved" && r1.status_changed_at !== r0.status_changed_at && r1.approved_by && r1.approved_at, "approve via editor PUT sets statusChangedAt + approvedBy + approvedAt");
  await new Promise((r) => setTimeout(r, 1100));
  r = await api("D10", "PUT status pending", "PUT", `/api/admin/resources/${res.id}`, { status: "pending" });
  const r2 = row("after pending");
  expect("D10", r2.status_changed_at > r1.status_changed_at && r2.approved_by === null && r2.approved_at === null, "back to pending advances statusChangedAt and clears approval attribution");
  await new Promise((r) => setTimeout(r, 1100));
  r = await api("D10", "PUT status rejected", "PUT", `/api/admin/resources/${res.id}`, { status: "rejected" });
  const r3 = row("after rejected");
  expect("D10", r3.status === "rejected" && r3.status_changed_at > r2.status_changed_at && r3.approved_by === null, "reject via editor advances statusChangedAt, no approval attribution");
  r = await api("D10", "PUT title only (no status change)", "PUT", `/api/admin/resources/${res.id}`, { title: `${P}d10_renamed_${RUN}` });
  const r4 = row("after unrelated edit");
  expect("D10", r4.status_changed_at === r3.status_changed_at, "unrelated edit does not touch statusChangedAt");
  sqlJson("D10", "audit trail for the resource", `select action, performed_by, changes->>'previousStatus' prev, changes->>'newStatus' new, created_at from resource_audit_log where resource_id = ${res.id} order by id`);
  const adminView = await api("D10", "admin API detail exposes attribution", "GET", `/api/admin/resources?search=${encodeURIComponent(`${P}d10_renamed_${RUN}`)}`);
  await api("D10", "PUT status approved again (for public probe)", "PUT", `/api/admin/resources/${res.id}`, { status: "approved" });
  const pub = await api("D10", "anonymous public GET", "GET", `/api/resources/${res.id}`, undefined, { admin: false });
  const pubKeys = JSON.stringify(pub.json);
  expect("D10", pub.status === 200 && !/approvedBy|approved_by|approvedAt|statusChangedAt|contributorRejectionReason/.test(pubKeys), "public payload contains no attribution/transition fields");
  void adminView; void adminId;
}

async function d11() {
  const res = await mkResource("D11", "d11", { status: "pending", description: "QA fixture resource for strict moderation rejection reason validation." });
  created.resources.push(res.id);
  const target = await mkResource("D11", "d11_edit_target", { status: "approved", description: "QA fixture resource that receives a suggested edit for moderation tests." });
  created.resources.push(target.id);
  const edit = await api("D11", "submit QA edit suggestion", "POST", `/api/resources/${target.id}/edits`, {
    proposedChanges: { description: { old: target.description, new: "QA fixture proposed description that is long enough to be a real edit." } },
    proposedData: { description: "QA fixture proposed description that is long enough to be a real edit." },
  });
  const editId = edit.json?.id ?? edit.json?.edit?.id;
  if (editId) created.edits.push(editId);
  const state = () => sql("D11", "resource+edit status and moderation audit count", `select (select status from resources where id=${res.id}) || ' / edit=' || coalesce((select status from resource_edits where id=${editId ?? 0}),'none') || ' / audit=' || (select count(*) from resource_audit_log where resource_id in (${res.id},${target.id}))`);
  const before = state();
  const invalid = [["number", 123], ["object", {}], ["array", ["a long enough reason here"]], ["null", null], ["short", "too short"], ["whitespace", "            "]];
  for (const [label, reason] of invalid) {
    let r = await api("D11", `resource reject reason=${label}`, "POST", `/api/admin/resources/${res.id}/reject`, { reason });
    expect("D11", r.status === 400 && r.json.fieldErrors?.reason, `resource reject ${label} -> 400 fieldErrors.reason`);
    r = await api("D11", `edit reject reason=${label}`, "POST", `/api/admin/resource-edits/${editId}/reject`, { reason });
    expect("D11", r.status === 400 && r.json.fieldErrors?.reason, `edit reject ${label} -> 400 fieldErrors.reason`);
  }
  let r = await api("D11", "resource reject with no body", "POST", `/api/admin/resources/${res.id}/reject`);
  expect("D11", r.status === 400, "missing body -> 400");
  const after = state();
  expect("D11", before === after, "no status change and no moderation audit rows from invalid bodies");
  const reason = "  QA: duplicate of an existing catalog entry.  ";
  r = await api("D11", "resource reject valid reason", "POST", `/api/admin/resources/${res.id}/reject`, { reason });
  expect("D11", r.status === 200 && r.json.status === "rejected", "valid reason rejects");
  sql("D11", "persisted contributor reason (trimmed)", `select contributor_rejection_reason from resources where id=${res.id}`);
  r = await api("D11", "edit reject valid reason", "POST", `/api/admin/resource-edits/${editId}/reject`, { reason });
  expect("D11", r.status === 200, "valid edit rejection -> 200");
  sql("D11", "edit row after valid reject", `select status || ' | ' || coalesce(rejection_reason,'') from resource_edits where id=${editId}`);
}

async function d12() {
  const a = await mkResource("D12", "d12_single", { status: "pending", description: "" });
  const b = await mkResource("D12", "d12_bulk", { status: "pending", description: "" });
  const c = await mkResource("D12", "d12_create_approved", { status: "approved", description: "" });
  const d = await mkResource("D12", "d12_put_status", { status: "pending", description: "Stub text for QA." });
  created.resources.push(a.id, b.id, c.id, d.id);
  sql("D12", "BEFORE: descriptions of pending fixtures", `select string_agg(id||':'||status||':len='||length(coalesce(description,'')), ', ' order by id) from resources where id in (${a.id},${b.id},${d.id})`);
  await api("D12", "single approve", "POST", `/api/admin/resources/${a.id}/approve`, {});
  await api("D12", "bulk approve", "POST", "/api/admin/resources/bulk/approve", { ids: [b.id] });
  await api("D12", "editor PUT status approved", "PUT", `/api/admin/resources/${d.id}`, { status: "approved" });
  const rows = sqlJson("D12", "AFTER: all four publication paths", `select id, title, status, length(description) len, description from resources where id in (${a.id},${b.id},${c.id},${d.id}) order by id`);
  expect("D12", rows.every((x) => x.status === "approved" && x.len >= MIN_DESC), `every path published with >= ${MIN_DESC}-char description: ${rows.map((x) => x.len).join(",")}`);
  expect("D12", rows.every((x) => /video development resource from example\.com/.test(x.description)), "every path applied the same fallback policy");
  for (const x of rows) {
    const pub = await api("D12", `public GET ${x.id}`, "GET", `/api/resources/${x.id}`, undefined, { admin: false });
    expect("D12", pub.json?.description === x.description, `public description equals stored for ${x.id}`);
  }
  const snapshot = sql("D12", "description snapshot BEFORE repeated approvals", `select md5(string_agg(id||description, '|' order by id)) from resources where id in (${a.id},${b.id},${c.id},${d.id})`);
  let r = await api("D12", "repeat single approve", "POST", `/api/admin/resources/${a.id}/approve`, {});
  expect("D12", r.status === 409, "repeated single approve -> 409");
  r = await api("D12", "repeat bulk approve", "POST", "/api/admin/resources/bulk/approve", { ids: [b.id, c.id] });
  expect("D12", r.status === 409 && r.json.failed === 2, "repeated bulk approve -> 409 all-failed");
  r = await api("D12", "PUT status approved on already-approved (no-op status)", "PUT", `/api/admin/resources/${d.id}`, { status: "approved" });
  const snap2 = sql("D12", "description snapshot AFTER repeated approvals", `select md5(string_agg(id||description, '|' order by id)) from resources where id in (${a.id},${b.id},${c.id},${d.id})`);
  expect("D12", snap2 === snapshot, "repeated/conflicting approvals did not mutate content");
  // Published-row edits: admin's own valid text is kept; blanking re-applies the fallback.
  r = await api("D12", "PUT short-but-valid admin description on published row", "PUT", `/api/admin/resources/${d.id}`, { description: "Admin override." });
  let row = sqlJson("D12", "published row after admin override", `select description from resources where id = ${d.id}`)[0];
  expect("D12", r.status === 200 && row.description === "Admin override.", `admin override text kept on published row ("${row.description}")`);
  r = await api("D12", "PUT blank description on published row", "PUT", `/api/admin/resources/${d.id}`, { description: "" });
  row = sqlJson("D12", "published row after blanking", `select length(description) len, description from resources where id = ${d.id}`)[0];
  expect("D12", r.status === 200 && row.len >= MIN_DESC, `blanking a published description re-applies the fallback (len=${row.len})`);
}

const only = process.argv[3]?.split(",");
const steps = { d02_d03_d04, d05, d07, d08, d10, d11, d12 };
try {
  const baseCat = await api("SETUP", "QA base category for resource fixtures", "POST", "/api/admin/categories", { name: `${P}base_cat_${RUN}`, slug: `qa-583-base-cat-${RUN}` });
  created.cats.push(baseCat.json.id); base.category = baseCat.json.name;
  for (const [name, fn] of Object.entries(steps)) {
    if (only && !only.includes(name)) continue;
    try { await fn(); } catch (e) { console.error(name, e); process.exitCode = 1; }
  }
} finally {
  await cleanup("CLEANUP");
  const res = residue("CLEANUP");
  console.log("RESIDUE", JSON.stringify(res));
  flush(OUT);
}
