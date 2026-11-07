import { mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { redact } from "./lib/http.ts";
import type { Check, Result, Status } from "./registry.ts";
import type { Violation } from "./lib/browser.ts";

export const EXIT = { ok: 0, blockingFailed: 1, guard: 2, usage: 3, runner: 4, authExpired: 5 } as const;

export interface CheckRecord {
  id: string;
  tier: number;
  kind: string;
  blocking: boolean;
  status: Status;
  ms: number;
  detail: string;
  values?: Record<string, unknown>;
  evidence?: string[];
  owner: boolean;
  authExpired: boolean;
}

export interface RunSummary {
  runId: string;
  startedAt: string;
  base: string;
  revision: string;
  tiers: number[];
  flags: Record<string, unknown>;
  records: CheckRecord[];
  violations: Violation[];
}

const KEEP_SCHEDULED_DAYS = 30;

export function record(check: Check, result: Result, ms: number, authExpired = false): CheckRecord {
  return {
    id: check.id, tier: check.tier, kind: check.kind, blocking: check.blocking, status: result.status, ms,
    detail: redact(result.detail ?? ""), values: result.values, evidence: result.evidence,
    owner: Boolean(check.needs?.includes("owner")), authExpired,
  };
}

export function exitCode(run: RunSummary): number {
  if (run.violations.length) return EXIT.guard;
  if (run.records.some((r) => r.authExpired)) return EXIT.authExpired;
  return run.records.some((r) => r.blocking && r.status === "fail") ? EXIT.blockingFailed : EXIT.ok;
}

function summaryMarkdown(run: RunSummary, code: number): string {
  const count = (s: Status) => run.records.filter((r) => r.status === s).length;
  const order = { fail: 0, info: 1, skip: 2, pass: 3 } as const;
  const rows = [...run.records].sort((a, b) => order[a.status] - order[b.status]);
  const verdict = code === EXIT.ok ? "PASS" : code === EXIT.authExpired ? "FAIL (exit 5): owner session expired" : `FAIL (exit ${code})`;
  const lines = [
    `# prod-check ${run.runId}: ${verdict}`,
    "",
    `Base ${run.base}, revision \`${run.revision.slice(0, 12)}\`, tiers ${run.tiers.join(",")}, started ${run.startedAt}.`,
    `pass ${count("pass")}, fail ${count("fail")}, info ${count("info")}, skip ${count("skip")}.`,
    `Read-only guard: ${run.violations.length === 0 ? "0 non-GET requests to awesome.video" : `${run.violations.length} non-GET request(s) aborted: ${run.violations.map((v) => `${v.method} ${v.url}`).join(", ")}`}.`,
    "",
    "| id | status | blocking | ms | detail |",
    "|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.id} | ${r.status} | ${r.blocking ? "yes" : "no"} | ${r.ms} | ${r.detail.replace(/\|/g, "\\|")} |`),
  ];
  return lines.join("\n") + "\n";
}

export function writeReport(dir: string, run: RunSummary, code: number): { json: string; markdown: string } {
  mkdirSync(dir, { recursive: true });
  const counts = Object.fromEntries((["pass", "fail", "skip", "info"] as const).map((s) => [s, run.records.filter((r) => r.status === s).length]));
  const json = JSON.stringify(
    {
      schema: 1, runId: run.runId, startedAt: run.startedAt, finishedAt: new Date().toISOString(), base: run.base, revision: run.revision,
      tiers: run.tiers, flags: run.flags, exit: code, counts, guard: { nonGet: run.violations.length, violations: run.violations }, checks: run.records,
    },
    null,
    2,
  );
  const markdown = summaryMarkdown(run, code);
  writeFileSync(join(dir, "result.json"), redact(json) + "\n");
  writeFileSync(join(dir, "summary.md"), redact(markdown));
  return { json, markdown };
}

export function pruneScheduled(root: string): void {
  const cutoff = Date.now() - KEEP_SCHEDULED_DAYS * 86_400_000;
  for (const d of readdirSync(root)) {
    const m = /^(\d{4})(\d{2})(\d{2})T/.exec(d);
    if (m && Date.UTC(+m[1], +m[2] - 1, +m[3]) < cutoff) rmSync(join(root, d), { recursive: true, force: true });
  }
}

export function linkLatest(root: string, dir: string): void {
  const link = join(root, "latest");
  rmSync(link, { force: true });
  symlinkSync(dir, link);
}
