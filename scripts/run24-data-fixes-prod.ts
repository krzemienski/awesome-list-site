/**
 * Run24 (R5 delta) data-corpus & link fixes — driven through the LIVE admin
 * API so the exact same code path works on dev and prod (prod DB is not
 * agent-writable). Modeled on scripts/run23-data-fixes-prod.ts; every fix
 * path is validated against dev first (PROD_BASE=http://localhost:5000).
 *
 * Findings covered (spec: attached_assets/REPORT-R5_1784576224900.md +
 * MASTER-FIX-PROMPT R5 delta; ground rules .local/tasks/run24-r5-remediation.md):
 *
 *  R4-021  185455 IEEE Xplore login-wall → SMPTE ST 2084 public source
 *  R4-022  bot-walled/plain-dead destinations → live intent-matching homes
 *          (185547 Kaltura Android SDK, 184940 Ant Media docs, 185390 npm pkg)
 *  R4-023  186531 screentogif.com now redirects to nicke.tech ("migrated") →
 *          official GitHub repo; 185306 IBM article → wayback snapshot
 *          (origin now 302s to a generic support search — intent destroyed)
 *  BUG-056 sportsvideo.org rows (184854, 186159): re-verified live from this
 *          network → journal-only (no change)
 *  R4-066  wayback re-audit: probe every web.archive.org row's ORIGIN; if the
 *          origin serves the same host+path again, repoint to origin
 *          (187178 QUANTEEC DRM doc is live again)
 *  R5-032  restore the space the run4→run5 whitespace pass ate before
 *          ".NET"/file-extensions (scan-driven regex, 16 known IDs)
 *  R5-033  "SVT-AV1 GitHub Discussions" (prod 187995) → "SVT-AV1 (GitLab)"
 *  R5-034  IMSC false acronym → W3C expansion (scan-driven)
 *  R5-035  strip personal share-tracking params from stored URLs (scan)
 *  R5-036  exact-dup "Demuxed Podcast": reject 185651 IFF another approved
 *          resource with the same exact title exists (prod 187950)
 *  R5-041  titles matching ^owner/repo — … → strip owner/ (scan-driven;
 *          importer itself fixed in server/ai/researchService.ts)
 *  R5-061  strip raw :emoji_shortcode: tokens from descriptions (scan)
 *  R5-062  185821 description = title verbatim → real description
 *  R5-064  185994 self-repeating title → "x265 Documentation"
 *  R5-065  184935 → kapwing.com, 184942 → PTZOptics Hive YouTube playlist
 *  NB-046  185662 "FFmpeg (FFmpeg)" → "FFmpeg (GitHub mirror)" (prod residual)
 *  NB-052  Kevin Staunton-Lambert talk decks: speaker-bio descriptions →
 *          topical descriptions (185610, 186001–186005)
 *  R5-063 + NB-015  POST /api/admin/maintenance/canonicalize-tags (endpoint
 *          upgraded: separator fold + plural fold + extended brand map)
 *
 * Idempotent: every action re-reads current state first; second run is a
 * full no-op. Journaled to evidence/run24/data-fixes-<env>.json.
 *
 * Dev validation:  PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run24-data-fixes-prod.ts
 * Prod:            ADMIN_PASSWORD=<prod admin pw> npx tsx scripts/run24-data-fixes-prod.ts
 */

import fs from "fs";
import { cleanGithubSlugTitle } from "../server/lib/titleClean";

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

type Row = {
  id: number;
  title: string;
  url: string;
  description?: string;
  status: string;
};

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
  return api(`/api/admin/resources/${id}`, { method: "PUT", body: JSON.stringify(update) });
}

/** Probe a URL like a browser-ish client. Returns {code, finalUrl}. */
async function probe(url: string): Promise<{ code: number; finalUrl: string }> {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(20000),
    });
    return { code: r.status, finalUrl: r.url };
  } catch (e: any) {
    return { code: 0, finalUrl: `error:${e?.message || e}` };
  }
}

// ------------------------------------------------------- repoints (by id)

type Repoint = {
  finding: string;
  id: number;
  /** substrings — repoint only if the CURRENT url contains one of these */
  oldUrlContains: string[];
  newUrl: string;
  note: string;
};

const REPOINTS: Repoint[] = [
  {
    finding: "R4-021",
    id: 185455,
    oldUrlContains: ["ieeexplore.ieee.org"],
    newUrl: "https://pub.smpte.org/doc/st2084/",
    note: "IEEE Xplore login-wall -> SMPTE's own public document page for ST 2084 (probed 200)",
  },
  {
    finding: "R4-022",
    id: 185547,
    oldUrlContains: ["developer.kaltura.com"],
    newUrl: "https://github.com/kaltura/kaltura-player-android",
    note: "developer.kaltura.com 403-bot-walls; official Kaltura Player Android repo (probed 200)",
  },
  {
    finding: "R4-022",
    id: 184940,
    oldUrlContains: ["mirror.antmedia.io"],
    newUrl: "https://antmedia.io/docs/",
    note: "mirror.antmedia.io/tutorial 403s; Ant Media's official docs hub (probed 200)",
  },
  {
    finding: "R4-022",
    id: 185390,
    oldUrlContains: ["libraries.io"],
    newUrl: "https://www.npmjs.com/package/web-monetisation-video-ads",
    note: "libraries.io 403s in real browsers; npm registry page is the canonical package home",
  },
  {
    finding: "R4-023",
    id: 185306,
    oldUrlContains: ["support.video.ibm.com"],
    newUrl:
      "https://web.archive.org/web/20260115072827/https://support.video.ibm.com/hc/en-us/articles/207852167-Basics-of-Streaming-Video-Production",
    note: "origin now 302s to a generic IBM support search (article gone); latest wayback snapshot (200)",
  },
  {
    finding: "R4-023",
    id: 186531,
    oldUrlContains: ["screentogif.com"],
    newUrl: "https://github.com/NickeManarin/ScreenToGif",
    note: "screentogif.com now redirects to nicke.tech/n-studio?migrated=true; official repo (probed 200)",
  },
  {
    finding: "R5-065",
    id: 184935,
    oldUrlContains: ["web.archive.org", "thinkbrandedmedia.com"],
    newUrl: "https://www.kapwing.com/",
    note: "Kapwing card pointed at an archived third-party listicle; product homepage (probed 200)",
  },
  {
    finding: "R5-065",
    id: 184942,
    oldUrlContains: ["web.archive.org", "remoteproduction.com"],
    newUrl: "https://www.youtube.com/playlist?list=PLyY0t7zWqRQpCFidP5f7Ga5muBHHFaO4L",
    note: "PTZOptics Hive card pointed at an archived listicle; official 'PTZOptics Hive Studio Remote Production Software' YouTube playlist",
  },
];

async function runRepoints() {
  for (const rp of REPOINTS) {
    const r = await freshResource(rp.id);
    if (!r) {
      log({ finding: rp.finding, id: rp.id, action: "absent-noop" });
      continue;
    }
    if (r.url === rp.newUrl) {
      log({ finding: rp.finding, id: rp.id, action: "already-repointed-noop" });
      continue;
    }
    if (!rp.oldUrlContains.some((s) => (r.url || "").includes(s))) {
      log({ finding: rp.finding, id: rp.id, action: "url-mismatch-skip", currentUrl: r.url });
      continue;
    }
    const put = await putResource(rp.id, { url: rp.newUrl });
    log({
      finding: rp.finding,
      id: rp.id,
      action: "repoint",
      from: r.url,
      to: rp.newUrl,
      note: rp.note,
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
}

// -------------------------------------------- BUG-056: sportsvideo re-verify

async function runSportsvideoVerify() {
  for (const id of [184854, 186159]) {
    const r = await freshResource(id);
    if (!r) {
      log({ finding: "BUG-056", id, action: "absent-noop" });
      continue;
    }
    const p = await probe(r.url);
    log({
      finding: "BUG-056",
      id,
      action: "verify-only",
      url: r.url,
      probe: p,
      verdict:
        p.code === 200
          ? "live-from-this-network (auditor 403 was a bot-block, not a dead link)"
          : "NOT 200 — needs manual follow-up",
    });
  }
}

// ------------------------------------- R4-066: wayback origin re-audit

function waybackOrigin(url: string): string | null {
  const m = url.match(/^https?:\/\/web\.archive\.org\/web\/\d+(?:[a-z_]*)?\/(https?:\/\/.+)$/i);
  return m ? m[1] : null;
}

function samePage(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const norm = (u: URL) =>
      `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
    return norm(ua) === norm(ub);
  } catch {
    return false;
  }
}

async function runWaybackReaudit(all: Row[]) {
  const waybackRows = all.filter(
    (r) => r.status === "approved" && /web\.archive\.org\/web\//.test(r.url || ""),
  );
  for (const row of waybackRows) {
    // Rows already handled by explicit repoints above will have new URLs by
    // now — re-read to be safe.
    const fresh = await freshResource(row.id);
    if (!fresh || !/web\.archive\.org\/web\//.test(fresh.url || "")) {
      log({ finding: "R4-066", id: row.id, action: "no-longer-wayback-noop" });
      continue;
    }
    const origin = waybackOrigin(fresh.url);
    if (!origin) {
      log({ finding: "R4-066", id: row.id, action: "unparseable-wayback-skip", url: fresh.url });
      continue;
    }
    const p = await probe(origin);
    const originAlive = p.code === 200 && samePage(origin, p.finalUrl);
    if (originAlive) {
      const put = await putResource(row.id, { url: origin });
      log({
        finding: "R4-066",
        id: row.id,
        action: "repoint-to-live-origin",
        from: fresh.url,
        to: origin,
        probe: p,
        status: put.status,
        ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
      });
    } else {
      log({
        finding: "R4-066",
        id: row.id,
        action: "keep-wayback",
        origin,
        probe: p,
        reason:
          p.code === 200
            ? "origin redirects away from the article (content gone)"
            : `origin not healthy (${p.code})`,
      });
    }
  }
}

// ----------------------------------------------------------- retitles

type Retitle = {
  finding: string;
  id: number;
  ifTitle: string; // exact current title required (idempotence guard)
  newTitle: string;
  newDescriptionIfContains?: { needle: string; description: string };
};

const RETITLES: Retitle[] = [
  {
    finding: "R5-064",
    id: 185994,
    ifTitle: "x265 Documentation — x265  documentation",
    newTitle: "x265 Documentation",
  },
  {
    finding: "NB-046",
    id: 185662,
    ifTitle: "FFmpeg (FFmpeg)",
    newTitle: "FFmpeg (GitHub mirror)",
  },
  {
    finding: "R5-033",
    id: 187995,
    ifTitle: "SVT-AV1 GitHub Discussions",
    newTitle: "SVT-AV1 (GitLab)",
    newDescriptionIfContains: {
      needle: "community hub",
      description:
        "Official GitLab repository for SVT-AV1, the Scalable Video Technology AV1 encoder and decoder maintained under the Alliance for Open Media. Hosts the source code, releases, issue tracker and build documentation.",
    },
  },
];

async function runRetitles() {
  for (const rt of RETITLES) {
    const r = await freshResource(rt.id);
    if (!r) {
      log({ finding: rt.finding, id: rt.id, action: "absent-noop" });
      continue;
    }
    if (r.title === rt.newTitle) {
      log({ finding: rt.finding, id: rt.id, action: "already-retitled-noop" });
      continue;
    }
    if (r.title !== rt.ifTitle) {
      log({ finding: rt.finding, id: rt.id, action: "title-mismatch-skip", currentTitle: r.title });
      continue;
    }
    const update: Record<string, string> = { title: rt.newTitle };
    if (
      rt.newDescriptionIfContains &&
      (r.description || "").toLowerCase().includes(rt.newDescriptionIfContains.needle.toLowerCase())
    ) {
      update.description = rt.newDescriptionIfContains.description;
    }
    const put = await putResource(rt.id, update);
    log({
      finding: rt.finding,
      id: rt.id,
      action: "retitle",
      from: r.title,
      to: rt.newTitle,
      descriptionRewritten: Boolean(update.description),
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
}

// ------------------------------------------- targeted description rewrites

async function runDescriptionRewrites() {
  // R5-034: invented acronym expansion.
  {
    const id = 185956;
    const r = await freshResource(id);
    if (!r) {
      log({ finding: "R5-034", id, action: "absent-noop" });
    } else if ((r.description || "").includes("International Movie Standardization Committee")) {
      const next = (r.description as string).replace(
        /IMSC\s*\(International Movie Standardization Committee\)/g,
        "IMSC (TTML Profiles for Internet Media Subtitles and Captions)",
      );
      const put = await putResource(id, { description: next });
      log({ finding: "R5-034", id, action: "fix-acronym", status: put.status });
    } else {
      log({ finding: "R5-034", id, action: "already-clean-noop" });
    }
  }

  // R5-062: description == title verbatim (± " - README.md").
  {
    const id = 185821;
    const r = await freshResource(id);
    if (!r) {
      log({ finding: "R5-062", id, action: "absent-noop" });
    } else {
      const desc = (r.description || "").trim();
      const startsWithTitle = desc.toLowerCase().startsWith((r.title || "").trim().toLowerCase());
      if (startsWithTitle || /-\s*README\.md\s*$/i.test(desc)) {
        const put = await putResource(id, {
          description:
            "Bash scripts for packaging VOD HLS streams with FFmpeg — renditions, master playlist and encryption included; tested on Linux and macOS.",
        });
        log({ finding: "R5-062", id, action: "rewrite-verbatim-desc", status: put.status });
      } else {
        log({ finding: "R5-062", id, action: "already-clean-noop" });
      }
    }
  }

  // NB-052: Kevin Staunton-Lambert conference decks — speaker-bio blurbs →
  // topical descriptions. Guard: only rewrites while the bio text is present.
  const TALK_DESCS: Record<number, string> = {
    185610:
      "Conference talk deck on working with the AV1 codec — encoding workflows, tooling and practical adoption notes for video engineers.",
    186001:
      "Talk deck on low-latency live streaming with Apple LL-HLS and CMAF — chunked transfer, latency budgets and player behaviour.",
    186002:
      "Talk deck on running WebAssembly at the edge for video workflows — use cases, constraints and performance considerations.",
    186003:
      "Talk deck on using TensorFlow for audience measurement in video streaming pipelines.",
    186004:
      "Talk deck on assembling live channels from VOD assets (VOD2Live), illustrated with a wildfire emergency-broadcast case study.",
    186005:
      "Talk deck on VOD2Live — converting on-demand assets into linear live streams with Unified Streaming tooling.",
  };
  for (const [idStr, desc] of Object.entries(TALK_DESCS)) {
    const id = Number(idStr);
    const r = await freshResource(id);
    if (!r) {
      log({ finding: "NB-052", id, action: "absent-noop" });
      continue;
    }
    if (!/Staunton-Lambert|kevleyski/i.test(r.description || "")) {
      log({ finding: "NB-052", id, action: "already-clean-noop" });
      continue;
    }
    const put = await putResource(id, { description: desc });
    log({ finding: "NB-052", id, action: "rewrite-speaker-bio-desc", status: put.status });
  }
}

// ------------------------------------------------ scan-driven corpus fixes

/** R5-061: strip raw :emoji_shortcode: tokens. */
function stripShortcodes(desc: string): string {
  return desc
    .replace(/:[a-z][a-z0-9_]{1,30}:/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/** R5-032: restore " ." before known extensions the whitespace pass ate. */
const EXT_WHITELIST = "NET|Mono|m3u8|mkv|ubv|cube|bin|srt|ssa|sub|txt";
const MISSING_SPACE_RE = new RegExp(`([a-z,])\\.(${EXT_WHITELIST})\\b`, "g");
function restoreExtensionSpaces(desc: string): string {
  return desc.replace(MISSING_SPACE_RE, "$1 .$2");
}

/** R5-035: strip personal share-tracking params. */
const ALWAYS_STRIP = /^(utm_[a-z0-9_]*|_hsenc|_hsmi|hsCtaTracking|fbclid|gclid|_branch_match_id)$/i;
function stripTrackingParams(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const params = Array.from(u.searchParams.keys());
  const hasShare =
    (u.searchParams.get("source") || "").startsWith("userActivityShare") ||
    params.some((k) => k === "_branch_match_id");
  let changed = false;
  for (const k of params) {
    const kill =
      ALWAYS_STRIP.test(k) ||
      (hasShare && (k === "gi" || k === "source"));
    if (kill) {
      u.searchParams.delete(k);
      changed = true;
    }
  }
  if (!changed) return null;
  let out = u.toString();
  if (out.endsWith("?")) out = out.slice(0, -1);
  return out;
}

async function runCorpusScans(all: Row[]) {
  const active = all.filter((r) => r.status === "approved" || r.status === "pending");

  // R5-041: owner/repo — titles.
  for (const r of active) {
    const cleaned = cleanGithubSlugTitle(r.title || "");
    if (cleaned !== r.title) {
      const put = await putResource(r.id, { title: cleaned });
      log({
        finding: "R5-041",
        id: r.id,
        action: "strip-owner-prefix",
        from: r.title,
        to: cleaned,
        status: put.status,
        ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
      });
    }
  }

  // R5-061 then R5-032 on descriptions (shortcode strip first so
  // "language.:cinema:" becomes "language." before the space pass runs).
  for (const r of active) {
    const desc = r.description || "";
    if (!desc) continue;
    let next = desc;
    const hadShortcode = /:[a-z][a-z0-9_]{1,30}:/.test(next);
    if (hadShortcode) next = stripShortcodes(next);
    const spaced = restoreExtensionSpaces(next);
    const hadMissingSpace = spaced !== next;
    next = spaced;
    if (next !== desc) {
      const put = await putResource(r.id, { description: next });
      log({
        finding: hadShortcode && hadMissingSpace ? "R5-061+R5-032" : hadShortcode ? "R5-061" : "R5-032",
        id: r.id,
        action: "fix-description",
        shortcodesStripped: hadShortcode,
        spacesRestored: hadMissingSpace,
        status: put.status,
        ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
      });
    }
  }

  // R5-035: tracking params. Verify the stripped URL still resolves before
  // writing (report acceptance: "each destination still resolves").
  for (const r of active) {
    const stripped = stripTrackingParams(r.url || "");
    if (!stripped) continue;
    const p = await probe(stripped);
    // 403 on the SAME page is a datacenter bot-block (Medium/Bitmovin block
    // non-browser IPs), not a dead destination — removing share-tracking
    // params cannot change which article the URL resolves to.
    const ok =
      (p.code >= 200 && p.code < 400) ||
      (p.code === 403 && samePage(stripped, p.finalUrl));
    if (!ok) {
      log({
        finding: "R5-035",
        id: r.id,
        action: "strip-skipped-destination-unhealthy",
        candidate: stripped,
        probe: p,
      });
      continue;
    }
    const put = await putResource(r.id, { url: stripped });
    log({
      finding: "R5-035",
      id: r.id,
      action: "strip-tracking-params",
      from: r.url,
      to: stripped,
      probe: p,
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
}

// ------------------------------------- R5-036: Demuxed Podcast exact dup

async function runDemuxedDedup(all: Row[]) {
  const dups = all.filter((r) => r.title === "Demuxed Podcast" && r.status === "approved");
  if (dups.length <= 1) {
    log({ finding: "R5-036", action: "no-duplicate-noop", approvedWithTitle: dups.length });
    return;
  }
  // Survivor preference: 187950 (the retitle-wave canonical) if present,
  // otherwise the highest id; reject 185651 (the heavybit library page).
  const survivor =
    dups.find((d) => d.id === 187950) ?? dups.reduce((a, b) => (a.id > b.id ? a : b));
  for (const d of dups) {
    if (d.id === survivor.id) {
      log({ finding: "R5-036", id: d.id, action: "survivor-kept", url: d.url });
      continue;
    }
    const put = await api(`/api/resources/${d.id}/reject`, { method: "PUT" });
    log({
      finding: "R5-036",
      id: d.id,
      action: "duplicate-reject",
      url: d.url,
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
}

// ----------------------------------------------- tags (R5-063 + NB-015)

async function runTagCanonicalization() {
  const r = await api(`/api/admin/maintenance/canonicalize-tags`, { method: "POST" });
  log({ finding: "R5-063+NB-015", action: "canonicalize-tags", status: r.status, result: r.body });
}

// --------------------------------------------------------------- main

async function main() {
  await login();

  log({ phase: "repoints" });
  await runRepoints();

  log({ phase: "sportsvideo-verify" });
  await runSportsvideoVerify();

  log({ phase: "corpus-fetch" });
  let all = await fetchAllResources();
  log({ phase: "corpus-fetched", count: all.length });

  log({ phase: "wayback-reaudit" });
  await runWaybackReaudit(all);

  log({ phase: "retitles" });
  await runRetitles();

  log({ phase: "description-rewrites" });
  await runDescriptionRewrites();

  log({ phase: "corpus-scans" });
  // Re-fetch so scans see post-repoint state.
  all = await fetchAllResources();
  await runCorpusScans(all);

  log({ phase: "demuxed-dedup" });
  await runDemuxedDedup(all);

  log({ phase: "tag-canonicalization" });
  await runTagCanonicalization();

  journal.finishedAt = new Date().toISOString();
  const mutating = journal.actions.filter(
    (a: any) =>
      a.action &&
      !/noop|verify-only|skip|survivor-kept|keep-wayback/.test(a.action) &&
      !a.phase &&
      // the tag endpoint call is only a mutation when it rewrote rows
      !(a.action === "canonicalize-tags" && a.result?.resourcesUpdated === 0),
  );
  journal.mutatingActionCount = mutating.length;
  fs.mkdirSync("evidence/run24", { recursive: true });
  fs.writeFileSync(`evidence/run24/data-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(
    `journal written to evidence/run24/data-fixes-${ENV_TAG}.json (${journal.actions.length} actions, ${mutating.length} mutating)`,
  );
}

main().catch((e) => {
  console.error(e);
  journal.error = String(e?.message || e);
  fs.mkdirSync("evidence/run24", { recursive: true });
  fs.writeFileSync(`evidence/run24/data-fixes-${ENV_TAG}-FAILED.json`, JSON.stringify(journal, null, 2));
  process.exit(1);
});
