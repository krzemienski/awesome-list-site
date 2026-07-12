/**
 * Run3 audit data cleanup (task #135) — LIVE PROD via admin API.
 *
 * Same detection logic as scripts/run3-cleanup-dev.ts (shared
 * server/github/importHygiene helpers), but every write goes through the live
 * admin API because prod's database is not directly writable from here:
 *  A. R3-03  QA artifacts (AuditTestResource* rows, any status) -> DELETE
 *            /api/admin/resources/:id. (__qa_test users are journaled only —
 *            prod has no delete-user endpoint.)
 *  B. R3-13  Junk fragment/#-URL rows -> DELETE.
 *  C. R3-24  Duplicate clusters -> losers PUT /api/resources/:id/reject
 *            (reversible, same pattern as the dev script's status flip).
 *  D. R3-25  Slug titles -> humanized (collision-guarded) via PUT
 *            /api/admin/resources/:id.
 *  E. R3-26/27 Entities/emails cleaned via PUT.
 *  F. R3-28  Approved short descriptions backfilled via PUT.
 *  G. Gates recomputed from a full refetch; non-zero -> exit 1.
 *
 * Resumable: every op is keyed in evidence/run3/prod-cleanup-state.json the
 * moment it succeeds; re-runs skip completed ops. A soft time budget stops the
 * run cleanly (exit 2 = resume needed) so it survives short shell sessions.
 * The admin password comes from process.env and is NEVER logged.
 *
 * Run:  npx tsx scripts/run3-cleanup-prod.ts            (dry run)
 *       npx tsx scripts/run3-cleanup-prod.ts --apply    (writes)
 */
import fs from "fs";
import path from "path";
import {
  isJunkResource,
  isSlugTitle,
  humanizeTitle,
  decodeHtmlEntities,
  sanitizeDescription,
  containsEmail,
  ensureMinDescription,
  normalizeUrlForDedup,
  normalizeTitleForDedup,
  domainOf,
  MIN_DESCRIPTION_LENGTH,
} from "../server/github/importHygiene";

const APPLY = process.argv.includes("--apply");
const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const START = Date.now();
const BUDGET_MS = 80_000;
const ENTITY_RE = /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/;

const OUT_DIR = path.join(process.cwd(), "evidence", "run3");
const STATE_FILE = path.join(OUT_DIR, "prod-cleanup-state.json");
const JOURNAL_FILE = path.join(OUT_DIR, APPLY ? "prod-cleanup-journal.json" : "prod-cleanup-dryrun.json");

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const state: Record<string, any> = fs.existsSync(STATE_FILE)
  ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
  : {};
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state));

type Row = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  status: string;
  submittedBy: string | null;
};

const journal: any = { startedAt: new Date().toISOString(), apply: APPLY, base: BASE, phases: [] };

function overBudget(): boolean {
  return Date.now() - START > BUDGET_MS;
}

function bail(msg: string): never {
  journal.stoppedEarly = msg;
  journal.finishedAt = new Date().toISOString();
  fs.writeFileSync(JOURNAL_FILE, JSON.stringify(journal, null, 2));
  console.log(`\n== TIME BUDGET — ${msg}. Re-run to resume. ==`);
  process.exit(2);
}

async function login(): Promise<string> {
  const r = await fetch(`${BASE}/api/auth/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`login failed ${r.status}: ${body.slice(0, 200)}`);
  const anyHeaders = r.headers as any;
  const cookies: string[] = typeof anyHeaders.getSetCookie === "function"
    ? anyHeaders.getSetCookie()
    : ([r.headers.get("set-cookie")].filter(Boolean) as string[]);
  const cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("login ok but no session cookie");
  return cookie;
}

async function fetchAll(): Promise<Row[]> {
  const out: Row[] = [];
  for (const status of ["approved", "pending", "rejected"]) {
    let offset = 0;
    for (;;) {
      const r = await fetch(`${BASE}/api/resources?status=${status}&limit=200&offset=${offset}`);
      if (!r.ok) throw new Error(`fetch ${status}@${offset} -> ${r.status}`);
      const j = await r.json();
      const rows: Row[] = j.resources || [];
      out.push(...rows);
      offset += rows.length;
      if (rows.length === 0 || offset >= (j.total || 0)) break;
    }
  }
  return out;
}

async function apiDelete(id: number, cookie: string): Promise<boolean> {
  const key = `del:${id}`;
  if (state[key]) return true;
  if (!APPLY) return false;
  if (overBudget()) bail(`before delete #${id}`);
  const r = await fetch(`${BASE}/api/admin/resources/${id}`, { method: "DELETE", headers: { Cookie: cookie } });
  if (r.status === 200 || r.status === 404) {
    state[key] = r.status;
    saveState();
    return true;
  }
  console.error(`  DELETE #${id} failed ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return false;
}

async function apiReject(id: number, cookie: string): Promise<boolean> {
  const key = `rej:${id}`;
  if (state[key]) return true;
  if (!APPLY) return false;
  if (overBudget()) bail(`before reject #${id}`);
  const r = await fetch(`${BASE}/api/resources/${id}/reject`, { method: "PUT", headers: { Cookie: cookie } });
  if (r.ok || r.status === 404) {
    state[key] = r.status;
    saveState();
    return true;
  }
  console.error(`  REJECT #${id} failed ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return false;
}

type StepRef = { stepId: number; journeyId: number; resourceId: number | null };

async function fetchAllJourneySteps(cookie: string): Promise<StepRef[]> {
  const r = await fetch(`${BASE}/api/admin/journeys`, { headers: { Cookie: cookie } });
  if (!r.ok) throw new Error(`admin journeys list -> ${r.status}`);
  const journeys = await r.json();
  const out: StepRef[] = [];
  for (const j of Array.isArray(journeys) ? journeys : journeys.journeys || []) {
    const sr = await fetch(`${BASE}/api/admin/journeys/${j.id}/steps`, { headers: { Cookie: cookie } });
    if (!sr.ok) throw new Error(`journey ${j.id} steps -> ${sr.status}`);
    const steps = await sr.json();
    for (const s of Array.isArray(steps) ? steps : steps.steps || []) {
      out.push({ stepId: s.id, journeyId: j.id, resourceId: s.resourceId ?? null });
    }
  }
  return out;
}

async function apiRepointStep(step: StepRef, newResourceId: number, cookie: string): Promise<boolean> {
  const key = `step:${step.stepId}:${newResourceId}`;
  if (state[key]) return true;
  if (!APPLY) return false;
  if (overBudget()) bail(`before step repoint #${step.stepId}`);
  const r = await fetch(`${BASE}/api/admin/journeys/${step.journeyId}/steps/${step.stepId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ resourceId: newResourceId }),
  });
  if (r.ok) {
    state[key] = 200;
    saveState();
    return true;
  }
  console.error(`  STEP PATCH #${step.stepId} failed ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return false;
}

async function apiUpdate(id: number, patch: Record<string, unknown>, cookie: string): Promise<boolean> {
  const key = `upd:${id}:${Object.keys(patch).sort().join(",")}`;
  if (state[key]) return true;
  if (!APPLY) return false;
  if (overBudget()) bail(`before update #${id}`);
  const r = await fetch(`${BASE}/api/admin/resources/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(patch),
  });
  if (r.ok) {
    state[key] = 200;
    saveState();
    return true;
  }
  console.error(`  UPDATE #${id} failed ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return false;
}

async function main() {
  console.log(`=== run3 cleanup (PROD ${BASE}) — ${APPLY ? "APPLY" : "DRY RUN"} ===\n`);
  const cookie = APPLY ? await login() : "";
  if (APPLY) console.log("logged in — session acquired");

  const all = await fetchAll();
  console.log(`fetched ${all.length} rows (all statuses)`);

  // ---------- Phase A: QA artifacts (R3-03) ----------
  const qaRows = all.filter((r) => r.title.startsWith("AuditTestResource"));
  console.log(`Phase A (R3-03): ${qaRows.length} QA resources`);
  journal.phases.push({ phase: "A:qa-resources", rows: qaRows });
  const deletedIds = new Set<number>();
  for (const r of qaRows) {
    console.log(`  qa #${r.id} [${r.status}] "${r.title}"`);
    if (await apiDelete(r.id, cookie)) deletedIds.add(r.id);
  }

  // ---------- Phase B: junk rows (R3-13) ----------
  const junk = all.filter((r) => !deletedIds.has(r.id) && isJunkResource(r.title, r.url));
  console.log(`Phase B (R3-13): ${junk.length} junk rows`);
  journal.phases.push({ phase: "B:junk", rows: junk });
  for (const r of junk) {
    console.log(`  junk #${r.id} [${r.status}] "${r.title}" ${r.url}`);
    if (await apiDelete(r.id, cookie)) deletedIds.add(r.id);
  }

  // ---------- Phase C: duplicate clusters (R3-24) ----------
  const approved = all.filter((r) => !deletedIds.has(r.id) && r.status === "approved");
  const byKey = new Map<string, Row[]>();
  for (const r of approved) {
    const k = `u:${normalizeUrlForDedup(r.url)}`;
    (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(r);
  }
  const byTitleDomain = new Map<string, Row[]>();
  for (const r of approved) {
    const k = `t:${normalizeTitleForDedup(r.title)}|${domainOf(r.url)}`;
    (byTitleDomain.get(k) ?? byTitleDomain.set(k, []).get(k)!).push(r);
  }
  const clusters: Array<{ key: string; rows: Row[] }> = [];
  const clustered = new Set<number>();
  for (const [k, rows] of Array.from(byKey.entries())) {
    if (rows.length > 1) {
      clusters.push({ key: k, rows });
      rows.forEach((r) => clustered.add(r.id));
    }
  }
  for (const [k, rows] of Array.from(byTitleDomain.entries())) {
    const fresh = rows.filter((r) => !clustered.has(r.id));
    if (fresh.length > 1) {
      clusters.push({ key: k, rows: fresh });
      fresh.forEach((r) => clustered.add(r.id));
    }
  }
  console.log(`Phase C (R3-24): ${clusters.length} duplicate clusters`);
  // Journey-step safety: repoint any step referencing a dup-loser to its
  // keeper BEFORE rejecting (rejected resources vanish from public surfaces).
  const stepsByResource = new Map<number, StepRef[]>();
  if (APPLY) {
    for (const s of await fetchAllJourneySteps(cookie)) {
      if (s.resourceId == null) continue;
      (stepsByResource.get(s.resourceId) ?? stepsByResource.set(s.resourceId, []).get(s.resourceId)!).push(s);
    }
  }
  const repointJournal: any[] = [];
  const rejectedSet = new Set<number>();
  const clusterJournal: any[] = [];
  for (const { key, rows } of clusters) {
    const sorted = [...rows].sort(
      (a, b) => (b.description?.length || 0) - (a.description?.length || 0) || a.id - b.id
    );
    const keep = sorted[0];
    const losers = sorted.slice(1);
    clusterJournal.push({
      key,
      keep: { id: keep.id, title: keep.title, url: keep.url },
      reject: losers.map((l) => ({ id: l.id, title: l.title, url: l.url })),
    });
    console.log(`  keep #${keep.id} "${keep.title}" — reject ${losers.map((l) => `#${l.id}`).join(", ")}`);
    for (const loser of losers) {
      rejectedSet.add(loser.id);
      for (const step of stepsByResource.get(loser.id) || []) {
        console.log(`    repoint step #${step.stepId} (journey ${step.journeyId}) ${loser.id} -> ${keep.id}`);
        repointJournal.push({ stepId: step.stepId, journeyId: step.journeyId, from: loser.id, to: keep.id });
        if (!(await apiRepointStep(step, keep.id, cookie))) {
          console.error(`    !! step repoint failed — SKIPPING reject of #${loser.id}`);
          rejectedSet.delete(loser.id);
        }
      }
      if (rejectedSet.has(loser.id)) await apiReject(loser.id, cookie);
    }
  }
  journal.phases.push({ phase: "C:dedup", clusters: clusterJournal, stepRepoints: repointJournal });

  // ---------- Phase D: slug titles (R3-25) ----------
  const updateQueue: Array<{ id: number; patch: Record<string, unknown> }> = [];
  const remaining = all.filter((r) => !deletedIds.has(r.id) && !rejectedSet.has(r.id));
  const takenKeys = new Set(remaining.map((r) => `${normalizeTitleForDedup(r.title)}|${domainOf(r.url)}`));
  const slugRows = remaining.filter((r) => isSlugTitle(r.title));
  console.log(`Phase D (R3-25): ${slugRows.length} slug titles to humanize`);
  const titleJournal: any[] = [];
  for (const r of slugRows) {
    let newTitle = humanizeTitle(r.title);
    const owner = r.title.split("/")[0]?.trim();
    let key = `${normalizeTitleForDedup(newTitle)}|${domainOf(r.url)}`;
    if (takenKeys.has(key) && owner) {
      newTitle = `${newTitle} (${owner})`;
      key = `${normalizeTitleForDedup(newTitle)}|${domainOf(r.url)}`;
    }
    if (newTitle === r.title || !newTitle) continue;
    takenKeys.add(key);
    titleJournal.push({ id: r.id, from: r.title, to: newTitle });
    r.title = newTitle; // keep in-memory copy current for later phases
    updateQueue.push({ id: r.id, patch: { title: newTitle } });
  }
  journal.phases.push({ phase: "D:slug-titles", changes: titleJournal });
  console.log(`  planned ${titleJournal.length}`);

  // ---------- Phase E: entities + emails (R3-26/27) ----------
  const textJournal: any[] = [];
  for (const r of remaining) {
    const newTitle = decodeHtmlEntities(r.title).replace(/\s+/g, " ").trim();
    const newDesc = sanitizeDescription(r.description || "");
    const titleChanged = ENTITY_RE.test(r.title) && newTitle !== r.title;
    const descChanged =
      (ENTITY_RE.test(r.description || "") || containsEmail(r.description || "")) &&
      newDesc !== (r.description || "");
    if (!titleChanged && !descChanged) continue;
    textJournal.push({
      id: r.id,
      ...(titleChanged ? { titleFrom: r.title, titleTo: newTitle } : {}),
      ...(descChanged ? { descFrom: r.description, descTo: newDesc } : {}),
    });
    const patch: any = {};
    if (titleChanged) {
      patch.title = newTitle;
      r.title = newTitle;
    }
    if (descChanged) {
      patch.description = newDesc;
      r.description = newDesc;
    }
    updateQueue.push({ id: r.id, patch });
  }
  journal.phases.push({ phase: "E:entities-emails", changes: textJournal });
  console.log(`Phase E (R3-26/27): ${textJournal.length} rows to clean (entities/emails)`);

  // ---------- Phase F: short descriptions (R3-28) ----------
  const descJournal: any[] = [];
  for (const r of remaining) {
    if (r.status !== "approved") continue;
    const cur = (r.description || "").trim();
    if (cur.length >= MIN_DESCRIPTION_LENGTH) continue;
    const fixed = ensureMinDescription(cur, r.title, r.url);
    descJournal.push({ id: r.id, from: cur, to: fixed });
    r.description = fixed;
    updateQueue.push({ id: r.id, patch: { description: fixed } });
  }
  journal.phases.push({ phase: "F:short-descriptions", changes: descJournal });
  console.log(`Phase F (R3-28): ${descJournal.length} short descriptions to backfill`);

  // ---------- Apply queued updates with small concurrency ----------
  if (APPLY && updateQueue.length > 0) {
    const pendingOps = updateQueue.filter(
      (op) => !state[`upd:${op.id}:${Object.keys(op.patch).sort().join(",")}`]
    );
    console.log(`\nupdates: ${updateQueue.length - pendingOps.length} already done, ${pendingOps.length} pending`);
    let idx = 0;
    let failures = 0;
    const worker = async () => {
      for (;;) {
        if (Date.now() - START > BUDGET_MS) return;
        const op = pendingOps[idx++];
        if (!op) return;
        if (!(await apiUpdate(op.id, op.patch, cookie))) failures++;
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    const remainingOps = pendingOps.filter(
      (op) => !state[`upd:${op.id}:${Object.keys(op.patch).sort().join(",")}`]
    ).length;
    console.log(`updates: ${remainingOps} still pending, ${failures} failures this run`);
    if (remainingOps > 0) bail(`${remainingOps} updates remaining`);
  }

  // ---------- Phase G: verification (refetch) ----------
  const finalRows = APPLY ? await fetchAll() : all;
  const finalApproved = finalRows.filter((r) => r.status === "approved");
  const gates = {
    junkUrls: finalRows.filter((r) => isJunkResource(r.title, r.url)).length,
    slugTitles: finalApproved.filter((r) => isSlugTitle(r.title)).length,
    entities: finalApproved.filter((r) => ENTITY_RE.test(r.title) || ENTITY_RE.test(r.description || "")).length,
    emails: finalApproved.filter((r) => containsEmail(r.description || "")).length,
    shortDescriptions: finalApproved.filter((r) => (r.description || "").trim().length < MIN_DESCRIPTION_LENGTH).length,
    qaArtifacts: finalRows.filter((r) => r.title.startsWith("AuditTestResource")).length,
    dupClusters: (() => {
      const m = new Map<string, number>();
      for (const r of finalApproved) {
        const k = normalizeUrlForDedup(r.url);
        m.set(k, (m.get(k) || 0) + 1);
      }
      const m2 = new Map<string, number>();
      for (const r of finalApproved) {
        const k = `${normalizeTitleForDedup(r.title)}|${domainOf(r.url)}`;
        m2.set(k, (m2.get(k) || 0) + 1);
      }
      return (
        Array.from(m.values()).filter((n) => n > 1).length +
        Array.from(m2.values()).filter((n) => n > 1).length
      );
    })(),
    approvedTotal: finalApproved.length,
  };
  journal.gates = gates;
  journal.finishedAt = new Date().toISOString();
  fs.writeFileSync(JOURNAL_FILE, JSON.stringify(journal, null, 2));
  console.log(`\n=== gates (${APPLY ? "post-apply refetch" : "dry run; prod unchanged"}) ===`);
  console.log(JSON.stringify(gates, null, 2));
  console.log(`journal: ${JOURNAL_FILE}`);

  if (APPLY) {
    const bad =
      gates.junkUrls + gates.slugTitles + gates.entities + gates.emails +
      gates.shortDescriptions + gates.qaArtifacts + gates.dupClusters;
    if (bad > 0) {
      console.error(`GATE FAILURE: ${bad} residual violations`);
      process.exit(1);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("prod cleanup failed:", err?.message || err);
  process.exit(1);
});
