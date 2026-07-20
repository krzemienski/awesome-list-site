/**
 * Run22 link-rot fixes (BUG-004, BUG-005) — applied via the live admin HTTP
 * API (prod DB is not directly writable from the agent environment; mirrors
 * scripts/run21-link-fixes-prod.ts). Base-configurable so the exact same code
 * path is validated against dev first (PROD_BASE=http://localhost:5000).
 *
 * Rules are matched by URL (NOT by id) so they apply identically to both
 * corpora. Every replacement target was 200-verified on July 19, 2026.
 *
 *  BUG-004  avisynth.nl (all paths)           -> github.com/AviSynth/AviSynthPlus
 *           (origin serves 508 Loop Detected on both schemes; the AviSynth
 *           project's maintained successor lives on GitHub — 200-verified)
 *  BUG-005  umezawa.dyndns.info (all paths)   -> github.com/umezawatakeshi/utvideo
 *           (origin 404s / resets; the author's official UT Video repo — 200-verified)
 *
 * Idempotent: a rule whose URL no longer matches any resource is a no-op.
 * Journaled to evidence/run22/link-fixes-<env>.json.
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run22-link-fixes-prod.ts
 * Dev validation:      PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run22-link-fixes-prod.ts
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

const journal: any = { startedAt: new Date().toISOString(), base: BASE, actions: [] };
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

// ---------------------------------------------------------------- rule table

type Rule = {
  finding: string;
  match: (url: string) => boolean;
  to: null | string | ((url: string) => string);
  note: string;
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const RULES: Rule[] = [
  {
    finding: "BUG-004",
    match: (u) => host(u) === "avisynth.nl",
    to: "https://github.com/AviSynth/AviSynthPlus",
    note: "avisynth.nl origin 508 Loop Detected on both schemes; maintained successor repo (200-verified 2026-07-19)",
  },
  {
    finding: "BUG-005",
    match: (u) => host(u) === "umezawa.dyndns.info",
    to: "https://github.com/umezawatakeshi/utvideo",
    note: "umezawa.dyndns.info 404s/resets; author's official UT Video repo (200-verified 2026-07-19)",
  },
];

// --------------------------------------------------------------------- main

async function fetchAllResources(): Promise<Array<{ id: number; url: string; title: string; status: string }>> {
  const out: Array<{ id: number; url: string; title: string; status: string }> = [];
  let page = 1;
  for (;;) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200) throw new Error(`admin resources page ${page} -> ${status}`);
    const rows = body.resources || body.data || body;
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) out.push({ id: r.id, url: r.url, title: r.title, status: r.status });
    if (rows.length < 100) break;
    page++;
  }
  return out;
}

async function main() {
  await login();
  const resources = await fetchAllResources();
  console.log(`fetched ${resources.length} resources from ${BASE}`);

  // url -> owning id, kept current, so a repoint whose target URL is already
  // taken is handled as a duplicate delete (resources.url is UNIQUE — a blind
  // PUT would 500).
  const urlOwner = new Map<string, number>();
  for (const r of resources) if (r.url) urlOwner.set(r.url, r.id);

  for (const rule of RULES) {
    const matches = resources.filter((r) => r.url && rule.match(r.url));
    if (matches.length === 0) {
      log({ finding: rule.finding, note: rule.note, action: "noop", matched: 0 });
      continue;
    }
    for (const res of matches) {
      if (urlOwner.get(res.url) !== res.id) continue;
      if (rule.to === null) {
        const del = await api(`/api/admin/resources/${res.id}`, { method: "DELETE" });
        if (del.status === 200) urlOwner.delete(res.url);
        log({ finding: rule.finding, id: res.id, title: res.title, from: res.url, action: "delete", status: del.status, note: rule.note });
      } else {
        const target = typeof rule.to === "function" ? rule.to(res.url) : rule.to;
        if (res.url === target) {
          log({ finding: rule.finding, id: res.id, action: "noop-already-target", url: target });
          continue;
        }
        const owner = urlOwner.get(target);
        if (owner !== undefined && owner !== res.id) {
          const del = await api(`/api/admin/resources/${res.id}`, { method: "DELETE" });
          if (del.status === 200) urlOwner.delete(res.url);
          log({ finding: rule.finding, id: res.id, title: res.title, from: res.url, to: target, action: "delete-dup", survivorId: owner, status: del.status, note: `${rule.note}; target URL already owned by resource ${owner}` });
          continue;
        }
        const put = await api(`/api/admin/resources/${res.id}`, {
          method: "PUT",
          body: JSON.stringify({ url: target }),
        });
        if (put.status === 200) {
          urlOwner.delete(res.url);
          urlOwner.set(target, res.id);
        }
        log({ finding: rule.finding, id: res.id, title: res.title, from: res.url, to: target, action: "repoint", status: put.status, note: rule.note });
      }
    }
  }

  journal.finishedAt = new Date().toISOString();
  const failures = journal.actions.filter((a: any) => a.status && a.status >= 400);
  journal.failureCount = failures.length;
  fs.mkdirSync("evidence/run22", { recursive: true });
  fs.writeFileSync(`evidence/run22/link-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(`\nDone. ${journal.actions.length} actions, ${failures.length} failures. Journal: evidence/run22/link-fixes-${ENV_TAG}.json`);
  if (failures.length) {
    console.error("FAILURES:", JSON.stringify(failures, null, 2));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
