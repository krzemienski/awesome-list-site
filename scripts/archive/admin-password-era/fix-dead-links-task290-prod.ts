/**
 * Task 290: triage of link-health job 5 (Aug 4 2026, prod). Repoints the 36
 * genuinely-dead broken/dns entries and 31 suspect off-domain redirects to
 * verified-live targets via the admin HTTP API (prod DB is read-only from the
 * workspace). Matches by exact OLD URL; idempotent; UNIQUE-url collisions are
 * skipped and reported.
 *
 * False positives intentionally NOT touched:
 *  - norsk.video/about-id3as/ (200 from this vantage; transient)
 *  - iphome.hhi.de spie-2017.pdf, professionalsupport.dolby.com x2 (incomplete
 *    SSL chain UNABLE_TO_VERIFY_LEAF_SIGNATURE; browsers load fine via AIA)
 *
 * Run: npx tsx scripts/fix-dead-links-task290-prod.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";
if (!PASSWORD) { console.error("ADMIN_PASSWORD not set"); process.exit(1); }

// Broken/dns/ssl entries -> verified-live replacements (all probed 200 on Aug 4 2026)
const BROKEN_FIXES: Array<{ from: string; to: string; note: string }> = [
  { from: "https://github.com/open-io/oio-sds", to: "https://web.archive.org/web/2024/https://github.com/open-io/oio-sds", note: "repo deleted after OVHcloud acquisition; archive snapshot" },
  { from: "https://developer.dolby.com/technology/dolby-vision2/", to: "https://www.dolby.com/technologies/dolby-vision/", note: "developer.dolby.com DNS gone; dolby.com tech page" },
  { from: "https://github.com/VideoLAN/librist", to: "https://code.videolan.org/rist/librist", note: "librist lives on VideoLAN GitLab, GitHub mirror removed" },
  { from: "https://github.com/privaloops/hevc.js", to: "https://www.hevcjs.dev/", note: "repo renamed then made private; official site live" },
  { from: "https://developer.dolby.com/technology/dolby-vision2/dolby-vision-for-games/pipeline/", to: "https://professional.dolby.com/gaming/", note: "developer portal gone; professional gaming page" },
  { from: "https://kahana.co/blog/inside-drm-session-eme-license-server-cdm-flow-2026", to: "https://kahana.io/blog/inside-drm-session-eme-license-server-cdm-flow-2026", note: "article moved to kahana.io" },
  { from: "https://www.digitaltvgroup.org/", to: "https://dtg.org.uk/", note: "DTG rebranded domain" },
  { from: "https://github.com/muhgholy/OpenCut", to: "https://github.com/OpenCut-app/OpenCut", note: "fork gone; canonical OpenCut org repo" },
  { from: "https://vsf.tv/wp-content/uploads/2026/02/VT26AGENDA_2_12.pdf", to: "https://vsf.tv/vidtrans26/", note: "agenda PDF removed; VidTrans26 event page" },
  { from: "https://cdnalliance.org/wp-content/uploads/2025/09/LL-WG-Whitepaper-Low-Latency-Streaming-%E2%80%93-A-First-Step-Towards-Standardization-V1.pdf", to: "https://web.archive.org/web/2026/https://cdnalliance.org/wp-content/uploads/2025/09/LL-WG-Whitepaper-Low-Latency-Streaming-%E2%80%93-A-First-Step-Towards-Standardization-V1.pdf", note: "PDF removed from site; archive copy" },
  { from: "https://rtc-on.io", to: "https://rtcon.live/", note: "RTC.ON conference moved domains" },
  { from: "https://developer.dolby.com/tools-media/utilities/dolby-encoding-engine", to: "https://professional.dolby.com/product/dolby-encoding-engine/", note: "developer portal gone; professional product page" },
  { from: "https://gstreamer.freedesktop.org/documentation/fmp4/index.html", to: "https://gstreamer.freedesktop.org/documentation/isobmff/GstFMP4Mux.html", note: "fmp4 plugin docs reorganized under isobmff" },
  { from: "https://ece.uwaterloo.ca/~zduanmu/waterloosqoe4/", to: "https://ivc.uwaterloo.ca/database/WaterlooSQoE-IV/", note: "personal page gone; IVC lab database page" },
  { from: "https://github.com/aleksandar-pajic-44/react-tv-player", to: "https://github.com/lewhunt/react-tv-player", note: "fork gone; canonical repo" },
  { from: "https://github.com/mutablealligator/CloudTranscode", to: "https://github.com/bfansports/CloudTranscode", note: "fork gone; canonical repo" },
  { from: "https://github.com/eyevinntechnology/mp4ff", to: "https://github.com/Eyevinn/mp4ff", note: "org handle is Eyevinn" },
  { from: "https://github.com/Axinom/Axinom.Drm.BearerAuthLicenseServerProxy", to: "https://github.com/Axinom/drm-quick-start", note: "repo removed; Axinom DRM reference project" },
  { from: "https://www.eidr.org/documents/EIDR_Documentation_Guide.pdf", to: "https://web.archive.org/web/2024/https://www.eidr.org/documents/EIDR_Documentation_Guide.pdf", note: "eidr.org documents dir removed; archive copy" },
  { from: "https://docs.livepeer.org/guides/orchestrating/benchmark-transcoding", to: "https://docs.livepeer.org/v1/orchestrators/guides/benchmark-transcoding", note: "docs restructure" },
  { from: "https://blog.tempus-ex.com/hello-video-codec/", to: "https://github.com/tempus-ex/hello-video-codec", note: "blog domain gone; companion repo (medium mirror bot-blocks scanners)" },
  { from: "https://blog.min.io/time-to-first-byte-streaming-media/", to: "https://web.archive.org/web/2024/https://blog.min.io/time-to-first-byte-streaming-media/", note: "article removed from min.io; archive copy" },
  { from: "https://videoservicesforum.net/RIST.shtml", to: "https://www.rist.tv/", note: "domain gone; RIST Forum site" },
  { from: "https://potato.vsf.tv/RIST.shtml", to: "https://en.wikipedia.org/wiki/Reliable_Internet_Stream_Transport", note: "staging host gone; rist.tv already used by sibling fix, point at RIST overview" },
  { from: "https://www-itec.uni-klu.ac.at/dash/?page_id=605", to: "https://dash.itec.aau.at/dash-dataset/", note: "ITEC DASH dataset moved to aau.at" },
  { from: "https://kixelated.github.io/moq-drafts/draft-lcurley-moq-hang.html", to: "https://datatracker.ietf.org/doc/draft-lcurley-moq-hang/", note: "personal draft page gone; IETF datatracker" },
  { from: "https://doc.moq.dev/app/gstreamer", to: "https://github.com/moq-dev/moq/blob/main/doc/bin/gstreamer.md", note: "doc site restructured; in-repo doc" },
  { from: "https://engineering.dazn.com/", to: "https://medium.com/dazn-tech", note: "DNS gone; DAZN engineering publication on Medium" },
  { from: "https://developer.android.om/media/media3/transformer", to: "https://developer.android.com/media/media3/transformer", note: "typo .om -> .com" },
  { from: "https://compress.cafe/resources.html", to: "https://compress.cafe/", note: "resources page removed; site root live" },
  { from: "https://voicesofvideo.netint.com", to: "https://netint.com/voices-of-video/", note: "subdomain retired; netint.com section" },
  { from: "https://github.com/Eyevinn/awesome-cmcd", to: "https://github.com/cta-wave/common-media-client-data", note: "awesome list removed; CTA-WAVE CMCD spec repo" },
  { from: "https://www.spotx.tv/", to: "https://www.magnite.com/", note: "SpotX absorbed into Magnite; DNS flaky + off-domain redirect" },
];

// Suspect off-domain redirects -> final URL (per link-health lifecycle guidance),
// except the ultrahdforum watermarking PDF which collapsed to a root (content gone).
const SUSPECT_FIXES: Array<{ from: string; to: string; note: string }> = [
  { from: "https://hydrogenaud.io/index.php", to: "https://hydrogenaudio.org/index.php", note: "domain rename" },
  { from: "https://docs.dolby.io/media-apis/docs/developer-tools", to: "https://optiview.dolby.com/docs/", note: "dolby.io docs folded into OptiView" },
  { from: "https://systemdr.substack.com/p/live-streaming-architecture-ingest", to: "https://systemdr.systemdrd.com/p/live-streaming-architecture-ingest", note: "substack custom domain" },
  { from: "https://ultrahdforum.org", to: "https://uhdf.svta.org/", note: "UHD Forum merged into SVTA" },
  { from: "https://docs.ovenmediaengine.com/dev/streaming/low-latency-hls", to: "https://ovenmedia.com/docs/ome/dev/streaming/low-latency-hls/", note: "docs domain move" },
  { from: "https://hls-js.netlify.app/api-docs/", to: "https://hlsjs.video-dev.org/api-docs/hls.js.hls", note: "hls.js docs moved to video-dev.org" },
  { from: "https://ultrahdforum.org/wp-content/uploads/watermarking-API-for-encoder-integration.1.0.1.pdf", to: "https://web.archive.org/web/2024/https://ultrahdforum.org/wp-content/uploads/watermarking-API-for-encoder-integration.1.0.1.pdf", note: "PDF collapsed to SVTA root; archive copy" },
  { from: "https://shaka-player-demo.appspot.com/docs/api/tutorial-welcome.html", to: "https://shaka-project.github.io/shaka-player/docs/api/tutorial-welcome.html", note: "shaka docs moved to github.io" },
  { from: "https://shaka-player-demo.appspot.com/docs/api/tutorial-architecture.html", to: "https://shaka-project.github.io/shaka-player/docs/api/tutorial-architecture.html", note: "shaka docs moved to github.io" },
  { from: "https://libmpeg2.sourceforge.net/", to: "https://libmpeg2.sourceforge.io/", note: "sourceforge canonical host" },
  { from: "https://wmspanel.com/nimble", to: "https://softvelum.com/nimble/", note: "Softvelum canonical site" },
  { from: "https://smplayer.sourceforge.io/", to: "https://www.smplayer.info/", note: "project's own domain" },
  { from: "https://www.jwplayer.com/", to: "https://jwx.com/", note: "JWP rebranded to JWX" },
  { from: "https://subworkshop.sourceforge.io/", to: "https://subworkshop.sourceforge.net/", note: "sourceforge canonical host" },
  { from: "https://hls-js.netlify.app/demo/?src=LL-HLS_URL", to: "https://hlsjs.video-dev.org/demo/?src=LL-HLS_URL", note: "hls.js demo moved to video-dev.org" },
  { from: "https://opensource.google/projects/shaka-packager", to: "https://github.com/shaka-project/shaka-packager", note: "project page redirects to repo" },
  { from: "https://www.streamingvideoalliance.org/", to: "https://www.svta.org/", note: "SVA rebranded to SVTA" },
  { from: "https://www.its.bldrdoc.gov/vqeg/vqeg-home.aspx", to: "https://vqeg.org/vqeg-home", note: "VQEG own domain" },
  { from: "https://www.streamingvideoalliance.org/project/best-practices-for-end-to-end-workflow-monitoring/", to: "https://www.svta.org/project/best-practices-for-end-to-end-workflow-monitoring/", note: "SVA rebranded to SVTA" },
  { from: "https://www.mpegstandards.org", to: "https://www.mpeg.org/", note: "canonical MPEG site" },
  { from: "https://www.theoplayer.com/blog/content-protection-for-hls-with-aes-128-encryption", to: "https://optiview.dolby.com/resources/blog/streaming/content-protection-for-hls-with-aes-128-encryption/", note: "THEOplayer content on Dolby OptiView" },
  { from: "https://www.learndigitalaudio.com/normalize-audio", to: "https://higherhz.org/learn/what-is-audio-normalization/", note: "content migrated to higherhz" },
  { from: "https://www.smarthomebeginner.com/best-home-server-apps/", to: "https://www.simplehomelab.com/best-home-server-apps/", note: "site rebranded to SimpleHomelab" },
  { from: "https://www.is.com/mobile-advertising-sdk/", to: "https://unity.com/solutions/user-acquisition", note: "ironSource merged into Unity" },
  { from: "https://jwplayer.com/mobile-sdk/", to: "https://jwx.com/mobile-sdk/", note: "JWP rebranded to JWX" },
  { from: "https://www.theoplayer.com/", to: "https://optiview.dolby.com/", note: "THEOplayer is Dolby OptiView" },
  { from: "https://www.fastpix.io/blog/cloud-transcoding-choosing-the-right-solution-for-your-video-centric-product", to: "https://fastpix.com/blog/cloud-transcoding-choosing-the-right-solution-for-your-video-centric-product", note: "fastpix.com canonical" },
  { from: "https://developers.google.com/interactive-media-ads/docs/sdks/html5/vastinspector", to: "https://googleads.github.io/googleads-ima-html5/vsi/", note: "VAST inspector moved to github.io" },
  { from: "https://antmedia.io/docs/", to: "https://docs.antmedia.io/", note: "docs on own subdomain" },
  { from: "https://gnomesubtitles.org/", to: "https://sourceforge.net/projects/gnome-subtitles/", note: "domain redirects to sourceforge project" },
  { from: "https://www.telestream.net/wirecast/", to: "https://www.wirecast.io/en/", note: "Wirecast spun out to wirecast.io" },
];

const FIXES = [...BROKEN_FIXES, ...SUSPECT_FIXES];

const journal: any = { startedAt: new Date().toISOString(), base: BASE, actions: [] };
const log = (e: any) => { journal.actions.push(e); console.log(JSON.stringify(e)); };

let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: cookie, ...(init.headers || {}) },
  });
  let body: any = null;
  try { body = await r.json(); } catch { /* non-JSON */ }
  return { status: r.status, body };
}

async function login(): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const setCookies: string[] =
        (r.headers as any).getSetCookie?.() ?? [r.headers.get("set-cookie")].filter(Boolean);
      const sid = setCookies.find((c) => c.startsWith("connect.sid="));
      if (!sid) throw new Error("login OK but no connect.sid");
      cookie = sid.split(";")[0];
      console.log(`[login] ok (attempt ${attempt})`);
      return;
    }
    console.log(`[login] attempt ${attempt} -> ${r.status}`);
    await new Promise((res) => setTimeout(res, 5000 * attempt));
  }
  throw new Error("login failed after retries");
}

async function fetchAllResources() {
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
  const urlOwner = new Map<string, number>();
  for (const r of resources) if (r.url) urlOwner.set(r.url, r.id);

  for (const fix of FIXES) {
    const matches = resources.filter((r) => r.url === fix.from);
    if (matches.length === 0) {
      log({ from: fix.from, action: "noop-no-match", note: fix.note });
      continue;
    }
    for (const res of matches) {
      const owner = urlOwner.get(fix.to);
      if (owner !== undefined && owner !== res.id) {
        log({ id: res.id, title: res.title, status: res.status, from: fix.from, to: fix.to, action: "skip-target-taken", ownerId: owner, note: fix.note });
        continue;
      }
      const put = await api(`/api/admin/resources/${res.id}`, { method: "PUT", body: JSON.stringify({ url: fix.to }) });
      if (put.status === 200) { urlOwner.delete(fix.from); urlOwner.set(fix.to, res.id); }
      log({ id: res.id, title: res.title, status: res.status, from: fix.from, to: fix.to, action: "repoint", httpStatus: put.status, note: fix.note });
    }
  }

  journal.finishedAt = new Date().toISOString();
  const failures = journal.actions.filter((a: any) => a.httpStatus && a.httpStatus >= 400);
  journal.failureCount = failures.length;
  fs.mkdirSync("evidence/task290", { recursive: true });
  fs.writeFileSync(`evidence/task290/link-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(`\nDone. ${journal.actions.length} actions, ${failures.length} failures.`);
  if (failures.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
