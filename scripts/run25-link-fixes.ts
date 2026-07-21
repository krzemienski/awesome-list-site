/**
 * Run25 link-rot fix (Task: triage of the July 21, 2026 full link scan).
 *
 * Scan outcome (1,806 approved links, two-pass with browser-UA verification):
 *   - 106 flagged links returned 200 under a browser UA (bot-block only)
 *   - 52 returned 403/429 under a browser UA (bot-block / auth walls — alive)
 *   - 8 timeouts, all verified live via external human-vantage evidence
 *     (fcc.gov x2, adobe.com x2, vcgit.hhi.fraunhofer.de, forum.kaltura.org,
 *      cta.tech x2 — the last three are known datacenter-IP blockers)
 *   - 1 truly dead link:
 *
 *  DEAD-001  http://example.com/x (placeholder URL on the StreamPack resource)
 *            -> https://github.com/ThibaultBee/StreamPack
 *            (the project's official repository — 200-verified July 21, 2026)
 *
 * Rules are matched by URL (NOT by id) so they apply identically to both
 * corpora. Idempotent: a rule whose URL no longer matches is a no-op.
 * Journaled to evidence/run25/link-fixes-<env>.json.
 *
 * Dev validation: PROD_BASE=http://localhost:5000 npx tsx scripts/run25-link-fixes.ts
 * Prod:           npx tsx scripts/run25-link-fixes.ts
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

const RULES: { match: (url: string) => boolean; to: string; note: string }[] = [
  {
    match: (url) => /^https?:\/\/example\.com\//i.test(url),
    to: "https://github.com/ThibaultBee/StreamPack",
    note: "placeholder example.com URL on StreamPack -> official GitHub repo (200-verified)",
  },
];

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

async function fetchAllResources(): Promise<{ id: number; url: string; title: string }[]> {
  const all: { id: number; url: string; title: string }[] = [];
  for (let page = 1; page < 200; page++) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200 || !body?.resources?.length) break;
    all.push(...body.resources);
    if (body.resources.length < 100) break;
  }
  return all;
}

async function main() {
  await login();
  const resources = await fetchAllResources();
  log({ step: "fetched", count: resources.length });

  let mutations = 0;
  for (const rule of RULES) {
    const targets = resources.filter((r) => rule.match(r.url));
    if (!targets.length) {
      log({ rule: rule.note, matched: 0, action: "no-op" });
      continue;
    }
    for (const t of targets) {
      const { status, body } = await api(`/api/admin/resources/${t.id}`, {
        method: "PUT",
        body: JSON.stringify({ url: rule.to }),
      });
      mutations++;
      log({ rule: rule.note, id: t.id, title: t.title, from: t.url, to: rule.to, status, ok: status === 200 && !!body });
    }
  }

  journal.completedAt = new Date().toISOString();
  journal.mutations = mutations;
  fs.mkdirSync("evidence/run25", { recursive: true });
  fs.writeFileSync(`evidence/run25/link-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(`DONE (${ENV_TAG}): ${mutations} mutation(s). Second run should be 0.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
