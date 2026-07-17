/**
 * Run18 data fixes — applied via the live admin HTTP API (prod DB is not
 * directly writable from the agent environment; mirrors
 * scripts/run17-data-fixes-prod.ts). Base-configurable so the exact same
 * code path is validated against dev first (PROD_BASE=http://localhost:5000).
 *
 *  NB-008: journey/6 step links resource 185380 whose destination hard-404s
 *          (inetsolutions.org). Fix: repoint URL to the live Wayback snapshot
 *          (guarded: only if the URL is still the dead original).
 *  NB-014: 216+ descriptions end with a GitHub og:description " - owner/repo"
 *          suffix. Fix: strip the trailing suffix (regex-guarded, idempotent).
 *  NB-015: naive Title-Case mangled brand/acronym tokens in titles
 *          ("Ffmpeg Js", "Videoplayback Ios"). Fix: whole-word brand-casing
 *          map applied to titles (case-sensitive tokens; re-runs no-op).
 *  NB-016: placeholder description templates rendered as real copy:
 *          "<title> — video development resource from <domain>." and
 *          "<title> - Resource from <domain>". Fix: clear to "" (ResourceCard
 *          omits empty descriptions; column is NOT NULL DEFAULT '').
 *  NB-027: journey/6 lists resource 186145 in two steps (prod). Fix: if the
 *          same resource appears in 2+ step rows, delete the later row(s)
 *          (group-aware renumbering happens server-side). Dev is clean → noop.
 *  NB-043: (a) Dolby.io Client SDKs deep-link (185228) drifted to the renamed
 *          product's generic docs root — repoint to the OptiView Millicast
 *          client-SDKs page (exact successor, verified 200).
 *          (b) doc.quanteec.com DRM page (187178) returns 502 — repoint to
 *          the live Wayback snapshot.
 *  NB-046: three near-identical "FFmpeg" entries. Keep 185214 (ffmpeg.org) as
 *          canonical "FFmpeg"; retitle 185662 (github mirror) and 185810
 *          (jrottenberg Docker images) to disambiguate.
 *  NB-049: two raw-filename titles: 186268 "Microsoft Word - EZDRM Bento 4
 *          Open Source.docx" (a .docx name on a .pdf URL) and 186253
 *          "DASH-IF-IOP-v3.2-diff-3.1.pdf". Fix: human titles.
 *  NB-052: talk resources with speaker-bio "salad" descriptions. Sweep with
 *          tight bio-phrase patterns; clear matches to "" and journal them.
 *          Dev sweep found 0 (dev descriptions already enriched) → prod-only.
 *
 * Idempotent: every write is preceded by a live re-check; re-runs are no-ops.
 * Journaled to evidence/run18/data-fixes-<env>.json.
 * Admin password read from ADMIN_PASSWORD env; never logged. Session cookie
 * is captured ONLY from the login response (GAESA affinity cookies ignored).
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run18-data-fixes-prod.ts
 * Dev validation:      PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run18-data-fixes-prod.ts
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

// ---------------------------------------------------------------- corpus scan

type AdminResource = {
  id: number;
  title: string;
  description: string;
  url: string;
  status: string;
};

async function fetchAllResources(): Promise<AdminResource[]> {
  const all: AdminResource[] = [];
  let page = 1;
  for (;;) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200) throw new Error(`admin resources page ${page} -> ${status}`);
    for (const r of body.resources) {
      all.push({
        id: r.id,
        title: r.title ?? "",
        description: typeof r.description === "string" ? r.description : "",
        url: r.url ?? "",
        status: r.status,
      });
    }
    if (page >= (body.totalPages || 1)) break;
    page++;
  }
  log("scan", { total: all.length });
  return all;
}

async function putResource(id: number, update: Record<string, string>) {
  const put = await api(`/api/admin/resources/${id}`, {
    method: "PUT",
    body: JSON.stringify(update),
  });
  return put.status;
}

// ------------------------------------------------- NB-014: owner/repo suffix

const OWNER_REPO_SUFFIX = / - [A-Za-z0-9_.][A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]+$/;

async function fixOwnerRepoSuffixes(all: AdminResource[]) {
  const matches = all.filter((r) => OWNER_REPO_SUFFIX.test(r.description));
  log("NB-014", { count: matches.length, ids: matches.map((m) => m.id) });
  for (const m of matches) {
    const cleaned = m.description.replace(OWNER_REPO_SUFFIX, "").trimEnd();
    const status = await putResource(m.id, { description: cleaned });
    log("NB-014", { id: m.id, ok: status === 200, status });
    if (status === 200) m.description = cleaned;
  }
}

// ---------------------------------------------- NB-015: brand casing in titles

const BRAND_CASING: Record<string, string> = {
  Ffmpeg: "FFmpeg", Ffprobe: "FFprobe", Ffplay: "FFplay",
  Vlc: "VLC", Ios: "iOS", Tvos: "tvOS", Macos: "macOS",
  Sdk: "SDK", Api: "API", Hls: "HLS", Hlsjs: "HLS.js", Drm: "DRM",
  Vp9: "VP9", Av1: "AV1", Rtmp: "RTMP", Rtsp: "RTSP", Srt: "SRT",
  Webrtc: "WebRTC", Gpac: "GPAC", Mp4: "MP4", Mp4box: "MP4Box",
  Hevc: "HEVC", Js: "JS", Ui: "UI", Cli: "CLI", Url: "URL",
  Http: "HTTP", Json: "JSON", Xml: "XML", Tv: "TV", Cdn: "CDN",
  Abr: "ABR", Vod: "VOD", Ott: "OTT", Mpeg: "MPEG", Aac: "AAC",
  Ac3: "AC3", Obs: "OBS", Php: "PHP", Sql: "SQL", Css: "CSS",
  Dvb: "DVB", Atsc: "ATSC", Aws: "AWS", Gcp: "GCP", Ibm: "IBM",
  Mkv: "MKV", M3u8: "M3U8", Cmaf: "CMAF", Scte: "SCTE",
  Vmaf: "VMAF", Psnr: "PSNR", Ssim: "SSIM", Yuv: "YUV", Rgb: "RGB",
  Hdr: "HDR", Sdr: "SDR", Fps: "FPS", Nginx: "NGINX", Jre: "JRE",
  P2p: "P2P",
};
const BRAND_TOKEN_RE = new RegExp(
  `\\b(${Object.keys(BRAND_CASING).join("|")})\\b`,
  "g", // case-SENSITIVE: only the naive-cased form matches; fixed forms no-op
);

function fixTitleCasing(title: string): string {
  return title.replace(BRAND_TOKEN_RE, (tok) => BRAND_CASING[tok] ?? tok);
}

async function fixBrandCasing(all: AdminResource[]) {
  const changes = all
    .map((r) => ({ r, next: fixTitleCasing(r.title) }))
    .filter(({ r, next }) => next !== r.title);
  log("NB-015", { count: changes.length, ids: changes.map((c) => c.r.id) });
  for (const { r, next } of changes) {
    const status = await putResource(r.id, { title: next });
    log("NB-015", { id: r.id, from: r.title, to: next, ok: status === 200 });
    if (status === 200) r.title = next;
  }
}

// ------------------------------------------- NB-016: placeholder descriptions

const PLACEHOLDER_TEMPLATES = [
  /^.* — video development resource from [A-Za-z0-9.-]+\.$/,
  /^.* - Resource from \S+$/,
];

async function fixPlaceholderTemplates(all: AdminResource[]) {
  const matches = all.filter((r) =>
    PLACEHOLDER_TEMPLATES.some((re) => re.test(r.description)),
  );
  log("NB-016", { count: matches.length, ids: matches.map((m) => m.id) });
  for (const m of matches) {
    const status = await putResource(m.id, { description: "" });
    log("NB-016", { id: m.id, cleared: status === 200, status });
    if (status === 200) m.description = "";
  }
}

// ------------------------------------------------ NB-052: speaker-bio salad

const BIO_SALAD_PATTERNS = [
  /\byears of experience\b/i,
  /\bprior to (joining|that)\b/i,
  /\b(he|she) (currently |previously )?(leads|led|joined|holds|serves|worked)\b/i,
  /\bis responsible for\b/i,
  /\b(his|her) (career|role|team)\b/i,
];

async function fixBioSaladDescriptions(all: AdminResource[]) {
  const matches = all.filter(
    (r) =>
      r.status === "approved" &&
      BIO_SALAD_PATTERNS.some((re) => re.test(r.description)),
  );
  log("NB-052", {
    count: matches.length,
    matches: matches.map((m) => ({ id: m.id, head: m.description.slice(0, 80) })),
  });
  for (const m of matches) {
    const status = await putResource(m.id, { description: "" });
    log("NB-052", { id: m.id, cleared: status === 200, status });
  }
}

// ---------------------------------------------------- targeted by-id repairs

const TARGETED: {
  tag: string;
  id: number;
  guard: (r: AdminResource) => boolean;
  update: Record<string, string>;
  note: string;
}[] = [
  {
    tag: "NB-008",
    id: 185380,
    guard: (r) => r.url.startsWith("https://www.inetsolutions.org/"),
    update: {
      url: "https://web.archive.org/web/20260313011439/https://www.inetsolutions.org/how-to-stream-video-a-beginners-guide/",
    },
    note: "journey/6 step 1 destination hard-404s; Wayback snapshot verified 200",
  },
  {
    tag: "NB-043",
    id: 185228,
    guard: (r) => r.url.startsWith("https://docs.dolby.io/"),
    update: { url: "https://optiview.dolby.com/docs/millicast/client-sdks/" },
    note: "Dolby.io streaming renamed OptiView; exact client-SDKs successor page (200)",
  },
  {
    tag: "NB-043",
    id: 187178,
    guard: (r) => r.url.startsWith("https://doc.quanteec.com/"),
    update: {
      url: "https://web.archive.org/web/20260122131732/https://doc.quanteec.com/advanced-topics/drm/",
    },
    note: "doc.quanteec.com 502s; Wayback snapshot verified 200",
  },
  {
    tag: "NB-046",
    id: 185662,
    guard: (r) => r.title === "FFmpeg",
    update: { title: "FFmpeg (GitHub mirror)" },
    note: "dedupe vs canonical 185214 ffmpeg.org",
  },
  {
    tag: "NB-046",
    id: 185810,
    guard: (r) => r.title === "FFmpeg (jrottenberg)",
    update: { title: "FFmpeg Docker Images (jrottenberg)" },
    note: "auto-parenthetical title; repo is Docker images for FFmpeg",
  },
  {
    tag: "NB-049",
    id: 186268,
    guard: (r) => r.title.endsWith(".docx"),
    update: { title: "EZDRM + Bento4 Open Source DRM Guide" },
    note: "raw .docx filename title on a .pdf URL",
  },
  {
    tag: "NB-049",
    id: 186253,
    guard: (r) => r.title.endsWith(".pdf"),
    update: { title: "DASH-IF IOP v3.2 Change Summary (vs v3.1)" },
    note: "raw .pdf filename title",
  },
];

async function applyTargetedFixes(all: AdminResource[]) {
  for (const t of TARGETED) {
    const r = all.find((x) => x.id === t.id);
    if (!r) {
      log(t.tag, { id: t.id, error: "resource not found in scan" });
      continue;
    }
    if (!t.guard(r)) {
      log(t.tag, { id: t.id, noop: "guard says already fixed", title: r.title, url: r.url });
      continue;
    }
    const status = await putResource(t.id, t.update);
    log(t.tag, { id: t.id, update: t.update, ok: status === 200, note: t.note });
  }
}

// ------------------------------------------ NB-027: journey/6 duplicate step

async function fixJourney6DuplicateStep() {
  const { status, body } = await api("/api/admin/journeys/6/steps");
  if (status !== 200) {
    log("NB-027", { error: `list steps -> ${status}` });
    return;
  }
  const steps: any[] = body.steps || body;
  const seen = new Map<number, any>();
  const dupes: any[] = [];
  for (const s of steps.sort((a, b) => a.stepNumber - b.stepNumber || a.id - b.id)) {
    if (seen.has(s.resourceId)) dupes.push(s);
    else seen.set(s.resourceId, s);
  }
  if (dupes.length === 0) {
    log("NB-027", { noop: "no duplicate resources in journey/6", stepCount: steps.length });
    return;
  }
  for (const s of dupes) {
    const del = await api(`/api/admin/journeys/6/steps/${s.id}`, { method: "DELETE" });
    log("NB-027", { deletedStep: s.id, resourceId: s.resourceId, status: del.status });
  }
  const after = await api("/api/admin/journeys/6/steps");
  const arr: any[] = after.body.steps || after.body;
  log("NB-027", { after: arr.map((s) => ({ id: s.id, sn: s.stepNumber, rid: s.resourceId })) });
}

async function main() {
  await login();
  const all = await fetchAllResources();
  await fixOwnerRepoSuffixes(all);
  await fixBrandCasing(all);
  await fixPlaceholderTemplates(all);
  await fixBioSaladDescriptions(all);
  await applyTargetedFixes(all);
  await fixJourney6DuplicateStep();
  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run18", { recursive: true });
  fs.writeFileSync(`evidence/run18/data-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(`DONE — journaled to evidence/run18/data-fixes-${ENV_TAG}.json`);
}

main().catch((e) => {
  console.error("FATAL", e);
  journal.fatal = String(e);
  fs.mkdirSync("evidence/run18", { recursive: true });
  fs.writeFileSync(`evidence/run18/data-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  process.exit(1);
});
