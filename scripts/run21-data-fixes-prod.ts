/**
 * Run21 data fixes — applied via the live admin HTTP API (prod DB is not
 * directly writable from the agent environment; mirrors
 * scripts/run19-data-fixes-prod.ts). Base-configurable so the exact same
 * code path is validated against dev first (PROD_BASE=http://localhost:5000).
 *
 *  R4-034: approved resources with EMPTY descriptions are backfilled from the
 *          dev-exported map evidence/run21/backfill-descriptions.json
 *          (65 prod ids; deterministic, no fresh LLM call).
 *  R4-035: WordPress page-builder shortcodes ([vc_row][vc_column]...) are
 *          stripped from stored descriptions via the SAME sanitizer the
 *          import pipeline now uses (server/github/importHygiene).
 *  R4-036: duplicate boilerplate descriptions get curated per-resource
 *          rewrites (Twitch transmux I/II, three ISO "Defines the file
 *          format and structure" specs, HEVC lecture parts 1/2, the two
 *          DASH 23009-1 catalogue entries, the two dlb_mp4demux repos).
 *  R4-064: markdown residue (links/backticks/bold/list markers) — curated
 *          rewrites for the readable-prose cases + mechanical
 *          sanitizeDescription pass over the whole corpus.
 *  R4-069: leading/trailing/doubled whitespace collapsed corpus-wide
 *          (same mechanical pass).
 *  R4-068: description===title violations are DETECTED and logged
 *          (expected 0 — fixed in a prior run).
 *  R4-037: resources whose subSubcategory label has no node under their own
 *          category > subcategory chain are folded to subSubcategory=null;
 *          resource 186362's phantom subcategory "Vendors & HDR" is
 *          repointed to "DRM & Content Protection Standards".
 *  R4-067: taxonomy nodes with zero resources in the public tree are
 *          deleted via the guarded admin endpoints (the server refuses the
 *          delete if ANY status still references the node, so this is safe
 *          even though the public tree only shows approved rows).
 *
 * Idempotent: every write is preceded by a live re-check; re-runs are no-ops.
 * Journaled to evidence/run21/data-fixes-<env>.json.
 * Admin password read from ADMIN_PASSWORD env; never logged. Session cookie
 * is captured ONLY from the login response (GAESA affinity cookies ignored).
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run21-data-fixes-prod.ts
 * Dev validation:      PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run21-data-fixes-prod.ts
 */
import fs from "fs";
import { sanitizeDescription } from "../server/github/importHygiene";

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

// --------------------------------------------------------------- R4-036/064
// Curated per-resource description rewrites. Keyed by resource id; applied
// only when the live description differs.
const CURATED: Record<number, string> = {
  // R4-036 duplicate boilerplate groups
  186146:
    "Part one of Twitch's engineering deep-dive comparing FFmpeg with their in-house TwitchTranscoder for live video transmuxing and transcoding, covering system architecture and design constraints at Twitch scale.",
  186147:
    "Part two of Twitch's engineering deep-dive comparing FFmpeg with TwitchTranscoder, covering benchmark results, performance trade-offs, and lessons from running live transcoding in production.",
  186300:
    "ISO/IEC 14496-12, the ISO Base Media File Format specification — defines the structural 'MP4' container that most modern media files and streaming segments are built on.",
  186301:
    "ISO/IEC 23000-19, the Common Media Application Format (CMAF) specification — a segmented media profile that lets a single encode serve both HLS and DASH delivery.",
  186302:
    "ISO/IEC 23001-18, the Event Message Track Format specification — defines how timed event messages (emsg) are carried as tracks in ISO base media files.",
  185989:
    "Part two of the HEVC/H.265 video coding standard lecture series by Dr. Dan Grois, Benjamin Bross, Dr. Detlev Marpe and Karsten Sühring, covering the Range Extensions and the Scalable Extension.",
  185990:
    "Part one of the HEVC/H.265 video coding standard lecture series by Dr. Dan Grois, Benjamin Bross, Dr. Detlev Marpe and Karsten Sühring, introducing the standard's core coding tools and structure.",
  185777:
    "ISO/IEC 23009-1:2019 (MPEG-DASH Part 1) — the standard defining the media presentation description (MPD) and segment formats for dynamic adaptive streaming over HTTP.",
  186249:
    "ISO catalogue entry for a later edition of ISO/IEC 23009-1 (MPEG-DASH Part 1), covering the media presentation description and segment formats with subsequent amendments.",
  186264:
    "Community mirror of dlb_mp4demux, the Dolby MP4 streaming demuxer for fragmented and unfragmented ISO base media files.",
  186265:
    "Dolby Laboratories' official MP4 streaming demuxer (dlb_mp4demux) — a reference implementation for demuxing fragmented or unfragmented ISO base media files.",
  // R4-064 markdown-residue rows where mechanical stripping would leave
  // clunky text — hand-rewritten as readable prose.
  185712:
    "Dockerfile combining the fabric8 JRE 8 base image with jrottenberg's FFmpeg image to produce an Alpine-based Java runtime with FFmpeg available.",
  185855:
    "The official Mux-flavored video player web component. The player UI is built on Media Chrome, with the mux-video element driving the core playback logic for Mux streams.",
  186813:
    "EdgeCDN-X is an open source CDN built on Kubernetes with ingress-nginx and CoreDNS for routing, and ArgoCD for fast config distribution to the edges. Supports static upstreams, S3 origins, URL signatures, static IP prefix routing, and geo routing.",
  187905:
    "A rewrite of the interface and orchestration layers of FFmpeg: a graphical interface to visualize, edit, validate and run processing graphs, jobs defined in JSON files, import of any FFmpeg command line, and a real-time encoding control system.",
  186459:
    "Guide to FFmpeg's -loglevel and debug options for troubleshooting encoding and decoding issues, covering the log levels from quiet to debug and flags like -report that write detailed logs to a file.",
  184932:
    "webm-wasm enables creating WebM videos directly in JavaScript via WebAssembly. It consumes raw RGBA32 buffers, making it compatible with ImageData from a canvas, and converts them into WebM video.",
};

// --------------------------------------------------------------- R4-037
// Phantom-subcategory repoint (dev+prod recon July 19, 2026): resource
// 186362 carries subcategory "Vendors & HDR" which exists nowhere in the
// taxonomy. Nearest valid home under its own category:
const SUBCATEGORY_REPOINT: Record<number, { subcategory: string }> = {
  186362: { subcategory: "DRM & Content Protection Standards" },
};

const VISIBLE_MIN = 10;

function visibleLength(s: string): number {
  return s.replace(/[\s\u200B-\u200D\uFEFF\u00AD]/g, "").length;
}

async function main() {
  await login();

  // ---- Load state -------------------------------------------------------
  const backfill: Record<string, string> = JSON.parse(
    fs.readFileSync("evidence/run21/backfill-descriptions.json", "utf8"),
  );

  const listRes = await api("/api/awesome-list");
  if (listRes.status !== 200) throw new Error(`awesome-list -> ${listRes.status}`);
  const resources: any[] = listRes.body.resources || [];
  const tree: any[] = listRes.body.categories || [];
  log("load", { resources: resources.length, categories: tree.length });

  // Valid (category > subcategory) and (category > subcategory > subsub)
  // chains from the live tree.
  const validSub = new Set<string>();
  const validSubSub = new Set<string>();
  for (const c of tree) {
    for (const sc of c.subcategories || []) {
      validSub.add(`${c.name}|${sc.name}`);
      for (const ss of sc.subSubcategories || []) {
        validSubSub.add(`${c.name}|${sc.name}|${ss.name}`);
      }
    }
  }

  // ---- Per-resource pass (R4-034/035/036/064/069/037/068) ---------------
  // The bulk list may be up to 60s stale (server-side TTL cache), so it is
  // only used to nominate CANDIDATES; every write decision is recomputed
  // against a fresh per-resource read (GET /api/resources/:id) immediately
  // before the PUT. That makes re-runs true no-ops.
  function computeUpdate(row: any): { update: Record<string, any>; reasons: string[] } {
    const update: Record<string, any> = {};
    const reasons: string[] = [];
    const current: string = row.description || "";

    // 1. Decide the desired description.
    let desired = current;
    if (CURATED[row.id] !== undefined) {
      desired = CURATED[row.id];
      if (desired !== current) reasons.push("curated-rewrite");
    } else if (current.trim() === "") {
      const mapped = backfill[String(row.id)];
      if (mapped && mapped.trim() !== "") {
        desired = mapped;
        reasons.push("R4-034-backfill");
      } else {
        log("R4-034-unmapped", { id: row.id, title: row.title });
      }
    }

    // 2. Mechanical normalize (shortcodes, markdown residue, entities,
    //    emails, whitespace) — same sanitizer the import pipeline uses.
    const cleaned = sanitizeDescription(desired);
    if (cleaned !== desired && !reasons.includes("curated-rewrite")) {
      reasons.push("mechanical-sanitize");
    }
    if (cleaned !== current) {
      if (visibleLength(cleaned) >= VISIBLE_MIN) {
        update.description = cleaned;
      } else if (current.trim() !== "") {
        log("skip-too-short", { id: row.id, cleaned });
      }
    }

    // 3. R4-068 detection (post-clean).
    const finalDesc = update.description ?? current;
    if (
      finalDesc.trim() !== "" &&
      finalDesc.trim().toLowerCase() === String(row.title || "").trim().toLowerCase()
    ) {
      log("R4-068-desc-equals-title", { id: row.id, title: row.title });
    }

    // 4. R4-037 containment.
    const repoint = SUBCATEGORY_REPOINT[row.id];
    if (repoint) {
      if (row.subcategory !== repoint.subcategory) {
        if (validSub.has(`${row.category}|${repoint.subcategory}`)) {
          update.subcategory = repoint.subcategory;
          update.subSubcategory = null;
          reasons.push("R4-037-subcategory-repoint");
        } else {
          log("R4-037-repoint-target-missing", { id: row.id, target: repoint.subcategory });
        }
      }
    } else if (row.subSubcategory != null && String(row.subSubcategory).trim() === "") {
      // Empty-string sub-subcategory is a degenerate value — normalize to NULL.
      update.subSubcategory = null;
      reasons.push("R4-037-empty-string-subsub");
    } else if (row.subSubcategory) {
      const chain = `${row.category}|${row.subcategory}|${row.subSubcategory}`;
      if (!validSubSub.has(chain)) {
        update.subSubcategory = null;
        reasons.push("R4-037-null-orphan-subsub");
      }
    }

    return { update, reasons };
  }

  let scanned = 0;
  let writes = 0;
  let staleSkips = 0;
  for (const r of resources) {
    scanned++;
    const candidate = computeUpdate(r);
    if (Object.keys(candidate.update).length === 0) continue;

    // Re-check against a FRESH read before writing.
    const freshRes = await api(`/api/resources/${r.id}`);
    if (freshRes.status !== 200 || !freshRes.body) {
      log("fresh-read-failed", { id: r.id, status: freshRes.status });
      continue;
    }
    const fresh = freshRes.body.resource || freshRes.body;
    const { update, reasons } = computeUpdate(fresh);
    if (Object.keys(update).length === 0) {
      staleSkips++;
      continue;
    }

    const put = await api(`/api/admin/resources/${r.id}`, {
      method: "PUT",
      body: JSON.stringify(update),
    });
    writes++;
    log("write", {
      id: r.id,
      reasons,
      fields: Object.keys(update),
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
  log("summary-resources", { scanned, writes, staleSkips });

  // ---- R4-067 empty taxonomy buckets -------------------------------------
  // Enumerate from the live tree AFTER the resource pass (repoints may have
  // changed emptiness) — refetch.
  const listRes2 = await api("/api/awesome-list");
  const tree2: any[] = listRes2.body?.categories || [];

  const [subsRes, subsubsRes] = [
    await api("/api/admin/subcategories"),
    await api("/api/admin/sub-subcategories"),
  ];
  const adminSubs: any[] = subsRes.body?.subcategories || subsRes.body || [];
  const adminSubSubs: any[] =
    subsubsRes.body?.subSubcategories || subsubsRes.body?.sub_subcategories || subsubsRes.body || [];
  const catsRes = await api("/api/admin/categories");
  const adminCats: any[] = catsRes.body?.categories || catsRes.body || [];
  const catIdByName = new Map(adminCats.map((c: any) => [c.name, c.id]));
  const subIdByKey = new Map(
    adminSubs.map((s: any) => [`${s.categoryId}|${s.name}`, s.id]),
  );
  const subsubIdByKey = new Map(
    adminSubSubs.map((s: any) => [`${s.subcategoryId}|${s.name}`, s.id]),
  );

  for (const c of tree2) {
    const catId = catIdByName.get(c.name);
    for (const sc of c.subcategories || []) {
      const subId = catId !== undefined ? subIdByKey.get(`${catId}|${sc.name}`) : undefined;
      const subsubs = sc.subSubcategories || [];
      const directCount = (sc.resources || []).length;
      const nestedCount = subsubs.reduce(
        (acc: number, ss: any) => acc + (ss.resources || []).length,
        0,
      );

      // Empty sub-subcategory nodes first.
      for (const ss of subsubs) {
        if ((ss.resources || []).length > 0) continue;
        const ssId = subId !== undefined ? subsubIdByKey.get(`${subId}|${ss.name}`) : undefined;
        if (ssId === undefined) {
          log("R4-067-subsub-id-missing", { cat: c.name, sub: sc.name, subsub: ss.name });
          continue;
        }
        const del = await api(`/api/admin/sub-subcategories/${ssId}`, { method: "DELETE" });
        log("R4-067-delete-subsub", {
          cat: c.name, sub: sc.name, subsub: ss.name, id: ssId, status: del.status,
          ...(del.status !== 200 ? { message: del.body?.message } : {}),
        });
      }

      // Then the subcategory itself, when the whole node is empty. The
      // server-side guard re-checks resource counts across ALL statuses.
      if (directCount + nestedCount === 0) {
        if (subId === undefined) {
          log("R4-067-sub-id-missing", { cat: c.name, sub: sc.name });
          continue;
        }
        const del = await api(`/api/admin/subcategories/${subId}`, { method: "DELETE" });
        log("R4-067-delete-sub", {
          cat: c.name, sub: sc.name, id: subId, status: del.status,
          ...(del.status !== 200 ? { message: del.body?.message } : {}),
        });
      }
    }
  }

  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run21", { recursive: true });
  fs.writeFileSync(
    `evidence/run21/data-fixes-${ENV_TAG}.json`,
    JSON.stringify(journal, null, 2),
  );
  console.log(`\nJournal written to evidence/run21/data-fixes-${ENV_TAG}.json`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  journal.fatal = String(err);
  fs.mkdirSync("evidence/run21", { recursive: true });
  fs.writeFileSync(
    `evidence/run21/data-fixes-${ENV_TAG}.json`,
    JSON.stringify(journal, null, 2),
  );
  process.exit(1);
});
