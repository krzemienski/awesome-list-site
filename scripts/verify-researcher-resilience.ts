/**
 * Real-system verification of the researcher tool resilience layer.
 * Drives the ACTUAL tool handlers (built by researchService.buildResearchTools)
 * against the live dev database — no mocks:
 *  - happy-path save_discovery persists a real row
 *  - out-of-range confidence is clamped (1-100) instead of overflowing int4
 *  - a REAL non-retryable Postgres failure (FK violation 23503 via a bogus
 *    jobId) fails fast with saved:false — no retries, no queue
 *  - a REAL transient outage (ACCESS EXCLUSIVE table lock wedging every
 *    insert) exercises retry -> in-memory queue -> queued:true, flush
 *    halt-on-first-failure + 30s backoff, then drain-after-recovery
 *  - the unique (job_id, url) index + ON CONFLICT proves the timed-out
 *    inserts that later commit can never produce duplicate rows
 *  - flush drops permanently-rejected queued items with a recovery dump
 * Cleans up every row it creates.
 */
import { db } from '../server/db';
import { researchJobs, researchDiscoveries, agentEvents } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { researchService } from '../server/ai/researchService';
import { AgentEventEmitter } from '../server/ai/agentEvents';

let pass = 0, fail = 0;
const check = (name: string, cond: boolean, detail = '') => {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  cond ? pass++ : fail++;
};

async function main() {
  const [job] = await db.insert(researchJobs).values({
    prompt: '__qa_resilience_harness__',
    status: 'processing',
    maxBudgetUsd: '0.01',
    maxTurns: 1,
    startedAt: new Date(),
  }).returning();
  const jobId = job.id;
  console.log(`Harness job id: ${jobId}`);

  const emitter = new AgentEventEmitter('research', jobId);
  const agentLog: Array<{ role: string; content: string; timestamp: string }> = [];
  const addLog = async (role: string, content: string, persistNow = false) => {
    agentLog.push({ role, content, timestamp: new Date().toISOString() });
    if (persistNow) {
      try {
        await db.update(researchJobs).set({ agentLog }).where(eq(researchJobs.id, jobId));
      } catch { /* pool may be wedged during the lock test — same as prod persist() */ }
    }
  };

  const makeCtx = (jid: number): any => ({
    jobId: jid,
    emitter,
    existingUrls: new Set<string>(),
    discoveryCap: 50,
    discoveriesSaved: 0,
    consecutiveDuplicates: 0,
    pendingDiscoveries: [],
    flushBackoffUntil: 0,
    addLog,
  });
  const runCtx = makeCtx(jobId);

  const svc: any = researchService;
  const [checkDuplicate, saveDiscovery, coverageGaps, existingResources] = svc.buildResearchTools(runCtx);
  const call = async (t: any, args: any) => {
    const res = await t.handler(args, {});
    return JSON.parse(String(res.content[0].text).split('\n\n')[0]);
  };

  const freshUrl = `https://qa-resilience.example.com/tool-${Date.now()}`;
  const lockUrl = `https://qa-resilience.example.com/lock-${Date.now()}`;
  let releaseLock: (() => void) | null = null;
  let lockDone: Promise<void> = Promise.resolve();

  try {
    // T1: check_duplicate on a fresh URL
    const t1 = await call(checkDuplicate, { url: freshUrl });
    check('T1 check_duplicate fresh URL -> isDuplicate=false', t1.isDuplicate === false);

    // T2: happy-path save persists a REAL row
    const t2 = await call(saveDiscovery, {
      title: 'QA Resilience Tool A', url: freshUrl, description: 'harness',
      suggested_category: 'Encoding & Codecs', confidence: 88, reasoning: 'harness happy path',
    });
    const [row] = await db.select().from(researchDiscoveries).where(eq(researchDiscoveries.id, t2.discoveryId ?? -1));
    check('T2 save_discovery happy path -> saved:true + row in DB', t2.saved === true && !!row, `discoveryId=${t2.discoveryId}`);

    // T3: same URL now reads as duplicate (in-memory set updated)
    const t3 = await call(checkDuplicate, { url: freshUrl });
    check('T3 check_duplicate after save -> isDuplicate=true', t3.isDuplicate === true);

    // T4: duplicate save rejected
    const t4 = await call(saveDiscovery, {
      title: 'dup', url: freshUrl, description: 'x',
      suggested_category: 'Encoding & Codecs', confidence: 90, reasoning: 'dup',
    });
    check('T4 duplicate save -> saved:false', t4.saved === false && /already exists/i.test(t4.reason || ''));

    // T5: out-of-range confidence is CLAMPED, not a DB error (used to overflow int4)
    const clampUrl = `https://qa-resilience.example.com/clamp-${Date.now()}`;
    const t5 = await call(saveDiscovery, {
      title: 'QA Clamp Candidate', url: clampUrl, description: 'confidence out of range',
      suggested_category: 'Encoding & Codecs', confidence: 3000000000, reasoning: 'clamp path',
    });
    const [clampRow] = await db.select().from(researchDiscoveries).where(eq(researchDiscoveries.id, t5.discoveryId ?? -1));
    check('T5 confidence 3e9 -> saved:true with clamped confidence 100',
      t5.saved === true && clampRow?.confidence === 100, `confidence=${clampRow?.confidence}`);

    // T6: REAL non-retryable failure — FK violation (23503) via a bogus jobId.
    // Must fail FAST with saved:false; never queued, never retried as-is.
    const badCtx = makeCtx(999999999);
    const [, badSave] = svc.buildResearchTools(badCtx);
    const t6start = Date.now();
    const t6 = await call(badSave, {
      title: 'QA FK Violation', url: `https://qa-resilience.example.com/fk-${Date.now()}`, description: 'x',
      suggested_category: 'Encoding & Codecs', confidence: 80, reasoning: 'non-retryable path',
    });
    const t6ms = Date.now() - t6start;
    check('T6 FK violation -> saved:false, permanently rejected',
      t6.saved === false && /permanently rejected/i.test(t6.reason || ''), JSON.stringify(t6).slice(0, 120));
    check('T6 FK violation -> NOT queued + fast-fail (no retry sleeps)',
      badCtx.pendingDiscoveries.length === 0 && t6ms < 10000, `${t6ms}ms, queue=${badCtx.pendingDiscoveries.length}`);

    // T6b: a permanently-rejected item already IN the queue is dropped with a
    // recovery dump instead of being retried forever.
    badCtx.pendingDiscoveries.push({
      input: {
        title: 'QA Stuck Queue Item', url: 'https://qa-resilience.example.com/stuck', description: 'x',
        suggested_category: 'Encoding & Codecs', confidence: 80, reasoning: 'flush drop path',
      },
      normalizedUrl: 'qa-resilience.example.com/stuck', queuedAt: new Date().toISOString(),
    });
    await svc.flushPendingDiscoveries(badCtx, { force: true });
    const logStr = JSON.stringify(agentLog);
    check('T6b flush drops non-retryable queued item with recovery dump',
      badCtx.pendingDiscoveries.length === 0 && logStr.includes('manual recovery data') && logStr.includes('/stuck'));

    // T7: REAL transient outage — hold ACCESS EXCLUSIVE on research_discoveries
    // so every insert wedges. All 3 attempts must time out; response queued:true.
    lockDone = db.transaction(async (tx) => {
      await tx.execute(sql`LOCK TABLE research_discoveries IN ACCESS EXCLUSIVE MODE`);
      await new Promise<void>((resolve) => { releaseLock = resolve; setTimeout(resolve, 60000); });
    }).then(() => console.log('  [lock released]'), (e) => console.log('  [lock txn ended]', e?.message));
    await new Promise(r => setTimeout(r, 500)); // let the lock take hold

    const t7start = Date.now();
    const t7 = await call(saveDiscovery, {
      title: 'QA Lock Candidate', url: lockUrl, description: 'saved during a real table-lock outage',
      suggested_category: 'Encoding & Codecs', confidence: 85, reasoning: 'transient outage path',
    });
    console.log(`  save under lock took ${Date.now() - t7start}ms`);
    check('T7 real outage -> queued:true (handler never threw, never hung)',
      t7.saved === true && t7.queued === true, JSON.stringify(t7).slice(0, 120));
    check('T7 pendingDiscoveries holds the candidate', runCtx.pendingDiscoveries.length === 1);

    // T8: one direct flush attempt during the outage halts on first transient
    // failure and arms the backoff (bounded: a big queue can never wedge a call).
    const t8 = await svc.flushPendingDiscoveries(runCtx, { force: true });
    check('T8 flush during outage halts + arms backoff',
      t8.flushed === 0 && t8.remaining === 1 && runCtx.flushBackoffUntil > Date.now(),
      `backoff in ${runCtx.flushBackoffUntil - Date.now()}ms`);

    // T9: opportunistic (non-forced) flush during backoff is an instant no-op.
    const t9start = Date.now();
    const t9 = await svc.flushPendingDiscoveries(runCtx);
    const t9ms = Date.now() - t9start;
    check('T9 backoff makes opportunistic flush an instant no-op', t9.flushed === 0 && t9.remaining === 1 && t9ms < 500, `${t9ms}ms`);

    // T10: outage ends -> run-end drain persists the queued item.
    releaseLock?.();
    await lockDone;
    await new Promise(r => setTimeout(r, 2000)); // let wedged inserts settle
    await svc.drainPendingDiscoveries(runCtx);
    check('T10 drain after recovery empties the queue', runCtx.pendingDiscoveries.length === 0);

    // T11: the timed-out inserts that later committed + the flush insert must
    // collapse to EXACTLY ONE row (unique index + ON CONFLICT closes the race).
    const lockRows = await db.select({ id: researchDiscoveries.id }).from(researchDiscoveries)
      .where(and(eq(researchDiscoveries.jobId, jobId), eq(researchDiscoveries.url, lockUrl)));
    check('T11 exactly ONE row for the lock-test URL (double-insert race closed)',
      lockRows.length === 1, `rows=${lockRows.length}`);

    // T12/T13: read tools still work (and never throw)
    const t12 = await call(coverageGaps, { limit: 5 });
    check('T12 get_coverage_gaps returns gaps', Array.isArray(t12.gaps) && t12.gaps.length > 0, `${t12.gaps?.length} gaps`);
    const t13 = await call(existingResources, { category: 'Encoding', limit: 5 });
    check('T13 get_existing_resources returns data', typeof t13.count === 'number' && !t13.degraded, `count=${t13.count}`);
  } finally {
    releaseLock?.();
    await lockDone.catch(() => {});
    // Cleanup everything the harness created
    await db.delete(researchDiscoveries).where(eq(researchDiscoveries.jobId, jobId));
    await db.delete(agentEvents).where(and(eq(agentEvents.jobType, 'research'), eq(agentEvents.jobId, jobId)));
    await db.delete(agentEvents).where(and(eq(agentEvents.jobType, 'research'), eq(agentEvents.jobId, 999999999)));
    await db.delete(researchJobs).where(eq(researchJobs.id, jobId));
    console.log('Cleanup done (harness job, discoveries, agent events removed).');
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(1); });
