/**
 * Task 289: remove trailing-slash duplicate resources from the LIVE site via
 * the admin HTTP API (prod DB is read-only from the workspace).
 *
 * Plan: scripts/data/dedup-trailing-slash-prod-plan.json — 39 survivor/loser
 * pairs derived from a read-only sweep of the prod replica on Aug 4, 2026,
 * carrying the EXPECTED url + status of both sides so this script can
 * revalidate live state immediately before each destructive request.
 * Journal of full pre-delete row contents (resources, audit log, enrichment
 * queue) is committed at scripts/data/dedup-trailing-slash-prod-journal.json.
 *
 * Safety (fail closed on any mismatch):
 *  - Preflight per pair via GET /api/admin/resources?search=<url>:
 *      * survivor must exist with the exact expected URL — always required;
 *      * loser must either match its journaled URL + "rejected" status
 *        (→ eligible for deletion) or be entirely absent (→ already deleted,
 *        counted as done ONLY because the survivor was just verified present).
 *  - Any other state (loser URL/status drifted, survivor missing, ambiguous
 *    search results) aborts before any DELETE is issued.
 *  - Every HTTP response (preflight + delete) is recorded in a committed,
 *    non-secret receipt: scripts/data/dedup-trailing-slash-prod-receipt.json.
 *
 * Run: npx tsx scripts/dedup-trailing-slash-prod.ts
 */
import { readFileSync, writeFileSync } from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) { console.error("ADMIN_PASSWORD not set"); process.exit(1); }

type Pair = {
  survivor: number; survivorUrl: string; survivorStatus: string;
  loser: number; loserUrl: string; loserStatus: string;
};
const plan: Pair[] = JSON.parse(readFileSync("scripts/data/dedup-trailing-slash-prod-plan.json", "utf8"));
for (const p of plan) {
  if (!Number.isSafeInteger(p.survivor) || !Number.isSafeInteger(p.loser) || p.survivor <= 0 || p.loser <= 0 ||
      p.survivor === p.loser || !p.survivorUrl || !p.loserUrl || p.loserStatus !== "rejected")
    throw new Error(`invalid pair: ${JSON.stringify(p)}`);
}

const RECEIPT_PATH = "scripts/data/dedup-trailing-slash-prod-receipt.json";
const receipt: any = { startedAt: new Date().toISOString(), base: BASE, pairs: [] };
const saveReceipt = () => writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2));

let cookie = "";
async function login(): Promise<void> {
  const r = await fetch(`${BASE}/api/auth/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`login failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const cookies: string[] = typeof (r.headers as any).getSetCookie === "function"
    ? (r.headers as any).getSetCookie()
    : ([r.headers.get("set-cookie")].filter(Boolean) as string[]);
  // pin ONLY connect.sid (prod edge injects unrelated affinity cookies)
  const sid = cookies.map((c) => c.split(";")[0]).find((c) => c.startsWith("connect.sid="));
  if (!sid) throw new Error("no connect.sid in login response");
  cookie = sid;
}

/** Find a resource by exact URL via the admin list endpoint. Returns the row or null. */
async function findByUrl(url: string): Promise<{ id: number; url: string; status: string } | null> {
  const r = await fetch(`${BASE}/api/admin/resources?search=${encodeURIComponent(url)}&limit=100`, {
    headers: { Cookie: cookie, Origin: BASE },
  });
  if (!r.ok) throw new Error(`admin search failed ${r.status} for ${url}`);
  const body = await r.json();
  const exact = (body.resources || []).filter((x: any) => x.url === url);
  if (exact.length > 1) throw new Error(`ambiguous: ${exact.length} exact-URL matches for ${url}`);
  return exact[0] ? { id: exact[0].id, url: exact[0].url, status: exact[0].status } : null;
}

async function main() {
  await login();
  console.log("logged in");
  let deleted = 0, alreadyDone = 0;

  for (const p of plan) {
    const entry: any = { survivor: p.survivor, loser: p.loser, loserUrl: p.loserUrl };
    receipt.pairs.push(entry);

    // Preflight 1: survivor must exist with the exact expected URL (always).
    const surv = await findByUrl(p.survivorUrl);
    if (!surv || surv.id !== p.survivor)
      throw new Error(`ABORT: survivor ${p.survivor} not found at ${p.survivorUrl} (got ${JSON.stringify(surv)})`);
    entry.survivorVerified = { id: surv.id, status: surv.status };

    // Preflight 2: loser must match journaled url+status, or be absent.
    const loser = await findByUrl(p.loserUrl);
    if (loser === null) {
      // 404-equivalent counts as done ONLY because the survivor was verified above.
      entry.outcome = "already-absent (survivor verified present)";
      alreadyDone++;
      saveReceipt();
      console.log(`pair ${p.loser}: already absent, survivor ${p.survivor} verified`);
      continue;
    }
    if (loser.id !== p.loser || loser.status !== "rejected")
      throw new Error(`ABORT: loser drifted: expected id=${p.loser} status=rejected at ${p.loserUrl}, got ${JSON.stringify(loser)}`);
    entry.loserVerified = { id: loser.id, status: loser.status };

    // Delete
    const r = await fetch(`${BASE}/api/admin/resources/${p.loser}`, {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: BASE },
    });
    entry.deleteStatus = r.status;
    if (r.status !== 200) {
      entry.deleteBody = (await r.text()).slice(0, 200);
      saveReceipt();
      throw new Error(`ABORT: DELETE ${p.loser} returned ${r.status}`);
    }
    // Postcondition: loser gone, survivor still present.
    const gone = await findByUrl(p.loserUrl);
    if (gone !== null) throw new Error(`ABORT: loser ${p.loser} still present after DELETE`);
    const survAfter = await findByUrl(p.survivorUrl);
    if (!survAfter || survAfter.id !== p.survivor) throw new Error(`ABORT: survivor ${p.survivor} missing after DELETE of ${p.loser}`);
    entry.outcome = "deleted; loser absent + survivor present postconditions verified";
    deleted++;
    saveReceipt();
    console.log(`pair ${p.loser}: deleted, postconditions verified`);
  }

  receipt.finishedAt = new Date().toISOString();
  receipt.summary = { pairs: plan.length, deletedThisRun: deleted, alreadyAbsent: alreadyDone };
  saveReceipt();
  console.log(`done: ${deleted} deleted this run, ${alreadyDone} already absent, receipt -> ${RECEIPT_PATH}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
