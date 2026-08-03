/**
 * Task #242 content & data-quality fixes (audit BUG-004 / BUG-007 / BUG-022)
 * — driven through the LIVE admin API so the exact same code path works on
 * dev and prod (prod DB is not agent-writable). Modeled on
 * scripts/run24-data-fixes-prod.ts.
 *
 * Findings covered:
 *   BUG-004  QA probe text "[QA-DAILY edit probe 2026-07-19]" persisted in a
 *            production resource description (prod id 184847). Scan-driven:
 *            strip every "\s*\[QA-...\]" token from ANY resource title or
 *            description.
 *   BUG-007  Double-escaped "&amp;" entity text stored in the denormalized
 *            category/subcategory/subSubcategory columns (884 prod rows) plus
 *            4 titles and 1 description. Scan-driven: decode "&amp;" -> "&"
 *            (looped, so "&amp;amp;" also collapses) in those five fields.
 *            The taxonomy tables themselves are clean — only the denormalized
 *            resource columns carry the entity text — so the repaired values
 *            re-align with the canonical tree. (The ingestion-side class fix
 *            lives in server/github/parser.ts normalizeCategory, which now
 *            decodes entities before persisting.)
 *   BUG-022  CommCon resource URL points at dead commcon.dev (NXDOMAIN);
 *            the live site is https://commcon.xyz/ (verified 200 on
 *            2026-08-03). Scan-driven: repoint any commcon.dev URL.
 *
 * Idempotent: every action recomputes the fix from current live state; a
 * second run finds nothing to change and mutates nothing.
 *
 * Dry-run by default; pass --apply to mutate.
 * Journal: evidence/task242/content-fixes-<env>[-dryrun].json
 *
 * Dev validation: PROD_BASE=http://localhost:5000 npx tsx scripts/task242-content-fixes-prod.ts --apply
 * Prod:           npx tsx scripts/task242-content-fixes-prod.ts --apply
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";
const APPLY = process.argv.includes("--apply");

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

const journal: any = {
  startedAt: new Date().toISOString(),
  base: BASE,
  apply: APPLY,
  actions: [],
};
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
      Origin: BASE,
      Cookie: cookie,
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  const text = await r.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: r.status, body };
}

async function login() {
  const r = await fetch(`${BASE}/api/auth/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (r.status !== 200) {
    throw new Error(`login failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  const setCookie = r.headers.get("set-cookie") || "";
  const m = setCookie.match(/connect\.sid=[^;]+/);
  if (!m) throw new Error("no connect.sid in login response");
  cookie = m[0];
}

// BUG-007: collapse "&amp;" (and "&amp;amp;" etc.) to "&", looped to a fixpoint.
function decodeAmp(s: string): string {
  let out = s;
  for (;;) {
    const next = out.replace(/&amp;/gi, "&");
    if (next === out) return out;
    out = next;
  }
}

// BUG-004: strip QA probe tokens like "[QA-DAILY edit probe 2026-07-19]".
const QA_TOKEN_RE = /\s*\[QA-[^\]]*\]/g;
function stripQaTokens(s: string): string {
  return s.replace(QA_TOKEN_RE, "").replace(/[ \t]{2,}/g, " ").trim();
}

// BUG-022: dead commcon.dev -> live commcon.xyz.
function fixCommconUrl(url: string): string {
  return /^https?:\/\/(www\.)?commcon\.dev([/:?#]|$)/i.test(url || "")
    ? "https://commcon.xyz/"
    : url;
}

async function fetchAllResources(): Promise<any[]> {
  const all: any[] = [];
  const limit = 200;
  let page = 1;
  for (;;) {
    const r = await api(`/api/admin/resources?page=${page}&limit=${limit}`);
    if (r.status !== 200) throw new Error(`list page ${page} failed: ${r.status}`);
    const rows = r.body?.resources ?? [];
    all.push(...rows);
    if (all.length >= (r.body?.total ?? 0) || rows.length === 0) break;
    page++;
  }
  return all;
}

async function main() {
  await login();
  log({ step: "login", ok: true, env: ENV_TAG });

  const all = await fetchAllResources();
  log({ step: "fetched", count: all.length });

  let changed = 0;
  let failed = 0;

  for (const res of all) {
    const update: Record<string, string> = {};
    const before: Record<string, string> = {};
    const findings: string[] = [];

    // BUG-007 — entity text in the five text fields
    for (const field of ["category", "subcategory", "subSubcategory", "title", "description"] as const) {
      const val = res[field];
      if (typeof val === "string" && /&amp;/i.test(val)) {
        update[field] = decodeAmp(val);
        before[field] = val;
        findings.push(`BUG-007:${field}`);
      }
    }

    // BUG-004 — QA probe tokens in title/description (applied on top of any
    // entity fix so both defects in one field resolve in a single PUT)
    for (const field of ["title", "description"] as const) {
      const val = update[field] ?? res[field];
      if (typeof val === "string" && QA_TOKEN_RE.test(val)) {
        QA_TOKEN_RE.lastIndex = 0;
        update[field] = stripQaTokens(val);
        if (!(field in before)) before[field] = res[field];
        findings.push(`BUG-004:${field}`);
      }
      QA_TOKEN_RE.lastIndex = 0;
    }

    // BUG-022 — dead CommCon domain
    if (typeof res.url === "string" && fixCommconUrl(res.url) !== res.url) {
      update.url = fixCommconUrl(res.url);
      before.url = res.url;
      findings.push("BUG-022:url");
    }

    if (Object.keys(update).length === 0) continue;

    if (!APPLY) {
      log({ step: "would-fix", id: res.id, findings, before, after: update });
      changed++;
      continue;
    }

    const r = await api(`/api/admin/resources/${res.id}`, {
      method: "PUT",
      body: JSON.stringify(update),
    });
    if (r.status === 200) {
      changed++;
      log({ step: "fixed", id: res.id, findings, before, after: update });
    } else {
      failed++;
      log({ step: "FAILED", id: res.id, findings, status: r.status, body: JSON.stringify(r.body).slice(0, 200) });
    }
  }

  journal.finishedAt = new Date().toISOString();
  journal.summary = { scanned: all.length, changed, failed, apply: APPLY };
  log({ step: "summary", ...journal.summary });

  fs.mkdirSync("evidence/task242", { recursive: true });
  const out = `evidence/task242/content-fixes-${ENV_TAG}${APPLY ? "" : "-dryrun"}.json`;
  fs.writeFileSync(out, JSON.stringify(journal, null, 2));
  console.log(`journal: ${out}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
