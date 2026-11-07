import { parseArgs } from "node:util";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AuthExpiredError, createHttp, redact } from "./lib/http.ts";
import { createBrowserKit, type BrowserKit } from "./lib/browser.ts";
import { loadCredentials, openActor, type Actor } from "./lib/audit-actor.ts";
import { select, type Check, type Ctx, type Result } from "./registry.ts";
import { EXIT, exitCode, linkLatest, pruneScheduled, record, writeReport, type CheckRecord, type RunSummary } from "./report.ts";
import "./checks/tier0.ts";
import "./checks/tier1-api.ts";
import "./checks/tier1-browser.ts";
import "./checks/tier1-admin-ui.ts";
import { cleanup, closeTier2Actors, tier2Wrote, verifyGone } from "./checks/tier2.ts";
import "./checks/tier3.ts";

const PROD_BASE = "https://awesome.video";
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const USAGE = "usage: npx tsx scripts/prod-check/index.ts [--tier 0,1,3] [--base https://awesome.video] [--only T1-04,T0-01] [--json] [--schedule]\n       Tier 2 (writes): --tier 2 --allow-writes, with PROD_CHECK_AUDIT_ADMIN_ID and PROD_CHECK_AUDIT_MEMBER_ID set";

class UsageError extends Error {}

function parse() {
  const { values } = parseArgs({
    options: {
      tier: { type: "string", default: "0,1" },
      base: { type: "string", default: PROD_BASE },
      only: { type: "string", default: "" },
      json: { type: "boolean", default: false },
      schedule: { type: "boolean", default: false },
      "allow-writes": { type: "boolean", default: false },
    },
    strict: true,
  });
  const tiers = values.tier.split(",").map(Number);
  if (tiers.some((t) => ![0, 1, 2, 3].includes(t))) throw new UsageError(`bad --tier ${values.tier}`);
  if (tiers.includes(2)) {
    if (!values["allow-writes"]) throw new UsageError("Tier 2 writes to production: pass --allow-writes");
    if (values.schedule) throw new UsageError("Tier 2 never runs on a schedule");
    const ids = process.env.PROD_CHECK_AUDIT_ADMIN_ID && process.env.PROD_CHECK_AUDIT_MEMBER_ID;
    if (!ids || !loadCredentials("Admin") || !loadCredentials("Member")) {
      throw new UsageError("Tier 2 needs the audit admin and member email and password, plus PROD_CHECK_AUDIT_ADMIN_ID and _MEMBER_ID");
    }
  }
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
  const tier2 = checks.some((c) => c.tier === 2);
  if (tier2 && !checks.some((c) => c.id === "T2-00")) checks.unshift(...select([2], ["T2-00"]));
  if (checks.length === 0) throw new UsageError("no checks selected");
  const http = createHttp(args.base);
  let browser: BrowserKit | undefined;
  const adminCreds = checks.some((c) => c.needs?.includes("owner")) ? loadCredentials("Admin") : null;
  let interrupted = false;
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.once(sig, () => {
      interrupted = true;
      log(`${sig}: finishing the current check, then cleaning up Tier 2 rows`);
      process.once(sig, () => process.exit(EXIT.runner));
    });
  }
  if (adminCreds || checks.some((c) => c.kind === "browser")) browser = await createBrowserKit(args.base, http, dir, args.tiers.includes(2));
  let admin: Actor | undefined;

  const ctx: Ctx = { base: args.base, runId, schedule: args.schedule, outRoot, http, browser, shared: new Map() };
  const run: RunSummary = {
    runId, startedAt: new Date().toISOString(), base: args.base, revision: "unknown", tiers: args.tiers,
    flags: { only: args.only, schedule: args.schedule }, records: [], violations: [],
  };
  try {
    if (adminCreds && browser) {
      admin = await openActor(browser, args.base, "Admin", adminCreds).catch(() => {
        throw new AuthExpiredError("audit admin sign-in failed", true);
      });
      ctx.adminKit = admin.kit;
      ctx.admin = admin;
      http.useAdmin(admin);
    }
    run.revision = (await http.get("/api/version")).json<{ revision: string }>().revision;
    for (const check of checks) {
      if (interrupted) break;
      const rec = await runCheck(check, ctx);
      run.records.push(rec);
      log(`${rec.status.toUpperCase().padEnd(4)} ${rec.id.padEnd(7)} ${String(rec.ms).padStart(6)} ms  ${rec.detail}`);
    }
  } finally {
    if (tier2Wrote(ctx)) {
      for (const check of [cleanup, verifyGone]) {
        const rec = await runCheck(check, ctx);
        run.records.push(rec);
        log(`${rec.status.toUpperCase().padEnd(4)} ${rec.id.padEnd(7)} ${String(rec.ms).padStart(6)} ms  ${rec.detail}`);
      }
    }
    await closeTier2Actors(ctx);
    run.violations = browser?.violations ?? [];
    await admin?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
  if (run.violations.length) {
    run.records.push(record({ id: "GUARD", tier: 1, kind: "browser", blocking: true, run: () => Promise.resolve({ status: "fail" }) }, { status: "fail", detail: `${run.violations.length} non-GET request(s) to awesome.video aborted` }, 0));
  }
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
    process.exit(usage ? EXIT.usage : err instanceof AuthExpiredError ? EXIT.authExpired : EXIT.runner);
  },
);
