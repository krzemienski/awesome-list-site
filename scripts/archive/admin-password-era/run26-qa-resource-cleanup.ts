/**
 * Run26 QA-residue cleanup (Task: clean up leftover test resources in the
 * production admin pending queue).
 *
 * Target: pending resources whose URL is a placeholder example.com URL
 * (QA-probe residue from earlier audit runs, ids roughly 188378-188554).
 * Per the qa-throwaway-user-teardown memory these are deleted, not repointed.
 *
 * Safety:
 *   - Deletes placeholder-URL resources in 'pending' AND 'rejected' status
 *     (both are QA residue cluttering admin lists). Approved resources with
 *     example.com URLs (there should be none after run25) are reported but
 *     NOT touched.
 *   - Journals FULL ROW CONTENTS of every resource before deletion
 *     (evidence/run26/qa-resource-cleanup-<env>.json) so anything deleted can
 *     be reconstructed.
 *   - Server-side deleteResource handles the audit row + non-cascading child
 *     FKs (resource_edits, research_discoveries.created_resource_id).
 *   - Idempotent: a second run matches nothing and mutates nothing.
 *
 * Dev validation: PROD_BASE=http://localhost:5000 npx tsx scripts/run26-qa-resource-cleanup.ts
 * Prod:           npx tsx scripts/run26-qa-resource-cleanup.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

const isPlaceholder = (url: string) => /^https?:\/\/(www\.)?example\.com([/:?#]|$)/i.test(url || "");

const journal: any = { startedAt: new Date().toISOString(), base: BASE, actions: [], deletedRows: [] };
function log(entry: any) {
  journal.actions.push(entry);
  console.log(JSON.stringify(entry).slice(0, 300));
}

let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  try {
    body = await r.json();
  } catch {
    /* non-JSON */
  }
  return { status: r.status, body };
}

async function login(): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const setCookies: string[] =
        (r.headers as any).getSetCookie?.() ??
        [r.headers.get("set-cookie")].filter(Boolean);
      const sid = setCookies.find((c) => c.startsWith("connect.sid="));
      if (!sid) throw new Error("login OK but no connect.sid in response");
      cookie = sid.split(";")[0];
      console.log(`[login] ok (attempt ${attempt})`);
      return;
    }
    console.log(`[login] attempt ${attempt} -> ${r.status}`);
    await new Promise((res) => setTimeout(res, 5000 * attempt));
  }
  throw new Error("login failed after retries");
}

async function fetchAllResources(status?: string): Promise<any[]> {
  const all: any[] = [];
  const statusParam = status ? `&status=${status}` : "";
  for (let page = 1; page < 500; page++) {
    const { status: s, body } = await api(`/api/admin/resources?limit=100&page=${page}${statusParam}`);
    if (s !== 200 || !body?.resources?.length) break;
    all.push(...body.resources);
    if (body.resources.length < 100) break;
  }
  return all;
}

async function main() {
  await login();

  const everything = await fetchAllResources();
  const placeholders = everything.filter((r) => isPlaceholder(r.url));
  const targets = placeholders.filter((r) => r.status === "pending" || r.status === "rejected");
  const approvedResidue = placeholders.filter((r) => r.status === "approved");
  log({
    step: "scanned",
    totalResources: everything.length,
    placeholderMatches: placeholders.length,
    deletable: targets.length,
    byStatus: targets.reduce((acc: any, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {}),
  });
  if (approvedResidue.length) {
    log({
      step: "approved-residue-report-only",
      count: approvedResidue.length,
      rows: approvedResidue.map((r) => ({ id: r.id, status: r.status, url: r.url, title: r.title })),
    });
  }

  if (!targets.length) {
    log({ step: "delete", action: "no-op", reason: "no pending/rejected placeholder resources" });
  }

  let succeeded = 0;
  let failed = 0;
  for (const t of targets) {
    // Journal the full row before deletion so it can be reconstructed.
    journal.deletedRows.push(t);
    const { status, body } = await api(`/api/admin/resources/bulk/delete`, {
      method: "POST",
      body: JSON.stringify({ ids: [t.id] }),
    });
    const ok = status === 200 && body?.succeeded === 1;
    if (ok) succeeded++;
    else failed++;
    log({ step: "delete", id: t.id, title: t.title, url: t.url, status, body, ok });
  }

  // Verify: re-scan for placeholder URLs in pending/rejected — must be zero.
  const after = await fetchAllResources();
  const remaining = after.filter((r) => isPlaceholder(r.url) && (r.status === "pending" || r.status === "rejected"));
  log({ step: "verify", totalAfter: after.length, remainingPlaceholders: remaining.length, remainingIds: remaining.map((r) => r.id) });

  journal.completedAt = new Date().toISOString();
  journal.succeeded = succeeded;
  journal.failed = failed;
  fs.mkdirSync("evidence/run26", { recursive: true });
  // Runs that mutated get their own timestamped journal so a later no-op
  // re-run can never overwrite the record of what was actually deleted.
  const suffix = succeeded + failed > 0 ? `-${Date.now()}` : "-noop";
  fs.writeFileSync(`evidence/run26/qa-resource-cleanup-${ENV_TAG}${suffix}.json`, JSON.stringify(journal, null, 2));
  console.log(`DONE (${ENV_TAG}): deleted ${succeeded}, failed ${failed}, remaining placeholders in pending: ${remaining.length}. Second run should be a no-op.`);
  if (failed > 0 || remaining.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
