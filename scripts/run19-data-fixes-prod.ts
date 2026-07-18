/**
 * Run19 data fixes — applied via the live admin HTTP API (prod DB is not
 * directly writable from the agent environment; mirrors
 * scripts/run18-data-fixes-prod.ts). Base-configurable so the exact same
 * code path is validated against dev first (PROD_BASE=http://localhost:5000).
 *
 *  BUG-025: learning journeys whose category is the legacy long-form
 *           "Introduction & Learning" are renamed to the DB-canonical
 *           "Intro & Learning" (matches the taxonomy tree + resources).
 *  BUG-032: journey 6 curation drift — steps 4–15 repointed to
 *           topic-matched resources (codec explainers under "Understanding
 *           Video Codecs", protocol overviews under "Streaming Protocols
 *           Overview", players under "Players and Playback Basics",
 *           container/format resources under "Video Formats and Containers").
 *           Guarded per stepNumber: only writes when the current resourceId
 *           differs from the curated target.
 *  BUG-037: replays the Claude-generated descriptions journaled in
 *           artifacts/remediation-2026-07/BUG-037/descriptions.json for
 *           approved resources whose live description is still <30 chars
 *           (same text as dev — no fresh LLM call, fully deterministic).
 *  BUG-043: classifies the 74 formerly-uncategorized Community & Events
 *           resources into "Community Groups" / "Events & Conferences".
 *           Guarded: only writes when the live subcategory is empty/null.
 *
 * Idempotent: every write is preceded by a live re-check; re-runs are no-ops.
 * Journaled to evidence/run19/data-fixes-<env>.json.
 * Admin password read from ADMIN_PASSWORD env; never logged. Session cookie
 * is captured ONLY from the login response (GAESA affinity cookies ignored).
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run19-data-fixes-prod.ts
 * Dev validation:      PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run19-data-fixes-prod.ts
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

const journal: any = { startedAt: new Date().toISOString(), base: BASE, steps: {} };
function log(step: string, entry: any) {
  journal.steps[step] = journal.steps[step] || [];
  journal.steps[step].push(entry);
  console.log(`[${step}]`, JSON.stringify(entry).slice(0, 300));
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
      log("login", { attempt, ok: true });
      return;
    }
    log("login", { attempt, status: r.status });
    await new Promise((res) => setTimeout(res, 5000 * attempt));
  }
  throw new Error("login failed after retries");
}

// ------------------------------------------------------------------- BUG-025

async function fixJourneyCategoryNames() {
  const { status, body } = await api("/api/admin/journeys");
  if (status !== 200) throw new Error(`admin journeys -> ${status}`);
  const journeys = body.journeys || body;
  for (const j of journeys) {
    if (j.category === "Introduction & Learning") {
      const put = await api(`/api/admin/journeys/${j.id}`, {
        method: "PUT",
        body: JSON.stringify({ category: "Intro & Learning" }),
      });
      log("BUG-025", { journeyId: j.id, title: j.title, status: put.status });
    } else {
      log("BUG-025", { journeyId: j.id, category: j.category, action: "noop" });
    }
  }
}

// ------------------------------------------------------------------- BUG-032

// Curated targets keyed by stepNumber (journey 6). Chosen against the live
// resource catalog on July 18, 2026 — same ids exist on prod (shared corpus).
const JOURNEY6_CURATION: Record<number, { resourceId: number; why: string }> = {
  4: { resourceId: 185124, why: "Video Coding: An Introduction to Standard Codecs" },
  5: { resourceId: 185846, why: "Video Coding Basics - How is this so efficient?" },
  6: { resourceId: 186041, why: "Introduction to H.264: NAL Unit (codec internals)" },
  7: { resourceId: 185018, why: "Wowza: Streaming Protocols Overview" },
  8: { resourceId: 185033, why: "Streaming 101: Differences Between Streaming Protocols" },
  9: { resourceId: 185840, why: "Guide to Mobile Video Streaming with HLS" },
  10: { resourceId: 184757, why: "Video.js" },
  11: { resourceId: 185654, why: "Demystifying HTML5 Video Player" },
  12: { resourceId: 185985, why: "Guide to HEVC/H.265 Encoding and Playback" },
  13: { resourceId: 185346, why: "Smithsonian Video Format Resources" },
  14: { resourceId: 185748, why: "HLS and Fragmented MP4" },
  15: { resourceId: 186417, why: "ISO Base Media File Format (MP4 container spec)" },
};

async function fixJourney6Curation() {
  const { status, body } = await api("/api/admin/journeys/6/steps");
  if (status !== 200) throw new Error(`journey 6 steps -> ${status}`);
  const steps = body.steps || [];
  for (const s of steps) {
    const target = JOURNEY6_CURATION[s.stepNumber];
    if (!target) continue;
    if (s.resourceId === target.resourceId) {
      log("BUG-032", { stepNumber: s.stepNumber, action: "noop" });
      continue;
    }
    const patch = await api(`/api/admin/journeys/6/steps/${s.id}`, {
      method: "PATCH",
      body: JSON.stringify({ resourceId: target.resourceId }),
    });
    log("BUG-032", {
      stepNumber: s.stepNumber,
      stepId: s.id,
      from: s.resourceId,
      to: target.resourceId,
      why: target.why,
      status: patch.status,
    });
  }
}

// ------------------------------------------------------- shared resource PUT

async function putResource(id: number, update: Record<string, string>) {
  return api(`/api/admin/resources/${id}`, {
    method: "PUT",
    body: JSON.stringify(update),
  });
}

type AdminResource = {
  id: number;
  title: string;
  description: string;
  url: string;
  status: string;
  category: string;
  subcategory: string;
};

// There is no GET /api/admin/resources/:id — scan the paged list once and
// guard every write against this snapshot (same pattern as run18).
let corpus: Map<number, AdminResource> | null = null;
async function fetchCorpus(): Promise<Map<number, AdminResource>> {
  if (corpus) return corpus;
  const all = new Map<number, AdminResource>();
  let page = 1;
  for (;;) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200) throw new Error(`admin resources page ${page} -> ${status}`);
    for (const r of body.resources) {
      all.set(r.id, {
        id: r.id,
        title: r.title ?? "",
        description: typeof r.description === "string" ? r.description : "",
        url: r.url ?? "",
        status: r.status,
        category: r.category ?? "",
        subcategory: r.subcategory ?? "",
      });
    }
    if (page >= (body.totalPages || 1)) break;
    page++;
  }
  log("scan", { total: all.size });
  corpus = all;
  return all;
}

// ------------------------------------------------------------------- BUG-037

const DESCRIPTIONS_JOURNAL = "artifacts/remediation-2026-07/BUG-037/descriptions.json";

async function fixShortDescriptions() {
  const map: Record<string, string> = JSON.parse(
    fs.readFileSync(DESCRIPTIONS_JOURNAL, "utf8"),
  );
  const all = await fetchCorpus();
  for (const [idStr, desc] of Object.entries(map)) {
    const id = Number(idStr);
    const live = all.get(id);
    if (!live) {
      log("BUG-037", { id, action: "skip-not-found" });
      continue;
    }
    if (live.description.length >= 30) {
      log("BUG-037", { id, action: "noop", len: live.description.length });
      continue;
    }
    const put = await putResource(id, { description: desc });
    log("BUG-037", { id, status: put.status, len: desc.length });
  }
}

// ------------------------------------------------------------------- BUG-043

// Full dev-DB assignment snapshot (query: category='Community & Events'
// grouped by subcategory, July 18 2026). Some ids were already assigned
// before Run19 — the empty-subcategory guard makes those no-ops on prod.
const EVENTS_CONFERENCES = [
  184746, 184747, 184748, 184749, 184750, 184751, 184853, 184854, 184858,
  184859, 184903, 185011, 185048, 185066, 185100, 185103, 185104, 185105,
  185136, 185166, 185167, 185199, 185200, 185232, 185233, 185234, 185236,
  185289, 185325, 185326, 185327, 185392, 185429, 185514, 185644, 185645,
  185647, 185648, 185649, 185651,
];
const COMMUNITY_GROUPS = [
  184752, 184753, 184754, 184755, 184756, 184855, 184856, 184857, 184910,
  184911, 184955, 184972, 184974, 184975, 184976, 184977, 185049, 185050,
  185064, 185065, 185114, 185115, 185161, 185162, 185168, 185237, 185308,
  185328, 185335, 185366, 185367, 185368, 185431, 185432, 185471, 185511,
  185544, 185562, 185563, 186389, 186390,
];

async function fixCommunitySubcategories() {
  const all = await fetchCorpus();
  const assign = async (ids: number[], subcategory: string) => {
    for (const id of ids) {
      const live = all.get(id);
      if (!live) {
        log("BUG-043", { id, action: "skip-not-found" });
        continue;
      }
      if (live.subcategory && live.subcategory.length > 0) {
        log("BUG-043", { id, action: "noop", subcategory: live.subcategory });
        continue;
      }
      if (live.category !== "Community & Events") {
        log("BUG-043", { id, action: "skip-category-drift", category: live.category });
        continue;
      }
      const put = await putResource(id, { subcategory });
      log("BUG-043", { id, subcategory, status: put.status });
    }
  };
  await assign(EVENTS_CONFERENCES, "Events & Conferences");
  await assign(COMMUNITY_GROUPS, "Community Groups");
}

// ---------------------------------------------------------------------- main

async function main() {
  await login();
  await fixJourneyCategoryNames();
  await fixJourney6Curation();
  await fixShortDescriptions();
  await fixCommunitySubcategories();
  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run19", { recursive: true });
  fs.writeFileSync(
    `evidence/run19/data-fixes-${ENV_TAG}.json`,
    JSON.stringify(journal, null, 2),
  );
  console.log(`Journal written to evidence/run19/data-fixes-${ENV_TAG}.json`);
}

main().catch((e) => {
  console.error(e);
  journal.error = String(e);
  fs.mkdirSync("evidence/run19", { recursive: true });
  fs.writeFileSync(
    `evidence/run19/data-fixes-${ENV_TAG}.json`,
    JSON.stringify(journal, null, 2),
  );
  process.exit(1);
});
