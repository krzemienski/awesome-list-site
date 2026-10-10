import { api, q, pool, loadState, saveState, record, flush } from "./lib.mjs";

const s = loadState();
const { submitter: A, second: B, admin: ADM } = s.users;
const R = s.resources;
const edits = async (rid) => (await q(`SELECT id, status, proposed_changes, proposed_data, claude_metadata, claude_analyzed_at FROM resource_edits WHERE resource_id=$1 ORDER BY id`, [rid]));
const aiCount = async () => (await api(ADM, "GET", "/api/health/ai")).body?.requestCount;
const enrichRows = async () => (await q(`SELECT
   (SELECT count(*) FROM enrichment_queue WHERE resource_id = ANY($1::int[]))::int AS queue`, [Object.values(R).map(r => r.id)]))[0];
s.edits = s.edits ?? {};

// ---------------- C03 baseline -----------------
const aiBefore = await aiCount();
record("C03 ai requestCount before", { requestCount: aiBefore });

// ---------------- C04: malformed shapes -----------------
const shapeUrl = `/api/resources/${R.shape.id}/edits`;
const malformed = [
  ["body is JSON array", null, "[]"],
  ["proposedData missing", {}],
  ["proposedData string", { proposedData: "string", proposedChanges: "string" }],
  ["proposedData number", { proposedData: 5 }],
  ["proposedData boolean", { proposedData: true }],
  ["proposedData null", { proposedData: null }],
  ["proposedData array", { proposedData: ["title"] }],
  ["proposedData empty object", { proposedData: {} }],
  ["proposedData unknown field", { proposedData: { status: "approved" } }],
  ["proposedData.title number", { proposedData: { title: 42 } }],
  ["proposedData.tags string", { proposedData: { tags: "a,b" } }],
  ["proposedData.category path", { proposedData: { category: "A › B" } }],
  ["proposedChanges number", { proposedData: { title: `${R.shape.title} v2` }, proposedChanges: 5 }],
  ["proposedChanges array", { proposedData: { title: `${R.shape.title} v2` }, proposedChanges: [] }],
  ["proposedChanges null", { proposedData: { title: `${R.shape.title} v2` }, proposedChanges: null }],
  ["change entry primitive", { proposedData: { title: `${R.shape.title} v2` }, proposedChanges: { title: "x" } }],
  ["change entry missing new", { proposedData: { title: `${R.shape.title} v2` }, proposedChanges: { title: { old: R.shape.title } } }],
  ["change entry extra key", { proposedData: { title: `${R.shape.title} v2` }, proposedChanges: { title: { old: R.shape.title, new: `${R.shape.title} v2`, x: 1 } } }],
  ["change entry object value", { proposedData: { title: `${R.shape.title} v2` }, proposedChanges: { title: { old: R.shape.title, new: { a: 1 } } } }],
  ["no-op edit (same title)", { proposedData: { title: R.shape.title } }],
];
for (const [label, body, raw] of malformed) {
  const r = await api(A, "POST", shapeUrl, body ?? undefined, raw ? { raw } : {});
  record(`C04 ${label}`, { status: r.status, body: r.body });
}
record("C04 resource_edits rows after malformed batch", { rows: (await edits(R.shape.id)).length });
const validShape = await api(A, "POST", shapeUrl, { proposedData: { description: `${R.shape.title} improved description text` } });
record("C04 valid manual edit still works", { status: validShape.status, proposedChanges: validShape.body?.proposedChanges, claudeMetadata: validShape.body?.claudeMetadata });
s.edits.shapeValid = validShape.body?.id;

// ---------------- C02: forged analysis -----------------
const forged = await api(A, "POST", shapeUrl, {
  proposedData: { title: `${R.shape.title} forged` },
  claudeMetadata: { confidence: 1, suggestedTitle: "Forged", keyTopics: ["forged"] },
});
record("C02 forged claudeMetadata", { status: forged.status, body: forged.body });
const forgedTs = await api(A, "POST", shapeUrl, { proposedData: { title: `${R.shape.title} forged2` }, claudeAnalyzedAt: new Date().toISOString() });
record("C02 forged claudeAnalyzedAt", { status: forgedTs.status, body: forgedTs.body });
record("C02 rows with forged titles", { rows: (await edits(R.shape.id)).filter(e => JSON.stringify(e.proposed_data).includes("forged")).length });

// ---------------- C03: non-admin paid AI exposure -----------------
const t0 = await api(A, "POST", `/api/resources/${R.diff.id}/edits`, { proposedData: { description: `${R.diff.title} trigger omitted description` } });
record("C03 trigger omitted", { status: t0.status, claudeMetadata: t0.body?.claudeMetadata ?? null, claudeAnalyzedAt: t0.body?.claudeAnalyzedAt ?? null });
const t1 = await api(B, "POST", `/api/resources/${R.diff.id}/edits`, { proposedData: { description: `${R.diff.title} trigger false description` }, triggerClaudeAnalysis: false });
record("C03 trigger false (second user)", { status: t1.status, claudeMetadata: t1.body?.claudeMetadata ?? null });
const t2 = await api(A, "POST", `/api/resources/${R.diff.id}/edits`, { proposedData: { description: `${R.diff.title} trigger true description` }, triggerClaudeAnalysis: true });
record("C03 trigger true", { status: t2.status, body: t2.body });
const t3 = await api(A, "POST", `/api/resources/${R.diff.id}/edits`, { proposedData: { description: `${R.diff.title} trigger string description` }, triggerClaudeAnalysis: "yes" });
record("C03 trigger non-boolean", { status: t3.status, body: t3.body });
const dupe = await api(A, "POST", `/api/resources/${R.diff.id}/edits`, { proposedData: { description: `${R.diff.title} trigger omitted description` } });
record("C03 duplicate resubmission (no AI before rejection)", { status: dupe.status, body: dupe.body });
const direct = await api(A, "POST", `/api/claude/analyze`, { url: "https://github.com/FFmpeg/FFmpeg" });
record("C03 non-admin /api/claude/analyze", { status: direct.status, body: direct.body });
s.edits.c03 = [t0.body?.id, t1.body?.id].filter(Boolean);

// ---------------- C01: diff == applied data -----------------
const evilUrl = `https://example.org/${s.run}_hidden_destination`;
const incons = await api(A, "POST", `/api/resources/${R.diff.id}/edits`, {
  proposedChanges: { title: { old: R.diff.title, new: `${R.diff.title} innocent` } },
  proposedData: { title: `${R.diff.title} innocent`, url: evilUrl },
});
record("C01 inconsistent maps (hidden URL in proposedData)", { status: incons.status, body: incons.body });
const incons2 = await api(A, "POST", `/api/resources/${R.diff.id}/edits`, {
  proposedChanges: { title: { old: R.diff.title, new: "Shown to reviewer" } },
  proposedData: { title: `${R.diff.title} actually applied` },
});
record("C01 inconsistent new value", { status: incons2.status, body: incons2.body });
record("C01 rows with hidden url", { rows: (await edits(R.diff.id)).filter(e => JSON.stringify(e).includes("hidden_destination")).length });
const newUrl = `https://example.org/${s.run}_diff_new`;
const canon = await api(A, "POST", `/api/resources/${R.diff.id}/edits`, {
  proposedData: { title: `${R.diff.title} renamed`, url: newUrl, subcategory: "" },
});
record("C01 single value map -> server-derived canonical diff", { status: canon.status, proposedChanges: canon.body?.proposedChanges, proposedData: canon.body?.proposedData });
s.edits.c01 = canon.body?.id;

// Legacy inconsistent row (as written by the pre-fix endpoint): diff shows a
// title change, value map also carries a different URL.
const [legacy] = await q(
  `INSERT INTO resource_edits (resource_id, submitted_by, status, original_resource_updated_at, proposed_changes, proposed_data)
   SELECT id, $2, 'pending', updated_at, $3::jsonb, $4::jsonb FROM resources WHERE id=$1 RETURNING id`,
  [R.legacy.id, A.localId,
   JSON.stringify({ title: { old: R.legacy.title, new: `${R.legacy.title} innocent` } }),
   JSON.stringify({ title: `${R.legacy.title} innocent`, url: `https://example.org/${s.run}_legacy_hidden` })],
);
s.edits.legacy = legacy.id;
const legacyApprove = await api(ADM, "POST", `/api/admin/resource-edits/${legacy.id}/approve`, {});
record("C01 approve inconsistent legacy edit", { status: legacyApprove.status, body: legacyApprove.body });
record("C01 legacy after refusal", {
  edit: (await q(`SELECT status FROM resource_edits WHERE id=$1`, [legacy.id]))[0],
  resource: (await q(`SELECT title, url FROM resources WHERE id=$1`, [R.legacy.id]))[0],
});

// ---------------- C05: duplicate URL at submission -----------------
const dupUrl = await api(A, "POST", `/api/resources/${R.url_a.id}/edits`, { proposedData: { url: R.url_b.url } });
record("C05 submit A->B url", { status: dupUrl.status, body: dupUrl.body });
record("C05 edits on A after dup submit", { rows: (await edits(R.url_a.id)).length });

// Race: valid proposal, then B moves onto that URL before approval.
const raceUrl = `https://example.com/${s.run}_race_target`;
const prop = await api(A, "POST", `/api/resources/${R.url_a.id}/edits`, { proposedData: { url: raceUrl } });
record("C05 unique proposal", { status: prop.status, id: prop.body?.id });
const move = await api(ADM, "PUT", `/api/admin/resources/${R.url_b.id}`, { url: raceUrl });
record("C05 admin moves B onto proposal URL", { status: move.status, url: move.body?.url });
const raceApprove = await api(ADM, "POST", `/api/admin/resource-edits/${prop.body?.id}/approve`, {});
record("C05 approve after B took the URL", { status: raceApprove.status, body: raceApprove.body });
record("C05 state after conflict", {
  edit: (await q(`SELECT status FROM resource_edits WHERE id=$1`, [prop.body?.id]))[0],
  a: (await q(`SELECT url FROM resources WHERE id=$1`, [R.url_a.id]))[0],
  b: (await q(`SELECT url FROM resources WHERE id=$1`, [R.url_b.id]))[0],
});
s.edits.c05Pending = prop.body?.id;

// Concurrent race: approve and a competing move fire together, 4 rounds.
for (let i = 0; i < 4; i++) {
  const target = `https://example.com/${s.run}_concurrent_${i}`;
  const e = await api(A, "POST", `/api/resources/${R.race.id}/edits`, { proposedData: { url: target } });
  const [ap, mv] = await Promise.all([
    api(ADM, "POST", `/api/admin/resource-edits/${e.body?.id}/approve`, {}),
    api(ADM, "PUT", `/api/admin/resources/${R.url_b.id}`, { url: target }),
  ]);
  const owners = await q(`SELECT id FROM resources WHERE url=$1`, [target]);
  record(`C05 concurrent round ${i}`, {
    submit: e.status, approve: ap.status, approveBody: ap.status !== 200 ? ap.body : undefined,
    move: mv.status, moveBody: mv.status !== 200 ? mv.body : undefined,
    owners: owners.map(o => o.id), editStatus: (await q(`SELECT status FROM resource_edits WHERE id=$1`, [e.body?.id]))[0]?.status,
  });
}

// ---------------- D11 (edit half) -----------------
const mod1 = await api(A, "POST", `/api/resources/${R.moderation.id}/edits`, { proposedData: { description: `${R.moderation.title} to be rejected later` } });
const mid = mod1.body?.id;
s.edits.d11Reject = mid;
for (const [label, body, raw] of [
  ["reject no body", undefined],
  ["reject reason number", { reason: 1234567890123 }],
  ["reject reason object", { reason: { text: "a long enough reason" } }],
  ["reject reason array", { reason: ["a long enough reason"] }],
  ["reject reason null", { reason: null }],
  ["reject reason too short", { reason: "short" }],
  ["reject reason 2001 chars", { reason: "x".repeat(2001) }],
  ["reject body JSON null", null, "null"],
]) {
  const r = await api(ADM, "POST", `/api/admin/resource-edits/${mid}/reject`, body, raw ? { raw } : {});
  record(`D11 ${label}`, { status: r.status, body: r.body });
}
for (const [label, body] of [
  ["approve reason number", { reason: 5 }],
  ["approve reason object", { reason: {} }],
  ["approve reason 2001 chars", { reason: "y".repeat(2001) }],
]) {
  const r = await api(ADM, "POST", `/api/admin/resource-edits/${mid}/approve`, body);
  record(`D11 ${label}`, { status: r.status, body: r.body });
}
record("D11 edit still pending after malformed requests", { edit: (await q(`SELECT status FROM resource_edits WHERE id=$1`, [mid]))[0], auditRows: (await q(`SELECT count(*)::int c FROM resource_audit_log WHERE resource_id=$1`, [R.moderation.id]))[0].c });
const goodReject = await api(ADM, "POST", `/api/admin/resource-edits/${mid}/reject`, { reason: "Duplicate of existing description, please add new information." });
record("D11 valid reject", { status: goodReject.status, body: goodReject.body });
const mod2 = await api(A, "POST", `/api/resources/${R.moderation.id}/edits`, { proposedData: { description: `${R.moderation.title} approved with a note` } });
const goodApprove = await api(ADM, "POST", `/api/admin/resource-edits/${mod2.body?.id}/approve`, { reason: "Verified against the source page." });
record("D11 valid approve with reason", { status: goodApprove.status, body: goodApprove.body });
record("D11 audit rows", { rows: await q(`SELECT action, performed_by, changes, notes FROM resource_audit_log WHERE resource_id=$1 ORDER BY id`, [R.moderation.id]) });
record("D11 edit rows", { rows: await q(`SELECT id, status, rejection_reason, handled_by FROM resource_edits WHERE resource_id=$1 ORDER BY id`, [R.moderation.id]) });

// ---------------- C03 after -----------------
const aiAfter = await aiCount();
record("C03 ai requestCount after all non-admin submissions", { before: aiBefore, after: aiAfter });
record("C03 edits with claude metadata on QA resources", { rows: (await q(`SELECT count(*)::int c FROM resource_edits WHERE resource_id = ANY($1::int[]) AND (claude_metadata IS NOT NULL OR claude_analyzed_at IS NOT NULL)`, [Object.values(R).map(r => r.id)]))[0].c });
record("C03 enrichment queue rows for QA resources", await enrichRows());

saveState(s);
flush("/tmp/qa582/api-proof.json");
await pool.end();
