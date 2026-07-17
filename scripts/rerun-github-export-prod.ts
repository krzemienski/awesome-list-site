/**
 * Task: re-run one GitHub export on PROD after republish so that
 * github_sync_history records a completed export and the sync queue row
 * shows "completed" (the old per-resource markSynced path exhausted the pg
 * pool and never wrote either; the bulk fix is now live).
 *
 * Flow: admin login (connect.sid only) -> POST /api/github/export ->
 * poll /api/github/sync-status/:id until terminal -> verify
 * /api/github/sync-history has a completed export with a commit SHA.
 *
 * Run: ADMIN_PASSWORD=... npx tsx scripts/rerun-github-export-prod.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const REPO_URL = "https://github.com/krzemienski/awesome-video";

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

const journal: any = { startedAt: new Date().toISOString(), base: BASE, repo: REPO_URL, steps: [] };
function log(step: string, entry: any) {
  journal.steps.push({ step, at: new Date().toISOString(), ...entry });
  console.log(`[${step}]`, JSON.stringify(entry).slice(0, 500));
}

async function login(): Promise<string> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const anyHeaders = r.headers as any;
      const cookies: string[] =
        typeof anyHeaders.getSetCookie === "function"
          ? anyHeaders.getSetCookie()
          : ([r.headers.get("set-cookie")].filter(Boolean) as string[]);
      const sid = cookies
        .map((c) => c.split(";")[0])
        .filter((c) => c.startsWith("connect.sid="))
        .join("; ");
      if (!sid) throw new Error("login ok but no connect.sid cookie");
      return sid;
    }
    const body = (await r.text()).slice(0, 200);
    if (attempt === 4) throw new Error(`login failed ${r.status}: ${body}`);
    console.log(`login attempt ${attempt} failed (${r.status}) — retrying in 15s`);
    await new Promise((res) => setTimeout(res, 15_000));
  }
  throw new Error("unreachable");
}

async function api(cookie: string, method: string, path: string, body?: any) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, ok: r.ok, json, text: text.slice(0, 500) };
}

async function main() {
  const cookie = await login();
  console.log("logged in — session acquired");

  // Pre-state: queue + history snapshot
  const preQueue = await api(cookie, "GET", "/api/github/sync-status");
  log("pre-queue", {
    total: preQueue.json?.total,
    recent: (preQueue.json?.items || []).slice(0, 5).map((q: any) => ({
      id: q.id, action: q.action, status: q.status, createdAt: q.createdAt,
    })),
  });

  // Start export (real, non-dry-run)
  const start = await api(cookie, "POST", "/api/github/export", {
    repositoryUrl: REPO_URL,
    options: {},
  });
  if (!start.ok) throw new Error(`export start failed ${start.status}: ${start.text}`);
  const queueId = start.json.queueId;
  log("export-start", { queueId, response: start.json });

  // Poll queue item until terminal (up to ~5 min)
  let item: any = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await api(cookie, "GET", `/api/github/sync-status/${queueId}`);
    item = st.json;
    console.log(`poll ${i + 1}: status=${item?.status}`);
    if (item?.status === "completed" || item?.status === "failed") break;
  }
  log("queue-final", { id: queueId, status: item?.status, error: item?.errorMessage || item?.error, metadata: item?.metadata });
  if (item?.status !== "completed") {
    process.exitCode = 1;
  }

  // Verify sync history shows a completed export
  const hist = await api(cookie, "GET", "/api/github/sync-history");
  const rows = (Array.isArray(hist.json) ? hist.json : hist.json?.history || hist.json?.items || []);
  const latestExport = rows.find((h: any) =>
    (h.syncDirection === "export" || h.action === "export" || h.direction === "export")
  );
  log("history-latest-export", latestExport || { none: true, sample: rows.slice(0, 3) });

  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/task161", { recursive: true });
  fs.writeFileSync("evidence/task161/rerun-export-prod.json", JSON.stringify(journal, null, 2));
  console.log(`\nJournal written to evidence/task161/rerun-export-prod.json (exit ${process.exitCode || 0})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
