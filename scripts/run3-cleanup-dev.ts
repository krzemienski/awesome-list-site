/**
 * Run3 audit data cleanup (task #135, T007) — DEV database.
 *
 * Phases (each journaled to evidence/run3/dev-cleanup-journal.json):
 *  A. R3-03  QA artifacts: hard-delete AuditTestResource* rows and __qa_test_* users
 *            (resource_edits cleaned + non-cascade user FKs NULLed first).
 *  B. R3-13  Junk rows: hard-delete fragment/#-URL + nav-anchor resources.
 *  C. R3-24  Duplicate clusters: keep canonical (longest description, lowest id),
 *            repoint journey steps, set losers to status='rejected' (reversible —
 *            same pattern as scripts/dedup-reject.ts).
 *  D. R3-25  Slug titles (owner/repo) -> humanized titles (collision-guarded).
 *  E. R3-26/27 Decode HTML entities + strip emails in titles/descriptions.
 *  F. R3-28  Approved rows with description < 20 chars -> sanitized or fallback.
 *  G. Verification: re-count every gate metric; non-zero gates exit(1).
 *
 * Run:  npx tsx scripts/run3-cleanup-dev.ts            (dry run)
 *       npx tsx scripts/run3-cleanup-dev.ts --apply    (writes)
 */
import fs from "fs";
import path from "path";
import { db } from "../server/db";
import {
  resources,
  resourceEdits,
  journeySteps,
  researchDiscoveries,
  githubSyncHistory,
  enrichmentJobs,
  researchJobs,
  users,
} from "../shared/schema";
import { eq, inArray, like, sql } from "drizzle-orm";
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
const journal: any = { startedAt: new Date().toISOString(), apply: APPLY, phases: [] };

const ENTITY_RE = /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/;

function log(msg: string) {
  console.log(msg);
}

async function hardDeleteResources(ids: number[], phase: string) {
  if (ids.length === 0) return;
  // Journal full row contents (memory: journal ROW CONTENTS, not just ids).
  const rows = await db.select().from(resources).where(inArray(resources.id, ids));
  const editRows = await db.select().from(resourceEdits).where(inArray(resourceEdits.resourceId, ids));
  const stepRows = await db.select().from(journeySteps).where(inArray(journeySteps.resourceId, ids));
  journal.phases.push({ phase, deletedResources: rows, deletedResourceEdits: editRows, cascadedJourneySteps: stepRows });
  if (stepRows.length > 0) {
    log(`  !! ${stepRows.length} journey step(s) reference rows being deleted in ${phase} — journaled`);
  }
  if (!APPLY) return;
  // Non-cascade FKs first: resource_edits (notNull, no ON DELETE) and
  // research_discoveries.created_resource_id (no ON DELETE).
  await db.delete(resourceEdits).where(inArray(resourceEdits.resourceId, ids));
  await db
    .update(researchDiscoveries)
    .set({ createdResourceId: null })
    .where(inArray(researchDiscoveries.createdResourceId, ids));
  await db.delete(resources).where(inArray(resources.id, ids));
}

async function main() {
  log(`=== run3 cleanup (dev) — ${APPLY ? "APPLY" : "DRY RUN"} ===\n`);

  // ---------- Phase A: QA artifacts (R3-03) ----------
  const qaUsers = await db.select().from(users).where(like(users.email, "__qa_test_%"));
  const qaUserIds = qaUsers.map((u) => u.id);
  const qaResourceRows = await db
    .select({ id: resources.id, title: resources.title, status: resources.status, submittedBy: resources.submittedBy })
    .from(resources)
    .where(
      qaUserIds.length > 0
        ? sql`${resources.title} LIKE 'AuditTestResource%' OR ${resources.submittedBy} IN ${qaUserIds}`
        : sql`${resources.title} LIKE 'AuditTestResource%'`
    );
  log(`Phase A (R3-03): ${qaResourceRows.length} QA resources, ${qaUsers.length} __qa_test users`);
  await hardDeleteResources(qaResourceRows.map((r) => r.id), "A:qa-resources");
  journal.phases.push({ phase: "A:qa-users", users: qaUsers.map(({ password, ...u }: any) => u) });
  if (APPLY && qaUserIds.length > 0) {
    // Non-cascade user FKs (submittedBy on resource_edits is NOT NULL -> delete rows).
    await db.delete(resourceEdits).where(inArray(resourceEdits.submittedBy, qaUserIds));
    await db.update(resourceEdits).set({ handledBy: null }).where(inArray(resourceEdits.handledBy, qaUserIds));
    await db.update(resources).set({ approvedBy: null }).where(inArray(resources.approvedBy, qaUserIds));
    await db.update(githubSyncHistory).set({ performedBy: null }).where(inArray(githubSyncHistory.performedBy, qaUserIds));
    await db.update(enrichmentJobs).set({ startedBy: null }).where(inArray(enrichmentJobs.startedBy, qaUserIds));
    await db.update(researchJobs).set({ startedBy: null }).where(inArray(researchJobs.startedBy, qaUserIds));
    await db.delete(users).where(inArray(users.id, qaUserIds));
  }

  // ---------- Load remaining catalog once ----------
  const all = await db.select().from(resources);
  const deletedA = new Set(qaResourceRows.map((r) => r.id));
  const live = all.filter((r) => !deletedA.has(r.id));

  // ---------- Phase B: junk rows (R3-13) ----------
  const junk = live.filter((r) => isJunkResource(r.title, r.url));
  log(`Phase B (R3-13): ${junk.length} junk rows (fragment URLs / nav anchors)`);
  for (const j of junk) log(`  junk #${j.id} [${j.status}] "${j.title}" ${j.url}`);
  await hardDeleteResources(junk.map((r) => r.id), "B:junk");
  const deletedB = new Set(junk.map((r) => r.id));

  // ---------- Phase C: duplicate clusters (R3-24) ----------
  const approved = live.filter((r) => !deletedB.has(r.id) && r.status === "approved");
  const byKey = new Map<string, typeof approved>();
  for (const r of approved) {
    const urlKey = `u:${normalizeUrlForDedup(r.url)}`;
    if (!byKey.has(urlKey)) byKey.set(urlKey, [] as any);
    byKey.get(urlKey)!.push(r);
  }
  // Title+domain clusters (only where URL keys differ).
  const byTitleDomain = new Map<string, typeof approved>();
  for (const r of approved) {
    const k = `t:${normalizeTitleForDedup(r.title)}|${domainOf(r.url)}`;
    if (!byTitleDomain.has(k)) byTitleDomain.set(k, [] as any);
    byTitleDomain.get(k)!.push(r);
  }
  const clusters: Array<{ key: string; rows: typeof approved }> = [];
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
  log(`Phase C (R3-24): ${clusters.length} duplicate clusters`);
  const rejectedIds: number[] = [];
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
    log(`  keep #${keep.id} "${keep.title}" — reject ${losers.map((l) => `#${l.id}`).join(", ")}`);
    for (const loser of losers) {
      rejectedIds.push(loser.id);
      if (APPLY) {
        const repointed = await db
          .update(journeySteps)
          .set({ resourceId: keep.id })
          .where(eq(journeySteps.resourceId, loser.id))
          .returning({ id: journeySteps.id });
        if (repointed.length > 0) log(`    repointed ${repointed.length} journey step(s) ${loser.id} -> ${keep.id}`);
        await db.update(resources).set({ status: "rejected" }).where(eq(resources.id, loser.id));
      }
    }
  }
  journal.phases.push({ phase: "C:dedup", clusters: clusterJournal });
  const rejectedSet = new Set(rejectedIds);

  // ---------- Phase D: slug titles (R3-25) ----------
  const remaining = live.filter((r) => !deletedB.has(r.id) && !rejectedSet.has(r.id));
  // Collision guard: humanized title must not collide with an existing
  // title+domain pair, or we'd create new "duplicate" clusters.
  const takenKeys = new Set(remaining.map((r) => `${normalizeTitleForDedup(r.title)}|${domainOf(r.url)}`));
  const slugRows = remaining.filter((r) => isSlugTitle(r.title));
  log(`Phase D (R3-25): ${slugRows.length} slug titles to humanize`);
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
    if (APPLY) await db.update(resources).set({ title: newTitle }).where(eq(resources.id, r.id));
  }
  journal.phases.push({ phase: "D:slug-titles", changes: titleJournal });
  log(`  updated ${titleJournal.length}`);

  // ---------- Phase E: entities + emails (R3-26/27) ----------
  const textJournal: any[] = [];
  for (const r of remaining) {
    const newTitle = decodeHtmlEntities(r.title).replace(/\s+/g, " ").trim();
    const newDesc = sanitizeDescription(r.description || "");
    const titleChanged = ENTITY_RE.test(r.title) && newTitle !== r.title;
    const descChanged =
      (ENTITY_RE.test(r.description || "") || containsEmail(r.description || "")) && newDesc !== (r.description || "");
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
    if (APPLY) await db.update(resources).set(patch).where(eq(resources.id, r.id));
  }
  journal.phases.push({ phase: "E:entities-emails", changes: textJournal });
  log(`Phase E (R3-26/27): ${textJournal.length} rows cleaned (entities/emails)`);

  // ---------- Phase F: short descriptions (R3-28) ----------
  const descJournal: any[] = [];
  for (const r of remaining) {
    if (r.status !== "approved") continue;
    const cur = (r.description || "").trim();
    if (cur.length >= MIN_DESCRIPTION_LENGTH) continue;
    const fixed = ensureMinDescription(cur, r.title, r.url);
    descJournal.push({ id: r.id, from: cur, to: fixed });
    r.description = fixed;
    if (APPLY) await db.update(resources).set({ description: fixed }).where(eq(resources.id, r.id));
  }
  journal.phases.push({ phase: "F:short-descriptions", changes: descJournal });
  log(`Phase F (R3-28): ${descJournal.length} short descriptions backfilled`);

  // ---------- Phase G: verification ----------
  const finalRows = await db.select().from(resources);
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
  const outDir = path.join(process.cwd(), "evidence", "run3");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, APPLY ? "dev-cleanup-journal.json" : "dev-cleanup-dryrun.json");
  fs.writeFileSync(outFile, JSON.stringify(journal, null, 2));
  log(`\n=== gates (post-${APPLY ? "apply" : "dryrun; unchanged DB"}) ===`);
  log(JSON.stringify(gates, null, 2));
  log(`journal: ${outFile}`);

  if (APPLY) {
    const bad =
      gates.junkUrls + gates.slugTitles + gates.entities + gates.emails + gates.shortDescriptions + gates.qaArtifacts + gates.dupClusters;
    if (bad > 0) {
      console.error(`GATE FAILURE: ${bad} residual violations`);
      process.exit(1);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("cleanup failed:", err);
  process.exit(1);
});
