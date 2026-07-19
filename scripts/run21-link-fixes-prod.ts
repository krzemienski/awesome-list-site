/**
 * Run21 link-rot fixes (R4-001..008, 020, 022, 023, 065) — applied via the
 * live admin HTTP API (prod DB is not directly writable from the agent
 * environment; mirrors scripts/run19-data-fixes-prod.ts). Base-configurable so
 * the exact same code path is validated against dev first
 * (PROD_BASE=http://localhost:5000).
 *
 * Rules are matched by URL (NOT by id) because seven of the audited rows are
 * prod-only ids — URL matching applies identically to both corpora.
 * Every replacement target was 200-verified on July 19, 2026 (real-browser
 * screenshots for ambiguous cases; wayback snapshots timestamp-pinned).
 *
 *  R4-001  afterglowplayer.com     -> github.com/moay/afterglow          (parked-spam takeover)
 *  R4-002  winff.org               -> github.com/WinFF/winff             (domain takeover)
 *  R4-003  openqoe.dev             -> DELETE                             (SSL dead; GitHub twins already in corpus)
 *  R4-004  wiki.x266.mov/*         -> wayback snapshots                  (TLS hard-broken)
 *  R4-005  kurento.org             -> doc-kurento.readthedocs.io         (domain now redirects to Twilio marketing)
 *  R4-006  mpegif.org/             -> Wikipedia MPEG Industry Forum      (SSL 525 dead)
 *          mpegif.org/resources.html -> DELETE                           (no equivalent)
 *          projekktor.com          -> github.com/frankyghost/projekktor  (connection dead)
 *          jplayer.org             -> github.com/jplayer/jPlayer         (connection dead)
 *  R4-007  github.imc.re/*         -> github.com/*                       (dead GitHub mirror host)
 *  R4-008  SVT-AV1/discussions     -> gitlab.com/AOMediaCodec/SVT-AV1    (repo moved, discussions 404)
 *          motion-canvas/core      -> motion-canvas/motion-canvas        (repo renamed)
 *          willowtreeapps/rocute   -> wayback snapshot                   (repo deleted)
 *  R4-020  mainconcept codec-comparison-tool -> DELETE                   (404, never archived)
 *  R4-022  chiariglione mpeg-dash  -> Wikipedia DASH                     (real-browser 403 Forbidden)
 *          businesswire PRs (x2)   -> wayback snapshots                  (blocks all automation/datacenter access)
 *  R4-023  redirect-drift-to-root: editframe/theiabm/thinkbrandedmedia/
 *          remoteproduction/blendvision/harmonic/conviva -> wayback;
 *          ultrahdforum (x3) -> uhdf.svta.org/guidelines/ (org merged into SVTA);
 *          mainconcept codec-sdk -> mainconcept.com/codecs;
 *          apps.sandflow.com/imscV -> imscv.sandflow.com (app moved);
 *          lwks.com/lightworks -> lwks.com (product root);
 *          restack/circlehd/kaltura-advertising -> DELETE (no archive)
 *  R4-065  7 sourceforge-class http:// -> https:// (301-to-https verified)
 *
 * Idempotent: a rule whose URL no longer matches any resource is a no-op.
 * Journaled to evidence/run21/link-fixes-<env>.json.
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run21-link-fixes-prod.ts
 * Dev validation:      PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run21-link-fixes-prod.ts
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
  /** matches against the stored resource URL */
  match: (url: string) => boolean;
  /** null => delete; string => fixed target; fn => derived target */
  to: null | string | ((url: string) => string);
  note: string;
};

const wb = (ts: string, orig: string) => `https://web.archive.org/web/${ts}/${orig}`;
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const RULES: Rule[] = [
  { finding: "R4-001", match: (u) => host(u) === "afterglowplayer.com", to: "https://github.com/moay/afterglow", note: "parked-spam domain takeover" },
  { finding: "R4-002", match: (u) => host(u) === "winff.org", to: "https://github.com/WinFF/winff", note: "domain takeover" },
  { finding: "R4-003", match: (u) => host(u) === "openqoe.dev", to: null, note: "SSL dead; GitHub org/repo rows remain in corpus" },
  { finding: "R4-004", match: (u) => u.includes("wiki.x266.mov/docs/video/AV1"), to: wb("20260412165755", "https://wiki.x266.mov/docs/video/AV1"), note: "wiki TLS hard-broken; snapshot pinned" },
  { finding: "R4-004", match: (u) => u.includes("wiki.x266.mov/blog/av1-for-dummies"), to: wb("20260327023036", "https://wiki.x266.mov/blog/av1-for-dummies"), note: "wiki TLS hard-broken; snapshot pinned" },
  { finding: "R4-005", match: (u) => host(u) === "kurento.org", to: "https://doc-kurento.readthedocs.io/en/stable/", note: "kurento.org now redirects to Twilio marketing" },
  { finding: "R4-006", match: (u) => u.replace(/\/$/, "").endsWith("mpegif.org/resources.html"), to: null, note: "SSL 525 dead, no equivalent content" },
  { finding: "R4-006", match: (u) => host(u) === "mpegif.org" && !u.includes("resources.html"), to: "https://en.wikipedia.org/wiki/MPEG_Industry_Forum", note: "SSL 525 dead org site" },
  { finding: "R4-006", match: (u) => host(u) === "projekktor.com", to: "https://github.com/frankyghost/projekktor", note: "site connection-dead; project lives on GitHub" },
  { finding: "R4-006", match: (u) => host(u) === "jplayer.org", to: "https://github.com/jplayer/jPlayer", note: "site connection-dead; project lives on GitHub" },
  { finding: "R4-007", match: (u) => u.startsWith("https://github.imc.re/"), to: (u) => u.replace("https://github.imc.re/", "https://github.com/"), note: "dead GitHub mirror host -> canonical GitHub" },
  { finding: "R4-008", match: (u) => u.includes("github.com/AOMediaCodec/SVT-AV1/discussions"), to: "https://gitlab.com/AOMediaCodec/SVT-AV1", note: "repo moved to GitLab; GitHub discussions 404" },
  { finding: "R4-008", match: (u) => u.includes("github.com/motion-canvas/core"), to: "https://github.com/motion-canvas/motion-canvas", note: "repo renamed" },
  { finding: "R4-008", match: (u) => u.includes("github.com/willowtreeapps/rocute"), to: wb("20250827020057", "https://github.com/willowtreeapps/rocute"), note: "repo deleted; snapshot pinned" },
  { finding: "R4-020", match: (u) => u.includes("mainconcept.com/codec-comparison-tool"), to: null, note: "404, never archived" },
  { finding: "R4-022", match: (u) => u.includes("mpeg.chiariglione.org/standards/mpeg-dash"), to: "https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP", note: "real-browser 403 Forbidden (screenshot evidence)" },
  { finding: "R4-022", match: (u) => u.includes("businesswire.com/news/home/20230516005279"), to: wb("20230521170721", "https://www.businesswire.com/news/home/20230516005279/en/Streaming-Video-Technology-Alliance-Introduces-New-Industry-Conference-SEGMENTS2023"), note: "businesswire blocks automation; static PR -> snapshot" },
  { finding: "R4-022", match: (u) => u.includes("businesswire.com/news/home/20231019229734"), to: wb("20231210195321", "https://www.businesswire.com/news/home/20231019229734/en/Streaming-Video-Technology-Alliance-Announces-First-Public-Open-Source-Repository-Common-Media-Library/"), note: "businesswire blocks automation; static PR -> snapshot" },
  { finding: "R4-023", match: (u) => u.includes("restack.io/p/open-source-video-streaming"), to: null, note: "drift-to-root; never archived" },
  { finding: "R4-023", match: (u) => u.includes("editframe.com/guides/integrating-ffmpeg"), to: wb("20251005160314", "https://www.editframe.com/guides/integrating-ffmpeg-with-react.js-via-webassembly"), note: "drift-to-root; snapshot pinned" },
  { finding: "R4-023", match: (u) => u.includes("theiabm.org/bamproducts/online-caption-subtitle-toolkit"), to: wb("20251115022642", "https://theiabm.org/bamproducts/online-caption-subtitle-toolkit/"), note: "drift-to-root; snapshot pinned" },
  { finding: "R4-023", match: (u) => u.includes("thinkbrandedmedia.com/the-best-ai-tools"), to: wb("20250126100102", "https://thinkbrandedmedia.com/the-best-ai-tools-for-adding-subtitles-improve-your-videos-and-retain-customers/"), note: "drift-to-root; snapshot pinned" },
  { finding: "R4-023", match: (u) => u.includes("remoteproduction.com/the-best-resources"), to: wb("20250905130722", "https://remoteproduction.com/the-best-resources-for-learning-remote-production-technology/"), note: "drift-to-root; snapshot pinned" },
  { finding: "R4-023", match: (u) => u.includes("blendvision.com/en/blog/live-streaming-protocols-comparison"), to: wb("20251116092923", "https://blendvision.com/en/blog/live-streaming-protocols-comparison"), note: "drift-to-root; snapshot pinned" },
  { finding: "R4-023", match: (u) => u.includes("ultrahdforum.org/phasea-guidelines-description"), to: wb("20260113061642", "https://ultrahdforum.org/phasea-guidelines-description/"), note: "phase-A doc has no distinct successor page; snapshot pinned" },
  { finding: "R4-023", match: (u) => u.includes("ultrahdforum.org/phaseb-guidelines-description"), to: wb("20260212223017", "https://ultrahdforum.org/phaseb-guidelines-description/"), note: "phase-B doc has no distinct successor page; snapshot pinned" },
  { finding: "R4-023", match: (u) => host(u) === "ultrahdforum.org" && !u.includes("guidelines-description"), to: "https://uhdf.svta.org/guidelines/", note: "UHD Forum merged into SVTA; guidelines live at successor (200)" },
  { finding: "R4-023", match: (u) => u.includes("mainconcept.com/codec-sdk"), to: "https://www.mainconcept.com/codecs", note: "SDK page moved; codecs catalog 200" },
  { finding: "R4-023", match: (u) => u.includes("circlehd.com/products/video-transcoding-service"), to: null, note: "drift-to-root; never archived" },
  { finding: "R4-023", match: (u) => u.includes("harmonicinc.com/insights/blog/targeted-ads-innovations"), to: wb("20260508115505", "https://www.harmonicinc.com/insights/blog/targeted-ads-innovations/"), note: "drift to mediakind root; snapshot pinned" },
  { finding: "R4-023", match: (u) => u.includes("corp.kaltura.com/products/video-player/advertising"), to: null, note: "drift-to-root; never archived" },
  { finding: "R4-023", match: (u) => u.includes("apps.sandflow.com/imscV"), to: "https://imscv.sandflow.com/", note: "app moved to its own subdomain (200)" },
  { finding: "R4-023", match: (u) => u.includes("lwks.com/lightworks"), to: "https://lwks.com/", note: "product now IS the site root (200)" },
  { finding: "R4-023", match: (u) => u.includes("conviva.com/state-of-streaming"), to: wb("20230907033441", "https://www.conviva.com/state-of-streaming/"), note: "report program discontinued after conviva.ai rebrand; snapshot pinned" },
  // R4-065: verified 301-to-https hosts only. The remaining http:// rows were
  // per-URL verified https-UNSUPPORTED on 2026-07-19 and stay http by design:
  // zuggy.wz.cz (https 403), avisynth.nl (507/508 both schemes), live555.com,
  // lives-video.com, cinepaint.org, dranger.com, infrarecorder.org,
  // mplayerhq.hu, slowmovideo.granjow.net, umezawa.dyndns.info (no TLS).
  ...[
    "http://sox.sourceforge.net/",
    "http://audacity.sourceforge.net/",
    "http://avidemux.sourceforge.net/",
    "http://yamdi.sourceforge.net/",
    "http://xine.sourceforge.net/",
    "http://libmpeg2.sourceforge.net/",
    "http://dvbsnoop.sourceforge.net/",
  ].map((u): Rule => ({
    finding: "R4-065",
    match: (x) => x === u,
    to: u.replace("http://", "https://"),
    note: "host 301s http->https (verified); store https directly",
  })),
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

  // Live view of url -> owning resource id, kept current as we repoint/delete,
  // so a repoint whose target is already taken is handled as a duplicate
  // delete (resources.url has a UNIQUE constraint — a blind PUT would 500).
  const urlOwner = new Map<string, number>();
  for (const r of resources) if (r.url) urlOwner.set(r.url, r.id);

  for (const rule of RULES) {
    const matches = resources.filter((r) => r.url && rule.match(r.url));
    if (matches.length === 0) {
      log({ finding: rule.finding, note: rule.note, action: "noop", matched: 0 });
      continue;
    }
    for (const res of matches) {
      if (urlOwner.get(res.url) !== res.id) continue; // already deleted/repointed this run
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
          // Target already lives in the corpus -> this row is a duplicate.
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
  fs.mkdirSync("evidence/run21", { recursive: true });
  fs.writeFileSync(`evidence/run21/link-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(`\nDone. ${journal.actions.length} actions, ${failures.length} failures. Journal: evidence/run21/link-fixes-${ENV_TAG}.json`);
  if (failures.length) {
    console.error("FAILURES:", JSON.stringify(failures, null, 2));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
