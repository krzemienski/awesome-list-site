// Dedup of http/https twin resource pairs on prod (July 16, 2026 follow-up).
// Pre-checked on the prod replica: all 3 delete targets have ZERO user-facing
// children (journey_steps / bookmarks / favorites / interactions / edits /
// research_discoveries = 0); only cascade-safe resource_tags + enrichment_queue.
// Full row snapshots are journaled before each delete.
//
// Pair A: keep 185277 (http lives-video.com, APPROVED — https is
//         ERR_TLS_CERT_ALTNAME_INVALID, so no upgrade) / delete 186568
//         (rejected, broken https URL).
// Pair B: delete 186069 (rejected http videolan) / keep 186539 (approved https).
// Pair C: delete 186621 (rejected http doom9)   / keep 184976 (approved https).
//
// All writes via the deployed app's audited admin API — no direct DB.
// Idempotent: 404 on already-deleted ids is a skip.
// Usage: ADMIN_PASSWORD=... npx tsx scripts/dedup-http-twins.ts
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const ADMIN_EMAIL = "admin@example.com";
const JOURNAL_PATH = "audit-evidence/cycle-01/prod-fixes-journal.jsonl";
const SNAPSHOTS_PATH = "audit-evidence/cycle-01/dedup-twin-snapshots.json";

function journalAppend(entry: any): void {
  fs.appendFileSync(JOURNAL_PATH, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}
function journalRead(): any[] {
  if (!fs.existsSync(JOURNAL_PATH)) return [];
  return fs.readFileSync(JOURNAL_PATH, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

let sessionCookie = ""; // pinned from login only — GAESA infra cookie must not clobber it
async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(sessionCookie ? { Cookie: sessionCookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json, res };
}
function captureSessionCookie(res: Response): void {
  const cookies: string[] =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()
      : res.headers.get("set-cookie") ? [res.headers.get("set-cookie") as string] : [];
  const sid = cookies.find((c) => c.trim().startsWith("connect.sid="));
  if (!sid) throw new Error("Login response did not set a connect.sid session cookie");
  sessionCookie = sid.split(";")[0].trim();
}

const DELETES: { id: number; keep: number; why: string }[] = [
  { id: 186568, keep: 185277, why: "rejected https twin with broken TLS (ERR_TLS_CERT_ALTNAME_INVALID); approved http row survives" },
  { id: 186069, keep: 186539, why: "rejected http twin; approved https row survives" },
  { id: 186621, keep: 184976, why: "rejected http twin; approved https row survives" },
];

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD env var is required");
  const snapshots: Record<string, any> = JSON.parse(fs.readFileSync(SNAPSHOTS_PATH, "utf-8"));
  for (const d of DELETES) {
    if (!snapshots[String(d.id)]) throw new Error(`Missing row snapshot for ${d.id} — refusing to delete`);
  }

  let login: Awaited<ReturnType<typeof api>> | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    login = await api("POST", "/api/auth/local/login", { email: ADMIN_EMAIL, password });
    if (login.status === 200) break;
    console.log(`Login attempt ${attempt} failed (${login.status})${attempt < 3 ? " — retrying in 20s" : ""}`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 20000));
  }
  if (!login || login.status !== 200) throw new Error(`Login failed: ${login?.status}`);
  captureSessionCookie(login.res);
  console.log(`✓ Logged in as ${ADMIN_EMAIL} (role: ${login.json?.user?.role})`);

  const done = new Set(journalRead().filter((e) => e.step === "dedup-twin").map((e) => e.id));
  for (const d of DELETES) {
    if (done.has(d.id)) { console.log(`SKIP ${d.id} — already journaled`); continue; }
    journalAppend({ step: "dedup-twin", id: d.id, action: "snapshot-before-delete", keep: d.keep, why: d.why, row: snapshots[String(d.id)] });
    const del = await api("DELETE", `/api/admin/resources/${d.id}`);
    console.log(`DELETE ${d.id} (survivor ${d.keep}): ${del.status}${del.status === 404 ? " (already gone)" : ""}`);
    if (![200, 204, 404].includes(del.status)) {
      journalAppend({ step: "dedup-twin", id: d.id, action: "delete-failed", status: del.status, body: del.json });
      throw new Error(`Delete ${d.id} failed: ${del.status} ${JSON.stringify(del.json)}`);
    }
    journalAppend({ step: "dedup-twin", id: d.id, action: "deleted", status: del.status, keep: d.keep });
  }
  console.log("ALL DONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
