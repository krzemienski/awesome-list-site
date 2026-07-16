// Cycle-01 audit prod data fixes (run AFTER republish — needs the ADMIN_PASSWORD
// boot-sync live on prod so the admin API accepts the rotated password).
//
// F-002: delete leftover QA resource 188037 ("Test Resource for Bug Hunt",
//        pending) then delete the empty "Test" category (id 1094).
// F-003: upgrade http:// resource URLs to https:// ONLY where the https origin
//        actually answers (2xx/3xx on GET). TLS-less hosts keep http and are
//        journaled. Rows with a pre-existing https twin are skipped.
//        Targets pre-computed from the prod read replica into
//        audit-evidence/cycle-01/prod-http-rows.json ({id, url, twinId}).
//
// All writes go through the deployed app's audited admin API — no direct DB.
// Idempotent: 404s on already-deleted rows and already-https URLs are skipped.
//
// Usage: ADMIN_PASSWORD=... npx tsx scripts/audit-prod-fixes.ts
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const ADMIN_EMAIL = "admin@example.com";
const TEST_RESOURCE_ID = 188037;
const TEST_CATEGORY_ID = 1094;

const JOURNAL_PATH = "audit-evidence/cycle-01/prod-fixes-journal.jsonl";
function journalAppend(entry: any): void {
  fs.appendFileSync(JOURNAL_PATH, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}
function journalRead(): any[] {
  if (!fs.existsSync(JOURNAL_PATH)) return [];
  return fs.readFileSync(JOURNAL_PATH, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

let sessionCookie = ""; // set ONCE from the login response (connect.sid only) —
// never updated afterward: prod infra injects its own Set-Cookie (GAESA
// affinity) on arbitrary responses, which must not clobber the session.

async function api(method: string, path: string, body?: unknown): Promise<{ status: number; json: any; res: Response }> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  return { status: res.status, json, res };
}

function captureSessionCookie(res: Response): void {
  const cookies: string[] =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie") as string]
        : [];
  const sid = cookies.find((c) => c.trim().startsWith("connect.sid="));
  if (!sid) throw new Error("Login response did not set a connect.sid session cookie");
  sessionCookie = sid.split(";")[0].trim();
}

async function httpsAnswers(url: string): Promise<{ ok: boolean; detail: string }> {
  const httpsUrl = url.replace(/^http:\/\//, "https://");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(httpsUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; awesome-video-linkcheck)" },
    });
    return { ok: res.status < 400, detail: `GET ${res.status}` };
  } catch (e: any) {
    return { ok: false, detail: `error: ${e?.cause?.code || e?.name || e?.message}` };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD env var is required");

  // ---- login (with retry: right after a republish the boot-time password
  // sync runs asynchronously post-listen, so the first attempt can race it) --
  let login: { status: number; json: any; res: Response } | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    login = await api("POST", "/api/auth/local/login", { email: ADMIN_EMAIL, password });
    if (login.status === 200) break;
    console.log(`Login attempt ${attempt} failed (${login.status})${attempt < 3 ? " — retrying in 20s (boot sync may still be running)" : ""}`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 20000));
  }
  if (!login || login.status !== 200) throw new Error(`Login failed: ${login?.status} ${JSON.stringify(login?.json)}`);
  captureSessionCookie(login.res);
  console.log(`✓ Logged in as ${ADMIN_EMAIL} (role: ${login.json?.user?.role})`);
  journalAppend({ step: "login", status: 200, role: login.json?.user?.role });

  const prior = journalRead();
  const doneSteps = new Set(prior.map((e) => e.step === "F-003" ? `F-003:${e.id}` : e.step));

  // ---- F-002: QA resource + Test category ---------------------------------
  if (!doneSteps.has("F-002-delete-resource")) {
    const delRes = await api("DELETE", `/api/admin/resources/${TEST_RESOURCE_ID}`);
    console.log(`F-002 delete resource ${TEST_RESOURCE_ID}: ${delRes.status}${delRes.status === 404 ? " (already gone)" : ""}`);
    if (![200, 204, 404].includes(delRes.status)) {
      throw new Error(`Resource delete failed: ${delRes.status} ${JSON.stringify(delRes.json)}`);
    }
    journalAppend({ step: "F-002-delete-resource", id: TEST_RESOURCE_ID, status: delRes.status, body: delRes.json });
  } else console.log("F-002 delete resource: already journaled, skipping");

  if (!doneSteps.has("F-002-delete-category")) {
    const delCat = await api("DELETE", `/api/admin/categories/${TEST_CATEGORY_ID}`);
    console.log(`F-002 delete category ${TEST_CATEGORY_ID} ("Test"): ${delCat.status}${delCat.status === 404 ? " (already gone)" : ""}`);
    if (![200, 204, 404].includes(delCat.status)) {
      throw new Error(`Category delete failed (guard?): ${delCat.status} ${JSON.stringify(delCat.json)}`);
    }
    journalAppend({ step: "F-002-delete-category", id: TEST_CATEGORY_ID, status: delCat.status, body: delCat.json });
  } else console.log("F-002 delete category: already journaled, skipping");

  // ---- F-003: https upgrade (resumable — journaled ids are skipped) --------
  const targets: { id: number; url: string; twinId: number | null }[] = JSON.parse(
    fs.readFileSync("audit-evidence/cycle-01/prod-http-rows.json", "utf-8"),
  );
  const pending = targets.filter((t) => t.id !== TEST_RESOURCE_ID && !doneSteps.has(`F-003:${t.id}`));
  console.log(`F-003 targets: ${targets.length} total, ${pending.length} pending this run`);
  let upgraded = 0, kept = 0, skipped = 0;
  for (const t of pending) {
    if (t.twinId) {
      journalAppend({ step: "F-003", id: t.id, url: t.url, action: "skipped-duplicate-https-twin", twin: t.twinId });
      console.log(`SKIP  ${t.id} ${t.url} — https twin exists (${t.twinId})`);
      skipped++;
      continue;
    }
    const check = await httpsAnswers(t.url);
    if (check.ok) {
      const newUrl = t.url.replace(/^http:\/\//, "https://");
      const put = await api("PUT", `/api/admin/resources/${t.id}`, { url: newUrl });
      if (put.status === 200) {
        journalAppend({ step: "F-003", id: t.id, from: t.url, to: newUrl, action: "upgraded", detail: check.detail });
        console.log(`UPGRADE ${t.id} ${t.url} -> https (${check.detail})`);
        upgraded++;
      } else {
        journalAppend({ step: "F-003", id: t.id, url: t.url, action: "put-failed", status: put.status, body: put.json });
        console.log(`FAIL  ${t.id} ${t.url} — PUT ${put.status} ${JSON.stringify(put.json)}`);
      }
    } else {
      journalAppend({ step: "F-003", id: t.id, url: t.url, action: "kept-http-tls-less-host", detail: check.detail });
      console.log(`KEEP  ${t.id} ${t.url} — https unreachable (${check.detail})`);
      kept++;
    }
  }
  const remaining = targets.filter((t) => t.id !== TEST_RESOURCE_ID && !journalRead().some((e) => e.step === "F-003" && e.id === t.id)).length;
  console.log(`F-003 this run: ${upgraded} upgraded, ${kept} kept (TLS-less), ${skipped} twin-skipped; ${remaining} remaining`);
  console.log(remaining === 0 ? "ALL DONE" : "RE-RUN to continue");
}

main().catch((e) => { console.error(e); process.exit(1); });
