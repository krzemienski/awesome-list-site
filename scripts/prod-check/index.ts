import { parseArgs } from "node:util";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AuthExpiredError, createHttp, redact } from "./lib/http.ts";
import { createBrowserKit, type BrowserKit } from "./lib/browser.ts";
import { select, type Check, type Ctx, type Result } from "./registry.ts";
import { EXIT, exitCode, linkLatest, pruneScheduled, record, writeReport, type CheckRecord, type RunSummary } from "./report.ts";
import "./checks/tier0.ts";
import "./checks/tier1-api.ts";
import "./checks/tier1-browser.ts";
import "./checks/tier1-admin-ui.ts";
import "./checks/tier3.ts";

const PROD_BASE = "https://awesome.video";
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const USAGE = "usage: npx tsx scripts/prod-check/index.ts [--tier 0,1,3] [--base https://awesome.video] [--only T1-04,T0-01] [--json] [--schedule]";

class UsageError extends Error {}

function parse() {
  const { values } = parseArgs({
    options: {
      tier: { type: "string", default: "0,1" },
      base: { type: "string", default: PROD_BASE },
      only: { type: "string", default: "" },
      json: { type: "boolean", default: false },
      schedule: { type: "boolean", default: false },
    },
    strict: true,
  });
  const tiers = values.tier.split(",").map(Number);
  if (tiers.some((t) => ![0, 1, 2, 3].includes(t))) throw new UsageError(`bad --tier ${values.tier}`);
  if (tiers.includes(2)) throw new UsageError("Tier 2 not available until #76/#77");
  if (values.base !== PROD_BASE) throw new UsageError(`--base must be ${PROD_BASE}: the owner session is only sent there`);
  return { tiers, only: values.only.split(",").filter(Boolean), json: values.json, schedule: values.schedule, base: values.base };
}

const utcStamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

async function runCheck(check: Check, ctx: Ctx): Promise<CheckRecord> {
  const started = Date.now();
  let result: Result;
  let authExpired = false;
  try {
    result = await check.run(ctx);
  } catch (err) {
    authExpired = err instanceof AuthExpiredError;
    result = { status: "fail", detail: redact(err instanceof Error ? err.message : String(err)) };
  }
  return record(check, result, Date.now() - started, authExpired);
}

async function main(): Promise<number> {
  const args = parse();
  const runId = utcStamp();
  const outRoot = args.schedule ? join(homedir(), ".cache", "awesome-prod-check") : resolve(REPO_ROOT, "e2e-evidence", "prod-check");
  const dir = join(outRoot, runId);
  const log = (line: string) => process.stderr.write(line + "\n");

  const checks = select(args.tiers, args.only);
  if (checks.length === 0) throw new UsageError("no checks selected");
  const http = createHttp(args.base);
  let browser: BrowserKit | undefined;
  if (checks.some((c) => c.kind === "browser")) browser = await createBrowserKit(args.base, http, dir);

  const ctx: Ctx = { base: args.base, runId, schedule: args.schedule, outRoot, http, browser, shared: new Map() };
  const run: RunSummary = {
    runId, startedAt: new Date().toISOString(), base: args.base, revision: "unknown", tiers: args.tiers,
    flags: { only: args.only, schedule: args.schedule }, records: [], violations: [],
  };
  try {
    run.revision = (await http.get("/api/version")).json<{ revision: string }>().revision;
    for (const check of checks) {
      const rec = await runCheck(check, ctx);
      run.records.push(rec);
      log(`${rec.status.toUpperCase().padEnd(4)} ${rec.id.padEnd(7)} ${String(rec.ms).padStart(6)} ms  ${rec.detail}`);
    }
  } finally {
    await browser?.close();
  }
  run.violations = browser?.violations ?? [];
  const code = exitCode(run);
  const { json, markdown } = writeReport(dir, run, code);
  if (args.schedule) pruneScheduled(outRoot);
  linkLatest(outRoot, dir);
  process.stdout.write(args.json ? redact(json) + "\n" : "");
  log("\n" + markdown + `evidence: ${dir}\nexit ${code}`);
  return code;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    const usage = err instanceof UsageError || (err as NodeJS.ErrnoException)?.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION";
    process.stderr.write(`${redact(err instanceof Error ? err.message : String(err))}\n${usage ? USAGE + "\n" : ""}`);
    process.exit(usage ? EXIT.usage : EXIT.runner);
  },
);
