// AI job terminal-state rules: budget-cap detection must recognise BOTH shapes
// the Claude Agent SDK produces (a returned result and a thrown error result),
// and orphan detection must judge by worker liveness rather than age alone.
import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { isBudgetCapStop } from "../../server/ai/runAgentQuery";
import {
  HEARTBEAT_STALE_MS,
  LEGACY_ORPHAN_THRESHOLD_MS,
  WORKER_ID,
  isJobOrphaned,
  livenessUnchangedSince,
} from "../../server/ai/jobLiveness";
import { enrichmentJobs } from "../../shared/schema";

describe("isBudgetCapStop", () => {
  it("recognises a returned budget-cap result", () => {
    expect(isBudgetCapStop({ subtype: "error_max_budget_usd", numTurns: 2 })).toBe(true);
    expect(isBudgetCapStop({ subtype: "error_during_execution", terminalReason: "budget_exhausted" })).toBe(true);
  });

  it("recognises a thrown budget-cap error result", () => {
    const tagged = Object.assign(new Error("Claude Code returned an error result"), { agentSubtype: "error_max_budget_usd" });
    expect(isBudgetCapStop(tagged)).toBe(true);
    expect(isBudgetCapStop(new Error("Claude Code returned an error result: Reached maximum budget ($0.03)"))).toBe(true);
  });

  it("does not treat other endings as budget stops", () => {
    expect(isBudgetCapStop({ subtype: "success" })).toBe(false);
    expect(isBudgetCapStop({ subtype: "error_max_turns" })).toBe(false);
    expect(isBudgetCapStop(new Error("network down"))).toBe(false);
    expect(isBudgetCapStop(null)).toBe(false);
  });
});

describe("isJobOrphaned", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms);
  const [containerId] = WORKER_ID.split(":");

  it("never reclaims a job owned by this process", () => {
    expect(isJobOrphaned({ workerId: WORKER_ID, heartbeatAt: ago(3_600_000), startedAt: null, createdAt: null }, true, now)).toBe(false);
  });

  it("reclaims a same-container job whose process is gone, even with a fresh heartbeat", () => {
    const row = { workerId: `${containerId}:999999:deadbeef`, heartbeatAt: ago(1_000), startedAt: ago(1_000), createdAt: ago(1_000) };
    expect(isJobOrphaned(row, false, now)).toBe(true);
  });

  it("keeps another instance's job while its heartbeat is fresh, reclaims once stale", () => {
    const base = { workerId: "other-container:4242:abcd", startedAt: ago(600_000), createdAt: ago(600_000) };
    expect(isJobOrphaned({ ...base, heartbeatAt: ago(HEARTBEAT_STALE_MS - 5_000) }, false, now)).toBe(false);
    expect(isJobOrphaned({ ...base, heartbeatAt: ago(HEARTBEAT_STALE_MS + 5_000) }, false, now)).toBe(true);
  });

  it("applies the legacy age rule to rows without a recorded worker", () => {
    const legacy = { workerId: null, heartbeatAt: null, createdAt: null };
    expect(isJobOrphaned({ ...legacy, startedAt: ago(LEGACY_ORPHAN_THRESHOLD_MS - 10_000) }, false, now)).toBe(false);
    expect(isJobOrphaned({ ...legacy, startedAt: ago(LEGACY_ORPHAN_THRESHOLD_MS + 10_000) }, false, now)).toBe(true);
  });
});

describe("livenessUnchangedSince", () => {
  const dialect = new PgDialect();

  it("pins both owner and heartbeat so a heartbeat after the liveness read blocks the flip", () => {
    const beat = new Date("2026-10-10T12:00:00Z");
    const q = dialect.sqlToQuery(livenessUnchangedSince(enrichmentJobs, { workerId: "w:1:a", heartbeatAt: beat }));
    expect(q.sql).toContain('"worker_id" = $1');
    expect(q.sql).toContain('"heartbeat_at" = $2');
    expect(q.params[0]).toBe("w:1:a");
  });

  it("matches legacy rows by NULL owner and heartbeat", () => {
    const q = dialect.sqlToQuery(livenessUnchangedSince(enrichmentJobs, { workerId: null, heartbeatAt: null }));
    expect(q.sql).toContain('"worker_id" is null');
    expect(q.sql).toContain('"heartbeat_at" is null');
  });
});
