/**
 * Run23 data fixes (NB-013 + NB-014) — applied via the live admin HTTP API
 * (prod DB is not directly writable from the agent environment; mirrors
 * scripts/run22-data-fixes-prod.ts). Base-configurable so the exact same code
 * path is validated against dev first (PROD_BASE=http://localhost:5000).
 *
 * NB-013 — four duplicate resource pairs merged to one canonical entry each:
 *   1. RFC 2326 (RTSP spec): survivor 185467 gets the canonical
 *      https://datatracker.ietf.org/doc/html/rfc2326 URL; twin 185517
 *      (tools.ietf.org mirror of the same RFC) is rejected.
 *   2. BOLA paper: survivor 186095 gets the canonical arXiv abstract URL
 *      https://arxiv.org/abs/1601.06748; twin 187937 (prod-only; absent in
 *      dev) is rejected where present.
 *   3. Shaka Player Embedded: survivor 185259 (canonical shaka-project org
 *      URL) adopts the twin's better placement (Players & Clients >
 *      Embedded Players); twin 186140 (google/ org redirect URL) is rejected.
 *   4. rtsp-simple-server: the catalog ALREADY has the canonical successor
 *      entry — 184829 "MediaMTX" at github.com/bluenviron/mediamtx (the
 *      project's current name/home). 184829 adopts the twin's better
 *      placement (Infrastructure & Delivery > Streaming Servers); BOTH
 *      audit-pair rows are rejected: 186611 (aler9/rtsp-simple-server, the
 *      pre-rename URL) and 185324 (xiejiulong fork mirror).
 *   Rejection uses PUT /api/resources/:id/reject (the approved-state status
 *   path) — the public resource page and API then 404 and catalog counts
 *   adjust, same removal mechanism as prior runs.
 *
 * NB-014 — 48 approved resources have descriptions that end in a mid-clause
 *   ellipsis ("..." / "…"), i.e. scraped text cut mid-thought. Fix:
 *   - 10 rows whose text has no usable sentence boundary get hand-written
 *     complete descriptions (OVERRIDES below, written July 20, 2026 from the
 *     visible source content).
 *   - The rest are elided at the last full sentence boundary (min 50 chars),
 *     dropping the dangling fragment + ellipsis.
 *   Idempotent: rows whose description no longer ends in an ellipsis are
 *   no-ops; the scan itself is the condition.
 *
 * Journaled to evidence/run23/data-fixes-<env>.json.
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run23-data-fixes-prod.ts
 * Dev validation:      PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run23-data-fixes-prod.ts
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

async function freshResource(id: number): Promise<any | null> {
  const r = await api(`/api/resources/${id}`);
  if (r.status !== 200 || !r.body) return null;
  return r.body.resource || r.body;
}

// ------------------------------------------------------------ NB-013 merges

type Merge = {
  pair: string;
  survivor: number;
  survivorUpdate: Record<string, string>; // applied only if values differ
  reject: number[];
};

const MERGES: Merge[] = [
  {
    pair: "RFC 2326 (RTSP spec)",
    survivor: 185467,
    survivorUpdate: { url: "https://datatracker.ietf.org/doc/html/rfc2326" },
    reject: [185517],
  },
  {
    pair: "BOLA paper (arXiv 1601.06748)",
    survivor: 186095,
    survivorUpdate: { url: "https://arxiv.org/abs/1601.06748" },
    reject: [187937],
  },
  {
    pair: "Shaka Player Embedded",
    survivor: 185259,
    survivorUpdate: { subcategory: "Embedded Players" },
    reject: [186140],
  },
  {
    pair: "rtsp-simple-server → MediaMTX",
    survivor: 184829,
    survivorUpdate: { subcategory: "Streaming Servers" },
    reject: [186611, 185324],
  },
];

async function runMerges() {
  for (const m of MERGES) {
    const s = await freshResource(m.survivor);
    if (!s) {
      log({ finding: "NB-013", pair: m.pair, id: m.survivor, action: "survivor-missing" });
    } else {
      const update: Record<string, string> = {};
      for (const [k, v] of Object.entries(m.survivorUpdate)) {
        if ((s as any)[k] !== v) update[k] = v;
      }
      if (Object.keys(update).length === 0) {
        log({ finding: "NB-013", pair: m.pair, id: m.survivor, action: "survivor-noop" });
      } else {
        const put = await api(`/api/admin/resources/${m.survivor}`, {
          method: "PUT",
          body: JSON.stringify(update),
        });
        log({
          finding: "NB-013",
          pair: m.pair,
          id: m.survivor,
          action: "survivor-update",
          fields: Object.keys(update),
          status: put.status,
          ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
        });
      }
    }
    for (const twin of m.reject) {
      const t = await freshResource(twin);
      if (!t) {
        log({ finding: "NB-013", pair: m.pair, id: twin, action: "twin-absent-noop" });
        continue;
      }
      if (t.status !== "approved") {
        log({ finding: "NB-013", pair: m.pair, id: twin, action: "twin-already-non-approved", status: t.status });
        continue;
      }
      const put = await api(`/api/resources/${twin}/reject`, { method: "PUT" });
      log({
        finding: "NB-013",
        pair: m.pair,
        id: twin,
        title: t.title,
        url: t.url,
        action: "twin-reject",
        status: put.status,
        ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
      });
    }
  }
}

// ---------------------------------------------------- NB-014 descriptions

// Hand-written complete descriptions for rows whose truncated text has no
// usable sentence boundary to elide at.
const OVERRIDES: Record<number, string> = {
  185811:
    "Netflix engineering post introducing Inca, a message tracing and loss detection system for Netflix's real-time data infrastructure, built on a multi-cluster Kafka architecture and Flink-powered stream processing.",
  185722:
    "Discussion of what went wrong with the visual quality of a very popular TV show episode, and the challenge of maintaining creative intent when encoding and distributing dark, high-contrast content at scale.",
  185724:
    "Explains the principles of real-time bidding for ad-supported video-on-demand (AVOD) services, building on earlier articles about server-side ad insertion and the challenges it presents.",
  185870:
    "Florian Camerer gives an introduction to the European Broadcasting Union's R128 broadcast loudness standard, covering perceived loudness, peak normalization, and loudness range measurement.",
  185964:
    "Eyevinn's knowledge-sharing series continues with video quality assessment, covering both subjective and objective approaches to measuring perceived video quality.",
  185974:
    "WWDC 2019 session introducing Low-Latency HLS. Since its introduction in 2009, HTTP Live Streaming has enabled the delivery of countless live and on-demand audio and video streams; this extension brings glass-to-glass latency down to a few seconds.",
  186134:
    "HTML5 audio/video player with support for MP4, WebM, and MP3 as well as HLS, DASH, YouTube, Facebook, SoundCloud and others, exposing a consistent HTML5 MediaElement API across browsers.",
  185755:
    "Forum thread showing a complete FFmpeg command line for generating a fragmented MP4 (fMP4) HLS live stream, including drawtext filter usage for burning timestamps into the output.",
  186074:
    "The Content Manager is a visual production tool which generates on-the-fly visualisations for DAB slideshow and RadioVIS. Based on the .NET framework, it is developed in C# and distributed as open source.",
  186113:
    "A collection of FFmpeg patches and samples that enable CNN model-based video analytics capabilities (such as object detection, classification, and recognition) within the FFmpeg framework.",
};

const ELLIPSIS_RE = /(\.\.\.|…)\s*$/;

function elide(desc: string): string | null {
  const d = desc.trim().replace(/(\.\.\.|…)+$/, "").trimEnd();
  const matches = [...d.matchAll(/[.!?]["')\]]?(?=\s)/g)];
  if (matches.length) {
    const last = matches[matches.length - 1];
    const cut = (last.index as number) + last[0].length;
    const out = d.slice(0, cut).trimEnd();
    if (out.length >= 50) return out;
  }
  return null;
}

async function fetchAllResources(): Promise<Array<{ id: number; description?: string; status: string }>> {
  const out: Array<{ id: number; description?: string; status: string }> = [];
  let page = 1;
  for (;;) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200) throw new Error(`admin resources page ${page} -> ${status}`);
    const rows = body?.resources || [];
    out.push(...rows);
    if (rows.length < 100) break;
    page++;
  }
  return out;
}

async function runDescriptions() {
  const all = await fetchAllResources();
  const targets = all.filter(
    (r) => r.status === "approved" && r.description && ELLIPSIS_RE.test(r.description.trim()),
  );
  log({ finding: "NB-014", action: "scan", truncatedCount: targets.length });
  for (const t of targets) {
    const fresh = await freshResource(t.id);
    if (!fresh?.description || !ELLIPSIS_RE.test(fresh.description.trim())) {
      log({ finding: "NB-014", id: t.id, action: "noop-already-fixed" });
      continue;
    }
    const next = OVERRIDES[t.id] ?? elide(fresh.description);
    if (!next) {
      log({ finding: "NB-014", id: t.id, action: "skip-no-boundary-no-override" });
      continue;
    }
    const put = await api(`/api/admin/resources/${t.id}`, {
      method: "PUT",
      body: JSON.stringify({ description: next }),
    });
    log({
      finding: "NB-014",
      id: t.id,
      action: OVERRIDES[t.id] ? "rewrite" : "elide",
      before: fresh.description.slice(-60),
      after: next.slice(-60),
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
  // Post-scan: must be 0 remaining ellipsis-truncated approved descriptions
  const after = await fetchAllResources();
  const remaining = after.filter(
    (r) => r.status === "approved" && r.description && ELLIPSIS_RE.test(r.description.trim()),
  );
  log({ finding: "NB-014", action: "post-scan", remaining: remaining.length, ids: remaining.map((r) => r.id) });
}

// ------------------------------------------------------------ NB-043 merges
//
// Three more duplicate pairs (same document/project listed twice under
// different hosts). Survivor keeps the canonical/original home; twin is
// rejected via the approved-state reject path (public page/API 404, counts
// adjust) — same mechanism as NB-013.
//   1. Copperpod video-coding-standards analysis: survivor 185007
//      (copperpodip.com original post); twin 185153 is the Medium mirror of
//      the identical article.
//   2. VCT (Video Converter & Transcoder): survivor 185310 (github.com/zbabac/
//      VCT, the project's source home); twin 185466 is the SourceForge
//      distribution page for the same project.
//   3. videojs-ads: survivor 185348 (github.com/dmlap/videojs-ads, the
//      original); twin 184798 (GLStephen/videojs-ads) is a GitHub FORK of
//      dmlap's repo, last pushed 2013 — verified via the GitHub API fork
//      pointer on July 20, 2026.
const MERGES_NB043: Merge[] = [
  {
    pair: "Copperpod video coding standards analysis",
    survivor: 185007,
    survivorUpdate: {},
    reject: [185153],
  },
  {
    pair: "VCT (Video Converter & Transcoder)",
    survivor: 185310,
    survivorUpdate: {},
    reject: [185466],
  },
  {
    pair: "videojs-ads (dmlap original vs GLStephen fork)",
    survivor: 185348,
    survivorUpdate: {},
    reject: [184798],
  },
];

async function runMergesNB043() {
  for (const m of MERGES_NB043) {
    const s = await freshResource(m.survivor);
    if (!s) {
      log({ finding: "NB-043", pair: m.pair, id: m.survivor, action: "survivor-missing" });
    } else {
      log({ finding: "NB-043", pair: m.pair, id: m.survivor, action: "survivor-kept", title: s.title });
    }
    for (const twin of m.reject) {
      const t = await freshResource(twin);
      if (!t) {
        log({ finding: "NB-043", pair: m.pair, id: twin, action: "twin-absent-noop" });
        continue;
      }
      if (t.status !== "approved") {
        log({ finding: "NB-043", pair: m.pair, id: twin, action: "twin-already-non-approved", status: t.status });
        continue;
      }
      const put = await api(`/api/resources/${twin}/reject`, { method: "PUT" });
      log({
        finding: "NB-043",
        pair: m.pair,
        id: twin,
        title: t.title,
        url: t.url,
        action: "twin-reject",
        status: put.status,
        ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
      });
    }
  }
}

// ----------------------------------------------------- NB-044 title chrome
//
// Titles scraped verbatim from page <title> tags carry site chrome
// (" | Site Name", " - Author - Medium", breadcrumb paths) or are whole
// sentences (186111 was a 196-char gist summary used as a title). Hand-cased
// replacements written July 20, 2026 against each row's URL + description.
// Idempotent: applied only when the current title differs. 185835 is retitled
// to "Open Broadcaster Software (OBS)" (not "OBS Studio") because 185834
// already holds that title (case-insensitive dup-title guard would 409) —
// the two are distinct entries (GitHub repo vs official site).
const RETITLES: Record<number, string> = {
  185005: "What Is Video Encoding? Encoding Formats and How-To",
  185008: "Video History Project: Tools",
  185009: "Background on the BAVC Model (Video History Project)",
  185570: "4K Media",
  185651: "Demuxed Podcast",
  185720: "Elecard Stream Analyzer",
  185768: "Lambda@Edge Design Best Practices",
  185771: "Dolby Vision for Content Creators",
  185774: "HLS Adaptive Streaming Tutorial with CloudFront & JW Player",
  185781: "Creating a Master Playlist",
  185798: "Audio Loudness (Google Conversational Actions)",
  185826: "Bento4 HLS Documentation",
  185827: "Bento4",
  185835: "Open Broadcaster Software (OBS)",
  185902: "NVIDIA FFmpeg GPU Dockerfile Sample",
  185948: "Amazon S3 (Fastly Help Guide)",
  185973: "Protocol Extension for Low-Latency HLS (Preliminary Specification)",
  185987: "Bento4 mp4dash",
  185996: "HLS Authoring Specification for Apple Devices",
  186041: "Introduction to H.264: (1) NAL Unit",
  186111: "Intel QSV-Enabled FFmpeg Build Guide",
  186115: "Best Practices for End-to-End Workflow Monitoring",
  186176: "Streaming Video Technology Alliance (SVTA)",
  186240: "H.264 Profiles and Levels",
  186249: "ISO/IEC 23009-1:2019 — MPEG-DASH Part 1: Media Presentation Description and Segment Formats",
  186251: "CENC — The DRM Blog",
  186257: "Generate MPEG-DASH Content Encrypted with MPEG-CENC ClearKey (dash.js Wiki)",
  186259: "Dolby Encoding Engine Plugins",
  186266: "HLS with Widevine for Android",
  186272: "Play Your Own DRM Content on ExoPlayer",
  186279: "CTA WAVE Project",
  186312: "DASH Sequences (GPAC Wiki)",
  186472: "Avid Media Composer First",
};

async function runRetitles() {
  for (const [idStr, title] of Object.entries(RETITLES)) {
    const id = Number(idStr);
    const fresh = await freshResource(id);
    if (!fresh) {
      log({ finding: "NB-044", id, action: "absent-noop" });
      continue;
    }
    if (fresh.title === title) {
      log({ finding: "NB-044", id, action: "noop-already-retitled" });
      continue;
    }
    const put = await api(`/api/admin/resources/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
    log({
      finding: "NB-044",
      id,
      action: "retitle",
      before: fresh.title,
      after: title,
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
}

// ------------------------------------------------- NB-045 wrong description
//
// 186257 (a dash.js WIKI PAGE about ClearKey encryption) carried a verbatim
// copy of 185806's description (the dash.js PLAYER itself) — scraped from the
// repo-level meta tags. Replaced with a description of the actual page.
const NB045_DESCRIPTIONS: Record<number, string> = {
  186257:
    "Step-by-step guide from the dash.js wiki showing how to generate MPEG-DASH content encrypted with MPEG-CENC ClearKey, and how to configure dash.js to play the protected stream back.",
};

async function runNB045() {
  for (const [idStr, description] of Object.entries(NB045_DESCRIPTIONS)) {
    const id = Number(idStr);
    const fresh = await freshResource(id);
    if (!fresh) {
      log({ finding: "NB-045", id, action: "absent-noop" });
      continue;
    }
    if (fresh.description === description) {
      log({ finding: "NB-045", id, action: "noop-already-fixed" });
      continue;
    }
    const put = await api(`/api/admin/resources/${id}`, {
      method: "PUT",
      body: JSON.stringify({ description }),
    });
    log({
      finding: "NB-045",
      id,
      action: "rewrite-description",
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
}

// --------------------------------------------------------- NB-047 slug fix
//
// The iOS/tvOS sub-subcategory slug was minted "iostvos" while every
// display-name map and hierarchy reference expects "ios-tvos" — the linked
// URL 404'd. Rename the slug via the admin API; the server keeps a permanent
// 301 from the old path (server/index.ts).
async function runSlugFix() {
  const list = await api(`/api/admin/sub-subcategories`);
  if (list.status !== 200) {
    log({ finding: "NB-047", action: "list-failed", status: list.status });
    return;
  }
  const rows: any[] = list.body?.subSubcategories || list.body || [];
  const bad = rows.find((r) => r.slug === "iostvos");
  if (!bad) {
    const good = rows.find((r) => r.slug === "ios-tvos");
    log({
      finding: "NB-047",
      action: good ? "noop-already-renamed" : "noop-slug-absent",
      ...(good ? { id: good.id } : {}),
    });
    return;
  }
  const patch = await api(`/api/admin/sub-subcategories/${bad.id}`, {
    method: "PATCH",
    body: JSON.stringify({ slug: "ios-tvos" }),
  });
  log({
    finding: "NB-047",
    id: bad.id,
    action: "rename-slug",
    before: "iostvos",
    after: "ios-tvos",
    status: patch.status,
    ...(patch.status !== 200 ? { error: patch.body?.message || patch.body } : {}),
  });
}

// -------------------------------------- NB-054 / NB-055 maintenance passes

async function runMaintenance() {
  const backfill = await api(`/api/admin/maintenance/backfill-approved-at`, { method: "POST" });
  log({
    finding: "NB-054",
    action: "backfill-approved-at",
    status: backfill.status,
    ...(backfill.status === 200 ? backfill.body : { error: backfill.body?.message || backfill.body }),
  });
  const canon = await api(`/api/admin/maintenance/canonicalize-tags`, { method: "POST" });
  log({
    finding: "NB-055",
    action: "canonicalize-tags",
    status: canon.status,
    ...(canon.status === 200 ? canon.body : { error: canon.body?.message || canon.body }),
  });
}

// --------------------------------------------------------------------- main

async function main() {
  await login();
  await runMerges();
  await runDescriptions();
  await runMergesNB043();
  await runRetitles();
  await runNB045();
  await runSlugFix();
  await runMaintenance();
  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run23", { recursive: true });
  fs.writeFileSync(`evidence/run23/data-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(`journal written to evidence/run23/data-fixes-${ENV_TAG}.json (${journal.actions.length} actions)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
