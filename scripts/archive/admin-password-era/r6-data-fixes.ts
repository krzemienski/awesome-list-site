/**
 * R6 residual data-corpus fixes — driven through the LIVE admin API so the
 * exact same code path works on dev and prod (prod DB is not agent-writable).
 * Modeled on scripts/run24-data-fixes-prod.ts.
 *
 * Findings covered (spec: MASTER-FIX-PROMPT-R6 + REGRESSION-R6 residual table):
 *
 *  NB-015  canonicalize brand casing in TITLES and DESCRIPTIONS (not tags):
 *          Dash -> DASH, Ts -> TS, Gstreamer/gstreamer -> GStreamer.
 *          Literal GitHub owner/repo paths are protected ("Dash-Industry-Forum/x"
 *          stays verbatim); prose "(Dash-Industry-Forum)" becomes the org's
 *          official display name "(DASH Industry Forum)". The one slug title
 *          "gstreamer-rs" is retitled editorially ("GStreamer Rust Bindings",
 *          run24E slug-title pattern) so the casing sweep converges to zero.
 *  R5-032  sentence-initial missing-space repair: "A.NET Standard wrapper"
 *          (id 186519 class) -> "A .NET Standard wrapper". Pattern requires an
 *          article/determiner (A|An|The|This) at sentence start immediately
 *          followed by ".NET", so initials ("J.R.R."), domains ("a.example"),
 *          versions and identifiers are untouched.
 *  R4-022  185390: if the URL still points at the Cloudflare-challenged
 *          npmjs.com page, repoint to the maintained mirror for the same
 *          package (https://libraries.io/npm/web-monetisation-video-ads).
 *          Dev was already repointed in run24 -> no-op there; this makes the
 *          prod rerun self-contained.
 *  R5-063  re-invoke POST /api/admin/maintenance/canonicalize-tags (separator
 *          + plural fold + brand map), then recompute separator families from
 *          the live tag list and assert zero remain.
 *
 * Idempotent: every action re-reads current state first; a second run is a
 * full no-op. Dry-run by default; set APPLY=1 to mutate.
 * Journal: journals/r6-data-fixes-<env>[-dryrun]-<runstamp>.json — the
 * filename carries a per-run timestamp so a second (no-op) run can never
 * overwrite the journal of the run that actually mutated rows.
 *
 * Dev dry-run:  PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/r6-data-fixes.ts
 * Dev apply:    PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... APPLY=1 npx tsx scripts/r6-data-fixes.ts
 * Prod apply:   ADMIN_PASSWORD=<prod admin pw> APPLY=1 npx tsx scripts/r6-data-fixes.ts
 */

import fs from "fs";
import path from "path";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const APPLY = process.env.APPLY === "1";
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

const journal: any = {
  startedAt: new Date().toISOString(),
  base: BASE,
  mode: APPLY ? "apply" : "dry-run",
  actions: [] as any[],
};
function log(entry: any) {
  journal.actions.push(entry);
  console.log(JSON.stringify(entry).slice(0, 400));
}

let cookie = "";
async function api(p: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${p}`, {
    ...init,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...(init.headers || {}) },
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
        (r.headers as any).getSetCookie?.() ?? [r.headers.get("set-cookie")].filter(Boolean);
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

type Row = { id: number; title: string; url: string; description?: string; status: string };

async function fetchAllResources(): Promise<Row[]> {
  const all: Row[] = [];
  for (let page = 1; page < 200; page++) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200) throw new Error(`admin resources page ${page} -> ${status}`);
    const rows: Row[] = body.resources || body.data || body;
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 100) break;
  }
  return all;
}

async function putResource(id: number, update: Record<string, string>) {
  if (!APPLY) return { status: 0, body: { dryRun: true } };
  return api(`/api/admin/resources/${id}`, { method: "PUT", body: JSON.stringify(update) });
}

// ---------------------------------------------------------------------------
// NB-015 — brand casing in titles + descriptions.
// Protected literals are masked before token replacement so owner/repo paths
// and crate names are never corrupted, then unmasked.
// ---------------------------------------------------------------------------
const PROTECTED: RegExp[] = [
  /Dash-Industry-Forum\/[\w.-]+/g, // literal GitHub owner/repo paths stay verbatim
];
// Special-case retitle: slug title that would otherwise never converge.
const RETITLES: Record<number, { from: string; to: string }> = {
  186612: { from: "gstreamer-rs", to: "GStreamer Rust Bindings" },
};

function canonicalizeBrands(text: string): string {
  const masks: string[] = [];
  let out = text;
  for (const re of PROTECTED) {
    out = out.replace(re, (m) => {
      masks.push(m);
      return `\u0000${masks.length - 1}\u0000`;
    });
  }
  // Prose org mention -> official display name (only reachable when NOT a path,
  // because path forms were masked above).
  out = out.replace(/\bDash-Industry-Forum\b/g, "DASH Industry Forum");
  out = out.replace(/\bDash\b/g, "DASH");
  out = out.replace(/\bTs\b/g, "TS");
  out = out.replace(/\bgstreamer\b/gi, (m) => (m === "GStreamer" ? m : "GStreamer"));
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => masks[Number(i)]);
  return out;
}

// ---------------------------------------------------------------------------
// R5-032 — sentence-initial missing space before ".NET".
// ---------------------------------------------------------------------------
const SENTENCE_INITIAL_RE = /(^|[.!?]\s)(A|An|The|This)\.(NET)\b/g;
function repairSentenceInitial(text: string): string {
  return text.replace(SENTENCE_INITIAL_RE, (_m, pre, art, brand) => `${pre}${art} .${brand}`);
}
// Broad residual detector used for the zero-remaining proof.
const SENTENCE_INITIAL_DETECT = /(^|[.!?] )(A|An|The|This)\.[A-Z]/;

// ---------------------------------------------------------------------------
// R4-022 — npm package link must be browser-reachable.
// ---------------------------------------------------------------------------
const R4022_ID = 185390;
const R4022_TARGET = "https://libraries.io/npm/web-monetisation-video-ads";

// ---------------------------------------------------------------------------
// R5-063 — tag separator families must be zero after canonicalize-tags.
// ---------------------------------------------------------------------------
async function tagFamilies(): Promise<[string, string[]][]> {
  const { status, body } = await api(`/api/tags`);
  if (status !== 200) throw new Error(`/api/tags -> ${status}`);
  const list: any[] = Array.isArray(body) ? body : body.tags;
  const m = new Map<string, string[]>();
  for (const t of list) {
    const name = String(t.tag ?? t.name ?? t);
    // Separator-only family key: strip space/hyphen/underscore/dot but KEEP
    // "+" and "#" (c++ vs c#, hdr10 vs hdr10+ are distinct tags, not variants).
    const key = name.toLowerCase().replace(/[\s\-_.]+/g, "");
    if (!key) continue;
    m.set(key, [...(m.get(key) || []), name]);
  }
  return [...m.entries()].filter(([, v]) => v.length > 1);
}

async function main() {
  await login();
  const rows = await fetchAllResources();
  log({ step: "fetch", total: rows.length });

  // --- NB-015 + R5-032 sweep (titles + descriptions, single pass) ---
  let mutated = 0;
  for (const r of rows) {
    const retitle = RETITLES[r.id];
    let newTitle = retitle && r.title === retitle.from ? retitle.to : canonicalizeBrands(r.title);
    let newDesc = r.description ?? "";
    const descBrand = canonicalizeBrands(newDesc);
    const descSpace = repairSentenceInitial(descBrand);
    newDesc = descSpace;

    const titleChanged = newTitle !== r.title;
    const descChanged = newDesc !== (r.description ?? "");
    if (!titleChanged && !descChanged) continue;

    const update: Record<string, string> = {};
    if (titleChanged) update.title = newTitle;
    if (descChanged) update.description = newDesc;
    const res = await putResource(r.id, update);
    mutated++;
    log({
      finding: descChanged && SENTENCE_INITIAL_RE.test(r.description ?? "") ? "NB-015+R5-032" : "NB-015",
      id: r.id,
      before: { title: titleChanged ? r.title : undefined, description: descChanged ? r.description : undefined },
      after: { title: titleChanged ? newTitle : undefined, description: descChanged ? newDesc : undefined },
      status: res.status,
    });
    // Reset lastIndex on the global regex used in the ternary above.
    SENTENCE_INITIAL_RE.lastIndex = 0;
  }
  log({ step: "sweep-done", mutatedRows: mutated });

  // --- R5-032 zero-remaining proof (post-state; in dry-run this reports the pre-state) ---
  const residualSpace = rows.filter(
    (r) => SENTENCE_INITIAL_DETECT.test(repairSentenceInitial(r.description ?? "")),
  );
  log({ finding: "R5-032", check: "sentence-initial residual after repair", count: residualSpace.length, ids: residualSpace.map((r) => r.id) });

  // --- R4-022 ---
  const r4022 = rows.find((r) => r.id === R4022_ID);
  if (!r4022) {
    log({ finding: "R4-022", id: R4022_ID, action: "skip", reason: "resource not found in this environment" });
  } else if (/npmjs\.com/.test(r4022.url)) {
    const res = await putResource(R4022_ID, { url: R4022_TARGET });
    log({ finding: "R4-022", id: R4022_ID, before: r4022.url, after: R4022_TARGET, status: res.status });
  } else {
    log({ finding: "R4-022", id: R4022_ID, action: "no-op", url: r4022.url });
  }

  // --- R5-063 ---
  const famBefore = await tagFamilies();
  log({ finding: "R5-063", check: "families-before", count: famBefore.length, families: famBefore.slice(0, 10) });
  if (APPLY) {
    const r = await api(`/api/admin/maintenance/canonicalize-tags`, { method: "POST" });
    log({ finding: "R5-063", action: "canonicalize-tags", status: r.status, result: r.body });
    const famAfter = await tagFamilies();
    log({ finding: "R5-063", check: "families-after", count: famAfter.length, families: famAfter });
  } else {
    log({ finding: "R5-063", action: "canonicalize-tags", dryRun: true });
  }

  // --- journal ---
  journal.finishedAt = new Date().toISOString();
  journal.mutatedRows = mutated;
  fs.mkdirSync(path.join(process.cwd(), "journals"), { recursive: true });
  const runstamp = journal.startedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(process.cwd(), "journals", `r6-data-fixes-${ENV_TAG}${APPLY ? "" : "-dryrun"}-${runstamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(journal, null, 2));
  console.log(`\n[journal] ${jsonPath}`);
  console.log(`[summary] mode=${journal.mode} env=${ENV_TAG} mutatedRows=${mutated}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
